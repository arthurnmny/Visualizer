const BPM_PATTERN = /(?:^|[_\-\s])(\d{2,3})bpm(?=\.[a-z0-9]+$)/i;

function toAbsoluteUrl(baseUrl, value) {
  return new URL(value, baseUrl).pathname;
}

export function parseBpmFromFilename(value) {
  const match = value.match(BPM_PATTERN);
  return match ? Number(match[1]) : null;
}

export async function loadGifLibrary(manifestUrl = '/assets/gifs/library.json') {
  const response = await fetch(manifestUrl, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`GIF library manifest missing at ${manifestUrl}`);
  }

  const payload = await response.json();
  const baseUrl = new URL(manifestUrl, window.location.href);
  const entries = Array.isArray(payload)
    ? payload
    : Array.isArray(payload.files)
      ? payload.files
      : [];

  const assets = entries
    .map((entry) => {
      const file = typeof entry === 'string' ? entry : entry.file || entry.url;
      if (!file) {
        return null;
      }

      const sourceBpm = typeof entry === 'object' && entry.bpm
        ? Number(entry.bpm)
        : parseBpmFromFilename(file);

      if (!sourceBpm) {
        return null;
      }

      return {
        name: typeof entry === 'string' ? file : entry.name || file,
        url: toAbsoluteUrl(baseUrl, file),
        sourceBpm,
      };
    })
    .filter(Boolean);

  return assets.sort((a, b) => a.sourceBpm - b.sourceBpm || a.name.localeCompare(b.name));
}
