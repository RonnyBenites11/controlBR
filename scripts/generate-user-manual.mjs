import { chromium } from '@playwright/test'
import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { setTimeout as delay } from 'node:timers/promises'
import { resolve } from 'node:path'

const baseURL = 'http://127.0.0.1:4175'
const captureDir = resolve('docs/manual/capturas')
const pdfPath = resolve('docs/manual-baby-ronnys.pdf')
await mkdir(captureDir, { recursive: true })

const userId = '00000000-0000-4000-8000-000000000001'
const lunaId = '10000000-0000-4000-8000-000000000001'
const nubeId = '10000000-0000-4000-8000-000000000002'
const solId = '10000000-0000-4000-8000-000000000003'
const liveId = '30000000-0000-4000-8000-000000000001'
const closedLiveId = '30000000-0000-4000-8000-000000000002'
const saleId = '40000000-0000-4000-8000-000000000001'
const v1 = '20000000-0000-4000-8000-000000000001'
const v2 = '20000000-0000-4000-8000-000000000002'
const v3 = '20000000-0000-4000-8000-000000000003'
const v4 = '20000000-0000-4000-8000-000000000004'
const now = Date.now()
const hoursAgo = (hours) => new Date(now - hours * 3600000).toISOString()
const demo = {
  profiles: [
    { id: userId, display_name: 'María Fernanda', role: 'admin', active: true, created_at: hoursAgo(24 * 60) },
    { id: '00000000-0000-4000-8000-000000000002', display_name: 'Lucía Encargada', role: 'staff', active: true, created_at: hoursAgo(24 * 30) },
    { id: '00000000-0000-4000-8000-000000000003', display_name: 'Nueva encargada', role: 'staff', active: false, created_at: hoursAgo(2) },
  ],
  products: [
    { id: lunaId, sku: 'BR-LUNA', name: 'Luna · primeros pasos', base_price: 49.9, active: true, created_at: hoursAgo(24 * 20) },
    { id: nubeId, sku: 'BR-NUBE', name: 'Nube · zapatito clásico', base_price: 59.9, active: true, created_at: hoursAgo(24 * 12) },
    { id: solId, sku: 'BR-SOL', name: 'Sol · sandalia de verano', base_price: 45, active: true, created_at: hoursAgo(24 * 4) },
  ],
  variants: [
    { id: v1, product_id: lunaId, color: 'Crema', size: 18, barcode: 'BR000000000001', stock: 10, minimum_stock: 3 },
    { id: v2, product_id: lunaId, color: 'Rosa viejo', size: 19, barcode: 'BR000000000002', stock: 2, minimum_stock: 3 },
    { id: v3, product_id: lunaId, color: 'Celeste', size: 20, barcode: 'BR000000000003', stock: 0, minimum_stock: 3 },
    { id: v4, product_id: nubeId, color: 'Arena', size: 20, barcode: 'BR000000000004', stock: 8, minimum_stock: 3 },
  ],
  lives: [
    { id: liveId, name: 'Miércoles de pequeños pasos', status: 'open', created_by: userId, created_at: hoursAgo(2), closed_at: null, closed_by: null },
    { id: closedLiveId, name: 'Sábado de nuevos colores', status: 'closed', created_by: userId, created_at: hoursAgo(24 * 2), closed_at: hoursAgo(24 * 2 - 3), closed_by: userId },
    { id: '30000000-0000-4000-8000-000000000003', name: 'Lanzamiento Primavera', status: 'closed', created_by: userId, created_at: hoursAgo(24 * 8), closed_at: hoursAgo(24 * 8 - 2), closed_by: userId },
  ],
  sales: [
    { id: saleId, live_id: liveId, buyer: '@mama_luna', payment_method: 'yape', notes: 'Entrega coordinada por mensaje', created_by: userId, created_at: hoursAgo(1.7), cancelled_at: null, cancelled_by: null, cancellation_reason: null },
    { id: '40000000-0000-4000-8000-000000000002', live_id: liveId, buyer: '@peque_pasos', payment_method: 'plin', notes: '', created_by: userId, created_at: hoursAgo(1), cancelled_at: null, cancelled_by: null, cancellation_reason: null },
    { id: '40000000-0000-4000-8000-000000000003', live_id: closedLiveId, buyer: '@familia_rosa', payment_method: 'efectivo', notes: '', created_by: userId, created_at: hoursAgo(24 * 2), cancelled_at: null, cancelled_by: null, cancellation_reason: null },
    { id: '40000000-0000-4000-8000-000000000004', live_id: closedLiveId, buyer: '@pasitos_azules', payment_method: 'transferencia', notes: 'Talla confirmada', created_by: userId, created_at: hoursAgo(24 * 2 + 0.5), cancelled_at: null, cancelled_by: null, cancellation_reason: null },
    { id: '40000000-0000-4000-8000-000000000005', live_id: liveId, buyer: '@compra_anulada', payment_method: 'yape', notes: '', created_by: userId, created_at: hoursAgo(0.8), cancelled_at: hoursAgo(0.6), cancelled_by: userId, cancellation_reason: 'La clienta cambió la talla' },
  ],
  sale_items: [
    { id: '50000000-0000-4000-8000-000000000001', sale_id: saleId, variant_id: v1, quantity: 2, unit_price: 49.9, product_name: 'Luna · primeros pasos', color: 'Crema', size: 18, barcode: 'BR000000000001' },
    { id: '50000000-0000-4000-8000-000000000002', sale_id: saleId, variant_id: v4, quantity: 1, unit_price: 57.9, product_name: 'Nube · zapatito clásico', color: 'Arena', size: 20, barcode: 'BR000000000004' },
    { id: '50000000-0000-4000-8000-000000000003', sale_id: '40000000-0000-4000-8000-000000000002', variant_id: v2, quantity: 1, unit_price: 47.9, product_name: 'Luna · primeros pasos', color: 'Rosa viejo', size: 19, barcode: 'BR000000000002' },
    { id: '50000000-0000-4000-8000-000000000004', sale_id: '40000000-0000-4000-8000-000000000003', variant_id: v1, quantity: 1, unit_price: 49.9, product_name: 'Luna · primeros pasos', color: 'Crema', size: 18, barcode: 'BR000000000001' },
    { id: '50000000-0000-4000-8000-000000000005', sale_id: '40000000-0000-4000-8000-000000000004', variant_id: v4, quantity: 2, unit_price: 59.9, product_name: 'Nube · zapatito clásico', color: 'Arena', size: 20, barcode: 'BR000000000004' },
    { id: '50000000-0000-4000-8000-000000000006', sale_id: '40000000-0000-4000-8000-000000000005', variant_id: v3, quantity: 1, unit_price: 45, product_name: 'Luna · primeros pasos', color: 'Celeste', size: 20, barcode: 'BR000000000003' },
  ],
  receipts: [
    { id: '60000000-0000-4000-8000-000000000001', sale_id: saleId, storage_path: `${liveId}/${saleId}/70000000-0000-4000-8000-000000000001.jpg`, created_by: userId, created_at: hoursAgo(1.5) },
  ],
  stock_movements: [
    { id: '80000000-0000-4000-8000-000000000001', variant_id: v1, kind: 'production', quantity: 12, balance_after: 12, reason: 'Producción lote primavera', live_id: null, created_by: userId, created_at: hoursAgo(24 * 5) },
    { id: '80000000-0000-4000-8000-000000000002', variant_id: v1, kind: 'sale', quantity: -1, balance_after: 11, reason: 'Cierre de Live: Sábado de nuevos colores', live_id: closedLiveId, created_by: userId, created_at: hoursAgo(24 * 2) },
    { id: '80000000-0000-4000-8000-000000000003', variant_id: v2, kind: 'adjustment', quantity: -1, balance_after: 2, reason: 'Ajuste por revisión física', live_id: null, created_by: userId, created_at: hoursAgo(24) },
    { id: '80000000-0000-4000-8000-000000000004', variant_id: v4, kind: 'production', quantity: 10, balance_after: 10, reason: 'Ingreso de taller', live_id: null, created_by: userId, created_at: hoursAgo(24 * 3) },
  ],
}

