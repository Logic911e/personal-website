import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseProjects } from '../src/lib/projects.js';

const valid = { title: 'Chess', description: 'Detects pieces', link: 'https://example.com/chess' };

describe('parseProjects', () => {
  it('accepts a valid entry and defaults tags to an empty list', () => {
    expect(parseProjects([valid])).toEqual([{ ...valid, tags: [] }]);
  });

  it('keeps tags when given', () => {
    expect(parseProjects([{ ...valid, tags: ['ml'] }])[0].tags).toEqual(['ml']);
  });

  it('rejects a javascript: link and names the field', () => {
    const bad = { ...valid, link: 'javascript:alert(1)' };
    expect(() => parseProjects([bad])).toThrow(/link/);
  });

  it('rejects a missing title and names the entry and field', () => {
    const { title, ...noTitle } = valid;
    expect(() => parseProjects([noTitle])).toThrow(/0.*title|title.*0/);
  });

  it('rejects input that is not an array', () => {
    expect(() => parseProjects({})).toThrow();
  });

  it('returns an empty list for an empty array', () => {
    expect(parseProjects([])).toEqual([]);
  });

  it('accepts the real projects.json', () => {
    const raw = JSON.parse(readFileSync(new URL('../src/data/projects.json', import.meta.url)));
    expect(parseProjects(raw).length).toBeGreaterThan(0);
  });
});
