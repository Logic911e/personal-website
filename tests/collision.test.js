import { describe, it, expect } from 'vitest';
import { collides } from '../src/lib/collision.js';

const rect = (x, y, w, h) => ({ x, y, w, h });

describe('collides', () => {
  const solids = [rect(10, 10, 10, 10)];

  it('is true when rects overlap', () => {
    expect(collides(rect(15, 15, 10, 10), solids)).toBe(true);
  });

  it('is false when rects only touch edges', () => {
    expect(collides(rect(20, 10, 10, 10), solids)).toBe(false);
  });

  it('is false when far apart', () => {
    expect(collides(rect(100, 100, 5, 5), solids)).toBe(false);
  });

  it('is false for an empty list of solids', () => {
    expect(collides(rect(0, 0, 5, 5), [])).toBe(false);
  });
});
