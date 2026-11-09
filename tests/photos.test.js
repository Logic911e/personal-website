import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { parsePhotos } from '../src/lib/photos.js';

describe('parsePhotos', () => {
  it('parses a valid list', () => {
    expect(parsePhotos([{ src: 'assets/photos/a.jpg', caption: 'Me' }])).toEqual([
      { src: 'assets/photos/a.jpg', caption: 'Me' },
    ]);
  });

  it('accepts an empty list', () => {
    expect(parsePhotos([])).toEqual([]);
  });

  it('defaults a missing caption to an empty string', () => {
    expect(parsePhotos([{ src: 'a.jpg' }])[0].caption).toBe('');
  });

  it('accepts a local path and an https address', () => {
    expect(() => parsePhotos([{ src: 'assets/photos/a.jpg' }, { src: 'https://x.test/a.jpg' }])).not.toThrow();
  });

  it('rejects something that is not a list', () => {
    expect(() => parsePhotos({})).toThrow(/list/);
  });

  it('names the entry with a missing src', () => {
    expect(() => parsePhotos([{ src: 'a.jpg' }, { caption: 'no picture' }])).toThrow(/#1.*src|src.*#1/);
  });

  it('rejects an empty src', () => {
    expect(() => parsePhotos([{ src: '' }])).toThrow(/src/);
  });

  it('rejects a javascript: address', () => {
    expect(() => parsePhotos([{ src: 'javascript:alert(1)' }])).toThrow(/src/);
  });

  it('rejects a data: address', () => {
    expect(() => parsePhotos([{ src: 'data:image/png;base64,AAAA' }])).toThrow(/src/);
  });

  it('rejects a protocol-relative address', () => {
    expect(() => parsePhotos([{ src: '//evil.test/a.jpg' }])).toThrow(/src/);
  });

  it('rejects a source with a backslash (browsers read /\\host as //host)', () => {
    expect(() => parsePhotos([{ src: '/\\evil.test/a.jpg' }])).toThrow(/src/);
    expect(() => parsePhotos([{ src: 'assets\\a.jpg' }])).toThrow(/src/);
  });

  it('rejects a caption that is not text', () => {
    expect(() => parsePhotos([{ src: 'a.jpg', caption: 5 }])).toThrow(/caption/);
  });
});

describe('the real photos.json', () => {
  const real = JSON.parse(readFileSync(new URL('../src/data/photos.json', import.meta.url)));

  it('parses and has six placeholders', () => {
    expect(parsePhotos(real)).toHaveLength(6);
  });

  it('points every local picture at a file that exists under public/', () => {
    for (const { src } of parsePhotos(real)) {
      if (/^https?:/.test(src)) continue;
      expect(existsSync(new URL(`../public/${src.replace(/^\.\//, '')}`, import.meta.url)), src).toBe(true);
    }
  });
});
