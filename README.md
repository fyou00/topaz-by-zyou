# Topaz by Zyou

Landing page jasa video enhancement **Topaz Labs** dan color correction **After Effects** dengan etalase video interaktif agar calon klien bisa menonton dan membandingkan klip **Original** dengan **9 Preset Color Correction** langsung dari hasil render After Effects asli.

![Topaz by Zyou Hero](./docs/preview-hero.png)

## Fitur Utama

- **Etalase Video Hasil Render AE Asli:** Menampilkan **1 klip Original** (`original.mp4`) dan **9 klip Preset** (`preset-01.mp4` sampai `preset-09.mp4`) dengan tombol switch cepat Original vs Preset aktif.
- **Pemutar Tunggal Adaptif & Hemat Bandwidth:** Rasio aspek pemutar otomatis menyesuaikan video (`9:16`, `16:9`, `1:1`, atau campuran), auto-pause saat keluar viewport (`IntersectionObserver`), dan kartu grid tidak memuat banyak `<video>` sekaligus.
- **9 Kartu Preset Polaroid + Salin Order:** Pengunjung dapat memilih Preset 1 sampai Preset 9, melihat deskripsi preset, dan menyalin format pesan order siap kirim.
- **Siap Vercel CDN dan Cloudflare R2:** Cukup taruh `.mp4` di `web/public/videos/` untuk Vercel, dan tersedia env `VITE_VIDEO_BASE_URL` untuk memindahkan hosting video ke Cloudflare R2 tanpa mengubah kode.

## Menjalankan Secara Lokal

```bash
cd web
npm install
npm run dev
```

## Panduan Menambahkan Video & Optimasi Ukuran

Untuk panduan memasukkan `.mp4` hasil render After Effects, menjalankan kompresi opsional `npm run optimize:videos`, serta migrasi ke Cloudflare R2, baca [cara-upload-video-preset.md](./web/docs/cara-upload-video-preset.md).