const vite = spawn(process.execPath, [resolve('node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', '4175', '--strictPort'], {
  cwd: process.cwd(),
  stdio: 'ignore',
  env: {
    ...process.env,
    VITE_SUPABASE_URL: 'https://gbilsdfiizuzhhicnroe.supabase.co',
    VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_manual_illustrative_key_only',
  },
})
let browser
try {
  let ready = false
  for (let attempt = 0; attempt < 60; attempt++) {
    try { ready = (await fetch(baseURL)).ok; if (ready) break } catch { await delay(500) }
  }
  if (!ready) throw new Error('Vite no estuvo disponible para generar las capturas.')
  browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome' })
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 }, deviceScaleFactor: 1 })
  const page = await context.newPage()
  page.setDefaultTimeout(10000)
  await page.addInitScript(({ userId }) => {
    localStorage.setItem('sb-gbilsdfiizuzhhicnroe-auth-token', JSON.stringify({
      access_token: 'manual-fixture-token', refresh_token: 'manual-fixture-refresh-token',
      token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: { id: userId, aud: 'authenticated', role: 'authenticated', email: 'manual@example.invalid', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() },
    }))
  }, { userId })
  await page.route('https://gbilsdfiizuzhhicnroe.supabase.co/**', async route => {
    const url = new URL(route.request().url())
    if (url.pathname.includes('/auth/v1/user')) return route.fulfill({ json: { id: userId, aud: 'authenticated', role: 'authenticated', email: 'manual@example.invalid', user_metadata: {} } })
    if (url.pathname.includes('/auth/v1/')) return route.fulfill({ json: { user: { id: userId }, access_token: 'manual-fixture-token' } })
    if (url.pathname.includes('/rest/v1/rpc/')) {
      const name = url.pathname.split('/').pop()
      const value = name === 'close_live' ? { already_closed: false, pairs: 4, total: 205.6 } : '90000000-0000-4000-8000-000000000001'
      return route.fulfill({ json: value })
    }
    if (url.pathname.includes('/storage/v1/object/sign/')) {
      return route.fulfill({ json: { signedURL: `${url.origin}/storage/v1/object/sign/receipts/demo.svg?token=manual`, path: 'receipts/demo.svg' } })
    }
    if (url.pathname.includes('/storage/v1/object/')) {
      const image = `<svg xmlns="http://www.w3.org/2000/svg" width="700" height="900"><rect width="700" height="900" rx="30" fill="#f1f6ec"/><text x="350" y="130" text-anchor="middle" font-family="sans-serif" font-size="38" fill="#557461">YAPE · DEMOSTRACIÓN</text><rect x="95" y="210" width="510" height="440" rx="22" fill="white"/><text x="350" y="360" text-anchor="middle" font-family="sans-serif" font-size="32" fill="#506b55">Pago recibido</text><text x="350" y="445" text-anchor="middle" font-family="sans-serif" font-weight="bold" font-size="62" fill="#527969">S/ 157.70</text><text x="350" y="520" text-anchor="middle" font-family="sans-serif" font-size="25" fill="#778b73">Imagen de ejemplo sin datos reales</text></svg>`
      return route.fulfill({ status: 200, contentType: 'image/svg+xml', body: image })
    }
    const table = url.pathname.split('/').pop()
    const rows = demo[table]
    if (rows) {
      if (table === 'profiles' && url.searchParams.has('id')) return route.fulfill({ json: rows[0] })
      return route.fulfill({ json: rows })
    }
    return route.fulfill({ status: 404, json: { message: `No fixture for ${url.pathname}` } })
  })
  await page.goto(baseURL)
  await page.getByRole('heading', { name: /Hola, María/ }).waitFor()
  await page.addStyleTag({ content: 'body::after{content:"CAPTURA ILUSTRATIVA · DATOS FICTICIOS";position:fixed;right:14px;top:10px;z-index:99999;background:#304d3f;color:white;font:700 9px system-ui;letter-spacing:1px;padding:6px 9px;border-radius:4px;opacity:.86}' })
  async function capture(name, action) {
    if (action) await action()
    await page.waitForTimeout(220)
    await page.screenshot({ path: resolve(captureDir, name), fullPage: true, animations: 'disabled' })
    console.log(`Captura creada: ${name}`)
  }
  await capture('01-resumen.png')
  await page.getByRole('link', { name: 'Inventario', exact: true }).click()
  await page.getByRole('heading', { name: 'Cada par, en su lugar' }).waitFor()
  await capture('02-inventario.png')
  await capture('03-nuevo-modelo.png', () => page.getByRole('button', { name: 'Nuevo modelo' }).click())
  await page.getByRole('button', { name: 'Cerrar ventana' }).click()
  await capture('04-nueva-variante.png', async () => {
    await page.getByRole('button', { name: 'Variante', exact: true }).click()
    await page.locator('dialog select[name="product"]').selectOption(lunaId)
    await page.locator('dialog input[name="color"]').fill('Menta')
    await page.locator('dialog input[name="size"]').fill('22')
  })
  await page.getByRole('button', { name: 'Cerrar ventana' }).click()
  await capture('05-produccion.png', async () => {
    await page.getByRole('button', { name: '+ Stock', exact: true }).first().click()
    await page.getByLabel('Cantidad de pares').fill('12')
    await page.getByLabel('Motivo').fill('Producción terminada, lote 014')
  })
  await page.getByRole('button', { name: 'Cerrar ventana' }).click()
  await page.getByRole('link', { name: 'Ventas Live' }).click()
  await page.getByRole('heading', { name: 'En vivo, todo bajo control' }).waitFor()
  await capture('06-lives.png')
  await page.goto(`${baseURL}/lives/${liveId}`)
  await page.getByRole('heading', { name: 'Miércoles de pequeños pasos' }).waitFor()
  await capture('07-venta-registrada.png')
  await capture('08-registrar-venta.png', async () => {
    await page.getByRole('button', { name: 'Nueva venta' }).click()
    await page.getByLabel('Cliente o usuario de TikTok').fill('@mama_rosa')
    await page.getByLabel('Agrega los pares de esta venta').fill('BR000000000001')
    await page.getByLabel('Agrega los pares de esta venta').press('Enter')
  })
  await page.getByRole('button', { name: 'Cerrar ventana' }).click()
  await capture('09-cierre-live.png', () => page.getByRole('button', { name: 'Cerrar Live' }).click())
  await page.getByRole('button', { name: 'Volver' }).click()
  await capture('10-anular-venta.png', () => page.getByRole('button', { name: 'Anular' }).first().click())
  await page.getByRole('button', { name: 'Volver' }).click()
  await page.getByRole('link', { name: 'Movimientos' }).click()
  await page.getByRole('heading', { name: 'La historia de cada par' }).waitFor()
  await capture('11-movimientos.png')
  await page.getByRole('link', { name: 'Reportes' }).click()
  await page.getByRole('heading', { name: 'Mira cómo crece tu negocio' }).waitFor()
  await capture('12-reportes.png')
  await page.getByRole('link', { name: 'Etiquetas' }).click()
  await page.getByRole('heading', { name: 'Un escaneo y listo' }).waitFor()
  await page.getByLabel('Copias de BR000000000001').fill('2')
  await page.getByLabel('Copias de BR000000000002').fill('1')
  await capture('13-etiquetas.png')
  await page.getByRole('link', { name: 'Equipo', exact: true }).click()
  await page.getByRole('heading', { name: 'Crecer en equipo' }).waitFor()
  await capture('14-equipo.png')
  const mobile = await context.newPage()
  await mobile.setViewportSize({ width: 390, height: 844 })
  await mobile.addInitScript(({ userId }) => {
    localStorage.setItem('sb-gbilsdfiizuzhhicnroe-auth-token', JSON.stringify({ access_token: 'manual-fixture-token', refresh_token: 'manual-fixture-refresh', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now()/1000)+3600, user: { id: userId, aud: 'authenticated', role: 'authenticated', email: 'manual@example.invalid', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } }))
  }, { userId })
  await mobile.route('https://gbilsdfiizuzhhicnroe.supabase.co/**', async route => {
    const url = new URL(route.request().url())
    if (url.pathname.includes('/auth/v1/')) return route.fulfill({ json: { id: userId, user: { id: userId } } })
    const rows = demo[url.pathname.split('/').pop()]
    if (rows) return route.fulfill({ json: url.pathname.endsWith('/profiles') && url.searchParams.has('id') ? rows[0] : rows })
    if (url.pathname.includes('/rest/v1/rpc/')) return route.fulfill({ json: '90000000-0000-4000-8000-000000000001' })
    return route.fulfill({ status: 404, json: { message: 'Demo fixture' } })
  })
  await mobile.goto(baseURL)
  await mobile.getByRole('heading', { name: /Hola, María/ }).waitFor()
  await mobile.addStyleTag({ content: 'body::after{content:"CAPTURA ILUSTRATIVA · DATOS FICTICIOS";position:fixed;right:5px;top:5px;z-index:99999;background:#304d3f;color:white;font:700 7px system-ui;letter-spacing:.4px;padding:5px;border-radius:4px;opacity:.86}' })
  await mobile.screenshot({ path: resolve(captureDir, '15-resumen-movil.png'), fullPage: true, animations: 'disabled', scale: 'css' })
  console.log('Captura creada: 15-resumen-movil.png')
  await mobile.close()
  const html = await readFile(resolve('docs/manual/index.html'), 'utf8')
  const manualPage = await context.newPage({ viewport: { width: 1100, height: 900 } })
  await manualPage.goto(`${baseURL}/docs/manual/index.html`, { waitUntil: 'networkidle' })
  await manualPage.evaluate(async () => Promise.all(Array.from(document.images, img => img.decode())))
  await manualPage.pdf({ path: pdfPath, format: 'A4', printBackground: true, preferCSSPageSize: true, displayHeaderFooter: true,
    headerTemplate: '<div style="font:8px Arial;color:#82917e;width:100%;padding:0 15mm;display:flex;justify-content:space-between"><span>BABY RONNYS · GUÍA DE USO</span><span>Documento para capacitación</span></div>',
    footerTemplate: '<div style="font:8px Arial;color:#82917e;width:100%;padding:0 15mm;display:flex;justify-content:space-between"><span>Capturas ilustrativas con datos ficticios</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>',
    margin: { top: '19mm', bottom: '19mm', left: '14mm', right: '14mm' } })
  console.log(`PDF listo: ${pdfPath}`)
  console.log(`Capturas: ${Object.keys(demo).length} conjuntos de datos ficticios; ${html.length} caracteres de manual.`)
  await manualPage.close()
  await context.close()
} finally {
  await browser?.close()
  vite.kill('SIGTERM')
}
