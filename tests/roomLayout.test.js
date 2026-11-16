import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, statSync } from 'node:fs';
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

describe('framed pictures on the walls', () => {
  const picture = (over = {}) => ({
    name: 'snap', src: 'assets/wall-photos/snap.jpg', wall: 'left', z: 3, y: 1.5, w: 0.5, h: 0.4, ...over,
  });
  const withPictures = (pictures, boxes = [box()]) => ({ ...minimal(boxes), pictures });
  const framesOf = (layout, name) => layout.boxes.filter((b) => b.name.startsWith(`frame-${name}-`));

  it('keeps the picture and builds a four-piece frame around it, not solid', () => {
    const layout = parseRoomLayout(withPictures([picture()]));
    expect(layout.pictures).toHaveLength(1);
    expect(layout.pictures[0]).toMatchObject({ name: 'snap', src: 'assets/wall-photos/snap.jpg', wall: 'left', y: 1.5, z: 3, w: 0.5, h: 0.4 });
    const frame = framesOf(layout, 'snap');
    expect(frame.map((b) => b.name).sort()).toEqual(['frame-snap-bottom', 'frame-snap-left', 'frame-snap-right', 'frame-snap-top']);
    expect(frame.every((b) => b.solid === false)).toBe(true);
  });

  it('puts the frame around the photo: a 0.03 m border on every side', () => {
    const frame = framesOf(parseRoomLayout(withPictures([picture()])), 'snap');
    const minZ = Math.min(...frame.map((b) => b.z));
    const maxZ = Math.max(...frame.map((b) => b.z + b.d));
    const minY = Math.min(...frame.map((b) => b.y));
    const maxY = Math.max(...frame.map((b) => b.y + b.h));
    expect(minZ).toBeCloseTo(3 - 0.25 - 0.03, 6);
    expect(maxZ).toBeCloseTo(3 + 0.25 + 0.03, 6);
    expect(minY).toBeCloseTo(1.5 - 0.2 - 0.03, 6);
    expect(maxY).toBeCloseTo(1.5 + 0.2 + 0.03, 6);
  });

  it('leaves the photo area itself open (no frame piece covers its middle)', () => {
    const frame = framesOf(parseRoomLayout(withPictures([picture()])), 'snap');
    const covers = (b, z, y) => z >= b.z && z <= b.z + b.d && y >= b.y && y <= b.y + b.h;
    expect(frame.some((b) => covers(b, 3, 1.5))).toBe(false);
  });

  it('hangs a left-wall picture on the left wall, a right-wall picture on the right wall', () => {
    const left = parseRoomLayout(withPictures([picture({ wall: 'left' })]));
    const right = parseRoomLayout(withPictures([picture({ wall: 'right' })]));
    expect(framesOf(left, 'snap').every((b) => b.x < 0.1)).toBe(true);
    expect(framesOf(right, 'snap').every((b) => b.x > 3.3 && b.x + b.w <= 3.5 + 1e-9)).toBe(true);
    expect(left.pictures[0].x).toBeLessThan(0.1);
    expect(right.pictures[0].x).toBeGreaterThan(3.4);
  });

  it('has no pictures for a room that lists none', () => {
    expect(parseRoomLayout(minimal()).pictures).toEqual([]);
  });

  it('rejects pictures that are not a list', () => {
    expect(() => parseRoomLayout(withPictures({}))).toThrow(/pictures/);
  });

  it('rejects an unknown wall, naming the picture', () => {
    expect(() => parseRoomLayout(withPictures([picture({ wall: 'ceiling' })]))).toThrow(/snap.*wall/);
  });

  it('rejects an unsafe or missing picture source', () => {
    expect(() => parseRoomLayout(withPictures([picture({ src: 'javascript:alert(1)' })]))).toThrow(/snap.*src/);
    expect(() => parseRoomLayout(withPictures([picture({ src: '' })]))).toThrow(/snap.*src/);
    expect(() => parseRoomLayout(withPictures([picture({ src: 'a\\b.jpg' })]))).toThrow(/snap.*src/);
  });

  it('rejects missing or non-positive numbers', () => {
    expect(() => parseRoomLayout(withPictures([picture({ w: 0 })]))).toThrow(/snap.*w/);
    expect(() => parseRoomLayout(withPictures([picture({ h: -1 })]))).toThrow(/snap.*h/);
    expect(() => parseRoomLayout(withPictures([picture({ z: undefined })]))).toThrow(/snap.*z/);
    expect(() => parseRoomLayout(withPictures([picture({ y: 'high' })]))).toThrow(/snap.*y/);
  });

  it('rejects two pictures with the same name', () => {
    expect(() => parseRoomLayout(withPictures([picture(), picture()]))).toThrow(/duplicate.*snap|snap.*duplicate/i);
  });

  it('rejects a picture whose frame would stick out of the room', () => {
    expect(() => parseRoomLayout(withPictures([picture({ z: 0.1 })]))).toThrow(/outside the room/);
    expect(() => parseRoomLayout(withPictures([picture({ y: 2.35 })]))).toThrow(/outside the room/);
  });
});

