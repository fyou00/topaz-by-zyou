import { useState } from 'react';
import {
  CC_PRESETS,
  TOPAZ_ONLY_ORDER_MESSAGE,
  buildWhatsAppOrderUrl,
  formatOrderMessage,
} from './data/presets';
import videoManifest from './data/video-manifest.json';
import { resolvePosterUrl } from './lib/media-url';
import { VideoPresetShowcase } from './components/VideoPresetShowcase';

export function App() {
  const [selectedPresetId, setSelectedPresetId] = useState(CC_PRESETS[0].id);
  const [heroSplit, setHeroSplit] = useState(50);

  const activePreset = CC_PRESETS.find((p) => p.id === selectedPresetId) ?? CC_PRESETS[0];
  const heroCleanPoster = resolvePosterUrl('cc-soft-clean.jpg', videoManifest.version);
  const heroSharpenPoster = resolvePosterUrl('sharpen-v2.jpg', videoManifest.version);
  const heroOriginalPoster = resolvePosterUrl('original.jpg', videoManifest.version);
  const heroFreshPoster = resolvePosterUrl('cc-soft-fresh.jpg', videoManifest.version);

  const closingPresetOrderUrl = buildWhatsAppOrderUrl(formatOrderMessage(activePreset));
  const closingTopazOrderUrl = buildWhatsAppOrderUrl(TOPAZ_ONLY_ORDER_MESSAGE);

  return (
    <>
      <a className="skip" href="#preset-cc">
        Lewati ke katalog video preset CC
      </a>

      <header className="hero">
        <img
          className="hero__bg"
          src="/images/hero-sky-clouds.jpg"
          alt="Langit siang biru cerah dengan gugusan awan cumulus putih"
          width={1920}
          height={1080}
          fetchPriority="high"
        />
        <div className="hero__scrim" aria-hidden="true" />
        <div className="hero__mist" aria-hidden="true" />

        <div className="container hero__nav-wrap">
          <nav className="nav" aria-label="Navigasi utama">
            <a className="wordmark nav__wordmark" href="#top">
              topaz by zyou
            </a>

            <div className="nav__pill">
              <ul className="nav__links">
                <li>
                  <a href="#preset-cc">Preset CC</a>
                </li>
                <li>
                  <a href="#layanan">Layanan</a>
                </li>
                <li>
                  <a href="#cara-pesan">Cara pesan</a>
                </li>
              </ul>
              <a className="btn nav__cta" href="#kontak">
                Hubungi Zyou
              </a>
            </div>
          </nav>
        </div>

        <div className="container hero__inner" id="top">
          <div className="hero__copy">
            <h1 className="hero__title">Video tajam, warna bersih ala Zyou.</h1>
            <p className="hero__lead">
              Jasa upscale Topaz Labs dan color correction After Effects pakai preset pilihan.
            </p>
            <div className="hero__actions">
              <a className="btn" href="#preset-cc">
                Lihat 17 preset
              </a>
              <a className="btn btn--ghost-sky" href="#cara-pesan">
                Cara pemesanan
              </a>
            </div>
          </div>

          <div className="hero__collage">
            <div className="polaroid-hero polaroid-hero--left">
              <div className="polaroid-hero__screen">
                <img
                  className="polaroid-hero__img"
                  src={heroCleanPoster}
                  alt="Hasil color correction CC Soft Clean"
                  width={720}
                  height={720}
                  loading="eager"
                />
              </div>
              <span className="polaroid-hero__label">CC Soft Clean</span>
            </div>

            <div className="polaroid-hero polaroid-hero--right">
              <div className="polaroid-hero__screen">
                <img
                  className="polaroid-hero__img"
                  src={heroSharpenPoster}
                  alt="Hasil penajaman detail Topaz dan Sharpen V2"
                  width={720}
                  height={720}
                  loading="eager"
                />
              </div>
              <span className="polaroid-hero__label">Topaz + Sharpen</span>
            </div>

            <div className="polaroid-hero polaroid-hero--front">
              <div className="polaroid-hero__screen polaroid-hero__screen--split">
                <img
                  className="polaroid-hero__img"
                  src={heroOriginalPoster}
                  alt="Frame asli sebelum color correction"
                  width={720}
                  height={720}
                  loading="eager"
                />
                <img
                  className="polaroid-hero__img polaroid-hero__img--cc"
                  src={heroFreshPoster}
                  alt="Frame hasil Topaz dan CC Soft Fresh"
                  width={720}
                  height={720}
                  loading="eager"
                  style={{ clipPath: `inset(0 0 0 ${heroSplit}%)` }}
                />
                <span className="polaroid-hero__tag polaroid-hero__tag--left" aria-hidden="true">
                  Asli
                </span>
                <span
                  className="polaroid-hero__tag polaroid-hero__tag--dark polaroid-hero__tag--right"
                  aria-hidden="true"
                >
                  Topaz + CC
                </span>
                <div
                  className="polaroid-hero__divider"
                  style={{ left: `${heroSplit}%` }}
                  aria-hidden="true"
                />
                <div
                  className="polaroid-hero__handle"
                  style={{ left: `${heroSplit}%` }}
                  aria-hidden="true"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M5 3L1 7L5 11M9 3L13 7L9 11"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <input
                  type="range"
                  min={5}
                  max={95}
                  value={heroSplit}
                  aria-label="Geser perbandingan Asli dan Topaz + CC pada CC Soft Fresh"
                  className="polaroid-hero__range"
                  onChange={(e) => setHeroSplit(Number(e.target.value))}
                />
              </div>
              <span className="polaroid-hero__label">CC Soft Fresh</span>
            </div>

            <svg
              className="hero__plane"
              width="116"
              height="70"
              viewBox="0 0 116 70"
              fill="none"
              aria-hidden="true"
            >
              <path d="M0 32L114 0L48 44Z" fill="#FAFDFF" />
              <path d="M48 44L114 0L56 68Z" fill="#B0D6F8" />
              <path d="M56 68L114 0L64 50Z" fill="#D0E8FC" />
              <path d="M64 50L114 0L98 62Z" fill="#E4F2FE" />
            </svg>
          </div>
        </div>
      </header>

      <main>
        <section className="catalog" id="preset-cc">
          <div className="container">
            <div className="section-head">
              <h2 className="section-head__title">Tujuh belas preset pilihan</h2>
              <p className="section-head__lead">
                Tonton langsung 17 hasil render asli After Effects lalu bandingkan
                dengan video original sebelum memesan.
              </p>
            </div>

            <VideoPresetShowcase
              selectedPresetId={selectedPresetId}
              onSelectPresetId={setSelectedPresetId}
            />
          </div>
        </section>

        <section className="services" id="layanan">
          <div className="container services__grid">
            <div className="services__intro">
              <h2 className="services__title">Dua layanan dalam satu alur</h2>
              <p className="services__body">
                Pesan peningkatan kualitas Topaz Labs, color correction After Effects, atau gabungkan
                keduanya untuk satu klip.
              </p>
            </div>

            <ul className="services__list">
              <li className="services__row">
                <h3 className="services__row-title">Topaz Video Enhancement</h3>
                <p className="services__row-desc">
                  Upscale resolusi, pengurangan noise, dan penajaman detail agar klip terlihat jernih
                  tanpa artefak kasar.
                </p>
              </li>
              <li className="services__row">
                <h3 className="services__row-title">Color Correction After Effects</h3>
                <p className="services__row-desc">
                  Pewarnaan konsisten memakai pilihan preset CC dari katalog yang disesuaikan dengan
                  pencahayaan klip aslimu.
                </p>
              </li>
              <li className="services__row">
                <h3 className="services__row-title">Paket Gabung Topaz dan CC</h3>
                <p className="services__row-desc">
                  Klip ditingkatkan dulu lewat Topaz Labs lalu dipoles warna di After Effects dalam satu
                  file hasil akhir.
                </p>
              </li>
            </ul>
          </div>
        </section>

        <section className="statement-band" aria-label="Ringkasan hasil pengerjaan">
          <img
            className="statement-band__bg"
            src="/images/cloud-horizon-band.jpg"
            alt="Hamparan awan putih di bawah langit biru cerah"
            width={1920}
            height={1080}
            loading="lazy"
          />
          <div className="statement-band__scrim" aria-hidden="true" />
          <div className="container statement-band__inner">
            <p className="statement-band__quote">
              Klip mentahmu naik kelas jadi jernih, halus, dan seragam warnanya.
            </p>
            <svg
              className="statement-band__plane"
              width="96"
              height="56"
              viewBox="0 0 96 56"
              fill="none"
              aria-hidden="true"
            >
              <path d="M0 26L96 0L40 36Z" fill="#FAFDFF" />
              <path d="M40 36L96 0L47 56Z" fill="#B0D6F8" />
              <path d="M47 56L96 0L54 42Z" fill="#D0E8FC" />
              <path d="M54 42L96 0L82 52Z" fill="#E4F2FE" />
            </svg>
          </div>
        </section>

        <section className="steps-sec" id="cara-pesan">
          <div className="container">
            <h2 className="steps-sec__title">Tiga langkah sampai file siap unggah</h2>
            <ol className="steps-list">
              <li className="steps-list__item">
                <h3 className="steps-list__head">Kirim klip dan pilih preset</h3>
                <p className="steps-list__desc">
                  Bagikan tautan video mentah beserta nomor preset CC pilihanmu dari katalog video di
                  atas.
                </p>
              </li>
              <li className="steps-list__item">
                <h3 className="steps-list__head">Proses Topaz dan After Effects</h3>
                <p className="steps-list__desc">
                  Video di-enhance dan diberi color correction sesuai permintaan tanpa mengubah isi klip.
                </p>
              </li>
              <li className="steps-list__item">
                <h3 className="steps-list__head">Terima file siap unggah</h3>
                <p className="steps-list__desc">
                  Hasil akhir dikirim dalam kualitas terbaik sesuai resolusi yang disepakati.
                </p>
              </li>
            </ol>
          </div>
        </section>

        <section className="closing-band" id="kontak">
          <img
            className="statement-band__bg"
            src="/images/cloud-horizon-band.jpg"
            alt="Langit biru cerah dengan awan cumulus di tepi cakrawala"
            width={1920}
            height={1080}
            loading="lazy"
          />
          <div className="statement-band__scrim" aria-hidden="true" />
          <div className="container closing-band__inner">
            <h2 className="closing-band__title">Siap merapikan klip berikutnya</h2>
            <p className="closing-band__lead">
              Kirim tautan klip dan nomor preset CC langsung ke Zyou untuk cek harga dan antrean.
            </p>
            <div className="closing-band__actions">
              <a
                className="btn"
                href={closingPresetOrderUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Mau order? Klik ini
              </a>
              <a
                className="btn btn--ghost-sky"
                href={closingTopazOrderUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Order Topaz only
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container site-footer__inner">
          <div className="site-footer__brand">
            <a className="wordmark site-footer__wordmark" href="#top">
              topaz by zyou
            </a>
            <p className="site-footer__tagline">
              Jasa video enhancement Topaz Labs dan color correction After Effects.
            </p>
          </div>

          <div className="site-footer__right">
            <ul className="site-footer__links">
              <li>
                <a href="#preset-cc">Preset CC</a>
              </li>
              <li>
                <a href="#layanan">Layanan</a>
              </li>
              <li>
                <a href="#cara-pesan">Cara pesan</a>
              </li>
            </ul>
            <p className="site-footer__copy">© 2026 Zyou</p>
          </div>
        </div>
      </footer>
    </>
  );
}
