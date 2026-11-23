import { useEffect, useState, type ChangeEvent } from 'react';
import {
  loadImageElement,
  parseCubeLut,
  unpackHaldImageTo3D,
  type Lut3DData,
} from '../engine/lut-loader';
import type { SpatialFxParams } from '../engine/webgl-cc-engine';
import type { CCPreset } from '../data/presets';

interface CalibrationDrawerProps {
  activePreset: CCPreset;
  fx: SpatialFxParams;
  onChangeFx: (next: SpatialFxParams) => void;
  onUploadLut: (lut: Lut3DData, label: string) => void;
  onResetPreset: () => void;
  onClose: () => void;
}

const TINT_OPTIONS: { id: string; label: string; rgb: [number, number, number] }[] = [
  { id: 'neutral', label: 'Netral', rgb: [1, 1, 1] },
  { id: 'cool', label: 'Biru Langit', rgb: [0.9, 0.96, 1] },
  { id: 'warm', label: 'Hangat Emas', rgb: [1, 0.92, 0.8] },
];

export function CalibrationDrawer({
  activePreset,
  fx,
  onChangeFx,
  onUploadLut,
  onResetPreset,
  onClose,
}: CalibrationDrawerProps) {
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [aeRefUrl, setAeRefUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (aeRefUrl) URL.revokeObjectURL(aeRefUrl);
    };
  }, [aeRefUrl]);

  const updateField = (key: keyof SpatialFxParams, value: number | [number, number, number]) => {
    onChangeFx({ ...fx, [key]: value });
  };

  const handleLutFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg('');
    setStatusMsg('');

    try {
      if (file.name.toLowerCase().endsWith('.cube')) {
        const text = await file.text();
        const lut = parseCubeLut(text);
        onUploadLut(lut, file.name);
        setStatusMsg(`LUT .cube dimuat: ${file.name} (${lut.size}x${lut.size}x${lut.size}).`);
      } else {
        const objUrl = URL.createObjectURL(file);
        try {
          const img = await loadImageElement(objUrl);
          const lut = unpackHaldImageTo3D(img);
          onUploadLut(lut, file.name);
          setStatusMsg(`Hald CLUT PNG dimuat: ${file.name} (${lut.size}x${lut.size}x${lut.size}).`);
        } finally {
          URL.revokeObjectURL(objUrl);
        }
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal membaca file LUT.');
    }
    e.target.value = '';
  };

  const handleAeRefFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (aeRefUrl) URL.revokeObjectURL(aeRefUrl);
    setAeRefUrl(URL.createObjectURL(file));
    e.target.value = '';
  };

  const handleCopyJson = async () => {
    const payload = JSON.stringify(
      {
        presetId: activePreset.id,
        name: activePreset.name,
        fx,
        isCalibrated: true,
      },
      null,
      2
    );
    try {
      await navigator.clipboard.writeText(payload);
      setStatusMsg(`Konfigurasi ${activePreset.name} tersalin ke clipboard.`);
    } catch {
      setStatusMsg('Clipboard diblokir browser. Cek console atau salin manual.');
      console.info(payload);
    }
  };

  const currentTintId =
    TINT_OPTIONS.find(
      (opt) =>
        Math.abs(opt.rgb[0] - fx.glowTint[0]) < 0.03 &&
        Math.abs(opt.rgb[1] - fx.glowTint[1]) < 0.03 &&
        Math.abs(opt.rgb[2] - fx.glowTint[2]) < 0.03
    )?.id ?? 'neutral';

  return (
    <aside className="cal-drawer" aria-label="Panel kalibrasi preset AE">
      <div className="cal-drawer__head">
        <div>
          <h3 className="cal-drawer__title">Mode Kalibrasi Zyou ({activePreset.name})</h3>
          <p className="tester__honest-note">
            Muat Hald CLUT PNG (512x512) atau file .cube dari After Effects lalu sesuaikan efek spasialnya.
          </p>
        </div>
        <div className="tester__sources">
          <label className="btn btn--quiet" htmlFor="cal-lut-upload">
            Muat Hald PNG / .cube
          </label>
          <input
            id="cal-lut-upload"
            className="tester__upload-input"
            type="file"
            accept=".png,.cube,image/png"
            onChange={handleLutFile}
          />
          <label className="btn btn--quiet" htmlFor="cal-ae-ref">
            Upload Render AE Asli
          </label>
          <input
            id="cal-ae-ref"
            className="tester__upload-input"
            type="file"
            accept="image/*"
            onChange={handleAeRefFile}
          />
          <button type="button" className="btn btn--quiet" onClick={onResetPreset}>
            Reset preset
          </button>
          <button type="button" className="btn" onClick={handleCopyJson}>
            Salin JSON preset
          </button>
          <button type="button" className="btn btn--quiet" onClick={onClose}>
            Tutup
          </button>
        </div>
      </div>

      {errorMsg ? (
        <p className="tester__error" role="alert">
          {errorMsg}
        </p>
      ) : null}

      {statusMsg ? (
        <p className="tester__feedback" aria-live="polite">
          {statusMsg}
        </p>
      ) : null}

      <div className="cal-drawer__grid">
        <div className="cal-field">
          <label htmlFor="cal-glow-int">
            <span>Glow Intensity (S_Glow / Deep Glow)</span>
            <span className="num">{fx.glowIntensity.toFixed(2)}</span>
          </label>
          <input
            id="cal-glow-int"
            type="range"
            min={0}
            max={1.5}
            step={0.02}
            value={fx.glowIntensity}
            onChange={(e) => updateField('glowIntensity', Number(e.target.value))}
          />
        </div>

        <div className="cal-field">
          <label htmlFor="cal-glow-thresh">
            <span>Glow Threshold</span>
            <span className="num">{fx.glowThreshold.toFixed(2)}</span>
          </label>
          <input
            id="cal-glow-thresh"
            type="range"
            min={0.2}
            max={0.98}
            step={0.02}
            value={fx.glowThreshold}
            onChange={(e) => updateField('glowThreshold', Number(e.target.value))}
          />
        </div>

        <div className="cal-field">
          <label htmlFor="cal-glow-rad">
            <span>Glow Radius</span>
            <span className="num">{fx.glowRadius.toFixed(2)}</span>
          </label>
          <input
            id="cal-glow-rad"
            type="range"
            min={0.05}
            max={1}
            step={0.02}
            value={fx.glowRadius}
            onChange={(e) => updateField('glowRadius', Number(e.target.value))}
          />
        </div>

        <div className="cal-field">
          <label htmlFor="cal-soft">
            <span>Soft / Dreamy Blur (Orton)</span>
            <span className="num">{fx.softFocus.toFixed(2)}</span>
          </label>
          <input
            id="cal-soft"
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={fx.softFocus}
            onChange={(e) => updateField('softFocus', Number(e.target.value))}
          />
        </div>

        <div className="cal-field">
          <label htmlFor="cal-sharpen">
            <span>Sharpen / Clarity (Unsharp)</span>
            <span className="num">{fx.sharpen.toFixed(2)}</span>
          </label>
          <input
            id="cal-sharpen"
            type="range"
            min={0}
            max={1.5}
            step={0.02}
            value={fx.sharpen}
            onChange={(e) => updateField('sharpen', Number(e.target.value))}
          />
        </div>

        <div className="cal-field">
          <label htmlFor="cal-vignette">
            <span>Vignette</span>
            <span className="num">{fx.vignette.toFixed(2)}</span>
          </label>
          <input
            id="cal-vignette"
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={fx.vignette}
            onChange={(e) => updateField('vignette', Number(e.target.value))}
          />
        </div>

        <div className="cal-field">
          <label htmlFor="cal-grain">
            <span>Film Grain</span>
            <span className="num">{fx.grain.toFixed(2)}</span>
          </label>
          <input
            id="cal-grain"
            type="range"
            min={0}
            max={0.35}
            step={0.01}
            value={fx.grain}
            onChange={(e) => updateField('grain', Number(e.target.value))}
          />
        </div>

        <div className="cal-field">
          <label htmlFor="cal-ca">
            <span>Chromatic Aberration</span>
            <span className="num">{fx.chromaticAberration.toFixed(2)}</span>
          </label>
          <input
            id="cal-ca"
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={fx.chromaticAberration}
            onChange={(e) => updateField('chromaticAberration', Number(e.target.value))}
          />
        </div>

        <div className="cal-field">
          <label>
            <span>Warna Glow Tint</span>
          </label>
          <div className="tester__sources">
            {TINT_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className="btn btn--quiet"
                aria-pressed={currentTintId === opt.id}
                onClick={() => updateField('glowTint', opt.rgb)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {aeRefUrl ? (
        <div className="cal-compare">
          <div>
            <p className="tester__slider-label">Pembanding Render AE Asli</p>
            <img src={aeRefUrl} alt="Frame hasil render asli After Effects untuk kalibrasi" />
          </div>
          <div>
            <p className="tester__honest-note">
              Bandingkan pendar cahaya, ketajaman tepi, dan vignette pada frame AE asli di kiri dengan
              canvas simulator WebGL2 di atas.
            </p>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
