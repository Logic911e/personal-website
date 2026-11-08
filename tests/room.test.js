import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseRoom, collides, nearestInteractable } from '../src/lib/room.js';

const rect = (x, y, w, h) => ({ x, y, w, h });

function objectLayer(name, objects) {
  return { type: 'objectgroup', name, objects };
}

function fixture(overrides = {}) {
  return {
    width: 10,
    height: 20,
    tilewidth: 16,
    tileheight: 16,
    layers: [
      { type: 'tilelayer', name: 'floor', data: [] },
      objectLayer('solid', [
        { x: 0, y: 0, width: 160, height: 16 },
        {
          x: 32,
          y: 32,
          width: 48,
          height: 32,
          properties: [
            { name: 'color', type: 'string', value: '#aa5' },
            { name: 'label', type: 'string', value: 'Bed' },
          ],
        },
      ]),
      objectLayer('interact', [{ name: 'board', x: 0, y: 100, width: 20, height: 60 }]),
      objectLayer('spawn', [{ x: 70, y: 300, point: true }]),
    ],
    ...overrides,
  };
}

describe('parseRoom', () => {
  it('reads the room size in pixels', () => {
    const room = parseRoom(fixture());
    expect(room.widthPx).toBe(160);
    expect(room.heightPx).toBe(320);
  });

  it('reads the spawn point', () => {
    expect(parseRoom(fixture()).spawn).toEqual({ x: 70, y: 300 });
  });

  it('extracts every solid as a rect', () => {
    const { solids } = parseRoom(fixture());
    expect(solids).toHaveLength(2);
    expect(solids[0]).toEqual(rect(0, 0, 160, 16));
  });

  it('extracts named interactables', () => {
    const { interactables } = parseRoom(fixture());
    expect(interactables).toEqual([{ name: 'board', rect: rect(0, 100, 20, 60) }]);
  });

  it('only draws placeholder boxes for solids that have a color', () => {
    const { decor } = parseRoom(fixture());
    expect(decor).toEqual([{ rect: rect(32, 32, 48, 32), color: '#aa5', label: 'Bed' }]);
  });

  it('names the missing layer when spawn is absent', () => {
    const json = fixture();
    json.layers = json.layers.filter((l) => l.name !== 'spawn');
    expect(() => parseRoom(json)).toThrow(/spawn/);
  });

  it('names the missing layer when solid is absent', () => {
    const json = fixture();
    json.layers = json.layers.filter((l) => l.name !== 'solid');
    expect(() => parseRoom(json)).toThrow(/solid/);
  });

  it('treats a missing interact layer as no interactables', () => {
    const json = fixture();
    json.layers = json.layers.filter((l) => l.name !== 'interact');
    expect(parseRoom(json).interactables).toEqual([]);
  });
});

describe('collides', () => {
  const solids = [rect(10, 10, 10, 10)];

  it('is true when rects overlap', () => {
    expect(collides(rect(15, 15, 10, 10), solids)).toBe(true);
  });

  it('is false when rects only touch edges', () => {
    expect(collides(rect(20, 10, 10, 10), solids)).toBe(false);
  });

  it('is false when far apart', () => {
    expect(collides(rect(100, 100, 5, 5), solids)).toBe(false);
  });
});

describe('nearestInteractable', () => {
  const near = { name: 'near', rect: rect(30, 0, 10, 10) };
  const far = { name: 'far', rect: rect(40, 0, 10, 10) };

  it('returns null when nothing is within reach', () => {
    expect(nearestInteractable(rect(0, 0, 10, 10), [far], 12)).toBeNull();
  });

  it('returns the nearer one when two are in reach', () => {
    const player = rect(20, 0, 10, 10);
    expect(nearestInteractable(player, [far, near], 12).name).toBe('near');
  });

  it('returns null for an empty list', () => {
    expect(nearestInteractable(rect(0, 0, 10, 10), [], 12)).toBeNull();
  });
});

describe('placeholder room.json', () => {
  const room = parseRoom(JSON.parse(readFileSync(new URL('../public/assets/room.json', import.meta.url))));

  it('has a board interactable', () => {
    expect(room.interactables.some((i) => i.name === 'board')).toBe(true);
  });

  it('spawns the player in open floor', () => {
    const player = rect(room.spawn.x, room.spawn.y, 12, 12);
    expect(collides(player, room.solids)).toBe(false);
  });

  it('is 14 by 22 tiles at 16px', () => {
    expect(room.widthPx).toBe(224);
    expect(room.heightPx).toBe(352);
  });
});
