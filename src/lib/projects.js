const SAFE_SCHEMES = ['http:', 'https:'];

function fail(index, field, why) {
  throw new Error(`projects[${index}].${field}: ${why}`);
}

function requireText(entry, index, field) {
  const value = entry[field];
  if (typeof value !== 'string' || value.trim() === '') fail(index, field, 'must be a non-empty string');
  return value;
}

/**
 * Validate the raw project list and return clean Project objects.
 * Throws an Error naming the bad entry and field.
 */
export function parseProjects(raw) {
  if (!Array.isArray(raw)) throw new Error('projects must be an array');

  return raw.map((entry, index) => {
    if (entry === null || typeof entry !== 'object') fail(index, 'entry', 'must be an object');

    const title = requireText(entry, index, 'title');
    const description = requireText(entry, index, 'description');
    const link = requireText(entry, index, 'link');

    let scheme;
    try {
      scheme = new URL(link).protocol;
    } catch {
      fail(index, 'link', 'must be a full URL');
    }
    if (!SAFE_SCHEMES.includes(scheme)) fail(index, 'link', 'must start with http:// or https://');

    const tags = entry.tags ?? [];
    if (!Array.isArray(tags) || tags.some((t) => typeof t !== 'string')) {
      fail(index, 'tags', 'must be a list of strings');
    }

    return { title, description, link, tags };
  });
}
