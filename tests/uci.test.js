import { describe, it, expect } from 'vitest';
import { parseBestMove, engineCommands } from '../src/lib/uci.js';

describe('parseBestMove', () => {
  it('reads a plain move', () => {
    expect(parseBestMove('bestmove e2e4')).toEqual({ from: 'e2', to: 'e4' });
  });

  it('ignores the ponder move that follows', () => {
    expect(parseBestMove('bestmove g1f3 ponder d7d5')).toEqual({ from: 'g1', to: 'f3' });
  });

  it('reads a promotion', () => {
    expect(parseBestMove('bestmove e7e8q ponder e2e4')).toEqual({ from: 'e7', to: 'e8', promotion: 'q' });
  });

  it('gives null when the engine has no move', () => {
    expect(parseBestMove('bestmove (none)')).toBeNull();
  });

  it('gives null for lines that are not a best move', () => {
    expect(parseBestMove('')).toBeNull();
    expect(parseBestMove('info depth 5 score cp 12')).toBeNull();
    expect(parseBestMove('readyok')).toBeNull();
  });

  it('gives null for a best move with nothing or rubbish after it', () => {
    expect(parseBestMove('bestmove')).toBeNull();
    expect(parseBestMove('bestmove zz99')).toBeNull();
  });

  it('copes with a non-string', () => {
    expect(parseBestMove(undefined)).toBeNull();
    expect(parseBestMove(42)).toBeNull();
  });
});

describe('engineCommands', () => {
  it('sets the skill, the position and the thinking time, in that order', () => {
    expect(engineCommands('8/8/8/8/8/8/8/K6k w - - 0 1', { skill: 8, movetimeMs: 400 })).toEqual([
      'setoption name Skill Level value 8',
      'position fen 8/8/8/8/8/8/8/K6k w - - 0 1',
      'go movetime 400',
    ]);
  });
});
