# Topaz by Zyou

Landing page jasa video enhancement **Topaz Labs** dan color correction **After Effects** dengan simulator **WebGL2 Hybrid CC** agar calon klien bisa menguji Preset 1 sampai Preset 9 langsung di browser.

![Topaz by Zyou Hero](./docs/preview-hero.png)

## Fitur Utama

- **WebGL2 3D LUT + Spatial FX Shaders:** Simulasi real-time 60 FPS menggunakan 3D LUT dari Hald CLUT PNG (`64×64×64`) ditambah shader multi-pass untuk Glow / Bloom (`S_Glow` / `Deep Glow`), Sharpen / Clarity (`Unsharp Mask`), Soft / Dreamy Blur (Orton), Vignette, Film Grain, dan Chromatic Aberration.
- **Uji Media Lokal 100% di Browser:** Pengunjung dapat memilih sample bawaan atau mengunggah foto (`JPG`/`PNG`/`WebP`) dan video pendek (`MP4`/`MOV`/`WebM`) tanpa proses upload ke server.
- **9 Preset CC Interaktif:** Dilengkapi slider perbandingan Before / After (*Asli* vs *Simulasi CC*), kontrol intensitas (`0–100%`), tombol *Tahan lihat asli*, dan tombol salin pesan order sesuai preset aktif.
- **Mode Kalibrasi Pemilik (`?calibrate=1` / `Alt + Shift + C`):** Panel kalibrasi untuk mengunggah Hald PNG / `.cube` dari After Effects, membandingkan langsung dengan render AE asli, dan menyalin konfigurasi JSON preset.

## Menjalankan Secara Lokal

```bash
cd web
npm install
npm run dev
```

## Panduan Export LUT dari After Effects

Untuk membekukan efek warna `.ffx` (Boris FX, Sapphire, Magic Bullet Looks, Lumetri) ke file LUT web `preset_01.png`–`preset_09.png`, ikuti panduan di [cara-export-lut-ae.md](./web/docs/cara-export-lut-ae.md).
