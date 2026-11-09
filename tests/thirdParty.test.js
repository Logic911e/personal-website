import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, statSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const file = (p) => new URL(p, root);
const text = (p) => readFileSync(file(p), 'utf8');

describe('vendored Stockfish', () => {
  for (const name of ['stockfish.wasm.js', 'stockfish.wasm', 'Copying.txt']) {
    it(`ships public/assets/stockfish/${name}`, () => {
      expect(existsSync(file(`public/assets/stockfish/${name}`))).toBe(true);
      expect(statSync(file(`public/assets/stockfish/${name}`)).size).toBeGreaterThan(1000);
    });
  }

  it('includes the GPL licence text', () => {
    expect(text('public/assets/stockfish/Copying.txt')).toContain('GNU GENERAL PUBLIC LICENSE');
  });
});

describe('credits', () => {
  it('THIRD-PARTY.md names Stockfish, its licence and chess.js', () => {
    const t = text('THIRD-PARTY.md');
    expect(t).toContain('Stockfish');
    expect(t).toContain('GPL-3.0');
    expect(t).toContain('chess.js');
  });

  it('README credits Stockfish', () => {
    expect(text('README.md')).toContain('Stockfish');
  });

  it('chess.js is a dependency', () => {
    expect(JSON.parse(text('package.json')).dependencies['chess.js']).toBeDefined();
  });
});
