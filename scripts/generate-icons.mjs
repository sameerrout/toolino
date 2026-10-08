/**
 * Generates the static raster assets the site needs.
 *
 * Run with:  node scripts/generate-icons.mjs
 *
 * Produces, into `public/`:
 *   favicon.svg            the mark on its own (checked in as source)
 *   icon-192.png           Android / manifest
 *   icon-512.png           PWA install prompt, Organization JSON-LD logo
 *   icon-maskable-512.png  Android adaptive icon with safe-zone padding
 *   apple-icon.png         180x180 iOS home screen
 *   og-default.png         1200x630 social preview card
 *
 * Everything is rasterised here rather than committed as opaque binaries, so the
 * brand mark can be edited in one place. Pure Node: a tiny PNG encoder built on
 * `zlib`, so there is no image dependency to install and nothing to run at build
 * time on the server.
 */

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC_DIR = join(ROOT, 'public');

// ---------------------------------------------------------------- PNG encoder

/** CRC32 for PNG chunks. */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

/**
 * Encodes an RGBA pixel buffer as a PNG.
 * @param {number} width
 * @param {number} height
 * @param {Uint8Array} rgba length must be width * height * 4
 */
function encodePng(width, height, rgba) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // bit depth
  ihdr.writeUInt8(6, 9); // colour type: RGBA
  ihdr.writeUInt8(0, 10); // deflate
  ihdr.writeUInt8(0, 11); // adaptive filtering
  ihdr.writeUInt8(0, 12); // no interlace

  // One filter byte (0 = none) per scanline.
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + y * stride, stride).copy(
      raw,
      y * (stride + 1) + 1
    );
  }

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// --------------------------------------------------------------- tiny raster

class Raster {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.data = new Uint8Array(width * height * 4);
  }

  /** Alpha-composites one pixel. */
  blend(x, y, [r, g, b], alpha) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    if (alpha <= 0) return;
    const a = Math.min(1, alpha);
    const index = (y * this.width + x) * 4;
    const dstA = this.data[index + 3] / 255;
    const outA = a + dstA * (1 - a);
    if (outA <= 0) return;
    this.data[index] = Math.round((r * a + this.data[index] * dstA * (1 - a)) / outA);
    this.data[index + 1] = Math.round((g * a + this.data[index + 1] * dstA * (1 - a)) / outA);
    this.data[index + 2] = Math.round((b * a + this.data[index + 2] * dstA * (1 - a)) / outA);
    this.data[index + 3] = Math.round(outA * 255);
  }

  /** Fills the whole canvas. */
  fill(color) {
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) this.blend(x, y, color, 1);
    }
  }

  /** Antialiased rounded rectangle. */
  roundedRect(x0, y0, w, h, radius, color, alpha = 1) {
    const r = Math.min(radius, w / 2, h / 2);
    for (let y = Math.floor(y0); y < Math.ceil(y0 + h); y += 1) {
      for (let x = Math.floor(x0); x < Math.ceil(x0 + w); x += 1) {
        const dx = Math.max(x0 + r - x, 0, x - (x0 + w - r - 1));
        const dy = Math.max(y0 + r - y, 0, y - (y0 + h - r - 1));
        const distance = Math.hypot(dx, dy);
        const coverage = distance <= r - 1 ? 1 : distance >= r + 1 ? 0 : (r + 1 - distance) / 2;
        if (coverage > 0) this.blend(x, y, color, coverage * alpha);
      }
    }
  }

  /** Antialiased filled circle. */
  circle(cx, cy, radius, color, alpha = 1) {
    for (let y = Math.floor(cy - radius - 1); y <= Math.ceil(cy + radius + 1); y += 1) {
      for (let x = Math.floor(cx - radius - 1); x <= Math.ceil(cx + radius + 1); x += 1) {
        const distance = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        const coverage =
          distance <= radius - 1 ? 1 : distance >= radius + 1 ? 0 : (radius + 1 - distance) / 2;
        if (coverage > 0) this.blend(x, y, color, coverage * alpha);
      }
    }
  }

  /** Thick line segment with round caps. */
  line(x1, y1, x2, y2, width, color, alpha = 1) {
    const steps = Math.ceil(Math.hypot(x2 - x1, y2 - y1) * 2) + 1;
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      this.circle(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, width / 2, color, alpha);
    }
  }
}

