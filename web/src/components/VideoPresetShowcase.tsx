import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { CC_PRESETS, ORIGINAL_CLIP, formatOrderMessage } from '../data/presets';
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
  const resumeTimeRef = useRef(0);
  const wasPlayingRef = useRef(false);

  const [viewMode, setViewMode] = useState<'preset' | 'original'>('preset');
  const [videoStatus, setVideoStatus] = useState<'loading' | 'ready' | 'missing'>('loading');
  const [mediaAspect, setMediaAspect] = useState<{ w: number; h: number }>({ w: 16, h: 9 });
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [failedPosters, setFailedPosters] = useState<Record<string, boolean>>({});
  const [orderCopiedMsg, setOrderCopiedMsg] = useState('');

  const activePreset = useMemo(
    () => CC_PRESETS.find((p) => p.id === selectedPresetId) ?? CC_PRESETS[0],
    [selectedPresetId]
  );

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
    stageRef.current?.scrollIntoView({
      behavior: reducedMotion ? 'auto' : 'smooth',
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
    video.muted = isMuted;

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

  const toggleMute = () => {
    const video = videoRef.current;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (video) video.muted = nextMuted;
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

  const handleCopyOrder = async () => {
    const text = formatOrderMessage(activePreset);
    try {
      await navigator.clipboard.writeText(text);
      setOrderCopiedMsg(`Format order untuk ${activePreset.name} tersalin.`);
    } catch {
      setOrderCopiedMsg(text);
    }
  };

  const aspectRatioNum = mediaAspect.w > 0 && mediaAspect.h > 0 ? mediaAspect.w / mediaAspect.h : 16 / 9;

  return (
    <div className="showcase" ref={stageRef}>
      <div className="showcase__bar">
        <div className="showcase__sources" role="group" aria-label="Pilih tampilan klip">
          <button
            type="button"
            className="btn btn--quiet"
            aria-pressed={viewMode === 'original'}
            onClick={() => handleSelectViewMode('original')}
          >
            Video Original
          </button>
          <button
            type="button"
            className="btn btn--quiet"
            aria-pressed={viewMode === 'preset'}
            onClick={() => handleSelectViewMode('preset')}
          >
            {activePreset.name}
          </button>
        </div>

        <span className="showcase__honest-note">
          {viewMode === 'original'
            ? 'Klip mentah sebelum color correction'
            : 'Hasil render asli langsung dari After Effects'}
        </span>
      </div>

      <div className="showcase__stage">
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
                muted={isMuted}
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
                {viewMode === 'original' ? 'Original' : `Preset ${activePreset.number}`}
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
              </div>
            ) : null}
          </div>
        </div>

        {videoStatus === 'ready' ? (
          <div className="showcase__video-bar">
            <button type="button" className="btn btn--quiet" onClick={togglePlay}>
              {isPlaying ? 'Jeda' : 'Putar'}
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
            <button type="button" className="btn btn--quiet" onClick={toggleMute}>
              {isMuted ? 'Nyalakan suara' : 'Bisukan'}
            </button>
            <button type="button" className="btn btn--quiet" onClick={handleFullscreen}>
              Layar penuh
            </button>
            <button
              type="button"
              className="btn btn--quiet"
              onClick={() => handleSelectViewMode(viewMode === 'original' ? 'preset' : 'original')}
            >
              {viewMode === 'original' ? 'Lihat hasil preset' : 'Bandingkan original'}
            </button>
          </div>
        ) : null}

        <div className="showcase__footer">
          <div className="showcase__meta">
            <strong className="showcase__active-name">{activeClip.name}</strong>
            <p className="showcase__honest-note">{activeClip.description}</p>
          </div>
          <div className="showcase__order-wrap">
            <button type="button" className="btn" onClick={handleCopyOrder}>
              Salin pesan order
            </button>
            {orderCopiedMsg ? (
              <span className="showcase__feedback" aria-live="polite">
                {orderCopiedMsg}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="preset-grid" role="group" aria-label="Pilihan 9 video preset color correction">
        {CC_PRESETS.map((preset) => {
          const isSelected = preset.id === activePreset.id;
          const entry = PRESET_MANIFEST[preset.id];
          const showPoster = Boolean(entry?.hasPoster && !failedPosters[preset.id]);

          return (
            <button
              key={preset.id}
              type="button"
              className="preset-card"
              aria-pressed={isSelected}
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
                    <span className="preset-card__slot-label">Video Preset {preset.number}</span>
                    <span className="preset-card__slot-hint">Klik untuk putar di atas</span>
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
  );
}
