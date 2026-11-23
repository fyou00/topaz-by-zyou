#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.resolve(__dirname, '..');
const PUBLIC_VIDEOS_DIR = path.join(WEB_ROOT, 'public', 'videos');
const POSTERS_DIR = path.join(PUBLIC_VIDEOS_DIR, 'posters');
const MANIFEST_PATH = path.join(WEB_ROOT, 'src', 'data', 'video-manifest.json');

const CLIP_IDS = [
  'original',
  'preset-01',
  'preset-02',
  'preset-03',
  'preset-04',
  'preset-05',
  'preset-06',
  'preset-07',
  'preset-08',
  'preset-09',
];

const SUPPORTED_EXT = new Set(['.mp4', '.mov', '.mkv', '.webm', '.m4v']);
const WARN_FILE_MB = 5;
const WARN_TOTAL_MB = 45;

function printHelp() {
  console.log(`
Optimasi video render After Effects untuk showcase web Topaz by Zyou.

Penggunaan:
  npm run optimize:videos [opsi]

Opsi:
  --input <dir>     Folder sumber video mentah AE (default: web/raw-exports)
  --max-side <px>   Resolusi maksimal sisi terpanjang, rasio asli dijaga (default: 1280)
  --crf <angka>     Kualitas H.264 CRF 18-28, makin kecil makin tajam/besar (default: 23)
  --mute            Hapus track audio pada semua klip (hemat ukuran file)
  -h, --help        Tampilkan bantuan ini

Nama file yang dikenali di folder input:
  original.mp4 (atau .mov), serta preset-01.mp4 sampai preset-09.mp4
`);
}

function parseArgs(argv) {
  const opts = {
    inputDir: path.join(WEB_ROOT, 'raw-exports'),
    maxSide: 1280,
    crf: 23,
    mute: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '-h' || arg === '--help') {
      opts.help = true;
    } else if (arg === '--mute') {
      opts.mute = true;
    } else if (arg === '--input' && argv[i + 1]) {
      opts.inputDir = path.resolve(process.cwd(), argv[++i]);
    } else if (arg === '--max-side' && argv[i + 1]) {
      opts.maxSide = Number(argv[++i]) || 1280;
    } else if (arg === '--crf' && argv[i + 1]) {
      opts.crf = Number(argv[++i]) || 23;
    }
  }
  return opts;
}

function ensureBinary(name) {
  const res = spawnSync(name, ['-version'], { encoding: 'utf8' });
  if (res.error || res.status !== 0) {
    console.error(`[ERROR] '${name}' belum terpasang di sistem.`);
    console.error('Pasang dulu di macOS lewat Homebrew:');
    console.error('  brew install ffmpeg');
    process.exit(1);
  }
}

function probeVideo(filePath) {
  const res = spawnSync(
    'ffprobe',
    [
      '-v',
      'error',
      '-select_streams',
      'v:0',
      '-show_entries',
      'stream=width,height',
      '-show_entries',
      'format=duration',
      '-of',
      'json',
      filePath,
    ],
    { encoding: 'utf8' }
  );

  if (res.status !== 0 || !res.stdout) {
    return { width: 1920, height: 1080, duration: 0 };
  }

  try {
    const data = JSON.parse(res.stdout);
    const stream = data.streams?.[0] ?? {};
    const dur = Number(data.format?.duration ?? 0);
    return {
      width: Number(stream.width) || 1920,
      height: Number(stream.height) || 1080,
      duration: Number.isFinite(dur) ? Number(dur.toFixed(2)) : 0,
    };
  } catch {
    return { width: 1920, height: 1080, duration: 0 };
  }
}

function findSourceFiles(inputDir) {
  const files = fs.readdirSync(inputDir, { withFileTypes: true });
  const map = new Map();

  for (const entry of files) {
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (!SUPPORTED_EXT.has(ext)) continue;
    const stem = path.basename(entry.name, path.extname(entry.name)).toLowerCase();
    if (CLIP_IDS.includes(stem)) {
      map.set(stem, path.join(inputDir, entry.name));
    }
  }
  return map;
}

function encodeClip(srcPath, outMp4Path, outPosterPath, opts) {
  const scaleFilter =
    `scale='if(gte(iw,ih),min(iw,${opts.maxSide}),-2)':'if(gte(iw,ih),-2,min(ih,${opts.maxSide}))',` +
    'scale=trunc(iw/2)*2:trunc(ih/2)*2';

  const args = [
    '-y',
    '-i',
    srcPath,
    '-vf',
    scaleFilter,
    '-c:v',
    'libx264',
    '-preset',
    'slow',
    '-crf',
    String(opts.crf),
    '-pix_fmt',
    'yuv420p',
    '-profile:v',
    'high',
    '-level',
    '4.1',
    '-colorspace',
    'bt709',
    '-color_primaries',
    'bt709',
    '-color_trc',
    'bt709',
    '-movflags',
    '+faststart',
  ];

  if (opts.mute) {
    args.push('-an');
  } else {
    args.push('-c:a', 'aac', '-b:a', '96k');
  }

  args.push(outMp4Path);

  const encode = spawnSync('ffmpeg', args, { stdio: 'inherit' });
  if (encode.status !== 0) {
    throw new Error(`Gagal mengonversi ${path.basename(srcPath)}`);
  }

  // Extract lightweight poster JPG at 0.5s (fallback to 0s for very short clips)
  const posterTry1 = spawnSync(
    'ffmpeg',
    ['-y', '-ss', '0.5', '-i', outMp4Path, '-vframes', '1', '-vf', 'scale=640:-2', '-q:v', '3', outPosterPath],
    { stdio: 'pipe' }
  );

  if (posterTry1.status !== 0 || !fs.existsSync(outPosterPath)) {
    spawnSync(
      'ffmpeg',
      ['-y', '-ss', '0', '-i', outMp4Path, '-vframes', '1', '-vf', 'scale=640:-2', '-q:v', '3', outPosterPath],
      { stdio: 'pipe' }
    );
  }
}

