import { useEffect, useState } from 'react';
import { CC_PRESETS, formatOrderMessage } from './data/presets';
import { CCTester } from './components/CCTester';

export function App() {
  const [selectedPresetId, setSelectedPresetId] = useState(CC_PRESETS[2].id);
  const [calibrationOpen, setCalibrationOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('calibrate') === '1';
  });
  const [ctaCopied, setCtaCopied] = useState('');

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        setCalibrationOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const activePreset = CC_PRESETS.find((p) => p.id === selectedPresetId) ?? CC_PRESETS[0];

  const handleCopyFromClosing = async () => {
    const msg = formatOrderMessage(activePreset);
    try {
      await navigator.clipboard.writeText(msg);
      setCtaCopied(`Format pesan untuk ${activePreset.name} tersalin.`);
    } catch {
      setCtaCopied(msg);
    }
  };

  return (
    <>
      <a className="skip" href="#preset-cc">
        Lewati ke simulator preset CC
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
                Coba 9 preset CC
              </a>
              <a className="btn btn--ghost-sky" href="#cara-pesan">
                Cara pemesanan
              </a>
            </div>
          </div>

          <div className="hero__collage" aria-hidden="true">
            <div className="polaroid-hero polaroid-hero--left">
              <div className="polaroid-hero__screen">
                <div className="polaroid-hero__reticle" />
                <span className="polaroid-hero__caption-in">Pratinjau klip</span>
              </div>
              <span className="polaroid-hero__label">CC Soft Clean</span>
            </div>

            <div className="polaroid-hero polaroid-hero--right">
              <div className="polaroid-hero__screen polaroid-hero__screen--loupe">
                <div className="polaroid-hero__loupe" />
                <span className="polaroid-hero__caption-in">Detail tajam</span>
              </div>
              <span className="polaroid-hero__label">Topaz + Sharpen</span>
            </div>

            <div className="polaroid-hero polaroid-hero--front">
              <div className="polaroid-hero__screen polaroid-hero__screen--split">
                <div className="polaroid-hero__half polaroid-hero__half--raw">
                  <span className="polaroid-hero__tag">Asli</span>
                </div>
                <div className="polaroid-hero__half polaroid-hero__half--cc">
                  <span className="polaroid-hero__tag polaroid-hero__tag--dark">Topaz + CC</span>
                </div>
                <div className="polaroid-hero__divider" />
                <div className="polaroid-hero__handle">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path
                      d="M5 3L1 7L5 11M9 3L13 7L9 11"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
              <span className="polaroid-hero__label">CC Soft Fresh</span>
            </div>

            <svg
              className="hero__sparkle"
              width="34"
              height="34"
              viewBox="0 0 34 34"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M12 4L14.5 11.5L22 14L14.5 16.5L12 24L9.5 16.5L2 14L9.5 11.5L12 4Z"
                fill="currentColor"
              />
              <path
                d="M27 0L28.4 4.2L32.6 5.6L28.4 7L27 11.2L25.6 7L21.4 5.6L25.6 4.2L27 0Z"
                fill="currentColor"
              />
            </svg>

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
              <h2 className="section-head__title">Uji sembilan preset color correction</h2>
              <p className="section-head__lead">
                Coba langsung tampilan warna Preset 1 sampai Preset 9 memakai sample atau foto dan video
                milikmu sendiri sebelum memesan.
              </p>
            </div>

            <CCTester
              selectedPresetId={selectedPresetId}
              onSelectPresetId={setSelectedPresetId}
              calibrationOpen={calibrationOpen}
              onCloseCalibration={() => setCalibrationOpen(false)}
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
                  Pewarnaan konsisten memakai Preset 1 sampai Preset 9 yang disesuaikan dengan pencahayaan
                  klip aslimu.
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
                  Bagikan tautan video mentah beserta nomor preset CC pilihanmu dari simulator di atas.
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
              <button type="button" className="btn" onClick={handleCopyFromClosing}>
                Salin format pesanan ({activePreset.number})
              </button>
              <span className="fill-contact">Isi WhatsApp atau IG @zyou</span>
            </div>
            {ctaCopied ? (
              <p className="closing-band__feedback" aria-live="polite">
                {ctaCopied}
              </p>
            ) : null}
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
              <li>
                <button
                  type="button"
                  className="site-footer__cal-btn"
                  onClick={() => setCalibrationOpen((v) => !v)}
                >
                  {calibrationOpen ? 'Tutup kalibrasi' : 'Kalibrasi Zyou'}
                </button>
              </li>
            </ul>
            <p className="site-footer__copy">© 2026 Zyou</p>
          </div>
        </div>
      </footer>
    </>
  );
}
