import { describe, it, expect } from 'vitest';
import { LEVELS, levelSettings } from '../src/lib/chessLevels.js';

describe('levels', () => {
  it('has Easy, Medium and Hard in that order', () => {
    expect(LEVELS).toEqual(['Easy', 'Medium', 'Hard']);
  });

  it('starts with the agreed numbers', () => {
    expect(levelSettings('Easy')).toEqual({ skill: 0, movetimeMs: 100, fallbackDepth: 1 });
    expect(levelSettings('Medium')).toEqual({ skill: 8, movetimeMs: 400, fallbackDepth: 2 });
    expect(levelSettings('Hard')).toEqual({ skill: 16, movetimeMs: 900, fallbackDepth: 3 });
  });

  it('gets stronger and thinks longer at each step', () => {
    const [e, m, h] = LEVELS.map(levelSettings);
    expect(m.skill).toBeGreaterThan(e.skill);
    expect(h.skill).toBeGreaterThan(m.skill);
    expect(m.movetimeMs).toBeGreaterThan(e.movetimeMs);
    expect(h.movetimeMs).toBeGreaterThan(m.movetimeMs);
    expect(m.fallbackDepth).toBeGreaterThan(e.fallbackDepth);
    expect(h.fallbackDepth).toBeGreaterThan(m.fallbackDepth);
  });

  it('refuses an unknown level', () => {
    expect(() => levelSettings('Impossible')).toThrow(/unknown level/i);
  });

  it('keeps skills inside Stockfish\'s 0 to 20 range', () => {
    for (const name of LEVELS) {
      const { skill } = levelSettings(name);
      expect(skill).toBeGreaterThanOrEqual(0);
      expect(skill).toBeLessThanOrEqual(20);
    }
  });
});
