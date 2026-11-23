# Cara Export LUT Preset `.ffx` dari After Effects ke Simulator Zyou

Panduan singkat ini hanya perlu dilakukan **satu kali** untuk mengubah Preset 1 sampai Preset 9 milikmu (`.ffx` berisi Boris FX / Sapphire / Magic Bullet Looks / Lumetri) menjadi file **3D LUT PNG** yang bisa dijalankan di GPU browser pengunjung pada 60 FPS.

---

## 1. Siapkan Comp di After Effects

1. Ambil file **`public/luts/hald_identity_64.png`** (`512 × 512 px`).
2. Import ke After Effects lalu buat Composition berukuran persis **`512 × 512 px`**, frame rate bebas, durasi 1 frame.
3. Pastikan Project Settings warna berada pada **sRGB** (Color Depth boleh `8 bpc` atau `16 bpc`, biarkan Working Space *None* atau *sRGB IEC61966-2.1* agar nilai warna identik dengan web).

## 2. Terapkan Preset & Matikan Efek Spasial Sementara

1. Taruh `hald_identity_64.png` di timeline, lalu buat Adjustment Layer di atasnya.
2. Terapkan **Preset 1** (`.ffx`) ke Adjustment Layer.
3. **Penting:** Untuk sementara, **matikan (uncheck)** efek yang bersifat *blur/glow/sharpen/grain/vignette* (misal `S_Glow`, `Deep Glow`, `BCC Glow`, `Unsharp Mask`, `S_Sharpen`, `Add Grain`, `Vignette`).
   - Biarkan seluruh efek warna tetap nyala: *Lumetri, Curves, Levels, Hue/Saturation, Exposure, Vibrance, Selective Color, Magic Bullet Looks (Colorista/Mojo/Cosmo), Sapphire/BCC Color*.
4. Pilih `Composition > Save Frame As > File...`, set format output ke **PNG Sequence (RGB, Millions of Colors)**, lalu simpan menjadi **`preset_01.png`** (`512 × 512 px`).
5. Ulangi untuk **Preset 2 sampai Preset 9**, simpan ke folder:
   - `web/public/luts/preset_01.png`
   - `web/public/luts/preset_02.png`
   - ... sampai `web/public/luts/preset_09.png`

*(Jika kamu juga punya file LUT `.cube` berukuran `33×33×33` atau `64×64×64`, Mode Kalibrasi di web juga mendukung unggah langsung file `.cube`.)*

---

## 3. Kalibrasi Glow, Sharpen, Soft Blur, Vignette & Grain

Setelah warna dari AE masuk lewat Hald PNG:

1. Jalankan website lokal (`npm run dev`), lalu buka **`http://localhost:5173/?calibrate=1`** (atau tekan **`Alt + Shift + C`**).
2. Muat 1 frame video mentah ke simulator utama, dan unggah frame hasil render AE aslimu ke kotak **Pembanding Render AE Asli** di panel kalibrasi.
3. Geser slider **Glow Intensity, Glow Threshold, Glow Radius, Glow Tint, Soft/Dreamy Blur, Sharpen, Vignette, Film Grain, dan Chromatic Aberration** hingga tampilan WebGL sedekat mungkin dengan hasil render AE asli.
4. Klik **Salin JSON Preset**, lalu tempel nilainya ke entri preset terkait di `web/src/data/presets.ts`.