// ------------------------------------------------------------ 5x7 bitmap font

const GLYPHS = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '11110', '10001', '10001', '10001', '11110'],
  C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '11110', '10000', '10000', '10000', '11111'],
  F: ['11111', '10000', '11110', '10000', '10000', '10000', '10000'],
  G: ['01111', '10000', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '11111', '10001', '10001', '10001', '10001'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  J: ['00111', '00010', '00010', '00010', '10010', '10010', '01100'],
  K: ['10001', '10010', '11100', '10100', '10010', '10001', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00110', '01000', '10000', '11111'],
  '3': ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
  '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
  '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
  ',': ['00000', '00000', '00000', '00000', '01100', '00100', '01000'],
  ':': ['00000', '01100', '01100', '00000', '01100', '01100', '00000'],
  '\u2019': ['01100', '00100', '01000', '00000', '00000', '00000', '00000'],
};

/** Measures text drawn at a given pixel height. */
function measureText(text, height) {
  const scale = Math.max(1, Math.round(height / 7));
  return text.length * 6 * scale - scale;
}

/**
 * Draws text with the 5x7 bitmap font above.
 * Returns the width drawn.
 */
function drawText(raster, text, x, y, height, color, alpha = 1) {
  const scale = Math.max(1, Math.round(height / 7));
  let cursor = x;

  for (const rawChar of text.toUpperCase()) {
    const glyph = GLYPHS[rawChar] ?? GLYPHS['?'] ?? GLYPHS[' '];
    if (!glyph) continue;
    for (let row = 0; row < glyph.length; row += 1) {
      const line = glyph[row];
      for (let column = 0; column < line.length; column += 1) {
        if (line[column] !== '1') continue;
        raster.roundedRect(
          cursor + column * scale,
          y + row * scale,
          scale,
          scale,
          scale / 3,
          color,
          alpha
        );
      }
    }
    cursor += 6 * scale;
  }

  return cursor - x;
}

// ------------------------------------------------------------------- artwork

const BRAND_PRIMARY = [31, 71, 214];
const BRAND_LIGHT = [188, 211, 255];
const INK = [15, 23, 42];
const WHITE = [255, 255, 255];

/**
 * Draws the ToolForForever mark: a document with a folded corner and a padlock,
 * matching `src/components/layout/Logo.tsx`.
 */
function drawMark(raster, size, offsetX = 0, offsetY = 0) {
  const unit = size / 32;
  const px = (value) => offsetX + value * unit;
  const py = (value) => offsetY + value * unit;
  const s = (value) => value * unit;

  // Document body.
  raster.roundedRect(px(8.5), py(8), s(15), s(16), s(1.2), WHITE, 0.97);
  // Folded corner.
  raster.roundedRect(px(18), py(8), s(5.5), s(5.5), s(0.6), BRAND_LIGHT);
  // Text lines.
  raster.roundedRect(px(11.5), py(14.7), s(5), s(1.7), s(0.85), BRAND_PRIMARY, 0.55);
  raster.roundedRect(px(11.5), py(18), s(8.5), s(1.7), s(0.85), BRAND_PRIMARY, 0.34);

  // Padlock: a dark disc, a white shackle arc on top, and a white body below.
  raster.circle(px(22), py(22), s(4.6), INK);
  // Shackle, drawn as a stroked arc above the body.
  const arcCx = px(22);
  const arcCy = py(22.5);
  const arcR = s(2.1);
  const steps = 40;
  for (let i = 0; i <= steps; i += 1) {
    const angle = Math.PI + (Math.PI * i) / steps; // 180deg -> 360deg
    raster.circle(
      arcCx + Math.cos(angle) * arcR,
      arcCy + Math.sin(angle) * arcR,
      s(0.62),
      WHITE
    );
  }
  // Lock body.
  raster.roundedRect(px(19.4), py(21.9), s(5.2), s(3.6), s(0.8), WHITE);
  // Keyhole.
  raster.circle(px(22), py(23.4), s(0.55), INK);
}

/** Square app icon on the brand colour. */
function renderIcon(size, { maskable = false } = {}) {
  const raster = new Raster(size, size);
  const radius = maskable ? 0 : size * 0.22;
  raster.roundedRect(0, 0, size, size, radius, BRAND_PRIMARY);

  // Maskable icons need everything inside a 40% radius safe zone.
  const markSize = maskable ? size * 0.56 : size * 0.74;
  const offset = (size - markSize) / 2;
  drawMark(raster, markSize, offset, offset);

  return raster;
}

/** 1200x630 social preview card. */
function renderOgImage() {
  const width = 1200;
  const height = 630;
  const raster = new Raster(width, height);

  // Background: brand colour with a subtle vertical darkening.
  for (let y = 0; y < height; y += 1) {
    const t = y / height;
    const color = [
      Math.round(BRAND_PRIMARY[0] * (1 - t * 0.4)),
      Math.round(BRAND_PRIMARY[1] * (1 - t * 0.4)),
      Math.round(BRAND_PRIMARY[2] * (1 - t * 0.24)),
    ];
    for (let x = 0; x < width; x += 1) raster.blend(x, y, color, 1);
  }

  const margin = 80;

  // Mark, top left.
  drawMark(raster, 168, margin, 68);

  // Wordmark beside the mark.
  drawText(raster, 'TOOLFORFOREVER', margin + 200, 104, 54, WHITE);

  // Sub-line under the wordmark.
  drawText(raster, 'FREE BROWSER TOOLS', margin + 202, 176, 20, BRAND_LIGHT, 0.95);

  // Headline.
  drawText(raster, 'YOUR FILES NEVER', margin, 320, 44, WHITE);
  drawText(raster, 'LEAVE YOUR DEVICE', margin, 382, 44, WHITE);

  // Divider.
  raster.roundedRect(margin, 462, 1040, 3, 1.5, BRAND_LIGHT, 0.4);

  // Trust strip: one centred row so nothing can collide at any glyph width.
  const claims = ['NO UPLOADS', 'NO ACCOUNT', 'NO WATERMARK', 'PDF IMAGE ZIP'];
  const claimHeight = 14;
  const gap = 34;
  const widths = claims.map((claim) => measureText(claim, claimHeight));
  const totalWidth = widths.reduce((sum, value) => sum + value, 0) + gap * (claims.length - 1);
  let cursorX = margin + (1040 - totalWidth) / 2;

  claims.forEach((claim, index) => {
    // Small bullet between items.
    if (index > 0) {
      raster.circle(cursorX - gap / 2, 500 + claimHeight / 2 - 1, 2.2, BRAND_LIGHT, 0.75);
    }
    drawText(raster, claim, cursorX, 500, claimHeight, WHITE, 0.92);
    cursorX += (widths[index] ?? 0) + gap;
  });

  // Bottom accent bar.
  raster.roundedRect(margin, 556, 1040, 6, 3, BRAND_LIGHT, 0.55);

  return raster;
}

// --------------------------------------------------------------------- output

mkdirSync(PUBLIC_DIR, { recursive: true });

const outputs = [
  ['icon-192.png', renderIcon(192)],
  ['icon-512.png', renderIcon(512)],
  ['icon-maskable-512.png', renderIcon(512, { maskable: true })],
  ['apple-icon.png', renderIcon(180)],
  ['og-default.png', renderOgImage()],
];

for (const [name, raster] of outputs) {
  const png = encodePng(raster.width, raster.height, raster.data);
  writeFileSync(join(PUBLIC_DIR, name), png);
  console.log(
    `wrote public/${name}  ${raster.width}x${raster.height}  ${(png.length / 1024).toFixed(1)} KB`
  );
}

console.log('\nDone. favicon.svg is checked in as source; everything else is generated.');
