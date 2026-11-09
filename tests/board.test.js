import { describe, it, expect } from 'vitest';
import { layoutNotes, noteLabel, pickNote, pickTarget, BOARD_W, BOARD_H } from '../src/lib/board.js';

function overlap(a, b) {
  return (
    Math.abs(a.u - b.u) < (a.w + b.w) / 2 && Math.abs(a.v - b.v) < (a.h + b.h) / 2
  );
}

describe('layoutNotes', () => {
  it('shows one blank note when there are no projects', () => {
    const slots = layoutNotes(0);
    expect(slots).toHaveLength(1);
    expect(slots[0].kind).toBe('empty');
  });

  it('gives three projects three distinct positions', () => {
    const slots = layoutNotes(3);
    expect(slots.map((s) => s.kind)).toEqual(['project', 'project', 'project']);
    expect(slots.map((s) => s.index)).toEqual([0, 1, 2]);
    expect(new Set(slots.map((s) => `${s.u},${s.v}`)).size).toBe(3);
  });

  it('fills 20 projects in a 5 by 4 grid with no overlaps', () => {
    const slots = layoutNotes(20);
    expect(slots).toHaveLength(20);
    expect(slots.every((s) => s.kind === 'project')).toBe(true);
    expect(new Set(slots.map((s) => s.u)).size).toBe(5);
    expect(new Set(slots.map((s) => s.v)).size).toBe(4);
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) expect(overlap(slots[i], slots[j])).toBe(false);
    }
  });

  it('starts at the top left and fills row by row', () => {
    const slots = layoutNotes(6);
    const [first, second, sixth] = [slots[0], slots[1], slots[5]];
    expect(second.u).toBeGreaterThan(first.u);
    expect(second.v).toBe(first.v);
    expect(sixth.v).toBeLessThan(first.v);
    expect(sixth.u).toBe(first.u);
  });

  it('turns the 20th slot into a "See all projects" note when there are more than 20', () => {
    const slots = layoutNotes(21);
    expect(slots).toHaveLength(20);
    expect(slots.filter((s) => s.kind === 'project')).toHaveLength(19);
    expect(slots[19].kind).toBe('more');
    expect(slots[19].index).toBe(-1);
  });

  it('keeps every note inside the board', () => {
    for (const s of layoutNotes(25)) {
      expect(Math.abs(s.u) + s.w / 2).toBeLessThanOrEqual(BOARD_W / 2);
      expect(Math.abs(s.v) + s.h / 2).toBeLessThanOrEqual(BOARD_H / 2);
    }
  });

  it('gives each note a small fixed tilt', () => {
    const a = layoutNotes(20).map((s) => s.tilt);
    const b = layoutNotes(20).map((s) => s.tilt);
    expect(a).toEqual(b);
    expect(a.every((t) => Math.abs(t) <= 0.06 + 1e-9)).toBe(true);
    expect(new Set(a).size).toBeGreaterThan(1);
  });

  it('uses 0.28 by 0.2 metre notes', () => {
    const [s] = layoutNotes(1);
    expect(s.w).toBe(0.28);
    expect(s.h).toBe(0.2);
  });
});

describe('noteLabel', () => {
  it('leaves a short title alone', () => {
    expect(noteLabel('Chess detection')).toBe('Chess detection');
  });

  it('cuts a long title to 18 characters ending in an ellipsis', () => {
    const label = noteLabel('A very long project title that keeps going');
    expect(Array.from(label)).toHaveLength(18);
    expect(label.endsWith('…')).toBe(true);
  });

  it('never splits an emoji at the cut', () => {
    const label = noteLabel('a'.repeat(16) + '😀😀😀');
    expect(label).toBe('a'.repeat(16) + '😀…');
    expect(label).not.toMatch(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/);
  });

  it('never splits a joined emoji (like a family) at the cut', () => {
    const family = '👨‍👩‍👧‍👦';
    const label = noteLabel('x'.repeat(17) + family + 'y');
    expect(label).toBe('x'.repeat(17) + '…');
  });

  it('does not touch markup in a title (escaping happens where it is shown)', () => {
    expect(noteLabel('<b>hi</b>')).toBe('<b>hi</b>');
  });
});

describe('pickNote', () => {
  it('returns null when nothing is hit', () => {
    expect(pickNote([])).toBeNull();
  });

  it('returns null when the nearest hit is too far away', () => {
    expect(pickNote([{ distance: 2, noteIndex: 3 }])).toBeNull();
  });

  it('returns the nearest note when two are in reach', () => {
    const hits = [{ distance: 1.2, noteIndex: 5 }, { distance: 0.9, noteIndex: 2 }];
    expect(pickNote(hits)).toBe(2);
  });

  it('ignores a far hit even when it is first in the list', () => {
    const hits = [{ distance: 3, noteIndex: 7 }, { distance: 1, noteIndex: 4 }];
    expect(pickNote(hits)).toBe(4);
  });

  it('accepts a hit exactly at the reach limit', () => {
    expect(pickNote([{ distance: 1.5, noteIndex: 1 }])).toBe(1);
  });

  it('ignores a hit that is not a note (such as a pin), even when it is nearer', () => {
    const hits = [{ distance: 0.9, noteIndex: undefined }, { distance: 1.0, noteIndex: 2 }];
    expect(pickNote(hits)).toBe(2);
  });

  it('returns null when the only hit is not a note', () => {
    expect(pickNote([{ distance: 0.9, noteIndex: undefined }])).toBeNull();
  });

  it('can return the "See all projects" index', () => {
    expect(pickNote([{ distance: 1, noteIndex: -1 }])).toBe(-1);
  });
});

describe('pickTarget', () => {
  it('returns null when nothing is hit', () => {
    expect(pickTarget([])).toBeNull();
  });

  it('returns the nearest note in reach', () => {
    expect(pickTarget([{ distance: 1.2, target: 5 }, { distance: 0.9, target: 2 }])).toBe(2);
  });

  it('returns "computer" when the monitor is the nearest thing in reach', () => {
    expect(pickTarget([{ distance: 1.0, target: 'computer' }])).toBe('computer');
  });

  it('picks the nearer of a note and the monitor', () => {
    expect(pickTarget([{ distance: 1.4, target: 'computer' }, { distance: 1.1, target: 3 }])).toBe(3);
    expect(pickTarget([{ distance: 0.8, target: 'computer' }, { distance: 1.1, target: 3 }])).toBe('computer');
  });

  it('returns note 0 as 0, not as nothing', () => {
    expect(pickTarget([{ distance: 1, target: 0 }])).toBe(0);
  });

  it('returns the "See all projects" index', () => {
    expect(pickTarget([{ distance: 1, target: -1 }])).toBe(-1);
  });

  it('ignores a hit with no target (such as a pin), even when it is nearer', () => {
    expect(pickTarget([{ distance: 0.5 }, { distance: 1.0, target: 2 }])).toBe(2);
    expect(pickTarget([{ distance: 0.5, target: undefined }])).toBeNull();
  });

  it('ignores a target that is neither a note index nor the computer', () => {
    expect(pickTarget([{ distance: 0.5, target: 'toaster' }])).toBeNull();
  });

  it('ignores anything beyond reach, but accepts exactly the reach limit', () => {
    expect(pickTarget([{ distance: 2, target: 'computer' }])).toBeNull();
    expect(pickTarget([{ distance: 1.5, target: 'computer' }])).toBe('computer');
  });
});
