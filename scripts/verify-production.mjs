import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { resolve, extname, sep } from 'node:path'
import { once } from 'node:events'
import { chromium, expect } from '@playwright/test'
import assert from 'node:assert/strict'

const root = resolve('dist')
const types = {
  '.js': 'text/javascript',
  '.html': 'text/html',
  '.css': 'text/css',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
}
const headerFile = await readFile(resolve(root, '_headers'), 'utf8')
const headers = Object.fromEntries(
  headerFile
    .split(/\r?\n/)
    .filter((line) => line.startsWith('  '))
    .map((line) => {
      const colon = line.indexOf(':')
      return [line.slice(0, colon).trim(), line.slice(colon + 1).trim()]
    }),
)
const server = createServer(async (request, response) => {
  try {
    let file = resolve(root, '.' + new URL(request.url, 'http://localhost').pathname)
    if (file !== root && !file.startsWith(root + sep)) {
      response.writeHead(403)
      response.end()
      return
    }
    if (file === root || !(await stat(file).catch(() => null))?.isFile())
      file = resolve(root, 'index.html')
    response.writeHead(200, {
      ...headers,
      'Content-Type': types[extname(file)] ?? 'application/octet-stream',
    })
    response.end(await readFile(file))
  } catch {
    response.writeHead(500)
    response.end('No se pudo servir el build')
  }
})
server.listen(0, '127.0.0.1')
await once(server, 'listening')
const address = server.address()
const base = `http://127.0.0.1:${address.port}`
let browser
try {
  browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL })
  const context = await browser.newContext()
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  const response = await page.goto(base)
  assert.equal(response.status(), 200)
  assert.ok(response.headers()['content-security-policy'])
  await expect(page.getByRole('heading').first()).toBeVisible()
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await page.reload()
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null)
  const manifest = await (await context.request.get(`${base}/manifest.webmanifest`)).json()
  assert.equal(manifest.display, 'standalone')
  for (const icon of manifest.icons) {
    const bytes = await (await context.request.get(base + icon.src)).body()
    assert.equal(bytes.readUInt32BE(16), Number(icon.sizes.split('x')[0]))
  }
  await context.setOffline(true)
  await page.goto(`${base}/inventario`)
  await expect(page.getByRole('heading').first()).toBeVisible()
  assert.deepEqual(errors, [])
  console.log(
    'OK: build servido con CSP, manifest, iconos PNG, service worker y shell navegable sin conexión.',
  )
} finally {
  await browser?.close()
  await new Promise((resolve) => server.close(resolve))
}
