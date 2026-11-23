import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import {
  createIdentityLut3D,
  loadHaldLutFromUrl,
  loadImageElement,
  type Lut3DData,
} from '../engine/lut-loader';
import { WebGLCCEngine, type SpatialFxParams } from '../engine/webgl-cc-engine';
import { CC_PRESETS, SAMPLE_MEDIA, formatOrderMessage } from '../data/presets';
import { CalibrationDrawer } from './CalibrationDrawer';

interface CCTesterProps {
  selectedPresetId: string;
  onSelectPresetId: (id: string) => void;
  calibrationOpen: boolean;
  onCloseCalibration: () => void;
}

export function CCTester({
  selectedPresetId,
  onSelectPresetId,
  calibrationOpen,
  onCloseCalibration,
}: CCTesterProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<WebGLCCEngine | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const sourceImageRef = useRef<HTMLImageElement | null>(null);
  const activeMediaRef = useRef<'image' | 'video'>('image');
  const customUrlRef = useRef<string | null>(null);

  const [sourceMode, setSourceMode] = useState<'daylight' | 'night' | 'custom'>('daylight');
  const [mediaKind, setMediaKind] = useState<'image' | 'video'>('image');
  const [mediaAspect, setMediaAspect] = useState<{ w: number; h: number }>({ w: 16, h: 9 });
  const [customVideoUrl, setCustomVideoUrl] = useState<string | null>(null);
  const [mediaLabel, setMediaLabel] = useState('Sample Siang');

  const [splitPos, setSplitPos] = useState(0.5);
  const [mix, setMix] = useState(1);
  const [showOriginal, setShowOriginal] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [videoTime, setVideoTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);

  const [fxOverrides, setFxOverrides] = useState<Record<string, SpatialFxParams>>({});
  const [lutOverrides, setLutOverrides] = useState<Record<string, { lut: Lut3DData; label: string }>>({});
  const [thumbs, setThumbs] = useState<Record<string, string>>({});

  const [webglError, setWebglError] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [orderCopiedMsg, setOrderCopiedMsg] = useState('');

  const activePreset = useMemo(
    () => CC_PRESETS.find((p) => p.id === selectedPresetId) ?? CC_PRESETS[0],
    [selectedPresetId]
  );

  const activeFx = fxOverrides[activePreset.id] ?? activePreset.fx;
  const activeLutOverride = lutOverrides[activePreset.id];

  // Keep refs synced for rAF rendering loop
  const renderParamsRef = useRef({
    fx: activeFx,
    mix,
    splitPos,
    showOriginal,
  });
  renderParamsRef.current = { fx: activeFx, mix, splitPos, showOriginal };

  // Initialize WebGL2 engine once
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const engine = new WebGLCCEngine(canvas);
      engine.setLut(createIdentityLut3D(64));
      engineRef.current = engine;
      setWebglError(null);
      return () => {
        engine.dispose();
        engineRef.current = null;
      };
    } catch (err) {
      setWebglError(err instanceof Error ? err.message : 'WebGL2 tidak tersedia.');
      return undefined;
    }
  }, []);

  // Cleanup custom object URLs on unmount
  useEffect(() => {
    return () => {
      if (customUrlRef.current) URL.revokeObjectURL(customUrlRef.current);
    };
  }, []);

  const generateAllThumbnails = useCallback(async (source: HTMLImageElement | HTMLVideoElement) => {
    const engine = engineRef.current;
    if (!engine) return;

    const nextThumbs: Record<string, string> = {};
    for (const preset of CC_PRESETS) {
      try {
        const lut = lutOverrides[preset.id]?.lut ?? (await loadHaldLutFromUrl(preset.lutUrl));
        const fx = fxOverrides[preset.id] ?? preset.fx;
        const url = engine.renderThumbnailDataUrl(source, lut, fx);
        if (url) nextThumbs[preset.id] = url;
      } catch {
        // Keep previous thumb if a preset LUT failed to load
      }
    }

    // Restore main source and active LUT after thumbnail sweep
    engine.setSource(source);
    const currentLut =
      lutOverrides[activePreset.id]?.lut ?? (await loadHaldLutFromUrl(activePreset.lutUrl).catch(() => null));
    if (currentLut) engine.setLut(currentLut);
    const p = renderParamsRef.current;
    engine.setParams(p.fx, p.mix, p.splitPos, p.showOriginal);
    engine.render(0);

    setThumbs((prev) => ({ ...prev, ...nextThumbs }));
  }, [activePreset.id, activePreset.lutUrl, fxOverrides, lutOverrides]);

  // Load sample image whenever sample selection switches to daylight or night
  useEffect(() => {
    if (sourceMode === 'custom') return;
    const sample = SAMPLE_MEDIA.find((s) => s.id === sourceMode) ?? SAMPLE_MEDIA[0];
    let cancelled = false;
    setMediaKind('image');
    activeMediaRef.current = 'image';
    setIsPlaying(false);
    setMediaError(null);
    setMediaLabel(sample.label);

    loadImageElement(sample.src)
      .then((img) => {
        if (cancelled) return;
        sourceImageRef.current = img;
        setMediaAspect({ w: img.naturalWidth || 16, h: img.naturalHeight || 9 });
        const engine = engineRef.current;
        if (!engine) return;
        engine.setSource(img);
        const p = renderParamsRef.current;
        engine.setParams(p.fx, p.mix, p.splitPos, p.showOriginal);
        engine.render(0);
        void generateAllThumbnails(img);
      })
      .catch((err) => {
        if (!cancelled) {
          setMediaError(err instanceof Error ? err.message : 'Gagal memuat sample gambar.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [sourceMode, generateAllThumbnails]);

  // Load active preset LUT and render immediately on change
  useEffect(() => {
    let cancelled = false;
    const applyPreset = async () => {
      const engine = engineRef.current;
      if (!engine) return;
      try {
        const lut = activeLutOverride?.lut ?? (await loadHaldLutFromUrl(activePreset.lutUrl));
        if (cancelled) return;
        engine.setLut(lut);
        engine.setParams(activeFx, mix, splitPos, showOriginal);
        engine.render(videoRef.current?.currentTime ?? 0);
      } catch {
        // Fallback identity LUT stays bound
      }
    };
    void applyPreset();
    return () => {
      cancelled = true;
    };
  }, [activePreset, activeFx, activeLutOverride, mix, splitPos, showOriginal]);

  // Re-render live image/paused video instantaneously when sliders move
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.setParams(activeFx, mix, splitPos, showOriginal);
    engine.render(videoRef.current?.currentTime ?? 0);
  }, [activeFx, mix, splitPos, showOriginal]);

  // Video animation frame loop
  useEffect(() => {
    if (mediaKind !== 'video') return;
    let rafId = 0;

    const tick = () => {
      const video = videoRef.current;
      const engine = engineRef.current;
      if (video && engine && video.readyState >= 2) {
        engine.setSource(video);
        const p = renderParamsRef.current;
        engine.setParams(p.fx, p.mix, p.splitPos, p.showOriginal);
        engine.render(video.currentTime);
        setVideoTime(video.currentTime);
      }
      if (video && !video.paused && !video.ended) {
        rafId = requestAnimationFrame(tick);
      }
    };

    if (isPlaying) {
      rafId = requestAnimationFrame(tick);
    }
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [isPlaying, mediaKind]);

  const handleUserFile = async (file: File) => {
    setMediaError(null);
    const isVideoFile = file.type.startsWith('video/') || /\.(mp4|mov|webm|m4v)$/i.test(file.name);
    const isImageFile = file.type.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(file.name);

    if (!isVideoFile && !isImageFile) {
      setMediaError('Format belum didukung. Gunakan foto JPG/PNG/WebP atau video MP4/MOV/WebM.');
      return;
    }

    if (customUrlRef.current) URL.revokeObjectURL(customUrlRef.current);
    const objectUrl = URL.createObjectURL(file);
    customUrlRef.current = objectUrl;
    setSourceMode('custom');
    setMediaLabel(file.name);

    if (isImageFile) {
      setCustomVideoUrl(null);
      setMediaKind('image');
      activeMediaRef.current = 'image';
      setIsPlaying(false);
      try {
        const img = await loadImageElement(objectUrl);
        sourceImageRef.current = img;
        setMediaAspect({ w: img.naturalWidth || 16, h: img.naturalHeight || 9 });
        const engine = engineRef.current;
        if (engine) {
          engine.setSource(img);
          engine.setParams(activeFx, mix, splitPos, showOriginal);
          engine.render(0);
          void generateAllThumbnails(img);
        }
      } catch {
        setMediaError('Foto tidak bisa dibaca browser. Coba file JPG atau PNG lain.');
      }
    } else {
      setMediaKind('video');
      activeMediaRef.current = 'video';
      setCustomVideoUrl(objectUrl);
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      setIsPlaying(!reducedMotion);
    }
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleUserFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) void handleUserFile(file);
  };

  const handleVideoLoadedData = () => {
    const video = videoRef.current;
    const engine = engineRef.current;
    if (!video || !engine) return;
    setMediaAspect({ w: video.videoWidth || 16, h: video.videoHeight || 9 });
    setVideoDuration(Number.isFinite(video.duration) ? video.duration : 0);
    video.muted = isMuted;
    engine.setSource(video);
    engine.setParams(activeFx, mix, splitPos, showOriginal);
    engine.render(video.currentTime);
    void generateAllThumbnails(video);

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reducedMotion && isPlaying) {
      void video.play().catch(() => setIsPlaying(false));
    }
  };

  const toggleVideoPlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused || video.ended) {
      void video
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    const next = !isMuted;
    setIsMuted(next);
    if (video) video.muted = next;
  };

  const handleScrubVideo = (time: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = time;
    setVideoTime(time);
  };

  const handleVideoSeeked = () => {
    const video = videoRef.current;
    const engine = engineRef.current;
    if (!video || !engine || video.readyState < 2) return;
    engine.setSource(video);
    engine.setParams(activeFx, mix, splitPos, showOriginal);
    engine.render(video.currentTime);
  };

  const handleCopyOrder = async () => {
    const text = formatOrderMessage(activePreset);
    try {
      await navigator.clipboard.writeText(text);
      setOrderCopiedMsg(`Format order untuk ${activePreset.name} tersalin.`);
    } catch {
      setOrderCopiedMsg(text);
    }
  };

  const splitPercent = Math.round(splitPos * 100);
  const mixPercent = Math.round(mix * 100);

  return (
    <div className="tester">
      <div className="tester__bar">
        <div className="tester__sources" role="group" aria-label="Sumber media uji color correction">
          {SAMPLE_MEDIA.map((sample) => (
            <button
              key={sample.id}
              type="button"
              className="btn btn--quiet"
              aria-pressed={sourceMode === sample.id}
              onClick={() => setSourceMode(sample.id as 'daylight' | 'night')}
            >
              {sample.label}
            </button>
          ))}

          <label className="btn btn--quiet" htmlFor="cc-upload-media">
            Uji foto atau video
          </label>
          <input
            id="cc-upload-media"
            className="tester__upload-input"
            type="file"
            accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
            onChange={handleFileInput}
          />
        </div>

        <span className="tester__honest-note">
          Media aktif: {mediaLabel} (diproses lokal di GPU perangkatmu)
        </span>
      </div>

      {webglError ? (
        <p className="tester__error" role="alert">
          {webglError}
        </p>
      ) : null}

      {mediaError ? (
        <p className="tester__error" role="alert">
          {mediaError}
        </p>
      ) : null}

      <div className="tester__stage">
        <div
          className="tester__viewport"
          style={{ aspectRatio: `${mediaAspect.w} / ${mediaAspect.h}` }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <canvas
            ref={canvasRef}
            className="tester__canvas"
            aria-label={`Pratinjau simulasi color correction ${activePreset.name}`}
          />

          {mediaKind === 'video' && customVideoUrl ? (
            <video
              ref={videoRef}
              src={customVideoUrl}
              poster="/samples/sample-daylight.jpg"
              playsInline
              muted={isMuted}
              loop
              className="visually-hidden"
              onLoadedData={handleVideoLoadedData}
              onSeeked={handleVideoSeeked}
              onError={() =>
                setMediaError('Video tidak bisa diputar di browser ini. Coba format MP4 H.264 atau WebM.')
              }
            />
          ) : null}

          <span className="tester__badge tester__badge--left">Asli</span>
          <span className="tester__badge tester__badge--right">
            {showOriginal ? 'Asli' : 'Simulasi CC'}
          </span>

          {!showOriginal ? (
            <div className="tester__split-line" style={{ left: `${splitPercent}%` }} aria-hidden="true">
              <div className="tester__split-knob">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path
                    d="M5 3L1 7L5 11M9 3L13 7L9 11"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
          ) : null}

          <input
            type="range"
            min={0}
            max={100}
            value={splitPercent}
            aria-label="Geser pembanding asli dan simulasi CC"
            className="tester__split-range"
            onChange={(e) => setSplitPos(Number(e.target.value) / 100)}
          />
        </div>

        <div className="tester__controls">
          <div className="tester__slider-group">
            <label className="tester__slider-label" htmlFor="cc-mix-range">
              Intensitas ({mixPercent}%)
            </label>
            <input
              id="cc-mix-range"
              type="range"
              min={0}
              max={100}
              value={mixPercent}
              className="tester__range"
              onChange={(e) => setMix(Number(e.target.value) / 100)}
            />
          </div>

          <div className="tester__sources">
            <button
              type="button"
              className="btn btn--quiet"
              aria-pressed={showOriginal}
              onPointerDown={() => setShowOriginal(true)}
              onPointerUp={() => setShowOriginal(false)}
              onPointerLeave={() => setShowOriginal(false)}
              onPointerCancel={() => setShowOriginal(false)}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') setShowOriginal(true);
              }}
              onKeyUp={() => setShowOriginal(false)}
            >
              Tahan lihat asli
            </button>
          </div>
        </div>

        {mediaKind === 'video' ? (
          <div className="tester__video-bar">
            <button type="button" className="btn btn--quiet" onClick={toggleVideoPlay}>
              {isPlaying ? 'Jeda video' : 'Putar video'}
            </button>
            <input
              type="range"
              min={0}
              max={videoDuration || 1}
              step={0.02}
              value={videoTime}
              aria-label="Geser posisi waktu video"
              className="tester__video-scrubber"
              onChange={(e) => handleScrubVideo(Number(e.target.value))}
            />
            <button type="button" className="btn btn--quiet" onClick={toggleMute}>
              {isMuted ? 'Nyalakan suara' : 'Bisukan'}
            </button>
          </div>
        ) : null}

        <div className="tester__footer">
          <div className="tester__meta">
            <strong className="tester__active-name">
              {activePreset.name}
              {activeLutOverride ? ` (${activeLutOverride.label})` : ''}
            </strong>
            <p className="tester__honest-note">
              Simulasi pratinjau warna di browser. Hasil akhir tetap dirender penuh di After Effects dan plugin asli.
            </p>
          </div>
          <div className="tester__order-wrap">
            <button type="button" className="btn" onClick={handleCopyOrder}>
              Salin pesan order
            </button>
            {orderCopiedMsg ? (
              <span className="tester__feedback" aria-live="polite">
                {orderCopiedMsg}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {calibrationOpen ? (
        <CalibrationDrawer
          activePreset={activePreset}
          fx={activeFx}
          onChangeFx={(next) => setFxOverrides((prev) => ({ ...prev, [activePreset.id]: next }))}
          onUploadLut={(lut, label) => {
            setLutOverrides((prev) => ({ ...prev, [activePreset.id]: { lut, label } }));
            const activeSource =
              activeMediaRef.current === 'video' ? videoRef.current : sourceImageRef.current;
            if (activeSource && engineRef.current) {
              const dataUrl = engineRef.current.renderThumbnailDataUrl(activeSource, lut, activeFx);
              if (dataUrl) setThumbs((prev) => ({ ...prev, [activePreset.id]: dataUrl }));
            }
          }}
          onResetPreset={() => {
            setFxOverrides((prev) => {
              const copy = { ...prev };
              delete copy[activePreset.id];
              return copy;
            });
            setLutOverrides((prev) => {
              const copy = { ...prev };
              delete copy[activePreset.id];
              return copy;
            });
          }}
          onClose={onCloseCalibration}
        />
      ) : null}

      <div className="preset-grid" role="group" aria-label="Pilihan 9 preset color correction">
        {CC_PRESETS.map((preset) => {
          const isSelected = preset.id === activePreset.id;
          const thumbUrl = thumbs[preset.id];
          return (
            <button
              key={preset.id}
              type="button"
              className="preset-card"
              aria-pressed={isSelected}
              onClick={() => onSelectPresetId(preset.id)}
            >
              <figure
                className="preset-card__slot"
                data-slot={preset.id}
                data-alt={`Pratinjau ${preset.name}`}
              >
                {thumbUrl ? (
                  <img
                    className="preset-card__thumb"
                    src={thumbUrl}
                    alt={`Simulasi ${preset.name} pada ${mediaLabel}`}
                    width={400}
                    height={250}
                  />
                ) : (
                  <div className="preset-card__empty">
                    <span>Memuat pratinjau {preset.name}</span>
                  </div>
                )}
              </figure>
              <div className="preset-card__chin">
                <div>
                  <h3 className="preset-card__name">{preset.name}</h3>
                  <p className="preset-card__desc">{preset.description}</p>
                </div>
                <span className="preset-card__num num">{preset.number}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