describe('the real room\'s wall photos', () => {
  const layout = parseRoomLayout(real);
  const picture = (name) => layout.pictures.find((p) => p.name === name);
  const overlaps3d = (a, b) =>
    a.x < b.x + b.w - 1e-9 && b.x < a.x + a.w - 1e-9 &&
    a.y < b.y + b.h - 1e-9 && b.y < a.y + a.h - 1e-9 &&
    a.z < b.z + b.d - 1e-9 && b.z < a.z + a.d - 1e-9;

  it('hangs the band photo on the left wall and the childhood photo on the right wall', () => {
    expect(picture('band')).toMatchObject({ wall: 'left', src: 'assets/wall-photos/band.jpg' });
    expect(picture('baby')).toMatchObject({ wall: 'right', src: 'assets/wall-photos/baby.jpg' });
  });

  it('gives each picture the shape of its photo (band 3:2 landscape, baby 3:4 portrait)', () => {
    expect(picture('band').w / picture('band').h).toBeCloseTo(2048 / 1366, 1);
    expect(picture('baby').w / picture('baby').h).toBeCloseTo(3024 / 4032, 1);
  });

  it('hangs both at a sensible height for looking at', () => {
    for (const p of layout.pictures) {
      expect(p.y - p.h / 2).toBeGreaterThan(1.0);
      expect(p.y + p.h / 2).toBeLessThan(2.1);
    }
  });

  it('has every photo file in the project', () => {
    for (const p of layout.pictures) {
      expect(existsSync(new URL(`../public/${p.src}`, import.meta.url)), p.src).toBe(true);
    }
  });

  it('keeps the photos small enough for a web page (under 400 KB each)', () => {
    for (const p of layout.pictures) {
      expect(statSync(new URL(`../public/${p.src}`, import.meta.url)).size).toBeLessThan(400 * 1024);
    }
  });

  it('carries no hidden camera data in the photo files', () => {
    for (const p of layout.pictures) {
      const bytes = readFileSync(new URL(`../public/${p.src}`, import.meta.url));
      expect(bytes.includes(Buffer.from('Exif\0\0')), `${p.src} has EXIF`).toBe(false);
    }
  });

  it('does not overlap the pinboard, the instruments, the furniture or each other', () => {
    const frames = layout.boxes.filter((b) => b.name.startsWith('frame-'));
    const others = layout.boxes.filter((b) => !/^(frame-|pine-|wall|floor|ceiling)/.test(b.name));
    for (const f of frames) {
      for (const o of others) expect(overlaps3d(f, o), `${f.name} overlaps ${o.name}`).toBe(false);
    }
    for (const a of frames) {
      for (const b of frames) {
        if (a !== b && a.name.split('-')[1] !== b.name.split('-')[1]) expect(overlaps3d(a, b)).toBe(false);
      }
    }
  });
});
