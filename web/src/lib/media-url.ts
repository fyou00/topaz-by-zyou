/**
 * Normalize the base URL for preset videos and posters.
 * Defaults to `/videos` (served from `web/public/videos`) when `VITE_VIDEO_BASE_URL` is unset.
 */
export function normalizeBaseUrl(raw?: string): string {
  const trimmed = raw?.trim() ?? '';
  if (!trimmed) return '/videos';
  const stripped = trimmed.replace(/\/+$/, '');
  return stripped || '/videos';
}

/**
 * Join a normalized base URL with a relative asset path and optional cache-busting version.
 */
export function buildMediaUrl(baseUrl: string, relativePath: string, version?: string): string {
  const base = normalizeBaseUrl(baseUrl);
  const encodedPath = relativePath
    .replace(/^\/+/, '')
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  const joined = `${base}/${encodedPath}`;
  const cleanVersion = version?.trim();
  return cleanVersion ? `${joined}?v=${encodeURIComponent(cleanVersion)}` : joined;
}

export const VIDEO_BASE_URL = normalizeBaseUrl(import.meta.env?.VITE_VIDEO_BASE_URL);

export function resolveVideoUrl(fileName: string, version?: string): string {
  return buildMediaUrl(VIDEO_BASE_URL, fileName, version);
}

export function resolvePosterUrl(fileName: string, version?: string): string {
  const clean = fileName.replace(/^\/+/, '');
  return buildMediaUrl(VIDEO_BASE_URL, `posters/${clean}`, version);
}
