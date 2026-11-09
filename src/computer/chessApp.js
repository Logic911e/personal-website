import { newGame, legalTargets, playerMove, applyEngineMove, gameStatus } from '../lib/chessGame.js';
import { chooseMove } from '../lib/chessAi.js';
import { LEVELS } from '../lib/chessLevels.js';

/**
 * The rules of the Chess window with no page in sight, so they can be tested on their own.
 * The visitor plays white; the computer (engine.bestMove) plays black.
 */
export function createChessController({ engine, onChange = () => {} }) {
  let game = newGame();
  let selected = null;
  let targets = [];
  let level = 'Medium';
  let thinking = false;
  let gameId = 0; // changes on New Game, so an answer meant for an old game can be recognised and dropped

  const clearSelection = () => {
    selected = null;
    targets = [];
  };

  function state() {
    return { board: game.board(), selected, targets: [...targets], level, thinking, status: gameStatus(game) };
  }

  function reply(id, move) {
    if (id !== gameId) return; // that answer belongs to a game that is no longer on the board
    thinking = false;
    if (!applyEngineMove(game, move)) {
      // The engine gave nothing usable. Never leave the visitor waiting on a move that will not come.
      const backup = chooseMove(game, 1);
      if (backup) applyEngineMove(game, backup);
    }
    onChange();
  }

  function requestReply() {
    const id = gameId;
    thinking = true;
    let asked;
    try {
      asked = Promise.resolve(engine.bestMove(game.fen(), level));
    } catch {
      asked = Promise.resolve(null);
    }
    asked.then(
      (move) => reply(id, move),
      () => reply(id, null),
    );
  }

  function select(square) {
    if (typeof square !== 'string' || thinking || gameStatus(game).over) return;
    if (selected !== null && targets.includes(square)) {
      const result = playerMove(game, selected, square);
      clearSelection();
      if (result.ok && !gameStatus(game).over) requestReply();
      onChange();
      return;
    }
    if (square === selected) {
      clearSelection();
    } else {
      const next = legalTargets(game, square);
      if (next.length > 0) {
        selected = square;
        targets = next;
      } else {
        clearSelection();
      }
    }
    onChange();
  }

  function setLevel(name) {
    if (!LEVELS.includes(name)) return;
    level = name; // applies to the computer's next move
    onChange();
  }

  function newGameStart() {
    gameId += 1;
    game = newGame();
    clearSelection();
    thinking = false;
    onChange();
  }

  return { state, select, setLevel, newGame: newGameStart };
}

// White pieces are drawn as outlines and black as solid shapes; the trailing selector keeps them text, not emoji.
const GLYPH = {
  w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
  b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' },
};
const NAME = { k: 'king', q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn' };
const FILES = 'abcdefgh';

/** Draw the Chess window inside `container`. The engine (if any) is loaded now, when the window first opens. */
export function mountChessApp(container, { engine }) {
  container.textContent = '';
  const root = document.createElement('div');
  root.className = 'chess-app';

  const status = document.createElement('div');
  status.className = 'chess-status';
  status.setAttribute('aria-live', 'polite');

  const board = document.createElement('div');
  board.className = 'chess-board';
  board.setAttribute('role', 'group');
  board.setAttribute('aria-label', 'Chess board');

  const squares = new Map();
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const square = `${FILES[col]}${8 - row}`;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `chess-square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
      button.dataset.square = square;
      board.appendChild(button);
      squares.set(square, button);
    }
  }

  const controls = document.createElement('div');
  controls.className = 'chess-controls';
  const levelLabel = document.createElement('label');
  levelLabel.textContent = 'Level: ';
  const levelSelect = document.createElement('select');
  for (const name of LEVELS) {
    const option = document.createElement('option');
    option.value = option.textContent = name;
    levelSelect.appendChild(option);
  }
  levelLabel.appendChild(levelSelect);
  const newGameButton = document.createElement('button');
  newGameButton.type = 'button';
  newGameButton.className = 'win-button';
  newGameButton.textContent = 'New Game';
  const note = document.createElement('span');
  note.className = 'chess-note';
  note.textContent = 'Loading engine…';
  controls.append(levelLabel, newGameButton, note);

  root.append(status, board, controls);
  container.appendChild(root);

  let ready = false; // the board waits for the engine so a quick first move does not get the weak backup
  let disposed = false;

  const controller = createChessController({ engine, onChange: render });

  function render() {
    if (disposed) return;
    const s = controller.state();
    status.textContent = ready ? s.status.text : 'Loading engine…';
    levelSelect.value = s.level;
    for (const [square, button] of squares) {
      const col = FILES.indexOf(square[0]);
      const row = 8 - Number(square[1]);
      const piece = s.board[row][col];
      button.textContent = piece ? `${GLYPH[piece.color][piece.type]}︎` : '';
      button.classList.toggle('white-piece', piece?.color === 'w');
      button.classList.toggle('black-piece', piece?.color === 'b');
      button.classList.toggle('selected', s.selected === square);
      button.classList.toggle('target', s.targets.includes(square));
      button.setAttribute('aria-label', `${square} ${piece ? `${piece.color === 'w' ? 'white' : 'black'} ${NAME[piece.type]}` : 'empty'}`);
      button.disabled = !ready;
    }
  }

  board.addEventListener('click', (e) => {
    const button = e.target.closest?.('.chess-square');
    if (button && ready) controller.select(button.dataset.square);
  });
  levelSelect.addEventListener('change', () => controller.setLevel(levelSelect.value));
  newGameButton.addEventListener('click', () => controller.newGame());

  render();
  Promise.resolve(engine.load?.())
    .catch(() => false)
    .then((ok) => {
      ready = true;
      note.textContent = ok ? '' : 'Using the built-in opponent';
      render();
    });

  return {
    dispose() {
      disposed = true;
      container.textContent = '';
    },
  };
}
