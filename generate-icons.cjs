const { deflateSync } = require('zlib')
const fs = require('fs')
const path = require('path')

const CRC_TABLE = (() => {
  const t = new Int32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
    t[i] = c
  }
  return t
})()

function crc32(buf) {
  let crc = 0xFFFFFFFF
  for (const b of buf) crc = CRC_TABLE[(crc ^ b) & 0xFF] ^ (crc >>> 8)
  return (crc ^ 0xFFFFFFFF) >>> 0
}

function encodePNG(w, h, rgba) {
  const raw = Buffer.alloc(h * (1 + w * 4))
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 4)] = 0
    for (let x = 0; x < w; x++) {
      const s = (y * w + x) * 4, d = y * (1 + w * 4) + 1 + x * 4
      raw[d] = rgba[s]; raw[d + 1] = rgba[s + 1]; raw[d + 2] = rgba[s + 2]; raw[d + 3] = rgba[s + 3]
    }
  }
  const idat = deflateSync(raw, { level: 9 })
  function chunk(type, data) {
    const l = Buffer.alloc(4); l.writeUInt32BE(data.length)
    const t = Buffer.from(type)
    const c = Buffer.alloc(4); c.writeUInt32BE(crc32(Buffer.concat([t, data])))
    return Buffer.concat([l, t, data, c])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w); ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8; ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))
  ])
}

function makeIcon(size) {
  const N = 4
  const S = size * N
  const buf = new Float32Array(S * S * 4)

  // Rounded rect background #1A1A1A
  const r = S * 0.22
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      let cx = -1, cy = -1
      if (x < r && y < r) { cx = r; cy = r }
      else if (x > S - 1 - r && y < r) { cx = S - 1 - r; cy = r }
      else if (x < r && y > S - 1 - r) { cx = r; cy = S - 1 - r }
      else if (x > S - 1 - r && y > S - 1 - r) { cx = S - 1 - r; cy = S - 1 - r }

      if (cx >= 0) {
        const dx = x - cx, dy = y - cy
        if (dx * dx + dy * dy > r * r) continue
      }

      const i = (y * S + x) * 4
      buf[i] = 26 / 255; buf[i + 1] = 26 / 255; buf[i + 2] = 26 / 255; buf[i + 3] = 1
    }
  }

  // Draw "M" in #ECEADE
  const fR = 236 / 255, fG = 234 / 255, fB = 222 / 255

  const lx = S * 0.18
  const ly = S * 0.185
  const lw = S * 0.64
  const lh = S * 0.63
  const sw = lw * 0.175
  const midY = ly + lh * 0.47

  // Fill trapezoid: (tlx,ty)-(trx,ty) top edge, (blx,by)-(brx,by) bottom edge
  function fillTrap(tlx, ty, trx, blx, by, brx) {
    const y0 = Math.floor(ty), y1 = Math.ceil(by)
    for (let y = y0; y <= y1; y++) {
      const t = by > ty ? Math.max(0, Math.min(1, (y - ty) / (by - ty))) : 0
      const xl = tlx + (blx - tlx) * t
      const xr = trx + (brx - trx) * t
      for (let x = Math.floor(xl); x <= Math.ceil(xr); x++) {
        if (x < 0 || x >= S || y < 0 || y >= S) continue
        const i = (y * S + x) * 4
        buf[i] = fR; buf[i + 1] = fG; buf[i + 2] = fB; buf[i + 3] = 1
      }
    }
  }

  // Left vertical bar
  fillTrap(lx, ly, lx + sw, lx, ly + lh, lx + sw)
  // Right vertical bar
  fillTrap(lx + lw - sw, ly, lx + lw, lx + lw - sw, ly + lh, lx + lw)
  // Left diagonal
  fillTrap(lx + sw, ly, lx + sw * 2, lx + lw / 2 - sw / 2, midY, lx + lw / 2 + sw / 2)
  // Right diagonal
  fillTrap(lx + lw - sw * 2, ly, lx + lw - sw, lx + lw / 2 - sw / 2, midY, lx + lw / 2 + sw / 2)

  // Downsample N×N → 1×1
  const out = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0
      for (let dy = 0; dy < N; dy++) {
        for (let dx = 0; dx < N; dx++) {
          const i = ((y * N + dy) * S + (x * N + dx)) * 4
          r += buf[i]; g += buf[i + 1]; b += buf[i + 2]; a += buf[i + 3]
        }
      }
      const n = N * N, i = (y * size + x) * 4
      out[i] = Math.round(r / n * 255)
      out[i + 1] = Math.round(g / n * 255)
      out[i + 2] = Math.round(b / n * 255)
      out[i + 3] = Math.round(a / n * 255)
    }
  }
  return encodePNG(size, size, out)
}

const pub = path.join(__dirname, 'public')
fs.writeFileSync(path.join(pub, 'icon-192.png'), makeIcon(192))
fs.writeFileSync(path.join(pub, 'icon-512.png'), makeIcon(512))
fs.writeFileSync(path.join(pub, 'apple-touch-icon.png'), makeIcon(180))
console.log('Icons generated with M lettermark')
