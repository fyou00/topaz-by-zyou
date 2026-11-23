#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(HERE, '../public/luts');
const SIZE = 64;
const TILES = 8; // 8 * 8 = 64 slices -> 512 x 512 PNG
const WIDTH = SIZE * TILES;
const HEIGHT = SIZE * TILES;

// Precomputed CRC32 table for valid lossless PNG chunk checksums.
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  CRC_TABLE[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function encodeRGBAtoPNG(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (stride + 1);
    raw[rowStart] = 0; // filter type 0 (None)
    rgba.copy(raw, rowStart + 1, y * stride, (y + 1) * stride);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const compressed = zlib.deflateSync(raw, { level: 6 });
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const mix = (a, b, t) => a + (b - a) * t;
const smoothstep = (e0, e1, x) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};

function gradeColor(r, g, b, cfg) {
  let cr = r;
  let cg = g;
  let cb = b;

  // Lift, gamma, gain per channel
  const lift = cfg.lift ?? 0;
  const gain = cfg.gain ?? 1;
  const gamma = cfg.gamma ?? 1;
  cr = clamp01(Math.pow(clamp01(cr * gain + lift), 1 / gamma));
  cg = clamp01(Math.pow(clamp01(cg * gain + lift), 1 / gamma));
  cb = clamp01(Math.pow(clamp01(cb * gain + lift), 1 / gamma));

  // S-curve contrast around 0.5 pivot
  if (cfg.contrast && cfg.contrast !== 1) {
    const p = cfg.pivot ?? 0.5;
    cr = clamp01((cr - p) * cfg.contrast + p);
    cg = clamp01((cg - p) * cfg.contrast + p);
    cb = clamp01((cb - p) * cfg.contrast + p);
  }

  // Split tone shadows and highlights
  const lum = 0.2126 * cr + 0.7152 * cg + 0.0722 * cb;
  if (cfg.shadowTint) {
    const sw = (1 - smoothstep(0.05, 0.55, lum)) * (cfg.shadowStrength ?? 0.16);
    cr = mix(cr, clamp01(cr * cfg.shadowTint[0]), sw);
    cg = mix(cg, clamp01(cg * cfg.shadowTint[1]), sw);
    cb = mix(cb, clamp01(cb * cfg.shadowTint[2]), sw);
  }
  if (cfg.highlightTint) {
    const hw = smoothstep(0.42, 0.95, lum) * (cfg.highlightStrength ?? 0.16);
    cr = mix(cr, clamp01(cr * cfg.highlightTint[0]), hw);
    cg = mix(cg, clamp01(cg * cfg.highlightTint[1]), hw);
    cb = mix(cb, clamp01(cb * cfg.highlightTint[2]), hw);
  }

  // Channel balance
  if (cfg.balance) {
    cr = clamp01(cr * cfg.balance[0]);
    cg = clamp01(cg * cfg.balance[1]);
    cb = clamp01(cb * cfg.balance[2]);
  }

  // Saturation adjustment
  if (cfg.saturation && cfg.saturation !== 1) {
    const l = 0.2126 * cr + 0.7152 * cg + 0.0722 * cb;
    cr = clamp01(mix(l, cr, cfg.saturation));
    cg = clamp01(mix(l, cg, cfg.saturation));
    cb = clamp01(mix(l, cb, cfg.saturation));
  }

  // Soft black floor / matte lift
  if (cfg.blackFloor) {
    cr = cfg.blackFloor + cr * (1 - cfg.blackFloor);
    cg = cfg.blackFloor + cg * (1 - cfg.blackFloor);
    cb = cfg.blackFloor + cb * (1 - cfg.blackFloor);
  }

  return [cr, cg, cb];
}

function buildHaldPNG(transformFn) {
  const rgba = Buffer.alloc(WIDTH * HEIGHT * 4);
  for (let b = 0; b < SIZE; b++) {
    const tileX = (b % TILES) * SIZE;
    const tileY = Math.floor(b / TILES) * SIZE;
    const bn = b / (SIZE - 1);
    for (let g = 0; g < SIZE; g++) {
      const gn = g / (SIZE - 1);
      const y = tileY + g;
      for (let r = 0; r < SIZE; r++) {
        const rn = r / (SIZE - 1);
        const x = tileX + r;
        const [or, og, ob] = transformFn(rn, gn, bn);
        const idx = (y * WIDTH + x) * 4;
        rgba[idx] = Math.round(clamp01(or) * 255);
        rgba[idx + 1] = Math.round(clamp01(og) * 255);
        rgba[idx + 2] = Math.round(clamp01(ob) * 255);
        rgba[idx + 3] = 255;
      }
    }
  }
  return encodeRGBAtoPNG(WIDTH, HEIGHT, rgba);
}

const STARTER_PRESETS = {
  'preset_01.png': {
    lift: 0.02,
    gain: 1.03,
    gamma: 1.03,
    contrast: 1.06,
    saturation: 1.04,
    shadowTint: [0.95, 0.99, 1.08],
    shadowStrength: 0.22,
    highlightTint: [1.02, 1.01, 0.99],
    highlightStrength: 0.12,
    blackFloor: 0.015,
  },
  'preset_02.png': {
    lift: -0.01,
    gain: 1.05,
    gamma: 0.98,
    contrast: 1.18,
    saturation: 1.12,
    shadowTint: [0.94, 0.98, 1.06],
    shadowStrength: 0.14,
    highlightTint: [1.01, 1.01, 1.0],
    highlightStrength: 0.08,
  },
  'preset_03.png': {
    lift: 0.025,
    gain: 1.06,
    gamma: 1.06,
    contrast: 1.08,
    saturation: 1.2,
    shadowTint: [0.9, 1.0, 1.1],
    shadowStrength: 0.24,
    highlightTint: [0.98, 1.03, 1.06],
    highlightStrength: 0.2,
  },
  'preset_04.png': {
    lift: 0.04,
    gain: 1.02,
    gamma: 1.08,
    contrast: 0.95,
    saturation: 0.88,
    shadowTint: [0.92, 0.99, 1.12],
    shadowStrength: 0.3,
    highlightTint: [1.05, 0.99, 1.02],
    highlightStrength: 0.25,
    blackFloor: 0.04,
  },
  'preset_05.png': {
    lift: 0.015,
    gain: 1.0,
    gamma: 0.97,
    contrast: 1.12,
    saturation: 0.96,
    shadowTint: [0.82, 0.98, 1.12],
    shadowStrength: 0.35,
    highlightTint: [1.05, 1.01, 0.94],
    highlightStrength: 0.2,
    blackFloor: 0.025,
  },
  'preset_06.png': {
    lift: 0.01,
    gain: 1.04,
    gamma: 1.04,
    contrast: 1.08,
    saturation: 1.14,
    balance: [1.03, 1.01, 0.95],
    shadowTint: [0.95, 0.97, 1.05],
    shadowStrength: 0.14,
    highlightTint: [1.08, 1.02, 0.88],
    highlightStrength: 0.28,
  },
  'preset_07.png': {
    lift: -0.025,
    gain: 1.08,
    gamma: 0.95,
    contrast: 1.24,
    saturation: 1.24,
    shadowTint: [0.85, 0.94, 1.14],
    shadowStrength: 0.28,
    highlightTint: [1.06, 0.99, 0.93],
    highlightStrength: 0.18,
  },
  'preset_08.png': {
    lift: 0.04,
    gain: 1.03,
    gamma: 1.1,
    contrast: 0.98,
    saturation: 1.05,
    shadowTint: [0.9, 0.96, 1.1],
    shadowStrength: 0.26,
    highlightTint: [1.07, 1.01, 0.96],
    highlightStrength: 0.24,
    blackFloor: 0.035,
  },
  'preset_09.png': {
    lift: -0.02,
    gain: 1.06,
    gamma: 0.96,
    contrast: 1.28,
    saturation: 1.08,
    shadowTint: [0.92, 0.96, 1.04],
    shadowStrength: 0.16,
    highlightTint: [1.02, 1.01, 0.98],
    highlightStrength: 0.12,
  },
};

fs.mkdirSync(OUT_DIR, { recursive: true });

const identityPath = path.join(OUT_DIR, 'hald_identity_64.png');
fs.writeFileSync(identityPath, buildHaldPNG((r, g, b) => [r, g, b]));
console.log(`Generated ${identityPath} (${WIDTH}x${HEIGHT})`);

for (const [filename, cfg] of Object.entries(STARTER_PRESETS)) {
  const outPath = path.join(OUT_DIR, filename);
  fs.writeFileSync(outPath, buildHaldPNG((r, g, b) => gradeColor(r, g, b, cfg)));
  console.log(`Generated ${outPath}`);
}
