import { Chess } from 'chess.js';

// The built-in backup opponent, used if Stockfish cannot load. A plain look-ahead search: try each move,
// imagine the best reply, score the board by piece values plus a small bonus for central pieces.

const VALUE = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
const MATE = 100000;
const INF = 1e9;

function centreBonus(square, type) {
  if (type !== 'n' && type !== 'b' && type !== 'p') return 0;
  const file = square.charCodeAt(0) - 97;
  const rank = square.charCodeAt(1) - 49;
  const away = Math.abs(file - 3.5) + Math.abs(rank - 3.5); // 1 in the middle, 7 in a corner
  return Math.round((7 - away) * (type === 'p' ? 3 : 5));
}

// Score from the point of view of the side to move: positive means it is ahead.
function evaluate(game) {
  let score = 0;
  for (const row of game.board()) {
    for (const cell of row) {
      if (!cell) continue;
      const v = VALUE[cell.type] + centreBonus(cell.square, cell.type);
      score += cell.color === 'w' ? v : -v;
    }
  }
  return game.turn() === 'w' ? score : -score;
}

function ordered(game) {
  // Captures first: it lets the search skip hopeless moves sooner.
  return game.moves({ verbose: true }).sort((a, b) => Number(Boolean(b.captured)) - Number(Boolean(a.captured)));
}

function negamax(game, depth, alpha, beta) {
  if (game.isCheckmate()) return -MATE - depth; // being mated sooner is worse
  if (game.isDraw()) return 0;
  if (depth === 0) return evaluate(game);
  let best = -INF;
  for (const m of ordered(game)) {
    game.move(m);
    const score = -negamax(game, depth - 1, -beta, -alpha);
    game.undo();
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

/**
 * Pick a move for the side to move, looking `depth` half-moves ahead. Ties are broken with `rng`.
 * Returns { from, to, promotion? }, or null if there is no legal move. Does not change `game`.
 */
export function chooseMove(game, depth, rng = Math.random) {
  const work = new Chess(game.fen());
  const moves = ordered(work);
  if (moves.length === 0) return null;

  let bestScore = -INF;
  let best = [];
  for (const m of moves) {
    work.move(m);
    const score = -negamax(work, Math.max(depth - 1, 0), -INF, INF); // full window so equal moves stay equal
    work.undo();
    if (score > bestScore) {
      bestScore = score;
      best = [m];
    } else if (score === bestScore) {
      best.push(m);
    }
  }
  const pick = best[Math.floor(rng() * best.length)];
  return pick.promotion ? { from: pick.from, to: pick.to, promotion: pick.promotion } : { from: pick.from, to: pick.to };
}
