import { Chess } from 'chess.js';
import { chooseMove } from '../lib/chessAi.js';
import { engineCommands, parseBestMove } from '../lib/uci.js';
import { levelSettings } from '../lib/chessLevels.js';

const FALLBACK_YIELD_MS = 20; // let the page paint before the built-in search keeps it busy

/**
 * The chess computer. Talks to Stockfish in a Web Worker, and quietly uses the built-in search instead if
 * Stockfish cannot load, errors, or takes too long. The worker is only created when load() is first called.
 *
 * bestMove(fen, levelName) never rejects. It resolves with { from, to, promotion? }, or null when there is no
 * move to make, the level is unknown, or the request was replaced by a newer one (or the engine was disposed).
 * The worker is injectable so tests can use a fake.
 */
export function createEngine({
  workerUrl,
  makeWorker = (url) => new Worker(url),
  loadTimeoutMs = 8000,
  moveTimeoutMs = 10000,
}) {
  let worker = null;
  let loaded = false;
  let loadPromise = null;
  let finishLoad = null;
  let pending = null; // the search whose answer we are waiting for
  let inFlight = 0; // searches sent to Stockfish whose "bestmove" has not come back yet
  let disposed = false;

  const lineOf = (e) => (typeof e === 'string' ? e : e?.data);

  function settle(result) {
    if (!pending) return;
    const p = pending;
    pending = null;
    clearTimeout(p.timer);
    p.resolve(result);
  }

  function failOver() {
    if (!pending) return;
    const p = pending;
    pending = null;
    clearTimeout(p.timer);
    p.resolve(p.fallback());
  }

  function breakWorker() {
    loaded = false;
    inFlight = 0;
    try {
      worker?.terminate();
    } catch {
      // already gone
    }
    worker = null;
    failOver();
  }

  function onMessage(e) {
    const line = lineOf(e);
    if (typeof line !== 'string') return;
    if (line === 'uciok' && finishLoad) {
      loaded = true;
      finishLoad(true);
    } else if (line.startsWith('bestmove')) {
      inFlight = Math.max(0, inFlight - 1);
      // Only the newest search's answer counts; the rest belong to searches that were replaced or timed out.
      if (inFlight === 0) settle(parseBestMove(line));
    }
  }

  function load() {
    if (loadPromise) return loadPromise;
    loadPromise = new Promise((resolve) => {
      let timer = null;
      const done = (ok) => {
        if (!finishLoad) return;
        finishLoad = null;
        clearTimeout(timer);
        if (!ok) breakWorker();
        resolve(ok);
      };
      finishLoad = done;
      timer = setTimeout(() => done(false), loadTimeoutMs);
      try {
        worker = makeWorker(workerUrl);
        worker.onmessage = onMessage;
        worker.onerror = () => (finishLoad ? finishLoad(false) : breakWorker());
        worker.postMessage('uci');
      } catch {
        done(false);
      }
    });
    return loadPromise;
  }

  function bestMove(fen, level) {
    let settings;
    try {
      settings = levelSettings(level);
    } catch {
      return Promise.resolve(null);
    }
    const fallback = () =>
      new Promise((r) => setTimeout(r, FALLBACK_YIELD_MS)).then(() => chooseMove(new Chess(fen), settings.fallbackDepth));

    if (disposed || !loaded || !worker) return fallback();

    if (pending) {
      settle(null); // replaced by this newer search
      try {
        worker.postMessage('stop');
      } catch {
        // the error handler deals with a dead worker
      }
    }
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        try {
          worker?.postMessage('stop');
        } catch {
          // ignore
        }
        failOver();
      }, moveTimeoutMs);
      pending = { resolve, fallback, timer };
      try {
        inFlight += 1;
        for (const command of engineCommands(fen, settings)) worker.postMessage(command);
      } catch {
        inFlight = Math.max(0, inFlight - 1);
        failOver();
      }
    });
  }

  function dispose() {
    disposed = true;
    loaded = false;
    finishLoad?.(false);
    try {
      worker?.terminate();
    } catch {
      // ignore
    }
    worker = null;
    settle(null);
  }

  return { load, bestMove, dispose };
}
