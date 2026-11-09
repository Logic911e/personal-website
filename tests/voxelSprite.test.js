import { describe, it, expect } from 'vitest';
import { spriteToBoxes } from '../src/lib/voxelSprite.js';

const base = {
  name: 'toy',
  facing: '-x',
  voxel: 0.1,
  depth: 0.05,
  origin: { x: 1, y: 0.5, z: 2 },
  palette: { A: '#ff0000', B: '#00ff00' },
  rows: ['A'],
};
const make = (over = {}) => spriteToBoxes({ ...base, ...over });
const volume = (boxes) => boxes.reduce((s, b) => s + b.w * b.h * b.d, 0);

describe('spriteToBoxes', () => {
  it('turns one pixel into one block of voxel size and the given depth', () => {
    const [b] = make();
    expect(b).toMatchObject({ x: 1, y: 0.5, z: 2, w: 0.05, color: '#ff0000', solid: false });
    expect(b.h).toBeCloseTo(0.1);
    expect(b.d).toBeCloseTo(0.1);
  });

  it('skips empty pixels', () => {
    expect(make({ rows: ['.', '.'] })).toEqual([]);
    expect(make({ rows: ['A.A'] })).toHaveLength(2);
  });

  it('merges a run of the same colour along a row into one block', () => {
    const boxes = make({ rows: ['AAAA'] });
    expect(boxes).toHaveLength(1);
    expect(boxes[0].d).toBeCloseTo(0.4);
  });

  it('merges identical runs on rows above each other into one taller block', () => {
    const boxes = make({ rows: ['AA', 'AA', 'AA'] });
    expect(boxes).toHaveLength(1);
    expect(boxes[0].h).toBeCloseTo(0.3);
    expect(boxes[0].d).toBeCloseTo(0.2);
  });

  it('does not merge different colours or different spans', () => {
    expect(make({ rows: ['AB'] })).toHaveLength(2);
    expect(make({ rows: ['AA', 'AB'] }).length).toBeGreaterThan(1);
  });

  it('puts the top row at the top: row 0 is the highest', () => {
    const boxes = make({ rows: ['A', 'B'] });
    const a = boxes.find((b) => b.color === '#ff0000');
    const b = boxes.find((b) => b.color === '#00ff00');
    expect(a.y).toBeGreaterThan(b.y);
    expect(b.y).toBeCloseTo(0.5);
    expect(a.y).toBeCloseTo(0.6);
  });

  it('facing -x: columns run toward +z from the origin', () => {
    const boxes = make({ facing: '-x', rows: ['AB'] });
    const a = boxes.find((b) => b.color === '#ff0000');
    const b = boxes.find((b) => b.color === '#00ff00');
    expect(a.z).toBeCloseTo(2);
    expect(b.z).toBeCloseTo(2.1);
  });

  it('facing +x: columns run toward -z from the origin, so the picture is not mirrored', () => {
    const boxes = make({ facing: '+x', rows: ['AB'] });
    const a = boxes.find((b) => b.color === '#ff0000');
    const b = boxes.find((b) => b.color === '#00ff00');
    // the viewer's left edge is at z = 2; A is leftmost, so it covers 1.9..2.0 and B covers 1.8..1.9
    expect(a.z).toBeCloseTo(1.9);
    expect(b.z).toBeCloseTo(1.8);
  });

  it('keeps every filled pixel and nothing else (volume is conserved)', () => {
    const rows = ['A.AB', 'AAAB', '.BB.'];
    const filled = rows.join('').replace(/\./g, '').length;
    const boxes = make({ rows });
    expect(volume(boxes)).toBeCloseTo(filled * 0.1 * 0.1 * 0.05, 9);
  });

  it('gives every block a unique name starting with the sprite name', () => {
    const boxes = make({ rows: ['ABAB', 'BABA'] });
    expect(new Set(boxes.map((b) => b.name)).size).toBe(boxes.length);
    expect(boxes.every((b) => b.name.startsWith('toy-'))).toBe(true);
  });

  it('refuses a character that is not in the palette, naming it and the sprite', () => {
    expect(() => make({ rows: ['AZ'] })).toThrow(/toy.*Z|Z.*toy/);
  });

  it('refuses rows of different lengths', () => {
    expect(() => make({ rows: ['AA', 'A'] })).toThrow(/toy.*row/i);
  });

  it('refuses a bad facing, voxel size, depth, empty rows or missing origin', () => {
    expect(() => make({ facing: 'up' })).toThrow(/facing/);
    expect(() => make({ voxel: 0 })).toThrow(/voxel/);
    expect(() => make({ depth: -1 })).toThrow(/depth/);
    expect(() => make({ rows: [] })).toThrow(/rows/);
    expect(() => make({ origin: { x: 1 } })).toThrow(/origin/);
  });

  it('refuses a palette colour that is not #rrggbb', () => {
    expect(() => make({ palette: { A: 'red' } })).toThrow(/palette|color/);
  });

  it('refuses "." as a palette entry (it means empty)', () => {
    expect(() => make({ palette: { '.': '#000000', A: '#ff0000' } })).toThrow(/\./);
  });
});
