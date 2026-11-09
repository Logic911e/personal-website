import { describe, it, expect } from 'vitest';
import { createPhotosController, resolveSrc } from '../src/computer/photosApp.js';

const three = [
  { src: 'a.jpg', caption: 'A' },
  { src: 'b.jpg', caption: 'B' },
  { src: 'c.jpg', caption: 'C' },
];

describe('createPhotosController', () => {
  it('starts on the grid', () => {
    expect(createPhotosController(three).state()).toEqual({ view: 'grid', index: null, count: 3 });
  });

  it('opens a photo and goes back to the grid', () => {
    const c = createPhotosController(three);
    c.open(1);
    expect(c.state()).toEqual({ view: 'viewer', index: 1, count: 3 });
    c.back();
    expect(c.state()).toEqual({ view: 'grid', index: null, count: 3 });
  });

  it('goes to the next and previous photo', () => {
    const c = createPhotosController(three);
    c.open(0);
    c.next();
    expect(c.state().index).toBe(1);
    c.prev();
    expect(c.state().index).toBe(0);
  });

  it('wraps around at both ends', () => {
    const c = createPhotosController(three);
    c.open(2);
    c.next();
    expect(c.state().index).toBe(0);
    c.prev();
    expect(c.state().index).toBe(2);
  });

  it('ignores an index that is out of range or not a whole number', () => {
    const c = createPhotosController(three);
    for (const bad of [-1, 3, 1.5, NaN, undefined, '1']) c.open(bad);
    expect(c.state().view).toBe('grid');
  });

  it('ignores next and previous while on the grid', () => {
    const c = createPhotosController(three);
    c.next();
    c.prev();
    expect(c.state()).toEqual({ view: 'grid', index: null, count: 3 });
  });

  it('copes with an empty list', () => {
    const c = createPhotosController([]);
    c.open(0);
    c.next();
    c.prev();
    expect(c.state()).toEqual({ view: 'grid', index: null, count: 0 });
  });

  it('copes with a single photo (next and previous stay on it)', () => {
    const c = createPhotosController([three[0]]);
    c.open(0);
    c.next();
    expect(c.state().index).toBe(0);
    c.prev();
    expect(c.state().index).toBe(0);
  });
});

describe('resolveSrc', () => {
  it('puts the site base in front of a local path', () => {
    expect(resolveSrc('assets/photos/a.jpg', '/personal-website/')).toBe('/personal-website/assets/photos/a.jpg');
  });

  it('tidies a leading ./ or /', () => {
    expect(resolveSrc('./a.jpg', '/x/')).toBe('/x/a.jpg');
    expect(resolveSrc('/a.jpg', '/x/')).toBe('/x/a.jpg');
  });

  it('leaves a web address alone', () => {
    expect(resolveSrc('https://example.test/a.jpg', '/x/')).toBe('https://example.test/a.jpg');
  });

  it('works with no base', () => {
    expect(resolveSrc('a.jpg')).toBe('a.jpg');
  });
});
