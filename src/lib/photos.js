const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

function fail(where, why) {
  throw new Error(`photos, ${where}: ${why}`);
}

// A local path (assets/photos/a.jpg) or an http(s) address. Nothing that could run code or load from
// an unexpected place: no javascript:, data:, or protocol-relative (//host) sources.
function safeSrc(src) {
  if (typeof src !== 'string' || src.trim() === '') return false;
  if (src.startsWith('//') || src.includes('\\')) return false;
  if (HAS_SCHEME.test(src)) return /^https?:\/\//i.test(src);
  return true;
}

/** Validate the raw photo list. Throws an Error naming the entry that is wrong. */
export function parsePhotos(raw) {
  if (!Array.isArray(raw)) fail('root', 'must be a list');
  return raw.map((entry, i) => {
    const where = `photo #${i}`;
    if (!safeSrc(entry?.src)) fail(where, '"src" must be a local path or an http(s) address');
    if (entry.caption !== undefined && typeof entry.caption !== 'string') fail(where, '"caption" must be text');
    return { src: entry.src, caption: entry.caption ?? '' };
  });
}
