# Topaz by Zyou

Landing page jasa video enhancement **Topaz Labs** dan color correction **After Effects** dengan etalase video interaktif agar calon klien bisa menonton dan membandingkan klip **Original** dengan **17 Preset Pilihan** langsung dari hasil render After Effects asli.

![Topaz by Zyou Hero](./docs/preview-hero.png)

## Fitur Utama

- **Etalase 17 Video Hasil Render AE Asli:** Menampilkan **1 klip Original** (`original.mp4`) dan **17 klip Preset** (`CC BLUE BEATS` sampai `Sharpen V2`) dengan tombol switch cepat Original vs Preset aktif.
- **Pemutar Tunggal Adaptif & Hemat Bandwidth:** Rasio aspek pemutar otomatis menyesuaikan video (`1:1`, `9:16`, `16:9`, atau campuran), auto-pause saat keluar viewport (`IntersectionObserver`), dan kartu grid tidak memuat banyak `<video>` sekaligus.
- **17 Kartu Preset Polaroid + Salin Order:** Pengunjung dapat memilih preset dari katalog (atau filmstrip horizontal di mobile), melihat durasi serta deskripsi preset, dan menyalin format pesan order siap kirim.
- **Siap Vercel CDN dan Cloudflare R2:** Mendukung hosting statis di `web/public/videos/` maupun env `VITE_VIDEO_BASE_URL` untuk memindahkan hosting video ke Cloudflare R2 tanpa mengubah kode.
