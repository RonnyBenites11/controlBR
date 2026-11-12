import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { randomUUID } from 'node:crypto'

const admin = '00000000-0000-4000-8000-000000000001'
const staff = '00000000-0000-4000-8000-000000000002'
const inactive = '00000000-0000-4000-8000-000000000003'
let db: PGlite
let product: string
let v1: string
let v2: string
let live: string
async function scalar<T = string>(sql: string, params: unknown[] = []): Promise<T> {
  const result = await db.query<Record<string, T>>(sql, params)
  return Object.values(result.rows[0])[0]
}
async function actor(id: string) {
  await db.exec('set local role authenticated')
  await db.query("select set_config('request.jwt.claim.sub', $1, true)", [id])
}
async function sale(
  lines = [{ variant_id: v1, quantity: 2, unit_price: 39.9 }],
  request = randomUUID(),
) {
  return scalar('select public.create_sale($1, $2, $3, $4, $5::jsonb, $6)', [
    live,
    '@cliente',
    'yape',
    '',
    JSON.stringify(lines),
    request,
  ])
}
// Una sentencia rechazada aborta la transacción. Usa savepoint para continuar inspeccionando.
async function rejects(sql: string, params: unknown[], message: string | RegExp) {
  await db.exec('savepoint expected_error')
  try {
    await expect(db.query(sql, params)).rejects.toThrow(message)
  } finally {
    await db.exec('rollback to savepoint expected_error; release savepoint expected_error')
  }
}
beforeAll(async () => {
  db = new PGlite()
  await db.exec(readFileSync('tests/support/bootstrap.sql', 'utf8'))
  for (const name of ['202611110001_initial.sql', '202611110002_private_receipts.sql'])
    await db.exec(readFileSync(`supabase/migrations/${name}`, 'utf8'))
  await db.query('insert into auth.users(id) values ($1),($2),($3)', [admin, staff, inactive])
  await db.query("update public.profiles set role = 'admin', active = true where id = $1", [admin])
  await db.query('update public.profiles set active = true where id = $1', [staff])
})
beforeEach(async () => {
  await db.exec('begin')
  await actor(admin)
  product = await scalar("select public.save_product(null,'TEST-LUNA','Luna',49.90,true)")
  v1 = await scalar("select public.create_variant($1,'Crema',18::smallint,3)", [product])
  v2 = await scalar("select public.create_variant($1,'Rosa',19::smallint,3)", [product])
  await scalar("select public.change_stock($1,10,'production','Lote de prueba')", [v1])
  await scalar("select public.change_stock($1,1,'production','Lote de prueba')", [v2])
  live = await scalar("select public.create_live('Live de prueba')")
})
afterEach(async () => {
  await db.exec('rollback')
})
afterAll(async () => {
  await db.close()
})

