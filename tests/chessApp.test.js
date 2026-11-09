import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { createChessController } from '../src/computer/chessApp.js';

const START = new Chess().fen();

// An engine whose answers the test controls by hand.
function fakeEngine() {
  const calls = [];
  return {
    calls,
    bestMove(fen, level) {
      let resolve;
      let reject;
      const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
      });
      calls.push({ fen, level, resolve, reject });
      return promise;
    },
  };
}

const tick = () => new Promise((r) => setTimeout(r, 0));

function setup() {
  const engine = fakeEngine();
  const changes = [];
  const c = createChessController({ engine, onChange: () => changes.push(1) });
  return { engine, c, changes };
}

const fenNow = (c) => {
  // rebuild the position from the controller's board so tests only use its public state
  const rows = c.state().board.map((row) => {
    let out = '';
    let empty = 0;
    for (const cell of row) {
      if (!cell) empty++;
      else {
        if (empty) out += empty;
        empty = 0;
        out += cell.color === 'w' ? cell.type.toUpperCase() : cell.type;
      }
    }
    return out + (empty || '');
  });
  return rows.join('/');
};

describe('selecting', () => {
  it('shows where a white piece can go', () => {
    const { c } = setup();
    c.select('e2');
    expect(c.state().selected).toBe('e2');
    expect(c.state().targets.sort()).toEqual(['e3', 'e4']);
  });

  it('ignores an empty square, a black piece, and nonsense', () => {
    const { c } = setup();
    c.select('e4');
    c.select('e7');
    c.select('z9');
    expect(c.state().selected).toBeNull();
  });

  it('switches to another white piece', () => {
    const { c } = setup();
    c.select('e2');
    c.select('g1');
    expect(c.state().selected).toBe('g1');
    expect(c.state().targets.sort()).toEqual(['f3', 'h3']);
  });

  it('deselects when the same piece is clicked again', () => {
    const { c } = setup();
    c.select('e2');
    c.select('e2');
    expect(c.state().selected).toBeNull();
    expect(c.state().targets).toEqual([]);
  });

  it('deselects when a square that is not a legal target is clicked', () => {
    const { c } = setup();
    c.select('e2');
    c.select('e6');
    expect(c.state().selected).toBeNull();
  });
});

describe('playing a move', () => {
  it('plays the move, asks the engine for a reply, and waits', () => {
    const { c, engine } = setup();
    c.select('e2');
    c.select('e4');
    expect(c.state().thinking).toBe(true);
    expect(c.state().selected).toBeNull();
    expect(engine.calls).toHaveLength(1);
    expect(engine.calls[0].fen).toContain(' b ');
    expect(engine.calls[0].level).toBe('Medium');
  });

  it('applies the computer\'s reply when it arrives', async () => {
    const { c, engine } = setup();
    c.select('e2');
    c.select('e4');
    engine.calls[0].resolve({ from: 'e7', to: 'e5' });
    await tick();
    expect(c.state().thinking).toBe(false);
    expect(c.state().status.text).toBe('Your move');
    expect(c.state().board[3][4]).toMatchObject({ type: 'p', color: 'b' }); // e5
  });

  it('does nothing when squares are clicked while the computer is thinking', () => {
    const { c, engine } = setup();
    c.select('e2');
    c.select('e4');
    const before = fenNow(c);
    c.select('d2');
    c.select('d4');
    expect(fenNow(c)).toBe(before);
    expect(c.state().selected).toBeNull();
    expect(engine.calls).toHaveLength(1);
  });

  it('uses the level that is chosen when the player moves', () => {
    const { c, engine } = setup();
    c.setLevel('Hard');
    c.select('e2');
    c.select('e4');
    expect(engine.calls[0].level).toBe('Hard');
  });

  it('ignores a level that does not exist', () => {
    const { c } = setup();
    c.setLevel('Impossible');
    expect(c.state().level).toBe('Medium');
  });
});

describe('a reply that comes after New Game', () => {
  it('never moves a piece on the new game', async () => {
    const { c, engine } = setup();
    c.select('e2');
    c.select('e4');
    c.newGame();
    engine.calls[0].resolve({ from: 'e7', to: 'e5' });
    await tick();
    expect(fenNow(c)).toBe(START.split(' ')[0]);
    expect(c.state().thinking).toBe(false);
    expect(c.state().status.text).toBe('Your move');
  });

  it('does not unfreeze a newer search when an older reply arrives', async () => {
    const { c, engine } = setup();
    c.select('e2');
    c.select('e4'); // search 0
    c.newGame();
    c.select('d2');
    c.select('d4'); // search 1, on the new game
    engine.calls[0].resolve({ from: 'e7', to: 'e5' }); // old reply
    await tick();
    expect(c.state().thinking).toBe(true);
    expect(c.state().board[3][4]).toBeNull(); // no black pawn on e5
    engine.calls[1].resolve({ from: 'd7', to: 'd5' });
    await tick();
    expect(c.state().thinking).toBe(false);
    expect(c.state().board[3][3]).toMatchObject({ type: 'p', color: 'b' }); // d5
  });
});

describe('a reply that cannot be used', () => {
  const asBlackThinks = () => {
    const s = setup();
    s.c.select('e2');
    s.c.select('e4');
    return s;
  };

  it('is replaced by a built-in move when the engine names an illegal one', async () => {
    const { c, engine } = asBlackThinks();
    engine.calls[0].resolve({ from: 'e2', to: 'e4' }); // a white move
    await tick();
    expect(c.state().thinking).toBe(false);
    expect(c.state().status.text).toBe('Your move');
  });

  it('is replaced by a built-in move when the engine has no move', async () => {
    const { c, engine } = asBlackThinks();
    engine.calls[0].resolve(null);
    await tick();
    expect(c.state().thinking).toBe(false);
    expect(c.state().status.text).toBe('Your move');
  });

  it('is replaced by a built-in move when the engine call fails', async () => {
    const { c, engine } = asBlackThinks();
    engine.calls[0].reject(new Error('boom'));
    await tick();
    expect(c.state().thinking).toBe(false);
    expect(c.state().status.text).toBe('Your move');
  });
});

describe('finishing a game', () => {
  async function foolsMate() {
    const s = setup();
    s.c.select('f2');
    s.c.select('f3');
    s.engine.calls[0].resolve({ from: 'e7', to: 'e5' });
    await tick();
    s.c.select('g2');
    s.c.select('g4');
    s.engine.calls[1].resolve({ from: 'd8', to: 'h4' });
    await tick();
    return s;
  }

  it('shows the result and stops accepting moves after checkmate', async () => {
    const { c, engine } = await foolsMate();
    expect(c.state().status).toEqual({ over: true, text: 'Checkmate — computer wins' });
    const before = fenNow(c);
    c.select('e2');
    c.select('e3');
    expect(fenNow(c)).toBe(before);
    expect(c.state().selected).toBeNull();
    expect(engine.calls).toHaveLength(2);
  });

  it('starts a fresh game from New Game', async () => {
    const { c } = await foolsMate();
    c.newGame();
    expect(c.state().status).toEqual({ over: false, text: 'Your move' });
    expect(fenNow(c)).toBe(START.split(' ')[0]);
  });
});

describe('telling the page', () => {
  it('reports each change', () => {
    const { c, changes } = setup();
    c.select('e2');
    c.setLevel('Easy');
    c.newGame();
    expect(changes.length).toBeGreaterThanOrEqual(3);
  });
});
