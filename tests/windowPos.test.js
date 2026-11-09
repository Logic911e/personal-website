import { describe, it, expect } from 'vitest';
import { clampWindow, formatClock } from '../src/lib/windowPos.js';

const viewport = { w: 1000, h: 700 };
const size = { w: 400, h: 300 };

describe('clampWindow', () => {
  it('leaves a window that is fully on screen alone', () => {
    expect(clampWindow({ x: 100, y: 80 }, size, viewport)).toEqual({ x: 100, y: 80 });
  });

  it('stops the title bar going above the top', () => {
    expect(clampWindow({ x: 100, y: -50 }, size, viewport).y).toBe(0);
  });

  it('stops the title bar going down behind the taskbar', () => {
    // taskbar 32 and title bar 24 must stay visible: y can be at most 700 - 32 - 24 = 644
    expect(clampWindow({ x: 100, y: 5000 }, size, viewport).y).toBe(644);
  });

  it('keeps at least 40 px of the window on screen at the left', () => {
    expect(clampWindow({ x: -5000, y: 100 }, size, viewport).x).toBe(40 - 400);
  });

  it('keeps at least 40 px of the window on screen at the right', () => {
    expect(clampWindow({ x: 5000, y: 100 }, size, viewport).x).toBe(1000 - 40);
  });

  it('never gives NaN or a reversed range on a tiny viewport', () => {
    const p = clampWindow({ x: 10, y: 10 }, size, { w: 10, h: 10 });
    expect(Number.isFinite(p.x)).toBe(true);
    expect(Number.isFinite(p.y)).toBe(true);
    expect(p.y).toBe(0);
  });

  it('treats a missing or broken position as the top left', () => {
    expect(clampWindow({ x: NaN, y: undefined }, size, viewport)).toEqual({ x: 0, y: 0 });
  });

  it('accepts a taskbar of another height', () => {
    expect(clampWindow({ x: 0, y: 5000 }, size, viewport, 0).y).toBe(700 - 24);
  });
});

describe('formatClock', () => {
  const at = (h, m) => new Date(2026, 10, 9, h, m);

  it('shows the afternoon as PM', () => {
    expect(formatClock(at(15, 7))).toBe('3:07 PM');
  });

  it('shows midnight as 12:00 AM', () => {
    expect(formatClock(at(0, 0))).toBe('12:00 AM');
  });

  it('shows noon as 12:00 PM and just after as 12:30 PM', () => {
    expect(formatClock(at(12, 0))).toBe('12:00 PM');
    expect(formatClock(at(12, 30))).toBe('12:30 PM');
  });

  it('pads the minutes but not the hour', () => {
    expect(formatClock(at(9, 5))).toBe('9:05 AM');
  });

  it('shows 11:59 PM before midnight', () => {
    expect(formatClock(at(23, 59))).toBe('11:59 PM');
  });
});
