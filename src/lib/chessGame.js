import { Chess } from 'chess.js';

// The visitor plays white; the computer plays black. These wrap chess.js so the rest of the site never has
// to handle its exceptions or remember whose turn it is.

export function newGame() {
  return new Chess();
}

/** Squares the white piece on `square` can legally move to (none if it is not white's turn). */
export function legalTargets(game, square) {
  try {
    if (game.turn() !== 'w' || game.isGameOver()) return [];
    const piece = game.get(square);
    if (!piece || piece.color !== 'w') return [];
    return game.moves({ square, verbose: true }).map((m) => m.to);
  } catch {
    return [];
  }
}

/** Play a white move (pawns reaching the end become queens). Never throws. */
export function playerMove(game, from, to) {
  try {
    if (game.turn() !== 'w' || game.isGameOver()) return { ok: false };
    const piece = game.get(from);
    if (!piece || piece.color !== 'w') return { ok: false };
    const move = game.move({ from, to, promotion: 'q' });
    return { ok: true, san: move.san };
  } catch {
    return { ok: false };
  }
}

/** Play the computer's black move. Returns false (and changes nothing) if it is not a legal black move. */
export function applyEngineMove(game, move) {
  try {
    if (!move || game.turn() !== 'b' || game.isGameOver()) return false;
    game.move({ from: move.from, to: move.to, promotion: move.promotion ?? 'q' });
    return true;
  } catch {
    return false;
  }
}

export function gameStatus(game) {
  if (game.isCheckmate()) {
    // The side to move is the one who has been mated.
    return { over: true, text: game.turn() === 'b' ? 'Checkmate — you win!' : 'Checkmate — computer wins' };
  }
  if (game.isStalemate()) return { over: true, text: 'Stalemate — draw' };
  if (game.isDraw()) return { over: true, text: 'Draw' };
  const base = game.turn() === 'w' ? 'Your move' : 'Computer is thinking…';
  return { over: false, text: game.inCheck() ? `${base} — Check!` : base };
}
