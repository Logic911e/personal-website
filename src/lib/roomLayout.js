import { collides } from './collision.js';
import { PLAYER_SIZE } from '../config.js';
import { TEXTURE_NAMES } from './pixelTextures.js';
import { spriteToBoxes } from './voxelSprite.js';
import { isSafeSrc } from './photos.js';

const COLOR = /^#[0-9a-fA-F]{6}$/;
const NUMBER_FIELDS = ['x', 'y', 'z', 'w', 'h', 'd'];
// Boxes with these name prefixes may extend outside the interior (walls sit around it).
const MAY_BE_OUTSIDE = ['wall', 'floor', 'ceiling'];
const EPS = 1e-9;

function fail(where, why) {
  throw new Error(`room layout, ${where}: ${why}`);
}

function requireNumber(obj, field, where) {
  if (typeof obj?.[field] !== 'number' || !Number.isFinite(obj[field])) fail(where, `"${field}" must be a number`);
  return obj[field];
}

const FRAME_COLOR = '#3b2614';
const FRAME_BORDER = 0.03; // width of the wooden frame around a photo, in metres
const FRAME_DEPTH = 0.03; // how far the frame sticks out of the wall
const WALL_SURFACE = 0.02; // the pine planks are 0.02 thick, so a frame hangs on that

/**
 * Pictures hung on the left or right wall. Each becomes a "pictures" entry (the photo itself, drawn by the
 * renderer) plus four frame boxes around it, which then go through the same checks as every other box.
 */
function expandPictures(rawPictures, size) {
  if (!Array.isArray(rawPictures)) fail('root', '"pictures" must be a list');
  const names = new Set();
  const pictures = [];
  const boxes = [];
  rawPictures.forEach((raw, i) => {
    const name = typeof raw?.name === 'string' && raw.name !== '' ? raw.name : null;
    if (name === null) fail(`picture #${i}`, '"name" must be a non-empty string');
    const where = `picture "${name}"`;
    if (names.has(name)) fail(where, 'duplicate name');
    names.add(name);
    if (raw.wall !== 'left' && raw.wall !== 'right') fail(where, '"wall" must be "left" or "right"');
    if (!isSafeSrc(raw.src)) fail(where, '"src" must be a local path or an http(s) address');
    const y = requireNumber(raw, 'y', where);
    const z = requireNumber(raw, 'z', where);
    const w = requireNumber(raw, 'w', where);
    const h = requireNumber(raw, 'h', where);
    if (w <= 0) fail(where, '"w" must be greater than 0');
    if (h <= 0) fail(where, '"h" must be greater than 0');

    const frameX = raw.wall === 'left' ? WALL_SURFACE : size.w - WALL_SURFACE - FRAME_DEPTH;
    const round = (n) => Number(n.toFixed(6));
    pictures.push({ name, src: raw.src, wall: raw.wall, x: round(frameX + FRAME_DEPTH / 2), y, z, w, h });

    const b = FRAME_BORDER;
    const piece = (side, py, pz, ph, pd) => ({
      name: `frame-${name}-${side}`, x: round(frameX), y: round(py), z: round(pz), w: FRAME_DEPTH, h: round(ph), d: round(pd),
      color: FRAME_COLOR, solid: false, texture: 'wood',
    });
    boxes.push(
      piece('top', y + h / 2, z - w / 2 - b, b, w + 2 * b),
      piece('bottom', y - h / 2 - b, z - w / 2 - b, b, w + 2 * b),
      piece('left', y - h / 2, z - w / 2 - b, h, b),
      piece('right', y - h / 2, z + w / 2, h, b),
    );
  });
  return { pictures, boxes };
}

