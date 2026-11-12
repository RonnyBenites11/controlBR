import pg from 'pg'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'

// Prueba con dos conexiones REALES. Ejecutar solo contra Supabase local desechable.
const connectionString = process.env.TEST_DATABASE_URL
if (!connectionString)
  throw new Error(
    'Falta TEST_DATABASE_URL. Consulta README: prueba de concurrencia en Supabase local.',
  )
if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(connectionString).hostname))
  throw new Error('Por seguridad, esta prueba solo acepta una base local.')
const pool = new pg.Pool({ connectionString, max: 4 })
const actorId = randomUUID()
const request = randomUUID()
let productId
let variantId
const liveIds = []
async function scalar(sql, args = []) {
  const { rows } = await pool.query(sql, args)
  return Object.values(rows[0])[0]
}
async function asActor(job) {
  const connection = await pool.connect()
  try {
    await connection.query('begin')
    await connection.query('set local role authenticated')
    await connection.query("select set_config('request.jwt.claim.sub',$1,true)", [actorId])
    const result = await job(connection)
    await connection.query('commit')
    return result
  } catch (error) {
    await connection.query('rollback')
    throw error
  } finally {
    connection.release()
  }
}
async function close(id) {
  return asActor(
    async (c) => (await c.query('select public.close_live($1) as result', [id])).rows[0].result,
  )
}
try {
  await pool.query(
    "insert into auth.users(id, email, raw_user_meta_data) values ($1,$2,'{}'::jsonb)",
    [actorId, `${request}@example.test`],
  )
  await pool.query("update public.profiles set role='admin',active=true where id=$1", [actorId])
  productId = await asActor(
    async (c) =>
      (
        await c.query(
          "select public.save_product(null,$1,'Prueba de concurrencia',10,true) as id",
          [`T-${request.slice(0, 8).toUpperCase()}`],
        )
      ).rows[0].id,
  )
  variantId = await asActor(
    async (c) =>
      (await c.query("select public.create_variant($1,'Prueba',18::smallint,3) as id", [productId]))
        .rows[0].id,
  )
  await asActor((c) =>
    c.query("select public.change_stock($1,10,'production','Fixture de prueba')", [variantId]),
  )
  for (const quantity of [2, 7, 7]) {
    const liveId = await asActor(
      async (c) =>
        (await c.query("select public.create_live('TEST concurrencia') as id")).rows[0].id,
    )
    liveIds.push(liveId)
    await asActor((c) =>
      c.query('select public.create_sale($1,$2,$3,$4,$5::jsonb)', [
        liveId,
        'Cliente prueba',
        'efectivo',
        '',
        JSON.stringify([{ variant_id: variantId, quantity, unit_price: 10 }]),
      ]),
    )
  }
  const same = await Promise.all([close(liveIds[0]), close(liveIds[0])])
  assert.equal(same.filter((result) => result.already_closed).length, 1)
  assert.equal(await scalar('select stock from public.variants where id=$1', [variantId]), 8)
  const competing = await Promise.allSettled([close(liveIds[1]), close(liveIds[2])])
  assert.equal(competing.filter((r) => r.status === 'fulfilled').length, 1)
  assert.equal(
    competing.filter(
      (r) => r.status === 'rejected' && r.reason.message.includes('Stock insuficiente'),
    ).length,
    1,
  )
  assert.equal(await scalar('select stock from public.variants where id=$1', [variantId]), 1)
  assert.equal(
    await scalar(
      "select count(*)::int from public.stock_movements where variant_id=$1 and kind='sale'",
      [variantId],
    ),
    2,
  )
  console.log(
    'OK: doble cierre concurrente y dos Lives compitiendo por el mismo stock. Saldo final: 1.',
  )
} finally {
  // Únicamente los UUID generados por esta ejecución; nunca truncar tablas.
  await pool.query(
    'delete from public.sale_items where sale_id in (select id from public.sales where live_id=any($1::uuid[]))',
    [liveIds],
  )
  await pool.query('delete from public.sales where live_id=any($1::uuid[])', [liveIds])
  await pool.query('delete from public.stock_movements where created_by=$1', [actorId])
  await pool.query('delete from public.lives where id=any($1::uuid[])', [liveIds])
  if (variantId) await pool.query('delete from public.variants where id=$1', [variantId])
  if (productId) await pool.query('delete from public.products where id=$1', [productId])
  await pool.query('delete from public.profiles where id=$1', [actorId])
  await pool.query('delete from auth.users where id=$1', [actorId])
  await pool.end()
}
