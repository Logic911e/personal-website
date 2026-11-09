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

describe('textures', () => {
  const byName = (name) => parseRoomLayout(real).boxes.find((b) => b.name === name);

  it('keeps a known texture name on a box', () => {
    const layout = parseRoomLayout(minimal([box({ texture: 'wood' })]));
    expect(layout.boxes[0].texture).toBe('wood');
  });

  it('leaves a box with no texture flat-coloured', () => {
    expect(parseRoomLayout(minimal()).boxes[0].texture).toBeUndefined();
  });

  it('rejects an unknown texture and names the box and the choices', () => {
    expect(() => parseRoomLayout(minimal([box({ texture: 'marble' })]))).toThrow(/crate.*marble.*planks|crate.*texture/s);
  });

  it('rejects a texture that is not a string', () => {
    expect(() => parseRoomLayout(minimal([box({ texture: 5 })]))).toThrow(/crate.*texture/);
  });

  it('textures the surfaces of the real room', () => {
    expect(byName('floor').texture).toBe('carpet');
    expect(byName('wall-back').texture).toBe('plaster');
    expect(byName('ceiling').texture).toBe('plaster');
    expect(byName('wall-door').texture).toBe('door');
    expect(byName('bed-duvet').texture).toBe('weave');
    expect(byName('curtain-left').texture).toBe('curtain');
    expect(byName('desk-top').texture).toBe('wood');
    expect(parseRoomLayout(real).boxes.filter((b) => b.name.startsWith('pine-')).every((b) => b.texture === 'planks')).toBe(true);
  });
});

describe('the door', () => {
  const door = () => parseRoomLayout(real).boxes.find((b) => b.name === 'wall-door');

  it('is a proper doorway: at least 0.8 m wide and 2 m tall', () => {
    expect(door().w).toBeGreaterThanOrEqual(0.8);
    expect(door().h).toBeGreaterThanOrEqual(2);
  });

  it('is filled in on both sides and above, with no gap in the wall', () => {
    const { boxes } = parseRoomLayout(real);
    const d = door();
    const left = boxes.find((b) => b.name === 'wall-door-left');
    const right = boxes.find((b) => b.name === 'wall-door-right');
    const top = boxes.find((b) => b.name === 'wall-door-top');
    expect(left.x + left.w).toBeCloseTo(d.x, 9);
    expect(right.x).toBeCloseTo(d.x + d.w, 9);
    expect(top.x).toBeCloseTo(d.x, 9);
    expect(top.w).toBeCloseTo(d.w, 9);
    expect(top.y).toBeCloseTo(d.h, 9);
  });

  it('has a frame around it', () => {
    const names = parseRoomLayout(real).boxes.map((b) => b.name);
    expect(names).toEqual(expect.arrayContaining(['door-frame-left', 'door-frame-right', 'door-frame-top']));
  });
});

describe('the monitor', () => {
  it('has a teal-tinted screen so it looks switched on, and sits inside the room', () => {
    const screen = parseRoomLayout(real).boxes.find((b) => b.name === 'monitor-screen');
    expect(screen).toBeDefined();
    expect(screen.color).toBe('#1f6f6f');
    expect(screen.x + screen.w).toBeLessThanOrEqual(3.5);
  });

  it('is within reach of the floor space in front of the desk', () => {
    const { boxes } = parseRoomLayout(real);
    const screen = boxes.find((b) => b.name === 'monitor-screen');
    const desk = boxes.find((b) => b.name === 'desk-body');
    // The player's centre can get no closer to the desk than half the player's size; the screen must be reachable from there.
    const nearestPlayerX = desk.x - 0.25;
    expect(screen.x - nearestPlayerX).toBeLessThanOrEqual(1.5);
  });
});

