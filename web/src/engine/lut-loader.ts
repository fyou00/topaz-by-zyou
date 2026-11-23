export interface Lut3DData {
  size: number;
  data: Uint8Array;
}

const lutCache = new Map<string, Promise<Lut3DData>>();

export function createIdentityLut3D(size = 64): Lut3DData {
  const data = new Uint8Array(size * size * size * 4);
  const max = size - 1;
  for (let b = 0; b < size; b++) {
    const bv = Math.round((b / max) * 255);
    for (let g = 0; g < size; g++) {
      const gv = Math.round((g / max) * 255);
      for (let r = 0; r < size; r++) {
        const rv = Math.round((r / max) * 255);
        const idx = (b * size * size + g * size + r) * 4;
        data[idx] = rv;
        data[idx + 1] = gv;
        data[idx + 2] = bv;
        data[idx + 3] = 255;
      }
    }
  }
  return { size, data };
}

export function unpackHaldImageTo3D(img: HTMLImageElement | ImageBitmap): Lut3DData {
  const w = img.width;
  const h = img.height;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable while unpacking Hald CLUT');
  }
  ctx.drawImage(img, 0, 0);
  const pixels = ctx.getImageData(0, 0, w, h).data;

  // Standard 64^3 Hald CLUT (512x512 = 8x8 grid of 64x64 slices)
  if (w === 512 && h === 512) {
    const size = 64;
    const tiles = 8;
    const out = new Uint8Array(size * size * size * 4);
    for (let b = 0; b < size; b++) {
      const tileX = (b % tiles) * size;
      const tileY = Math.floor(b / tiles) * size;
      for (let g = 0; g < size; g++) {
        const sy = tileY + g;
        for (let r = 0; r < size; r++) {
          const sx = tileX + r;
          const srcIdx = (sy * w + sx) * 4;
          const dstIdx = (b * size * size + g * size + r) * 4;
          out[dstIdx] = pixels[srcIdx];
          out[dstIdx + 1] = pixels[srcIdx + 1];
          out[dstIdx + 2] = pixels[srcIdx + 2];
          out[dstIdx + 3] = 255;
        }
      }
    }
    return { size, data: out };
  }

  // Horizontal strip 3D LUT (e.g. 4096x64 for 64^3, or 1024x32 for 32^3)
  if (w === h * h && (h === 16 || h === 32 || h === 64)) {
    const size = h;
    const out = new Uint8Array(size * size * size * 4);
    for (let b = 0; b < size; b++) {
      const offsetX = b * size;
      for (let g = 0; g < size; g++) {
        for (let r = 0; r < size; r++) {
          const sx = offsetX + r;
          const srcIdx = (g * w + sx) * 4;
          const dstIdx = (b * size * size + g * size + r) * 4;
          out[dstIdx] = pixels[srcIdx];
          out[dstIdx + 1] = pixels[srcIdx + 1];
          out[dstIdx + 2] = pixels[srcIdx + 2];
          out[dstIdx + 3] = 255;
        }
      }
    }
    return { size, data: out };
  }

  throw new Error(
    `Ukuran gambar Hald CLUT (${w}x${h}) belum didukung. Gunakan PNG 512x512 dari hald_identity_64.png.`
  );
}

export function parseCubeLut(text: string): Lut3DData {
  const lines = text.split(/\r?\n/);
  let size = 0;
  let domainMin = [0, 0, 0];
  let domainMax = [1, 1, 1];
  const entries: number[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    if (line.startsWith('TITLE')) continue;
    if (line.startsWith('LUT_3D_SIZE')) {
      size = parseInt(line.split(/\s+/)[1] ?? '0', 10);
      continue;
    }
    if (line.startsWith('DOMAIN_MIN')) {
      const parts = line.split(/\s+/).slice(1).map(Number);
      if (parts.length === 3 && parts.every(Number.isFinite)) domainMin = parts;
      continue;
    }
    if (line.startsWith('DOMAIN_MAX')) {
      const parts = line.split(/\s+/).slice(1).map(Number);
      if (parts.length === 3 && parts.every(Number.isFinite)) domainMax = parts;
      continue;
    }
    if (/^[A-Z_]+/.test(line)) continue;

    const parts = line.split(/\s+/).map(Number);
    if (parts.length >= 3 && parts.slice(0, 3).every(Number.isFinite)) {
      const r = (parts[0] - domainMin[0]) / (domainMax[0] - domainMin[0] || 1);
      const g = (parts[1] - domainMin[1]) / (domainMax[1] - domainMin[1] || 1);
      const b = (parts[2] - domainMin[2]) / (domainMax[2] - domainMin[2] || 1);
      entries.push(
        Math.round(Math.min(1, Math.max(0, r)) * 255),
        Math.round(Math.min(1, Math.max(0, g)) * 255),
        Math.round(Math.min(1, Math.max(0, b)) * 255),
        255
      );
    }
  }

  if (size < 2 || entries.length !== size * size * size * 4) {
    throw new Error('File .cube tidak valid atau ukuran LUT_3D_SIZE tidak sesuai jumlah baris RGB.');
  }

  return { size, data: new Uint8Array(entries) };
}

export function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Gagal memuat gambar: ${url}`));
    img.src = url;
  });
}

export function loadHaldLutFromUrl(url: string): Promise<Lut3DData> {
  const existing = lutCache.get(url);
  if (existing) return existing;

  const promise = loadImageElement(url).then((img) => unpackHaldImageTo3D(img));
  lutCache.set(url, promise);
  return promise;
}
