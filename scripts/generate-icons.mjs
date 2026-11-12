import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'
// Rasterización determinista del monograma de la aplicación. Sin recursos remotos.
function crc32(bytes) {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let n = 0; n < 8; n++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
  }
  return (crc ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const name = Buffer.from(type)
  const size = Buffer.alloc(4)
  size.writeUInt32BE(data.length)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])))
  return Buffer.concat([size, name, data, crc])
}
for (const size of [192, 512]) {
  const pixels = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const px = (x / size) * 192
      const py = (y / size) * 192
      const outer =
        (px >= 50 && px <= 73 && py >= 58 && py <= 141) ||
        ((px - 88) ** 2 / 38 ** 2 + (py - 81) ** 2 / 23 ** 2 < 1 && px >= 68) ||
        ((px - 91) ** 2 / 42 ** 2 + (py - 119) ** 2 / 24 ** 2 < 1 && px >= 68)
      const inner =
        (px >= 73 && px <= 92 && py >= 74 && py <= 89) ||
        (px >= 73 && px <= 99 && py >= 111 && py <= 127)
      const dot = (px - 143) ** 2 + (py - 54) ** 2 < 13 ** 2
      const color = dot ? [232, 185, 159] : outer && !inner ? [255, 248, 237] : [82, 121, 105]
      const offset = y * (size * 4 + 1) + 1 + x * 4
      pixels.set([...color, 255], offset)
    }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(pixels)),
    chunk('IEND', Buffer.alloc(0)),
  ])
  writeFileSync(`public/icon-${size}.png`, png)
  console.log(`Icono ${size}×${size} generado`)
}
