import { describe, it, expect } from 'vitest';
import { shouldUseFallback, needsKeyboardMouse } from '../src/lib/viewport.js';

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

  it('lets a visitor force the game on a narrow or touch-only screen', () => {
    expect(shouldUseFallback({ width: 400, touchOnly: true, forceGame: true })).toBe(false);
  });

  it('treats exactly 700px as wide enough', () => {
    expect(shouldUseFallback({ width: 700, touchOnly: false })).toBe(false);
  });
});

describe('needsKeyboardMouse', () => {
  it('is true only for a touch-only device forced into the game', () => {
    expect(needsKeyboardMouse({ touchOnly: true, forceGame: true })).toBe(true);
    expect(needsKeyboardMouse({ touchOnly: true, forceGame: false })).toBe(false);
    expect(needsKeyboardMouse({ touchOnly: false, forceGame: true })).toBe(false);
    expect(needsKeyboardMouse({ touchOnly: false, forceGame: false })).toBe(false);
  });
});