describe('sprites in the room file', () => {
  const sprite = (over = {}) => ({
    name: 'toy', facing: '-x', voxel: 0.1, depth: 0.05,
    origin: { x: 1, y: 0.5, z: 2 },
    palette: { A: '#ff0000' },
    rows: ['AA', 'AA'],
    ...over,
  });
  const withSprites = (sprites, boxes = [box()]) => ({ ...minimal(boxes), sprites });

  it('adds the blocks of every sprite to the room, not solid', () => {
    const layout = parseRoomLayout(withSprites([sprite()]));
    const mine = layout.boxes.filter((b) => b.name.startsWith('toy-'));
    expect(mine.length).toBeGreaterThan(0);
    expect(mine.every((b) => b.solid === false && b.color === '#ff0000')).toBe(true);
  });

  it('does not add anything for a room with no sprites', () => {
    expect(parseRoomLayout(minimal()).boxes).toHaveLength(1);
  });

  it('does not make a sprite block a path (sprites never count as solid)', () => {
    expect(solidRects(parseRoomLayout(withSprites([sprite()])))).toHaveLength(1); // only the crate
  });

  it('names the sprite when it is wrong', () => {
    expect(() => parseRoomLayout(withSprites([sprite({ rows: ['AZ'] })]))).toThrow(/room layout.*toy.*Z/);
  });

  it('rejects sprites that are not a list', () => {
    expect(() => parseRoomLayout(withSprites({}))).toThrow(/sprites/);
  });

  it('rejects a sprite that sticks out of the room', () => {
    expect(() => parseRoomLayout(withSprites([sprite({ origin: { x: 3.49, y: 0.5, z: 2 } })]))).toThrow(/outside the room/);
  });

  it('rejects a sprite whose block names clash with a box', () => {
    expect(() => parseRoomLayout(withSprites([sprite()], [box({ name: 'toy-0' })]))).toThrow(/duplicate/i);
  });
});

describe('the bass and the guitar', () => {
  const layout = parseRoomLayout(real);
  const named = (prefix) => layout.boxes.filter((b) => b.name.startsWith(prefix));
  const bounds = (boxes) => ({
    minX: Math.min(...boxes.map((b) => b.x)), maxX: Math.max(...boxes.map((b) => b.x + b.w)),
    minY: Math.min(...boxes.map((b) => b.y)), maxY: Math.max(...boxes.map((b) => b.y + b.h)),
    minZ: Math.min(...boxes.map((b) => b.z)), maxZ: Math.max(...boxes.map((b) => b.z + b.d)),
  });

  it('are drawn as detailed sprites, not a few plain blocks', () => {
    expect(named('bass-').length).toBeGreaterThan(30);
    expect(named('guitar-').length).toBeGreaterThan(30);
  });

  it('left the old plain blocks behind', () => {
    for (const old of ['bass-body', 'bass-neck', 'bass-head', 'guitar-body', 'guitar-neck', 'guitar-head']) {
      expect(layout.boxes.find((b) => b.name === old), old).toBeUndefined();
    }
  });

  it('keep the bass on the left wall, at a size that looks like a bass', () => {
    const b = bounds(named('bass-'));
    expect(b.minX).toBeLessThan(0.1);
    expect(b.maxX).toBeLessThan(0.25);
    expect(b.maxY - b.minY).toBeGreaterThan(1.0);
    expect(b.maxY - b.minY).toBeLessThan(1.3);
    expect(b.maxY).toBeLessThanOrEqual(2.4);
    expect(b.maxZ - b.minZ).toBeGreaterThan(0.25); // body width
    expect(b.maxZ - b.minZ).toBeLessThan(0.45);
  });

  it('keep the guitar standing on its stand, at a size that looks like a guitar', () => {
    const stand = layout.boxes.find((b) => b.name === 'guitar-stand');
    expect(stand.solid).toBe(true);
    const g = bounds(named('guitar-').filter((b) => b.name !== 'guitar-stand'));
    expect(g.minY).toBeGreaterThanOrEqual(stand.y + stand.h - 1e-6);
    expect(g.maxY - g.minY).toBeGreaterThan(0.9);
    expect(g.maxY - g.minY).toBeLessThan(1.2);
    expect(g.minZ).toBeGreaterThanOrEqual(stand.z - 0.1);
    expect(g.maxZ).toBeLessThanOrEqual(stand.z + stand.d + 0.1);
    expect(g.minX).toBeGreaterThanOrEqual(stand.x - 1e-6);
  });

  it('use the colours of the real instruments: a black bass and a pink guitar', () => {
    const bass = named('bass-').map((b) => b.color);
    const guitar = named('guitar-').map((b) => b.color);
    const count = (colors, c) => colors.filter((x) => x === c).length;
    expect(count(bass, '#1a1a1a')).toBeGreaterThan(count(bass, '#e6dcc0')); // more black body than cream guard
    expect(guitar).toContain('#f08db4'); // pink
  });
});