describe('Migraciones reales · cierre y ventas', () => {
  it('rechaza fracciones de céntimo en el servidor y no deja ventas parciales', async () => {
    await rejects(
      "select public.save_product(null,'PRECIO','Modelo',10.001,true)",
      [],
      'dos decimales',
    )
    await rejects(
      'select public.create_sale($1,$2,$3,$4,$5::jsonb)',
      [
        live,
        'Cliente',
        'yape',
        '',
        JSON.stringify([{ variant_id: v1, quantity: 1, unit_price: 20.001 }]),
      ],
      'dos decimales',
    )
    expect(await scalar<number>('select count(*)::int from public.sales')).toBe(0)
  })
  it('detecta reintentos de una solicitud ya guardada con datos diferentes', async () => {
    const request = randomUUID()
    await sale(undefined, request)
    await rejects(
      'select public.create_sale($1,$2,$3,$4,$5::jsonb,$6)',
      [
        live,
        '@otrocliente',
        'yape',
        '',
        JSON.stringify([{ variant_id: v1, quantity: 2, unit_price: 39.9 }]),
        request,
      ],
      'ya se guardó',
    )
    expect(await scalar<number>('select count(*)::int from public.sales')).toBe(1)
  })
  it('no descuenta al vender; cierra una sola vez con movimientos e importe histórico', async () => {
    await sale()
    expect(await scalar<number>('select stock from public.variants where id=$1', [v1])).toBe(10)
    const result = await scalar<{ pairs: number; total: number; already_closed: boolean }>(
      'select public.close_live($1)',
      [live],
    )
    expect(result).toEqual({ pairs: 2, total: 79.8, already_closed: false })
    expect(await scalar<number>('select stock from public.variants where id=$1', [v1])).toBe(8)
    expect(await scalar('select public.close_live($1)', [live])).toEqual({ already_closed: true })
    expect(
      await scalar<number>('select count(*)::int from public.stock_movements where live_id=$1', [
        live,
      ]),
    ).toBe(1)
  })
  it('revierte todos los descuentos y movimientos si falta stock en cualquier variante', async () => {
    // Garantiza que primero se procesa una variante con stock y después la insuficiente.
    const [first, second] = [v1, v2].sort()
    await sale([
      { variant_id: first, quantity: 1, unit_price: 10 },
      { variant_id: second, quantity: 99, unit_price: 10 },
    ])
    const before = await db.query('select id, stock from public.variants order by id')
    await rejects('select public.close_live($1)', [live], 'Stock insuficiente')
    expect((await db.query('select id, stock from public.variants order by id')).rows).toEqual(
      before.rows,
    )
    expect(await scalar('select status from public.lives where id=$1', [live])).toBe('open')
    expect(
      await scalar<number>('select count(*)::int from public.stock_movements where live_id=$1', [
        live,
      ]),
    ).toBe(0)
  })
  it('conserva precios y nombres históricos después de editar el modelo', async () => {
    await sale()
    await scalar("select public.save_product($1,'TEST-LUNA','Nombre nuevo',99,true)", [product])
    expect(
      (await db.query('select product_name, unit_price from public.sale_items')).rows[0],
    ).toEqual({ product_name: 'Luna', unit_price: '39.90' })
  })
  it('excluye anuladas y bloquea operaciones después del cierre', async () => {
    const id = await sale()
    await db.query("select public.cancel_sale($1,'Cliente desistió')", [id])
    await db.query('select public.close_live($1)', [live])
    expect(await scalar<number>('select stock from public.variants where id=$1', [v1])).toBe(10)
    await rejects('select public.cancel_sale($1,$2)', [id, 'Otra razón'], 'Live abierto')
    await rejects(
      'select public.create_sale($1,$2,$3,$4,$5::jsonb)',
      [
        live,
        'Cliente',
        'yape',
        '',
        JSON.stringify([{ variant_id: v1, quantity: 1, unit_price: 10 }]),
      ],
      'no está abierto',
    )
  })
  it('es idempotente al reintentar ventas y producción con el mismo identificador', async () => {
    const request = randomUUID()
    expect(await sale(undefined, request)).toBe(await sale(undefined, request))
    expect(await scalar<number>('select count(*)::int from public.sales')).toBe(1)
    const move = randomUUID()
    await db.query("select public.change_stock($1,3,'production','Lote nuevo',$2)", [v1, move])
    await db.query("select public.change_stock($1,3,'production','Lote nuevo',$2)", [v1, move])
    expect(await scalar<number>('select stock from public.variants where id=$1', [v1])).toBe(13)
  })
  it('rechaza ajustes negativos, ventas vacías y variantes duplicadas sin residuos', async () => {
    await rejects(
      "select public.change_stock($1,-11,'adjustment','Conteo físico')",
      [v1],
      'Stock insuficiente',
    )
    await rejects(
      'select public.create_sale($1,$2,$3,$4,$5::jsonb)',
      [live, 'Cliente', 'yape', '', '[]'],
      'entre 1 y 100',
    )
    const line = { variant_id: v1, quantity: 1, unit_price: 10 }
    await rejects(
      'select public.create_sale($1,$2,$3,$4,$5::jsonb)',
      [live, 'Cliente', 'yape', '', JSON.stringify([line, line])],
      /duplicate key/,
    )
    expect(await scalar<number>('select count(*)::int from public.sales')).toBe(0)
  })
})
describe('RLS, roles y comprobantes privados', () => {
  it('permite vender a encargada y le prohíbe stock, productos, roles y escrituras directas', async () => {
    await actor(staff)
    await sale()
    await rejects(
      "select public.change_stock($1,5,'production','Sin permiso')",
      [v1],
      'requiere administrador',
    )
    await rejects(
      "select public.save_product(null,'ILEGAL','Modelo',10,true)",
      [],
      'requiere administrador',
    )
    await rejects('update public.variants set stock=100', [], 'permission denied')
    await rejects("update public.profiles set role='admin'", [], 'permission denied')
    expect(await scalar<number>('select count(*)::int from public.profiles')).toBe(1)
  })
  it('impide el acceso de inactivos y anónimos', async () => {
    await actor(inactive)
    expect(await scalar<number>('select count(*)::int from public.products')).toBe(0)
    await rejects('select public.close_live($1)', [live], 'Acceso no autorizado')
    await db.exec('set local role anon')
    await rejects('select * from public.sales', [], 'permission denied')
    await rejects('select public.close_live($1)', [live], 'permission denied')
  })
  it('crea perfiles sin privilegios y evita modificar el acceso propio', async () => {
    await rejects(
      "select public.manage_profile($1,'Admin','staff',false)",
      [admin],
      'otro administrador',
    )
    await db.exec('reset role')
    const user = randomUUID()
    await db.query('insert into auth.users(id,raw_user_meta_data) values ($1,$2::jsonb)', [
      user,
      '{"role":"admin","active":true}',
    ])
    expect(
      (await db.query('select role,active from public.profiles where id=$1', [user])).rows[0],
    ).toEqual({ role: 'staff', active: false })
  })
  it('genera códigos únicos, válidos y persistentes', async () => {
    const codes = (
      await db.query<{ barcode: string }>('select barcode from public.variants')
    ).rows.map((r) => r.barcode)
    expect(new Set(codes).size).toBe(2)
    codes.forEach((code) => expect(code).toMatch(/^BR\d{12}$/))
  })
  it('solo vincula archivos existentes de la venta y conserva privados los comprobantes', async () => {
    const saleId = await sale()
    const path = `${live}/${saleId}/${randomUUID()}.jpg`
    expect(await scalar('select public.can_upload_receipt($1)', [path])).toBe(true)
    await rejects('select public.attach_receipt($1,$2)', [saleId, path], 'Sube la imagen')
    await db.query(
      "insert into storage.objects(bucket_id,name,owner_id) values ('receipts',$1,$2)",
      [path, admin],
    )
    await db.query('select public.attach_receipt($1,$2)', [saleId, path])
    await db.query('delete from storage.objects where name=$1', [path])
    expect(await scalar<number>('select count(*)::int from storage.objects')).toBe(1)
    await db.query('select public.close_live($1)', [live])
    expect(await scalar('select public.can_upload_receipt($1)', [path])).toBe(false)
    await db.exec('reset role')
    expect(await scalar("select public from storage.buckets where id='receipts'")).toBe(false)
  })
})
