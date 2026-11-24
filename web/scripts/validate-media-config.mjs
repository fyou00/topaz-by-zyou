#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CC_PRESETS, ORIGINAL_CLIP, formatOrderMessage } from '../src/data/presets.ts';
import {
  VIDEO_BASE_URL,
  buildMediaUrl,
  normalizeBaseUrl,
  resolvePosterUrl,
  resolveVideoUrl,
} from '../src/lib/media-url.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(WEB_ROOT, 'src', 'data', 'video-manifest.json');
const VIDEOS_DIR = path.join(WEB_ROOT, 'public', 'videos');
const POSTERS_DIR = path.join(VIDEOS_DIR, 'posters');
const WARN_TOTAL_MB = 45;
const GITHUB_FILE_LIMIT_BYTES = 100 * 1024 * 1024;

function sumDirectoryBytes(dir) {
  if (!fs.existsSync(dir)) return 0;
  let total = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      total += sumDirectoryBytes(full);
    } else if (entry.isFile()) {
      total += fs.statSync(full).size;
    }
  }
  return total;
}

function main() {
  // 1. Validate ORIGINAL_CLIP and 17 CC_PRESETS
  assert.equal(ORIGINAL_CLIP.id, 'original');
  assert.equal(ORIGINAL_CLIP.videoFile, 'original.mp4');
  assert.equal(ORIGINAL_CLIP.posterFile, 'original.jpg');

  assert.equal(CC_PRESETS.length, 17, 'Harus tepat 17 preset pilihan');
  const seenIds = new Set();
  CC_PRESETS.forEach((preset, idx) => {
    const expectedNum = String(idx + 1).padStart(2, '0');
    assert.ok(preset.id.length > 0, `ID preset ke-${idx + 1} tidak boleh kosong`);
    assert.equal(preset.number, expectedNum, `Nomor preset ke-${idx + 1} harus ${expectedNum}`);
    assert.ok(preset.name.length > 0, `Nama preset ${preset.id} tidak boleh kosong`);
    assert.ok(preset.videoFile.endsWith('.mp4'), `Video preset ${preset.id} harus .mp4`);
    assert.ok(preset.posterFile.endsWith('.jpg'), `Poster preset ${preset.id} harus .jpg`);
    assert.ok(!seenIds.has(preset.id), `Duplikat preset id: ${preset.id}`);
    seenIds.add(preset.id);
    assert.ok(formatOrderMessage(preset).includes(preset.name), 'Format order harus menyebut nama preset');
  });

  // 2. Validate video-manifest.json consistency and posters on disk
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  assert.ok(manifest.version, 'Manifest harus punya version');
  assert.equal(manifest.original?.file, ORIGINAL_CLIP.videoFile);
  assert.equal(manifest.original?.poster, ORIGINAL_CLIP.posterFile);

  if (manifest.original?.hasPoster) {
    assert.ok(
      fs.existsSync(path.join(POSTERS_DIR, manifest.original.poster)),
      `Poster original tidak ditemukan: ${manifest.original.poster}`
    );
  }

  for (const preset of CC_PRESETS) {
    const entry = manifest.presets?.[preset.id];
    assert.ok(entry, `Entri manifest untuk ${preset.id} hilang`);
    assert.equal(entry.file, preset.videoFile);
    assert.equal(entry.poster, preset.posterFile);
    if (entry.hasPoster) {
      assert.ok(
        fs.existsSync(path.join(POSTERS_DIR, entry.poster)),
        `Poster ${preset.id} ditandai ada tetapi file hilang: ${entry.poster}`
      );
    }
  }

  // 3. Validate URL normalization, segment encoding for spaces, & R2 compatibility
  assert.equal(normalizeBaseUrl(undefined), '/videos');
  assert.equal(normalizeBaseUrl('   '), '/videos');
  assert.equal(normalizeBaseUrl('https://media.zyou.id/videos///'), 'https://media.zyou.id/videos');

  assert.equal(buildMediaUrl('', 'CC BLUE BEATS.mp4'), '/videos/CC%20BLUE%20BEATS.mp4');
  assert.equal(
    buildMediaUrl('https://media.zyou.id/videos/', '/Sharpen V2.mp4'),
    'https://media.zyou.id/videos/Sharpen%20V2.mp4'
  );
  assert.equal(buildMediaUrl('', 'CC BLUE BEATS.mp4', '42'), '/videos/CC%20BLUE%20BEATS.mp4?v=42');

  if (!process.env.VITE_VIDEO_BASE_URL) {
    assert.equal(VIDEO_BASE_URL, '/videos');
    assert.equal(resolveVideoUrl('CC BLUE BEATS.mp4'), '/videos/CC%20BLUE%20BEATS.mp4');
    assert.equal(resolvePosterUrl('cc-blue-beats.jpg'), '/videos/posters/cc-blue-beats.jpg');
  }

  // 4. Report web/public/videos footprint & oversize files
  const totalBytes = sumDirectoryBytes(VIDEOS_DIR);
  const totalMb = totalBytes / (1024 * 1024);

  const oversizedFiles = [];
  if (fs.existsSync(VIDEOS_DIR)) {
    for (const entry of fs.readdirSync(VIDEOS_DIR, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.mp4')) continue;
      const size = fs.statSync(path.join(VIDEOS_DIR, entry.name)).size;
      if (size > GITHUB_FILE_LIMIT_BYTES) {
        oversizedFiles.push({ name: entry.name, mb: (size / (1024 * 1024)).toFixed(1) });
      }
    }
  }

  console.log('Validasi konfigurasi media & manifest berhasil:');
  console.log(`  - Preset terdaftar : ${CC_PRESETS.length} preset + 1 original`);
  console.log(`  - Base URL default : ${VIDEO_BASE_URL}`);
  console.log(`  - Ukuran videos/   : ${totalMb.toFixed(2)} MB`);

  if (totalMb > WARN_TOTAL_MB) {
    console.warn(
      `[PERINGATAN] Total folder videos/ (${totalMb.toFixed(2)} MB) melebihi batas nyaman Vercel Hobby (${WARN_TOTAL_MB} MB).`
    );
  }
  for (const f of oversizedFiles) {
    console.warn(
      `[PERINGATAN GITHUB] ${f.name} berukuran ${f.mb} MB (> 100 MB batas file GitHub). Kompres atau pindahkan ke Cloudflare R2 sebelum git push.`
    );
  }
}

main();
