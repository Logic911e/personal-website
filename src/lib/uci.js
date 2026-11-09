const SQUARE = /^[a-h][1-8]$/;

/** Read a Stockfish "bestmove" line into { from, to, promotion? }, or null if it holds no usable move. */
export function parseBestMove(line) {
  if (typeof line !== 'string') return null;
  const parts = line.trim().split(/\s+/);
  if (parts[0] !== 'bestmove' || !parts[1]) return null;
  const move = parts[1];
  const from = move.slice(0, 2);
  const to = move.slice(2, 4);
  const promotion = move.slice(4, 5);
  if (!SQUARE.test(from) || !SQUARE.test(to)) return null;
  if (promotion && !/^[qrbn]$/.test(promotion)) return null;
  return promotion ? { from, to, promotion } : { from, to };
}

/** The messages that ask Stockfish for a move: set the skill, show the position, think for a while. */
export function engineCommands(fen, { skill, movetimeMs }) {
  return [`setoption name Skill Level value ${skill}`, `position fen ${fen}`, `go movetime ${movetimeMs}`];
}
