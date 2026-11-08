import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseRoomLayout, solidRects } from '../src/lib/roomLayout.js';
import { collides } from '../src/lib/collision.js';
import { stepPlayer } from '../src/lib/movement.js';
import { PLAYER_SIZE, WALK_SPEED } from '../src/config.js';

const real = JSON.parse(readFileSync(new URL('../src/data/room.json', import.meta.url)));

function box(over = {}) {
  return { name: 'crate', x: 1, y: 0, z: 1, w: 0.5, h: 0.5, d: 0.5, color: '#aabbcc', solid: true, ...over };
}

function minimal(boxes = [box()], over = {}) {
  return {
    size: { w: 3.5, l: 5.5, h: 2.4 },
    unit: 0.25,
    spawn: { x: 2.5, z: 4.5, yaw: 0 },
    boxes,
    board: { center: { z: 3, y: 1.4 }, w: 1.5, h: 1 },
    ...over,
  };
}

describe('parseRoomLayout', () => {
  it('accepts the real room.json', () => {
    const layout = parseRoomLayout(real);
    expect(layout.size).toEqual({ w: 3.5, l: 5.5, h: 2.4 });
    expect(layout.unit).toBe(0.25);
    expect(layout.boxes.length).toBeGreaterThan(20);
  });

  it('rejects a bad colour and names the box', () => {
    expect(() => parseRoomLayout(minimal([box({ color: 'red' })]))).toThrow(/crate.*color|color.*crate/);
  });

  it('rejects a duplicate box name', () => {
    expect(() => parseRoomLayout(minimal([box(), box()]))).toThrow(/duplicate.*crate|crate.*duplicate/i);
  });

  it('rejects a missing numeric field and names the box', () => {
    const { w, ...noWidth } = box();
    expect(() => parseRoomLayout(minimal([noWidth]))).toThrow(/crate.*w|w.*crate/);
  });

  it('rejects a non-wall box outside the room', () => {
    expect(() => parseRoomLayout(minimal([box({ x: 3.4, w: 0.5 })]))).toThrow(/crate.*outside|outside.*crate/i);
  });

  it('lets wall, floor and ceiling boxes sit outside the interior', () => {
    const outside = [
      box({ name: 'wall-left', x: -0.25, w: 0.25, z: -0.25, d: 6, h: 2.4 }),
      box({ name: 'floor', x: -0.25, y: -0.05, h: 0.05, z: -0.25, w: 4, d: 6, solid: false }),
    ];
    expect(() => parseRoomLayout(minimal(outside))).not.toThrow();
  });

  it('rejects a spawn inside a solid box', () => {
    const inside = box({ name: 'crate', x: 2.2, z: 4.2, w: 1, d: 1 });
    expect(() => parseRoomLayout(minimal([inside]))).toThrow(/spawn/i);
  });

  it('rejects a layout without a board', () => {
    const { board, ...noBoard } = minimal();
    expect(() => parseRoomLayout(noBoard)).toThrow(/board/);
  });
});

describe('solidRects', () => {
  it('maps z to y and depth to h, and skips non-solid boxes', () => {
    const layout = parseRoomLayout(minimal([box({ name: 'a', x: 1, z: 2, w: 0.4, d: 0.6 }), box({ name: 'b', solid: false })]));
    expect(solidRects(layout)).toEqual([{ x: 1, y: 2, w: 0.4, h: 0.6 }]);
  });
});

describe('the real room', () => {
  const layout = parseRoomLayout(real);
  const solids = solidRects(layout);
  const start = { x: layout.spawn.x - PLAYER_SIZE / 2, y: layout.spawn.z - PLAYER_SIZE / 2, w: PLAYER_SIZE, h: PLAYER_SIZE };

  const directions = [
    [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1],
  ];

  it('keeps the player inside the room from every free spot, walking in all 8 directions for 8 seconds', () => {
    // Start points across the whole floor, so every wall (not just the ones near the spawn) is tried.
    const starts = [];
    for (let x = 0; x <= layout.size.w - PLAYER_SIZE; x += 0.5) {
      for (let z = 0; z <= layout.size.l - PLAYER_SIZE; z += 0.5) {
        const p = { x, y: z, w: PLAYER_SIZE, h: PLAYER_SIZE };
        if (!collides(p, solids)) starts.push(p);
      }
    }
    expect(starts.length).toBeGreaterThan(20);

    const escaped = [];
    for (const from of starts) {
      for (const [dx, dz] of directions) {
        let p = from;
        for (let t = 0; t < 8000; t += 16) p = stepPlayer(p, { x: dx, y: dz }, 16, solids, WALK_SPEED);
        const inside =
          p.x >= -1e-9 && p.y >= -1e-9 &&
          p.x + p.w <= layout.size.w + 1e-9 && p.y + p.h <= layout.size.l + 1e-9;
        if (!inside) escaped.push(`from (${from.x},${from.y}) dir (${dx},${dz}) ended at (${p.x.toFixed(2)},${p.y.toFixed(2)})`);
      }
    }
    expect(escaped).toEqual([]);
  });

  it('lets the player walk from the door to the board wall', () => {
    const step = 0.1;
    const cols = Math.round((layout.size.w - PLAYER_SIZE) / step);
    const rows = Math.round((layout.size.l - PLAYER_SIZE) / step);
    const free = (c, r) => !collides({ x: c * step, y: r * step, w: PLAYER_SIZE, h: PLAYER_SIZE }, solids);
    const sc = Math.round(start.x / step);
    const sr = Math.round(start.y / step);
    const target = [0, Math.round((layout.board.center.z - PLAYER_SIZE / 2) / step)]; // flat against the left wall
    const seen = new Set([`${sc},${sr}`]);
    const queue = [[sc, sr]];
    while (queue.length) {
      const [c, r] = queue.shift();
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nc = c + dc;
        const nr = r + dr;
        const key = `${nc},${nr}`;
        if (nc < 0 || nr < 0 || nc > cols || nr > rows || seen.has(key) || !free(nc, nr)) continue;
        seen.add(key);
        queue.push([nc, nr]);
      }
    }
    expect(seen.has(`${target[0]},${target[1]}`)).toBe(true);
  });

  it('keeps the spawn clear of every solid', () => {
    expect(collides(start, solids)).toBe(false);
  });
});
