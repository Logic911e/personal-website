import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { createEngine } from '../src/computer/engine.js';

const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';

// A stand-in for the Stockfish worker. `behave(line, worker)` decides how it answers each message.
function fakeWorker(behave = () => {}) {
  const w = {
    posted: [],
    terminated: false,
    onmessage: null,
    onerror: null,
    postMessage(line) {
      w.posted.push(line);
      behave(line, w);
    },
    terminate() {
      w.terminated = true;
    },
    emit(line) {
      w.onmessage?.({ data: line });
    },
  };
  return w;
}

const answersUci = (line, w) => {
  if (line === 'uci') queueMicrotask(() => w.emit('uciok'));
};

function engineWith(worker, opts = {}) {
  const made = [];
  const engine = createEngine({
    workerUrl: 'x.js',
    makeWorker: (url) => {
      made.push(url);
      return worker;
    },
    loadTimeoutMs: 30,
    moveTimeoutMs: 60,
    ...opts,
  });
  return { engine, made };
}

function isLegalBlackMove(move) {
  const g = new Chess(AFTER_E4);
  try {
    g.move({ from: move.from, to: move.to, promotion: move.promotion });
    return true;
  } catch {
    return false;
  }
}

describe('loading', () => {
  it('creates no worker until load() is called', () => {
    const { made } = engineWith(fakeWorker());
    expect(made).toEqual([]);
  });

  it('loads when the engine says uciok', async () => {
    const w = fakeWorker(answersUci);
    const { engine, made } = engineWith(w);
    expect(await engine.load()).toBe(true);
    expect(made).toEqual(['x.js']);
    expect(w.posted[0]).toBe('uci');
  });

  it('makes only one worker however many times load() is called', async () => {
    const w = fakeWorker(answersUci);
    const { engine, made } = engineWith(w);
    await Promise.all([engine.load(), engine.load()]);
    await engine.load();
    expect(made).toHaveLength(1);
  });

  it('gives false when the engine never answers', async () => {
    const { engine } = engineWith(fakeWorker());
    expect(await engine.load()).toBe(false);
  });

  it('gives false when the worker cannot be created', async () => {
    const engine = createEngine({
      workerUrl: 'x.js',
      makeWorker: () => {
        throw new Error('no workers here');
      },
    });
    expect(await engine.load()).toBe(false);
  });

  it('gives false when the worker reports an error while loading', async () => {
    const { engine } = engineWith(fakeWorker((line, w) => line === 'uci' && queueMicrotask(() => w.onerror?.(new Error('boom')))));
    expect(await engine.load()).toBe(false);
  });
});

describe('bestMove with Stockfish', () => {
  const replying = (line, w) => {
    answersUci(line, w);
    if (line.startsWith('go movetime')) queueMicrotask(() => w.emit('bestmove e7e5 ponder g1f3'));
  };

  it('sends skill, position and thinking time, and returns the parsed move', async () => {
    const w = fakeWorker(replying);
    const { engine } = engineWith(w);
    await engine.load();
    const move = await engine.bestMove(AFTER_E4, 'Medium');
    expect(move).toEqual({ from: 'e7', to: 'e5' });
    expect(w.posted.slice(-3)).toEqual([
      'setoption name Skill Level value 8',
      `position fen ${AFTER_E4}`,
      'go movetime 400',
    ]);
  });

  it('uses the settings of the level asked for', async () => {
    const w = fakeWorker(replying);
    const { engine } = engineWith(w);
    await engine.load();
    await engine.bestMove(AFTER_E4, 'Easy');
    expect(w.posted).toContain('setoption name Skill Level value 0');
  });

  it('gives null when Stockfish has no move', async () => {
    const w = fakeWorker((line, ww) => {
      answersUci(line, ww);
      if (line.startsWith('go')) queueMicrotask(() => ww.emit('bestmove (none)'));
    });
    const { engine } = engineWith(w);
    await engine.load();
    expect(await engine.bestMove(AFTER_E4, 'Easy')).toBeNull();
  });

  it('gives null (never throws) for an unknown level', async () => {
    const { engine } = engineWith(fakeWorker(replying));
    await engine.load();
    expect(await engine.bestMove(AFTER_E4, 'Impossible')).toBeNull();
  });
});

