# Panduan Menambahkan Video Preset AE ke Web

Website **Topaz by Zyou** menampilkan **1 video original + 9 video preset hasil render After Effects asli** (format `.mp4`), tanpa perlu kalibrasi LUT atau mengunggah screenshot satu per satu.

## 1. Cara Paling Simpel: Langsung Taruh `.mp4`

Cukup ekspor video dari After Effects atau Media Encoder dan salin langsung ke folder `web/public/videos/` dengan nama file persis seperti ini:

- `original.mp4` (klip mentah sebelum color correction)
- `preset-01.mp4` sampai `preset-09.mp4` (hasil render masing-masing preset)

Web otomatis mendeteksi dan memutar file yang sudah ada di folder tersebut. Jika ada preset yang belum diisi `.mp4`-nya, kartu dan player akan menampilkan slot kosong rapi tanpa merusak halaman.

### Saran Pengaturan Render AE agar Ringan & Warna Akurat

- **Format:** `H.264` (`.mp4`) dengan profile color `Rec.709`
- **Durasi ideal:** `5 sampai 10 detik` per klip
- **Ukuran target:** `2 sampai 4 MB` per video (bitrate `2.5` sampai `4 Mbps`, sehingga total 10 file sekitar `25 sampai 40 MB` dan tetap lega di batas proyek Vercel Hobby `100 MB`)
- **Rasio aspek bebas:** Vertikal `9:16`, Landscape `16:9`, `4:5`, maupun `1:1` didukung otomatis oleh pemutar utama

## 2. Opsional: Kompresi & Poster Otomatis via FFmpeg

Jika hasil render AE masih terlalu besar (misalnya `15–50 MB` per klip) atau kamu ingin setiap kartu Polaroid di grid menampilkan gambar thumbnail poster otomatis, gunakan script optimasi bawaan:

1. Pasang FFmpeg sekali saja di macOS:
   ```bash
   brew install ffmpeg
   ```
2. Taruh file mentah render AE ke folder `web/raw-exports/` dengan nama `original.mp4` (atau `.mov`) dan `preset-01.mp4` sampai `preset-09.mp4`. *(Folder `web/raw-exports/` otomatis diabaikan Git sehingga tidak membengkakkan repo).*
3. Jalankan script optimasi dari folder `web/`:
   ```bash
   npm run optimize:videos
   ```
   Script akan otomatis menghasilkan:
   - Video terkompresi di `web/public/videos/` (`libx264`, warna `bt709`, `+faststart`)
   - Gambar thumbnail ringan di `web/public/videos/posters/`
   - Pembaruan metadata di `web/src/data/video-manifest.json`

## 3. Deploy di Vercel & Migrasi ke Cloudflare R2

### Deploy Awal di Vercel

- Pada pengaturan proyek Vercel, pastikan **Root Directory** diarahkan ke `web`.
- Header caching di `web/vercel.json` otomatis mengaktifkan edge cache pada rute `/videos/*` sehingga pemutaran berulang langsung dilayani CDN Vercel.

### Kapan dan Bagaimana Pindah ke Cloudflare R2

Paket gratis **Vercel Hobby** memiliki kuota transfer data **100 GB/bulan** dan batas ukuran source CLI **100 MB**. Jika pengunjung web semakin ramai atau kamu ingin menaruh video lebih panjang/tajam tanpa khawatir batas bandwidth:

1. Buat bucket di **Cloudflare R2** (gratis `10 GB` storage dan `0` biaya bandwidth keluar) lalu hubungkan **Custom Domain**, misalnya `https://media.domainkamu.com`.
2. Unggah isi folder `web/public/videos/` ke bucket R2 tersebut (termasuk subfolder `posters/`).
3. Di dashboard Vercel (**Settings > Environment Variables**), tambahkan variabel:
   ```text
   VITE_VIDEO_BASE_URL=https://media.domainkamu.com/videos
   ```
4. Redeploy di Vercel, lalu kamu boleh menghapus file `.mp4` dari `web/public/videos/` lokal agar ukuran repo GitHub tetap kecil.
