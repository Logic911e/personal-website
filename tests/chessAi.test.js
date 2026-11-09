import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { chooseMove } from '../src/lib/chessAi.js';

// A small repeatable random generator, so tests do not depend on luck.
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('chooseMove', () => {
  it('captures a free queen (white)', () => {
    const g = new Chess('4k3/8/8/3q4/8/8/8/3QK3 w - - 0 1');
    expect(chooseMove(g, 2, seeded(1))).toMatchObject({ from: 'd1', to: 'd5' });
  });

  it('captures a free queen (black)', () => {
    const g = new Chess('3qk3/8/8/3Q4/8/8/8/4K3 b - - 0 1');
    expect(chooseMove(g, 2, seeded(1))).toMatchObject({ from: 'd8', to: 'd5' });
  });

  it('finds mate in one', () => {
    const g = new Chess('6k1/5ppp/8/8/8/8/8/R3K3 w - - 0 1');
    expect(chooseMove(g, 2, seeded(1))).toMatchObject({ from: 'a1', to: 'a8' });
  });

  it('does not trade its queen for a protected pawn', () => {
    const g = new Chess('4k3/8/4p3/3p4/8/8/8/3QK3 w - - 0 1');
    const move = chooseMove(g, 2, seeded(1));
    expect(`${move.from}${move.to}`).not.toBe('d1d5');
  });

  it('returns null when there is no legal move (checkmated)', () => {
    const g = new Chess('rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3');
    expect(chooseMove(g, 2, seeded(1))).toBeNull();
  });

  it('returns null when there is no legal move (stalemate)', () => {
    const g = new Chess('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
    expect(chooseMove(g, 2, seeded(1))).toBeNull();
  });

  it('leaves the game it was given untouched', () => {
    const g = new Chess();
    g.move('e4');
    const before = g.fen();
    chooseMove(g, 2, seeded(3));
    expect(g.fen()).toBe(before);
    expect(g.history()).toEqual(['e4']);
  });

  it('chooses the same move when given the same random numbers', () => {
    const g = new Chess();
    expect(chooseMove(g, 1, seeded(7))).toEqual(chooseMove(g, 1, seeded(7)));
  });

  it('always returns a legal move over whole games played against itself', () => {
    for (const seed of [1, 2, 3]) {
      const g = new Chess();
      const rng = seeded(seed);
      for (let ply = 0; ply < 24 && !g.isGameOver(); ply++) {
        const move = chooseMove(g, 1, rng);
        expect(move).not.toBeNull();
        expect(() => g.move({ from: move.from, to: move.to, promotion: move.promotion })).not.toThrow();
      }
    }
  });

  it('names a promotion piece when it promotes', () => {
    const g = new Chess('8/P6k/8/8/8/8/8/K7 w - - 0 1');
    expect(chooseMove(g, 1, seeded(1))).toMatchObject({ from: 'a7', to: 'a8', promotion: 'q' });
  });
});
