#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const LUT_DIR = path.resolve(HERE, '../public/luts');
const SIZE = 64;
const TILES = 8;

function paethPredictor(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function decodePNG(filePath) {
  const buf = fs.readFileSync(filePath);
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let i = 0; i < 8; i++) {
    if (buf[i] !== sig[i]) throw new Error(`Invalid PNG signature in ${filePath}`);
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  const idatChunks = [];

  while (offset < buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.subarray(offset + 4, offset + 8).toString('ascii');
    const data = buf.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;

    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      colorType = data[9];
    } else if (type === 'IDAT') {
      idatChunks.push(data);
    } else if (type === 'IEND') {
      break;
    }
  }

  const bpp = colorType === 6 ? 4 : colorType === 2 ? 3 : 0;
  if (!bpp) throw new Error(`Unsupported PNG colorType ${colorType} in ${filePath}`);

  const raw = zlib.inflateSync(Buffer.concat(idatChunks));
  const stride = width * bpp;
  const pixels = new Uint8Array(width * height * bpp);

  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const rowIn = y * (stride + 1) + 1;
    const rowOut = y * stride;
    for (let i = 0; i < stride; i++) {
      const val = raw[rowIn + i];
      const left = i >= bpp ? pixels[rowOut + i - bpp] : 0;
      const up = y > 0 ? pixels[(y - 1) * stride + i] : 0;
      const upLeft = y > 0 && i >= bpp ? pixels[(y - 1) * stride + i - bpp] : 0;
      let recon = val;
      if (filter === 1) recon = (val + left) & 0xff;
      else if (filter === 2) recon = (val + up) & 0xff;
      else if (filter === 3) recon = (val + ((left + up) >> 1)) & 0xff;
      else if (filter === 4) recon = (val + paethPredictor(left, up, upLeft)) & 0xff;
      pixels[rowOut + i] = recon;
    }
  }

  return { width, height, bpp, pixels };
}

// Test 1: Exact identity cube round-trip verification (all 262,144 texels)
const idPng = decodePNG(path.join(LUT_DIR, 'hald_identity_64.png'));
if (idPng.width !== 512 || idPng.height !== 512) {
  throw new Error(`Expected 512x512 identity LUT, got ${idPng.width}x${idPng.height}`);
}

let maxErr = 0;
let checked = 0;
for (let b = 0; b < SIZE; b++) {
  const tileX = (b % TILES) * SIZE;
  const tileY = Math.floor(b / TILES) * SIZE;
  const expB = Math.round((b / (SIZE - 1)) * 255);
  for (let g = 0; g < SIZE; g++) {
    const expG = Math.round((g / (SIZE - 1)) * 255);
    const y = tileY + g;
    for (let r = 0; r < SIZE; r++) {
      const expR = Math.round((r / (SIZE - 1)) * 255);
      const x = tileX + r;
      const idx = (y * idPng.width + x) * idPng.bpp;
      const errR = Math.abs(idPng.pixels[idx] - expR);
      const errG = Math.abs(idPng.pixels[idx + 1] - expG);
      const errB = Math.abs(idPng.pixels[idx + 2] - expB);
      maxErr = Math.max(maxErr, errR, errG, errB);
      checked++;
    }
  }
}

if (checked !== SIZE * SIZE * SIZE || maxErr !== 0) {
  throw new Error(`Hald identity test failed: checked=${checked}, maxErr=${maxErr}`);
}
console.log(`PASS identity Hald CLUT round-trip: ${checked} texels checked, maxErr=${maxErr}`);

// Test 2: Verify all 9 preset LUT PNGs decode cleanly as 512x512
for (let i = 1; i <= 9; i++) {
  const name = `preset_0${i}.png`;
  const decoded = decodePNG(path.join(LUT_DIR, name));
  if (decoded.width !== 512 || decoded.height !== 512) {
    throw new Error(`${name} has unexpected size ${decoded.width}x${decoded.height}`);
  }
  console.log(`PASS ${name}: ${decoded.width}x${decoded.height} valid PNG`);
}
