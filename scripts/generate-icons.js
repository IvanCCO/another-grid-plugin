/**
 * Generates the extension icons: an orange grid tile.
 * Uses only built-in Node.js modules (zlib, fs, path) — no extra dependencies.
 *
 * The design mirrors public/assets/grid.svg: a rounded square with grid lines.
 * Rendered as RGBA PNGs with transparency and supersampled anti-aliasing.
 *
 * Output: icons/icon-16.png, icons/icon-48.png, icons/icon-128.png
 */

'use strict';

const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

// Orange grid tile (#F97316 — vivid orange) with white grid lines.
const ORANGE = [0xf9, 0x71, 0x16];
const LINE = [0xff, 0xff, 0xff];

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
 * Returns true when point (px, py) is inside a rounded rectangle.
 * Coordinates and radius are in the same unit space.
 */
function inRoundedRect(px, py, x0, y0, x1, y1, rad) {
  if (px < x0 || px > x1 || py < y0 || py > y1) return false;

  // Corner regions: distance to the corner arc centre must be <= rad.
  const nx = px < x0 + rad ? x0 + rad : px > x1 - rad ? x1 - rad : px;
  const ny = py < y0 + rad ? y0 + rad : py > y1 - rad ? y1 - rad : py;
  const dx = px - nx;
  const dy = py - ny;
  return dx * dx + dy * dy <= rad * rad;
}

/**
 * Computes the RGBA colour for a normalised point (fx, fy) in [0, 1].
 * Returns [r, g, b, a].
 */
function samplePixel(fx, fy) {
  const margin = 0.06;
  const x0 = margin;
  const y0 = margin;
  const x1 = 1 - margin;
  const y1 = 1 - margin;
  const radius = 0.2;

  if (!inRoundedRect(fx, fy, x0, y0, x1, y1, radius)) {
    return [0, 0, 0, 0];
  }

  // Grid lines split the tile into a 3x3 grid (two internal lines each way).
  const span = x1 - x0;
  const halfThickness = 0.015;
  for (let i = 1; i <= 2; i++) {
    const lineX = x0 + (span * i) / 3;
    const lineY = y0 + (span * i) / 3;
    if (Math.abs(fx - lineX) < halfThickness) return [...LINE, 255];
    if (Math.abs(fy - lineY) < halfThickness) return [...LINE, 255];
  }

  return [...ORANGE, 255];
}

/**
 * Creates an RGBA PNG buffer for the grid icon at the given size,
 * using SS x SS supersampling for smooth edges.
 */
function createIconPNG(size) {
  const SS = 4;
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR: RGBA (colour type 6), 8-bit depth.
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const bytesPerRow = 1 + size * 4;
  const raw = Buffer.allocUnsafe(size * bytesPerRow);

  for (let y = 0; y < size; y++) {
    const rowOffset = y * bytesPerRow;
    raw[rowOffset] = 0; // filter type: None
    for (let x = 0; x < size; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;

      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const fx = (x + (sx + 0.5) / SS) / size;
          const fy = (y + (sy + 0.5) / SS) / size;
          const [pr, pg, pb, pa] = samplePixel(fx, fy);
          // Premultiply by alpha so colour edges blend correctly.
          const alpha = pa / 255;
          r += pr * alpha;
          g += pg * alpha;
          b += pb * alpha;
          a += pa;
        }
      }

      const samples = SS * SS;
      const avgA = a / samples;
      const px = rowOffset + 1 + x * 4;
      if (avgA === 0) {
        raw[px] = 0;
        raw[px + 1] = 0;
        raw[px + 2] = 0;
        raw[px + 3] = 0;
      } else {
        // Un-premultiply to recover straight-alpha colour.
        const alphaSum = a / 255;
        raw[px] = Math.round(r / alphaSum);
        raw[px + 1] = Math.round(g / alphaSum);
        raw[px + 2] = Math.round(b / alphaSum);
        raw[px + 3] = Math.round(avgA);
      }
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
  const png = createIconPNG(size);
  const outPath = path.join(iconsDir, `icon-${size}.png`);
  fs.writeFileSync(outPath, png);
  console.log(`  created ${outPath}`);
}

console.log('Icons generated.');
