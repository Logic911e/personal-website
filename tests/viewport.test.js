import { describe, it, expect } from 'vitest';
import { shouldUseFallback } from '../src/lib/viewport.js';

describe('shouldUseFallback', () => {
  it('sends a narrow viewport to the fallback', () => {
    expect(shouldUseFallback({ width: 400, touchOnly: false })).toBe(true);
  });

  it('keeps a wide non-touch viewport in the game', () => {
    expect(shouldUseFallback({ width: 1200, touchOnly: false })).toBe(false);
  });

  it('sends a touch-only device to the fallback even when wide', () => {
    expect(shouldUseFallback({ width: 1200, touchOnly: true })).toBe(true);
  });

  it('treats exactly 700px as wide enough', () => {
    expect(shouldUseFallback({ width: 700, touchOnly: false })).toBe(false);
  });
});
