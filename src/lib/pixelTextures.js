/**
 * Pixel-art textures drawn in code, so the room has surface detail without any image files.
 * Each one is grey: the box's own colour tints it, so room.json keeps deciding the colours.
 * To use your own art instead, drop a PNG in (see docs/ROOM-GUIDE.md).
 *
 * width/height are in pixels; tileW/tileH are how many metres of surface one copy covers.
 */

// A repeatable "random" number from 0 to 1 for a pixel: same inputs, same answer, every time.
function noise(x, y, seed) {
  let h = Math.imul(x + 1, 374761393) ^ Math.imul(y + 1, 668265263) ^ Math.imul(seed + 1, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const MIN_SHADE = 120; // never so dark that a tinted surface turns muddy
const clamp = (v) => Math.max(MIN_SHADE, Math.min(255, Math.round(v)));

const FOLDS = [250, 240, 215, 185, 172, 190, 220, 243];

// Raised panels: light on the top and left edge, dark on the bottom and right.
function panelShade(x, y, left, top, right, bottom) {
  if (x < left || x > right || y < top || y > bottom) return null;
  if (y === top || x === left) return 250;
  if (y === bottom || x === right) return 150;
  return 228;
}

export const TEXTURES = {
  planks: {
    width: 16, height: 16, tileW: 0.5, tileH: 0.5,
    shade(x, y) {
      if (y % 4 === 0) return 150; // gap between boards
      const row = Math.floor(y / 4);
      if (x === (row * 5) % 16) return 175; // where two boards meet
      return 238 - noise(x >> 2, y, 1) * 38 - noise(x, y, 2) * 10;
    },
  },
  plaster: {
    width: 16, height: 16, tileW: 0.5, tileH: 0.5,
    shade(x, y) {
      return noise(x, y, 3) > 0.96 ? 232 : 250 - noise(x, y, 4) * 7;
    },
  },
  carpet: {
    width: 16, height: 16, tileW: 0.5, tileH: 0.5,
    shade(x, y) {
      return 176 + noise(x, y, 5) * 72;
    },
  },
  weave: {
    width: 16, height: 16, tileW: 0.3, tileH: 0.3,
    shade(x, y) {
      const base = ((x >> 1) + (y >> 1)) % 2 === 0 ? 214 : 246;
      return base - noise(x, y, 6) * 16;
    },
  },
  curtain: {
    width: 16, height: 16, tileW: 0.4, tileH: 0.4,
    shade(x, y) {
      return FOLDS[x % 8] - noise(x, y, 7) * 8;
    },
  },
  wood: {
    width: 16, height: 16, tileW: 0.4, tileH: 0.4,
    shade(x, y) {
      return 244 - noise(x >> 2, y, 8) * 14 - noise(0, y, 9) * 16;
    },
  },
  door: {
    width: 16, height: 32, tileW: 0.9, tileH: 2.1,
    shade(x, y) {
      const panel =
        panelShade(x, y, 3, 3, 12, 13) ?? // upper panel
        panelShade(x, y, 3, 17, 12, 28); // lower panel
      const base = panel ?? 214; // the flat frame around the panels
      return base - noise(x, y >> 1, 10) * 12;
    },
  },
};

export const TEXTURE_NAMES = Object.keys(TEXTURES);

/** The pixels of one texture as { width, height, data }, data being RGBA bytes. */
export function texturePixels(name) {
  const t = TEXTURES[name];
  if (!t) throw new Error(`unknown texture "${name}"`);
  const data = new Uint8ClampedArray(t.width * t.height * 4);
  for (let y = 0; y < t.height; y++) {
    for (let x = 0; x < t.width; x++) {
      const v = clamp(t.shade(x, y));
      const i = (y * t.width + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = v;
      data[i + 3] = 255;
    }
  }
  return { width: t.width, height: t.height, data };
}
