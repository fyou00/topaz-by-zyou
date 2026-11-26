import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  CC_PRESETS,
  ORIGINAL_CLIP,
  TOPAZ_ONLY_ORDER_MESSAGE,
  buildWhatsAppOrderUrl,
  formatOrderMessage,
} from '../data/presets';
import videoManifest from '../data/video-manifest.json';
import { resolvePosterUrl, resolveVideoUrl } from '../lib/media-url';

interface ManifestClipEntry {
  file: string;
  poster: string;
  hasPoster: boolean;
  width: number;
  height: number;
  duration: number;
  sizeBytes: number;
}

interface VideoPresetShowcaseProps {
  selectedPresetId: string;
  onSelectPresetId: (id: string) => void;
}

const PRESET_MANIFEST = videoManifest.presets as Record<string, ManifestClipEntry | undefined>;
const ORIGINAL_MANIFEST = videoManifest.original as ManifestClipEntry;

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
  const total = Math.floor(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function VideoPresetShowcase({ selectedPresetId, onSelectPresetId }: VideoPresetShowcaseProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cardRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const resumeTimeRef = useRef(0);
  const wasPlayingRef = useRef(false);

  const [viewMode, setViewMode] = useState<'preset' | 'original'>('preset');
  const [videoStatus, setVideoStatus] = useState<'loading' | 'ready' | 'missing'>('loading');
  const [mediaAspect, setMediaAspect] = useState<{ w: number; h: number }>({ w: 16, h: 9 });
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [failedPosters, setFailedPosters] = useState<Record<string, boolean>>({});

  const activeIndex = useMemo(() => {
    const idx = CC_PRESETS.findIndex((p) => p.id === selectedPresetId);
    return idx >= 0 ? idx : 0;
  }, [selectedPresetId]);

  const activePreset = CC_PRESETS[activeIndex];

  const activeClip = viewMode === 'original' ? ORIGINAL_CLIP : activePreset;
  const activeManifest =
    viewMode === 'original' ? ORIGINAL_MANIFEST : PRESET_MANIFEST[activePreset.id];

  const activeVideoUrl = resolveVideoUrl(activeClip.videoFile, videoManifest.version);
  const activePosterUrl =
    activeManifest?.hasPoster && !failedPosters[activeClip.id]
      ? resolvePosterUrl(activeClip.posterFile, videoManifest.version)
      : undefined;

  // Reset stage metadata when switching active video clip
  useEffect(() => {
    setVideoStatus('loading');
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(activeManifest?.duration && activeManifest.duration > 0 ? activeManifest.duration : 0);
    setMediaAspect({
      w: activeManifest?.width && activeManifest.width > 0 ? activeManifest.width : 16,
      h: activeManifest?.height && activeManifest.height > 0 ? activeManifest.height : 9,
    });
  }, [activeVideoUrl, activeManifest]);

  // Auto-pause video when scrolled out of viewport to save CPU and bandwidth
  useEffect(() => {
    const stageEl = stageRef.current;
    if (!stageEl || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const video = videoRef.current;
        if (!entry?.isIntersecting && video && !video.paused) {
          video.pause();
          setIsPlaying(false);
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(stageEl);
    return () => observer.disconnect();
  }, []);

  const capturePlaybackState = () => {
    const video = videoRef.current;
    if (video && videoStatus === 'ready') {
      resumeTimeRef.current = video.currentTime;
      wasPlayingRef.current = !video.paused && !video.ended;
    } else {
      resumeTimeRef.current = 0;
      wasPlayingRef.current = false;
    }
  };

  const handleSelectViewMode = (mode: 'preset' | 'original') => {
    if (mode === viewMode) return;
    capturePlaybackState();
    setViewMode(mode);
  };

  const handleSelectPresetCard = (presetId: string) => {
    const switchingPreset = presetId !== activePreset.id || viewMode !== 'preset';
    if (switchingPreset) {
      capturePlaybackState();
      setViewMode('preset');
      onSelectPresetId(presetId);
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobileViewport = window.matchMedia('(max-width: 44rem)').matches;
    const isStackedTabletViewport = window.matchMedia('(max-width: 64rem)').matches;

    if (isMobileViewport) {
      cardRefs.current[presetId]?.scrollIntoView({
        behavior: reducedMotion ? 'auto' : 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    } else if (isStackedTabletViewport) {
      stageRef.current?.scrollIntoView({
        behavior: reducedMotion ? 'auto' : 'smooth',
        block: 'nearest',
      });
    }
  };

  const handleStepPreset = (delta: -1 | 1) => {
    const nextIndex = (activeIndex + delta + CC_PRESETS.length) % CC_PRESETS.length;
    const nextPreset = CC_PRESETS[nextIndex];
    capturePlaybackState();
    setViewMode('preset');
    onSelectPresetId(nextPreset.id);

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    cardRefs.current[nextPreset.id]?.scrollIntoView({
      behavior: reducedMotion ? 'auto' : 'smooth',
      inline: 'center',
      block: 'nearest',
    });
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.videoWidth > 0 && video.videoHeight > 0) {
      setMediaAspect({ w: video.videoWidth, h: video.videoHeight });
    }

    const nextDuration = Number.isFinite(video.duration) ? video.duration : 0;
    setDuration(nextDuration);

    if (
      resumeTimeRef.current > 0 &&
      nextDuration > 0 &&
      resumeTimeRef.current < nextDuration - 0.1
    ) {
      video.currentTime = resumeTimeRef.current;
      setCurrentTime(resumeTimeRef.current);
    }
    resumeTimeRef.current = 0;
    setVideoStatus('ready');

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (wasPlayingRef.current && !reducedMotion) {
      void video
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
    wasPlayingRef.current = false;
  };

  const handleVideoError = () => {
    resumeTimeRef.current = 0;
    wasPlayingRef.current = false;
    setIsPlaying(false);
    setVideoStatus('missing');
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video || videoStatus !== 'ready') return;
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

  const handleScrub = (nextTime: number) => {
    const video = videoRef.current;
    if (!video || videoStatus !== 'ready') return;
    video.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const handleFullscreen = () => {
    const video = videoRef.current as
      | (HTMLVideoElement & { webkitEnterFullscreen?: () => void })
      | null;
    if (!video || videoStatus !== 'ready') return;
    if (video.requestFullscreen) {
      void video.requestFullscreen().catch(() => undefined);
    } else if (video.webkitEnterFullscreen) {
      video.webkitEnterFullscreen();
    }
  };

  const primaryOrderMessage =
    viewMode === 'original' ? TOPAZ_ONLY_ORDER_MESSAGE : formatOrderMessage(activePreset);
  const primaryOrderUrl = buildWhatsAppOrderUrl(primaryOrderMessage);
  const topazOnlyOrderUrl = buildWhatsAppOrderUrl(TOPAZ_ONLY_ORDER_MESSAGE);

  const aspectRatioNum = mediaAspect.w > 0 && mediaAspect.h > 0 ? mediaAspect.w / mediaAspect.h : 16 / 9;

  return (
    <div className="showcase">
      <div className="showcase__stage" ref={stageRef}>
        <div className="showcase__stage-canvas">
          <div
            className="showcase__media-box"
            style={
              {
                '--media-ar': `${mediaAspect.w} / ${mediaAspect.h}`,
                '--media-ar-num': String(Number(aspectRatioNum.toFixed(4))),
              } as CSSProperties
            }
          >
            {videoStatus !== 'missing' ? (
              <video
                key={activeVideoUrl}
                ref={videoRef}
                src={activeVideoUrl}
                poster={activePosterUrl}
                playsInline
                loop
                muted
                preload="metadata"
                className={`showcase__video${videoStatus === 'ready' ? ' is-ready' : ''}`}
                aria-label={`${activeClip.name}: ${activeClip.description}`}
                onClick={togglePlay}
                onLoadedMetadata={handleLoadedMetadata}
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onError={handleVideoError}
              />
            ) : null}

            {videoStatus === 'ready' ? (
              <span className="showcase__badge">
                {viewMode === 'original' ? 'Original' : activePreset.name}
              </span>
            ) : null}

            {videoStatus === 'loading' ? (
              <div className="showcase__placeholder" aria-live="polite">
                <span className="showcase__placeholder-title">Memuat {activeClip.name}...</span>
              </div>
            ) : null}

            {videoStatus === 'missing' ? (
              <div className="showcase__placeholder">
                <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
                  <circle cx="18" cy="18" r="16" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M15 12.5L24 18L15 23.5V12.5Z" fill="currentColor" />
                </svg>
                <p className="showcase__placeholder-title">{activeClip.name} siap diisi video .mp4</p>
                <p className="showcase__placeholder-desc">
                  Taruh file hasil render ke{' '}
                  <code className="showcase__placeholder-code">
                    web/public/videos/{activeClip.videoFile}
                  </code>{' '}
                  agar langsung tampil di sini.
                </p>
                {viewMode === 'original' ? (
                  <button
                    type="button"
                    className="btn btn--quiet"
                    onClick={() => handleSelectViewMode('preset')}
                  >
                    Kembali ke {activePreset.name}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        {videoStatus === 'ready' ? (
          <div className="showcase__video-bar">
            <button
              type="button"
              className="btn btn--quiet showcase__icon-btn"
              aria-label={isPlaying ? 'Jeda video' : 'Putar video'}
              aria-pressed={isPlaying}
              title={isPlaying ? 'Jeda' : 'Putar'}
              onClick={togglePlay}
            >
              {isPlaying ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <rect x="6.5" y="5" width="4.2" height="14" rx="2.1" />
                  <rect x="13.3" y="5" width="4.2" height="14" rx="2.1" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M8.5 6.35c0-1.16 1.26-1.88 2.26-1.29l8.42 4.95c.98.58.98 2.0 0 2.58l-8.42 4.95c-1 .59-2.26-.13-2.26-1.29V6.35z" />
                </svg>
              )}
            </button>

            <input
              type="range"
              min={0}
              max={duration || 1}
              step={0.05}
              value={currentTime}
              aria-label="Geser posisi waktu video"
              className="showcase__video-scrubber"
              onChange={(e) => handleScrub(Number(e.target.value))}
            />

            <span className="showcase__time num">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            <button
              type="button"
              className="btn btn--quiet showcase__icon-btn"
              aria-label={viewMode === 'original' ? 'Lihat hasil preset' : 'Bandingkan dengan video original'}
              aria-pressed={viewMode === 'original'}
              title={viewMode === 'original' ? 'Kembali ke hasil preset' : 'Bandingkan original'}
              onClick={() => handleSelectViewMode(viewMode === 'original' ? 'preset' : 'original')}
            >
              {viewMode === 'original' ? (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="3.5" y="4.5" width="17" height="15" rx="3" />
                  <line x1="12" y1="3" x2="12" y2="21" />
                  <rect x="6" y="7.5" width="4" height="9" rx="1" fill="currentColor" stroke="none" />
                </svg>
              ) : (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="3.5" y="4.5" width="17" height="15" rx="3" />
                  <line x1="12" y1="3" x2="12" y2="21" />
                  <rect x="14" y="7.5" width="4" height="9" rx="1" fill="currentColor" stroke="none" />
                </svg>
              )}
            </button>

            <button
              type="button"
              className="btn btn--quiet showcase__icon-btn"
              aria-label="Layar penuh"
              title="Layar penuh"
              onClick={handleFullscreen}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M4 9V6.2A2.2 2.2 0 0 1 6.2 4H9" />
                <path d="M15 4h2.8A2.2 2.2 0 0 1 20 6.2V9" />
                <path d="M20 15v2.8a2.2 2.2 0 0 1-2.2 2.2H15" />
                <path d="M9 20H6.2A2.2 2.2 0 0 1 4 17.8V15" />
              </svg>
            </button>
          </div>
        ) : null}

        <div className="showcase__footer">
          <div className="showcase__meta">
            <strong className="showcase__active-name">{activeClip.name}</strong>
            <p className="showcase__honest-note">{activeClip.description}</p>
          </div>
          <div className="showcase__order-wrap">
            <a
              className="btn"
              href={primaryOrderUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Mau order? Klik ini
            </a>
            {viewMode === 'preset' ? (
              <a
                className="btn btn--quiet"
                href={topazOnlyOrderUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Topaz only
              </a>
            ) : null}
          </div>
        </div>
      </div>

      <div className="showcase__catalog">
        <div className="preset-nav" aria-label="Navigasi urutan preset">
          <div className="preset-nav__meta">
            <span className="preset-nav__count num">
              {activePreset.number} / {CC_PRESETS.length}
            </span>
            <span className="preset-nav__hint">
              Pilih preset di grid atau pakai panah untuk ganti preview
            </span>
          </div>

          <div className="preset-nav__actions">
            <button
              type="button"
              className="btn btn--quiet showcase__icon-btn"
              aria-label="Preset sebelumnya"
              title="Preset sebelumnya"
              onClick={() => handleStepPreset(-1)}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M14.5 6.5L9 12l5.5 5.5" />
              </svg>
            </button>
            <button
              type="button"
              className="btn btn--quiet showcase__icon-btn"
              aria-label="Preset berikutnya"
              title="Preset berikutnya"
              onClick={() => handleStepPreset(1)}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M9.5 6.5L15 12l-5.5 5.5" />
              </svg>
            </button>
          </div>
        </div>

        <div className="preset-grid" role="group" aria-label="Pilihan 17 video preset">
          {CC_PRESETS.map((preset) => {
            const isSelected = preset.id === activePreset.id;
            const entry = PRESET_MANIFEST[preset.id];
            const showPoster = Boolean(entry?.hasPoster && !failedPosters[preset.id]);

            return (
              <button
                key={preset.id}
                ref={(el) => {
                  cardRefs.current[preset.id] = el;
                }}
                type="button"
                className="preset-card"
                aria-pressed={isSelected}
                title={`${preset.number} ${preset.name}: ${preset.description}`}
                onClick={() => handleSelectPresetCard(preset.id)}
              >
                <figure className="preset-card__slot" data-slot={preset.id}>
                  {showPoster ? (
                    <img
                      className="preset-card__thumb"
                      src={resolvePosterUrl(preset.posterFile, videoManifest.version)}
                      alt={`Cuplikan hasil ${preset.name}`}
                      width={400}
                      height={250}
                      loading="lazy"
                      onError={() =>
                        setFailedPosters((prev) => ({
                          ...prev,
                          [preset.id]: true,
                        }))
                      }
                    />
                  ) : (
                    <div className="preset-card__placeholder">
                      <span className="preset-card__play-badge" aria-hidden="true">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                          <path d="M7 5L15 10L7 15V5Z" fill="currentColor" />
                        </svg>
                      </span>
                      <span className="preset-card__slot-label">{preset.name}</span>
                      <span className="preset-card__slot-hint">Klik untuk lihat preview</span>
                    </div>
                  )}

                  {entry && entry.duration > 0 ? (
                    <span className="preset-card__duration num" data-keep="true">
                      {formatTime(entry.duration)}
                    </span>
                  ) : null}
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
    </div>
  );
}