describe('falling back to the built-in search', () => {
  it('is used before the engine has loaded', async () => {
    const { engine } = engineWith(fakeWorker());
    const move = await engine.bestMove(AFTER_E4, 'Easy');
    expect(isLegalBlackMove(move)).toBe(true);
  });

  it('is used when the engine failed to load', async () => {
    const { engine } = engineWith(fakeWorker());
    await engine.load();
    expect(isLegalBlackMove(await engine.bestMove(AFTER_E4, 'Easy'))).toBe(true);
  });

  it('is used when the worker errors in the middle of a search', async () => {
    const w = fakeWorker((line, ww) => {
      answersUci(line, ww);
      if (line.startsWith('go')) queueMicrotask(() => ww.onerror?.(new Error('boom')));
    });
    const { engine } = engineWith(w);
    await engine.load();
    expect(isLegalBlackMove(await engine.bestMove(AFTER_E4, 'Easy'))).toBe(true);
  });

  it('is used when the engine takes too long, and the engine is told to stop', async () => {
    const w = fakeWorker(answersUci); // loads, then never answers a search
    const { engine } = engineWith(w, { moveTimeoutMs: 25 });
    await engine.load();
    expect(isLegalBlackMove(await engine.bestMove(AFTER_E4, 'Easy'))).toBe(true);
    expect(w.posted).toContain('stop');
  });

  it('keeps using it after a worker error', async () => {
    const w = fakeWorker((line, ww) => {
      answersUci(line, ww);
      if (line.startsWith('go')) queueMicrotask(() => ww.onerror?.(new Error('boom')));
    });
    const { engine } = engineWith(w);
    await engine.load();
    await engine.bestMove(AFTER_E4, 'Easy');
    const before = w.posted.length;
    expect(isLegalBlackMove(await engine.bestMove(AFTER_E4, 'Easy'))).toBe(true);
    expect(w.posted.length).toBe(before); // no more messages to the broken worker
  });
});

describe('replies that arrive late', () => {
  it('ignores the late reply of a search that already timed out', async () => {
    const w = fakeWorker(answersUci);
    const { engine } = engineWith(w, { moveTimeoutMs: 20 });
    await engine.load();
    await engine.bestMove(AFTER_E4, 'Easy'); // times out, falls back
    const second = engine.bestMove(AFTER_E4, 'Easy');
    await new Promise((r) => setTimeout(r, 5));
    w.emit('bestmove a7a6'); // the first search finally answers
    w.emit('bestmove e7e5'); // the second search answers
    expect(await second).toEqual({ from: 'e7', to: 'e5' });
  });

  it('gives null to a search that was replaced, and the answer to the new one', async () => {
    const w = fakeWorker(answersUci);
    const { engine } = engineWith(w, { moveTimeoutMs: 500 });
    await engine.load();
    const first = engine.bestMove(AFTER_E4, 'Easy');
    const second = engine.bestMove(AFTER_E4, 'Easy');
    w.emit('bestmove a7a6'); // belongs to the replaced search
    w.emit('bestmove e7e5');
    expect(await first).toBeNull();
    expect(await second).toEqual({ from: 'e7', to: 'e5' });
  });
});

describe('dispose', () => {
  it('stops the worker', async () => {
    const w = fakeWorker(answersUci);
    const { engine } = engineWith(w);
    await engine.load();
    engine.dispose();
    expect(w.terminated).toBe(true);
  });

  it('gives null to a search still waiting', async () => {
    const w = fakeWorker(answersUci);
    const { engine } = engineWith(w, { moveTimeoutMs: 500 });
    await engine.load();
    const waiting = engine.bestMove(AFTER_E4, 'Easy');
    engine.dispose();
    expect(await waiting).toBeNull();
  });

  it('is safe to call before anything was loaded', () => {
    const { engine } = engineWith(fakeWorker());
    expect(() => engine.dispose()).not.toThrow();
  });
});
