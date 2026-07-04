/**
 * Generates simple solid-colour PNG icons for the extension.
 * Uses only built-in Node.js modules (zlib, fs, path) — no extra dependencies.
 *
 * Output: icons/icon-16.png, icons/icon-48.png, icons/icon-128.png
 */

'use strict';

const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

// Bookmark-blue colour (#1D9BF0 — X's brand blue)
const R = 0x1d;
const G = 0x9b;
const B = 0xf0;

/** CRC32 implementation (as specified in the PNG standard). */
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

/** Wraps data in a PNG chunk (length + type + data + CRC). */
function makeChunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const lengthBuffer = Buffer.allocUnsafe(4);
  lengthBuffer.writeUInt32BE(data.length, 0);
  const crcValue = crc32(Buffer.concat([typeBuffer, data]));
  const crcBuffer = Buffer.allocUnsafe(4);
  crcBuffer.writeUInt32BE(crcValue, 0);
  return Buffer.concat([lengthBuffer, typeBuffer, data, crcBuffer]);
}

/**
 * Creates a minimal valid PNG buffer containing a solid-colour square.
 * @param {number} size - Width and height in pixels.
 * @param {number} r - Red channel (0-255).
 * @param {number} g - Green channel (0-255).
 * @param {number} b - Blue channel (0-255).
 */
function createPNG(size, r, g, b) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(size, 0);  // width
  ihdr.writeUInt32BE(size, 4);  // height
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type: truecolor RGB
  ihdr[10] = 0; // compression method
  ihdr[11] = 0; // filter method
  ihdr[12] = 0; // interlace method

  // Raw (uncompressed) image data: one filter byte (0 = None) per row + RGB pixels
  const bytesPerRow = 1 + size * 3;
  const raw = Buffer.allocUnsafe(size * bytesPerRow);
  for (let y = 0; y < size; y++) {
    const rowOffset = y * bytesPerRow;
    raw[rowOffset] = 0; // filter type: None
    for (let x = 0; x < size; x++) {
      const px = rowOffset + 1 + x * 3;
      raw[px]     = r;
      raw[px + 1] = g;
      raw[px + 2] = b;
    }
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

const iconsDir = path.join(__dirname, '..', 'icons');
fs.mkdirSync(iconsDir, { recursive: true });

for (const size of [16, 48, 128]) {
  const png = createPNG(size, R, G, B);
  const outPath = path.join(iconsDir, `icon-${size}.png`);
  fs.writeFileSync(outPath, png);
  console.log(`  created ${outPath}`);
}

console.log('Icons generated.');
