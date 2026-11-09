import { describe, it, expect } from 'vitest';
import {
  MOBILE_MAX_WIDTH, MUSIC_URL, PLAYER_SIZE, WALK_SPEED, EYE_HEIGHT, FOV, NOTE_REACH,
} from '../src/config.js';

describe('config', () => {
  it('sends viewports under 700px to the fallback', () => {
    expect(MOBILE_MAX_WIDTH).toBe(700);
  });

  it('points the entry music at the placeholder loop', () => {
    expect(MUSIC_URL).toBe('assets/music/entry.wav');
  });

  it('uses the first-person values from the design', () => {
    expect(PLAYER_SIZE).toBe(0.5);
    expect(WALK_SPEED).toBe(3);
    expect(EYE_HEIGHT).toBe(1.6);
    expect(FOV).toBe(75);
    expect(NOTE_REACH).toBe(1.5);
  });
});