function formatMb(bytes) {
  return (bytes / (1024 * 1024)).toFixed(2);
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    printHelp();
    process.exit(0);
  }

  ensureBinary('ffmpeg');
  ensureBinary('ffprobe');

  if (!fs.existsSync(opts.inputDir)) {
    console.error(`[ERROR] Folder input belum ditemukan: ${opts.inputDir}`);
    console.error('Buat folder tersebut dan taruh file original.mp4 / preset-01.mp4 .. preset-09.mp4.');
    process.exit(1);
  }

  const sources = findSourceFiles(opts.inputDir);
  if (sources.size === 0) {
    console.error(`[ERROR] Tidak ada file berawalan original atau preset-01..preset-09 di ${opts.inputDir}`);
    process.exit(1);
  }

  fs.mkdirSync(PUBLIC_VIDEOS_DIR, { recursive: true });
  fs.mkdirSync(POSTERS_DIR, { recursive: true });

  console.log(`Memproses ${sources.size} klip dari ${opts.inputDir} (maxSide=${opts.maxSide}px, crf=${opts.crf})...\n`);

  for (const clipId of CLIP_IDS) {
    const src = sources.get(clipId);
    if (!src) continue;
    const outMp4 = path.join(PUBLIC_VIDEOS_DIR, `${clipId}.mp4`);
    const outPoster = path.join(POSTERS_DIR, `${clipId}.jpg`);
    console.log(`-> Mengompresi ${clipId} (${path.basename(src)})...`);
    encodeClip(src, outMp4, outPoster, opts);
  }

  // Rebuild manifest from every valid clip inside web/public/videos
  const buildEntry = (clipId) => {
    const file = `${clipId}.mp4`;
    const poster = `${clipId}.jpg`;
    const mp4Path = path.join(PUBLIC_VIDEOS_DIR, file);
    const posterPath = path.join(POSTERS_DIR, poster);
    const hasMp4 = fs.existsSync(mp4Path);
    const hasPoster = fs.existsSync(posterPath);

    if (!hasMp4) {
      return {
        file,
        poster,
        hasPoster,
        width: 1920,
        height: 1080,
        duration: 0,
        sizeBytes: 0,
      };
    }

    const meta = probeVideo(mp4Path);
    const sizeBytes = fs.statSync(mp4Path).size;
    return {
      file,
      poster,
      hasPoster,
      width: meta.width,
      height: meta.height,
      duration: meta.duration,
      sizeBytes,
    };
  };

  const manifest = {
    version: String(Date.now()),
    original: buildEntry('original'),
    presets: {},
  };

  let totalBytes = manifest.original.sizeBytes;
  const warnings = [];

  for (const clipId of CLIP_IDS.slice(1)) {
    const entry = buildEntry(clipId);
    manifest.presets[clipId] = entry;
    totalBytes += entry.sizeBytes;
  }

  fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  console.log('\nRingkasan ukuran output di web/public/videos:');
  const allEntries = [['original', manifest.original], ...Object.entries(manifest.presets)];
  for (const [id, entry] of allEntries) {
    if (entry.sizeBytes <= 0) {
      console.log(`  - ${id.padEnd(10)}: belum ada`);
      continue;
    }
    const mb = Number(formatMb(entry.sizeBytes));
    if (mb > WARN_FILE_MB) {
      warnings.push(`${id}.mp4 berukuran ${mb} MB (disarankan <= ${WARN_FILE_MB} MB agar hemat kuota Vercel)`);
    }
    console.log(
      `  - ${id.padEnd(10)}: ${mb.toFixed(2)} MB | ${entry.width}x${entry.height} | ${entry.duration}s | poster=${entry.hasPoster ? 'ya' : 'tidak'}`
    );
  }

  const totalMb = Number(formatMb(totalBytes));
  console.log(`\nTotal ukuran video: ${totalMb.toFixed(2)} MB`);
  console.log(`Manifest diperbarui: ${path.relative(WEB_ROOT, MANIFEST_PATH)}`);

  if (totalMb > WARN_TOTAL_MB) {
    warnings.push(`Total folder video ${totalMb.toFixed(2)} MB mendekati batas nyaman Vercel Hobby (${WARN_TOTAL_MB} MB). Pertimbangkan CRF sedikit lebih tinggi (24-26) atau pindahkan ke Cloudflare R2.`);
  }

  if (warnings.length > 0) {
    console.log('\n[PERINGATAN KUOTA]');
    for (const w of warnings) console.log(`  ! ${w}`);
  }
}

main();