function parseBox(raw, index, size) {
  const name = typeof raw?.name === 'string' && raw.name !== '' ? raw.name : null;
  if (name === null) fail(`box #${index}`, '"name" must be a non-empty string');
  const where = `box "${name}"`;

  const box = { name };
  for (const f of NUMBER_FIELDS) box[f] = requireNumber(raw, f, where);
  for (const f of ['w', 'h', 'd']) if (box[f] <= 0) fail(where, `"${f}" must be greater than 0`);
  if (typeof raw.color !== 'string' || !COLOR.test(raw.color)) fail(where, '"color" must look like #rrggbb');
  box.color = raw.color;
  if (typeof raw.solid !== 'boolean') fail(where, '"solid" must be true or false');
  box.solid = raw.solid;
  if (raw.texture !== undefined) {
    if (typeof raw.texture !== 'string' || !TEXTURE_NAMES.includes(raw.texture)) {
      fail(where, `"texture" must be one of: ${TEXTURE_NAMES.join(', ')} (got ${JSON.stringify(raw.texture)})`);
    }
    box.texture = raw.texture;
  }

  if (!MAY_BE_OUTSIDE.some((p) => name.startsWith(p))) {
    const inside =
      box.x >= -EPS && box.y >= -EPS && box.z >= -EPS &&
      box.x + box.w <= size.w + EPS && box.y + box.h <= size.h + EPS && box.z + box.d <= size.l + EPS;
    if (!inside) fail(where, 'is outside the room (only wall, floor and ceiling boxes may be)');
  }
  return box;
}

/** Validate the raw room data and return a clean RoomLayout. Throws an Error naming what is wrong. */
export function parseRoomLayout(raw) {
  if (raw === null || typeof raw !== 'object') fail('root', 'must be an object');

  const size = {
    w: requireNumber(raw.size, 'w', 'size'),
    l: requireNumber(raw.size, 'l', 'size'),
    h: requireNumber(raw.size, 'h', 'size'),
  };
  const unit = requireNumber(raw, 'unit', 'root');
  const spawn = {
    x: requireNumber(raw.spawn, 'x', 'spawn'),
    z: requireNumber(raw.spawn, 'z', 'spawn'),
    yaw: requireNumber(raw.spawn, 'yaw', 'spawn'),
  };

  if (!Array.isArray(raw.boxes)) fail('root', '"boxes" must be a list');
  // Sprites (pixel drawings such as the guitar) become ordinary boxes, so everything else treats them alike.
  let spriteBoxes = [];
  if (raw.sprites !== undefined) {
    if (!Array.isArray(raw.sprites)) fail('root', '"sprites" must be a list');
    spriteBoxes = raw.sprites.flatMap((sprite) => {
      try {
        return spriteToBoxes(sprite ?? {});
      } catch (e) {
        return fail('sprites', e.message);
      }
    });
  }
  let pictures = [];
  let frameBoxes = [];
  if (raw.pictures !== undefined) ({ pictures, boxes: frameBoxes } = expandPictures(raw.pictures, size));
  const seen = new Set();
  const boxes = [...raw.boxes, ...spriteBoxes, ...frameBoxes].map((b, i) => {
    const box = parseBox(b, i, size);
    if (seen.has(box.name)) fail(`box "${box.name}"`, 'duplicate name');
    seen.add(box.name);
    return box;
  });

  if (!raw.board) fail('root', '"board" is missing');
  const board = {
    center: {
      z: requireNumber(raw.board.center, 'z', 'board.center'),
      y: requireNumber(raw.board.center, 'y', 'board.center'),
    },
    w: requireNumber(raw.board, 'w', 'board'),
    h: requireNumber(raw.board, 'h', 'board'),
  };

  const layout = { size, unit, spawn, boxes, board, pictures };

  const footprint = { x: spawn.x - PLAYER_SIZE / 2, y: spawn.z - PLAYER_SIZE / 2, w: PLAYER_SIZE, h: PLAYER_SIZE };
  if (collides(footprint, solidRects(layout))) fail('spawn', 'is inside a solid box');

  return layout;
}

/** Floor-plan rectangles for every solid box: x is world x, y is world z. */
export function solidRects(layout) {
  return layout.boxes.filter((b) => b.solid).map((b) => ({ x: b.x, y: b.z, w: b.w, h: b.d }));
}
