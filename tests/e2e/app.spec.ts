import { expect, test } from '@playwright/test'
// Fixtures exclusivas de pruebas. La app de producción siempre usa Supabase real.
const userId = '00000000-0000-4000-8000-000000000001'
const productId = '10000000-0000-4000-8000-000000000001'
const variantId = '20000000-0000-4000-8000-000000000001'
const liveId = '30000000-0000-4000-8000-000000000001'
const fixtures: Record<string, unknown[]> = {
  profiles: [{ id: userId, display_name: 'Ronny', role: 'admin', active: true }],
  products: [
    {
      id: productId,
      sku: 'BR-LUNA',
      name: 'Luna',
      base_price: 49.9,
      active: true,
      created_at: '2026-11-11T15:00:00Z',
    },
  ],
  variants: [
    {
      id: variantId,
      product_id: productId,
      color: 'Crema',
      size: 18,
      barcode: 'BR000000000001',
      stock: 10,
      minimum_stock: 3,
    },
  ],
  lives: [
    {
      id: liveId,
      name: 'Miércoles de pequeños pasos',
      status: 'open',
      created_by: userId,
      created_at: '2026-11-11T15:00:00Z',
      closed_at: null,
    },
  ],
  sales: [],
  sale_items: [],
  receipts: [],
  stock_movements: [],
}
test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    ({ userId }) => {
      localStorage.setItem(
        'sb-qa-auth-token',
        JSON.stringify({
          access_token: 'test-token',
          refresh_token: 'test-refresh',
          token_type: 'bearer',
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          user: {
            id: userId,
            aud: 'authenticated',
            role: 'authenticated',
            email: 'qa@example.test',
            app_metadata: {},
            user_metadata: {},
            created_at: '2026-11-11T00:00:00Z',
          },
        }),
      )
    },
    { userId },
  )
  await page.route('https://qa.supabase.co/**', async (route) => {
    const url = new URL(route.request().url())
    const table = url.pathname.split('/').pop()!
    if (url.pathname.includes('/auth/')) return route.fulfill({ json: { user: { id: userId } } })
    const rows = fixtures[table]
    if (rows) return route.fulfill({ json: table === 'profiles' ? rows[0] : rows })
    if (url.pathname.includes('/rpc/'))
      return route.fulfill({ json: '40000000-0000-4000-8000-000000000001' })
    return route.fulfill({ status: 404, json: { message: 'Endpoint no declarado en la prueba' } })
  })
})
test('muestra el resumen y permite navegar al inventario sin desbordar la pantalla', async ({
  page,
  isMobile,
}, testInfo) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Hola, Ronny' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Así van tus ventas' })).toBeVisible()
  const overflow = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    viewport: document.documentElement.clientWidth,
    elements: Array.from(document.querySelectorAll('body *'))
      .filter((el) => {
        const rect = el.getBoundingClientRect()
        return (
          rect.right > document.documentElement.clientWidth + 1 &&
          rect.width > 0 &&
          getComputedStyle(el).position !== 'fixed'
        )
      })
      .slice(0, 20)
      .map((el) => ({
        tag: el.tagName,
        class: el.className,
        right: el.getBoundingClientRect().right,
      })),
  }))
  expect(overflow.width, JSON.stringify(overflow)).toBeLessThanOrEqual(overflow.viewport)
  await page.screenshot({
    path: testInfo.outputPath('dashboard.png'),
    fullPage: true,
    scale: 'css',
  })
  if (isMobile) await page.getByRole('button', { name: 'Abrir menú' }).click()
  await page.getByRole('link', { name: 'Inventario', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Cada par, en su lugar' })).toBeVisible()
  await expect(page.getByText('BR000000000001 · BR-LUNA')).toBeVisible()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true)
})
test('busca un código, agrega una venta y envía su precio histórico con idempotencia', async ({
  page,
}) => {
  await page.goto(`/lives/${liveId}`)
  await page.getByRole('button', { name: 'Nueva venta' }).click()
  await page.getByLabel('Cliente o usuario de TikTok').fill('@maria')
  await page.getByLabel('Agrega los pares de esta venta').fill('BR000000000001')
  await page.getByLabel('Agrega los pares de esta venta').press('Enter')
  await expect(page.getByText('Total de la venta')).toBeVisible()
  const request = page.waitForRequest((r) => r.url().includes('/rpc/create_sale'))
  await page.getByRole('button', { name: 'Guardar venta' }).click()
  const body = (await request).postDataJSON()
  expect(body.p_buyer).toBe('@maria')
  expect(body.p_items).toEqual([{ variant_id: variantId, quantity: 1, unit_price: 49.9 }])
  expect(body.p_request_id).toMatch(/^[0-9a-f-]{36}$/)
  await expect(page.getByRole('dialog')).toHaveCount(0)
})
test('genera etiquetas Code 128 y abre el formulario de producción', async ({ page }) => {
  await page.goto('/etiquetas')
  await page.getByLabel('Copias de BR000000000001').fill('2')
  await expect(page.getByRole('img', { name: 'Código de barras BR000000000001' })).toHaveCount(2)
  await expect(page.getByRole('button', { name: 'Imprimir 2 etiquetas' })).toBeEnabled()
  await page.goto('/inventario')
  await page.getByRole('button', { name: '+ Stock', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Registrar movimiento de stock' })).toBeVisible()
})
test('un fallo de carga ofrece reintentar y no inventa registros', async ({ page }) => {
  await page.route('https://qa.supabase.co/rest/v1/products**', (route) =>
    route.fulfill({ status: 500, json: { message: 'Base no disponible' } }),
  )
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'No se pudieron cargar los datos' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Reintentar conexión' })).toBeVisible()
})
