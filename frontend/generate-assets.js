/**
 * Generates valid placeholder PNG assets for KaamWala.
 * Run: node generate-assets.js
 */
const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// CRC32 implementation (no external deps)
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function makeChunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crcBuf]);
}

function createPNG(width, height, r, g, b) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB

  // Build raw scanlines
  const row = Buffer.alloc(1 + width * 3);
  row[0] = 0; // filter: None
  for (let x = 0; x < width; x++) {
    row[1 + x * 3]     = r;
    row[1 + x * 3 + 1] = g;
    row[1 + x * 3 + 2] = b;
  }
  const rows = [];
  for (let y = 0; y < height; y++) rows.push(row);
  const raw = Buffer.concat(rows);
  const compressed = zlib.deflateSync(raw, { level: 1 });

  return Buffer.concat([
    sig,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

const OUT = path.join(__dirname, 'assets');

// KaamWala orange: #FF6B35  →  R=255 G=107 B=53
const ORANGE = [255, 107, 53];
// White for notification icon
const WHITE  = [255, 255, 255];

const assets = [
  { file: 'icon.png',              w: 1024, h: 1024, color: ORANGE },
  { file: 'adaptive-icon.png',     w: 1024, h: 1024, color: ORANGE },
  { file: 'splash.png',            w: 1242, h: 2436, color: ORANGE },
  { file: 'notification-icon.png', w:   96, h:   96, color: WHITE  },
  { file: 'favicon.png',           w:   64, h:   64, color: ORANGE },
];

for (const { file, w, h, color } of assets) {
  const buf = createPNG(w, h, ...color);
  fs.writeFileSync(path.join(OUT, file), buf);
  console.log(`✔ ${file} (${w}×${h})`);
}
console.log('\nAll assets generated. You can now replace them with real branded images.');
