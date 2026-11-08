import { describe, it, expect } from 'vitest';
import { TILE_SIZE, MOBILE_MAX_WIDTH, MUSIC_URL, INTERACT_REACH } from '../src/config.js';

describe('config', () => {
  it('uses 16px tiles', () => {
    expect(TILE_SIZE).toBe(16);
  });

  it('sends viewports under 700px to the fallback', () => {
    expect(MOBILE_MAX_WIDTH).toBe(700);
  });

  it('points the entry music at the placeholder loop', () => {
    expect(MUSIC_URL).toBe('assets/music/entry.wav');
  });

  it('lets the player interact from 12px away', () => {
    expect(INTERACT_REACH).toBe(12);
  });
});
