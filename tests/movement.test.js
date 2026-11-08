import { describe, it, expect } from 'vitest';
import { stepPlayer } from '../src/lib/movement.js';
import { collides } from '../src/lib/room.js';

const rect = (x, y, w, h) => ({ x, y, w, h });

describe('stepPlayer', () => {
  it('moves right by speed * dt', () => {
    const next = stepPlayer(rect(0, 0, 10, 10), { x: 1, y: 0 }, 50, [], 80);
    expect(next.x).toBeCloseTo(4);
    expect(next.y).toBe(0);
  });

  it('does not move without input', () => {
    expect(stepPlayer(rect(5, 5, 10, 10), { x: 0, y: 0 }, 16, [], 80)).toEqual(rect(5, 5, 10, 10));
  });

  it('stops at a solid on that axis but still moves on the other axis', () => {
    const wall = rect(20, -100, 10, 300);
    const next = stepPlayer(rect(9, 0, 10, 10), { x: 1, y: 1 }, 100, [wall], 80);
    expect(next.x).toBe(9);
    expect(next.y).toBeGreaterThan(0);
  });

  it('does not move faster on the diagonal', () => {
    const next = stepPlayer(rect(0, 0, 10, 10), { x: 1, y: 1 }, 50, [], 80);
    expect(Math.hypot(next.x, next.y)).toBeCloseTo(4);
  });

  it('caps a huge frame gap so the player cannot skip through a wall', () => {
    const wall = rect(12, 0, 4, 10);
    const start = rect(0, 0, 10, 10);
    const next = stepPlayer(start, { x: 1, y: 0 }, 5000, [wall], 80);
    expect(next.x - start.x).toBeLessThanOrEqual(80 * 0.05 + 1e-9);
    expect(collides(next, [wall])).toBe(false);
  });
});
