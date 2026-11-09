import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { newGame, legalTargets, playerMove, applyEngineMove, gameStatus } from '../src/lib/chessGame.js';

const fenOf = (g) => g.fen();

describe('legalTargets', () => {
  it('lists the squares a white pawn can reach', () => {
    expect(legalTargets(newGame(), 'e2').sort()).toEqual(['e3', 'e4']);
  });

  it('lists nothing for a black piece, an empty square, or a piece with no moves', () => {
    const g = newGame();
    expect(legalTargets(g, 'e7')).toEqual([]);
    expect(legalTargets(g, 'e4')).toEqual([]);
    expect(legalTargets(g, 'a1')).toEqual([]); // rook boxed in at the start
  });

  it('lists nothing while it is black\'s turn', () => {
    const g = newGame();
    playerMove(g, 'e2', 'e4');
    expect(legalTargets(g, 'd2')).toEqual([]);
  });

  it('lists nothing for a nonsense square', () => {
    expect(legalTargets(newGame(), 'z9')).toEqual([]);
  });
});

describe('playerMove', () => {
  it('plays a legal white move', () => {
    const g = newGame();
    expect(playerMove(g, 'e2', 'e4')).toEqual({ ok: true, san: 'e4' });
    expect(g.get('e4').type).toBe('p');
  });

  it('refuses an illegal move and leaves the position alone', () => {
    const g = newGame();
    const before = fenOf(g);
    expect(playerMove(g, 'e2', 'e5')).toEqual({ ok: false });
    expect(fenOf(g)).toBe(before);
  });

  it('refuses a move of a black piece', () => {
    const g = newGame();
    playerMove(g, 'e2', 'e4');
    const before = fenOf(g);
    expect(playerMove(g, 'e7', 'e5').ok).toBe(false);
    expect(fenOf(g)).toBe(before);
  });

  it('promotes a pawn to a queen by itself', () => {
    const g = new Chess('8/P6k/8/8/8/8/8/K7 w - - 0 1');
    expect(playerMove(g, 'a7', 'a8').ok).toBe(true);
    expect(g.get('a8')).toMatchObject({ type: 'q', color: 'w' });
  });

  it('refuses nonsense squares without throwing', () => {
    expect(playerMove(newGame(), 'z9', 'e4')).toEqual({ ok: false });
  });

  it('refuses any move once the game is over', () => {
    const g = new Chess('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1'); // stalemate
    expect(playerMove(g, 'g6', 'g5').ok).toBe(false);
  });
});

describe('applyEngineMove', () => {
  it('plays a legal black reply', () => {
    const g = newGame();
    playerMove(g, 'e2', 'e4');
    expect(applyEngineMove(g, { from: 'e7', to: 'e5' })).toBe(true);
    expect(g.get('e5').color).toBe('b');
  });

  it('refuses a white move at white\'s turn', () => {
    const g = newGame();
    const before = fenOf(g);
    expect(applyEngineMove(g, { from: 'e2', to: 'e4' })).toBe(false);
    expect(fenOf(g)).toBe(before);
  });

  it('refuses an illegal black move', () => {
    const g = newGame();
    playerMove(g, 'e2', 'e4');
    const before = fenOf(g);
    expect(applyEngineMove(g, { from: 'e7', to: 'e4' })).toBe(false);
    expect(fenOf(g)).toBe(before);
  });

  it('refuses garbage', () => {
    const g = newGame();
    playerMove(g, 'e2', 'e4');
    expect(applyEngineMove(g, null)).toBe(false);
    expect(applyEngineMove(g, {})).toBe(false);
  });

  it('promotes to the piece asked for, or a queen if none is named', () => {
    const a = new Chess('8/8/8/8/8/k7/p6K/8 b - - 0 1');
    expect(applyEngineMove(a, { from: 'a2', to: 'a1', promotion: 'n' })).toBe(true);
    expect(a.get('a1').type).toBe('n');
    const b = new Chess('8/8/8/8/8/k7/p6K/8 b - - 0 1');
    expect(applyEngineMove(b, { from: 'a2', to: 'a1' })).toBe(true);
    expect(b.get('a1').type).toBe('q');
  });
});

describe('gameStatus', () => {
  it('starts with "Your move"', () => {
    expect(gameStatus(newGame())).toEqual({ over: false, text: 'Your move' });
  });

  it('says the computer is thinking on black\'s turn', () => {
    const g = newGame();
    playerMove(g, 'e2', 'e4');
    expect(gameStatus(g)).toEqual({ over: false, text: 'Computer is thinking…' });
  });

  it('reports the computer winning by checkmate (fool\'s mate)', () => {
    const g = newGame();
    playerMove(g, 'f2', 'f3');
    applyEngineMove(g, { from: 'e7', to: 'e5' });
    playerMove(g, 'g2', 'g4');
    applyEngineMove(g, { from: 'd8', to: 'h4' });
    expect(gameStatus(g)).toEqual({ over: true, text: 'Checkmate — computer wins' });
  });

  it('reports the player winning by checkmate (scholar\'s mate)', () => {
    const g = newGame();
    playerMove(g, 'e2', 'e4');
    applyEngineMove(g, { from: 'e7', to: 'e5' });
    playerMove(g, 'f1', 'c4');
    applyEngineMove(g, { from: 'b8', to: 'c6' });
    playerMove(g, 'd1', 'h5');
    applyEngineMove(g, { from: 'g8', to: 'f6' });
    playerMove(g, 'h5', 'f7');
    expect(gameStatus(g)).toEqual({ over: true, text: 'Checkmate — you win!' });
  });

  it('reports stalemate', () => {
    expect(gameStatus(new Chess('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1'))).toEqual({ over: true, text: 'Stalemate — draw' });
  });

  it('reports other draws (bare kings)', () => {
    expect(gameStatus(new Chess('7k/8/8/8/8/8/8/K7 w - - 0 1'))).toEqual({ over: true, text: 'Draw' });
  });

  it('adds "Check!" when the side to move is in check', () => {
    const g = new Chess('4k3/8/8/8/8/8/4r3/4K3 w - - 0 1');
    expect(gameStatus(g)).toEqual({ over: false, text: 'Your move — Check!' });
  });
});
