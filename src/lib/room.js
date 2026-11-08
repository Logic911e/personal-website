import { overlaps, collides } from './collision.js';

function findLayer(json, name) {
  return json.layers.find((l) => l.type === 'objectgroup' && l.name === name);
}

function requireLayer(json, name) {
  const layer = findLayer(json, name);
  if (!layer) throw new Error(`room map is missing the object layer "${name}"`);
  return layer;
}

function toRect(o) {
  return { x: o.x, y: o.y, w: o.width, h: o.height };
}

function prop(object, name) {
  return object.properties?.find((p) => p.name === name)?.value;
}

/**
 * Read a Tiled JSON map into the plain data the game needs.
 * Contract is documented in docs/ART-CONTRACT.md.
 */
export function parseRoom(json) {
  const solidLayer = requireLayer(json, 'solid');
  const spawnLayer = requireLayer(json, 'spawn');
  const interactLayer = findLayer(json, 'interact');

  const spawnObject = spawnLayer.objects[0];
  if (!spawnObject) throw new Error('room map: the "spawn" layer needs one point object');

  return {
    widthPx: json.width * json.tilewidth,
    heightPx: json.height * json.tileheight,
    spawn: { x: spawnObject.x, y: spawnObject.y },
    solids: solidLayer.objects.map(toRect),
    interactables: (interactLayer?.objects ?? []).map((o) => ({ name: o.name, rect: toRect(o) })),
    decor: solidLayer.objects
      .filter((o) => prop(o, 'color'))
      .map((o) => ({ rect: toRect(o), color: prop(o, 'color'), label: prop(o, 'label') ?? '' })),
  };
}

export { collides };

function centreDistance(a, b) {
  const dx = a.x + a.w / 2 - (b.x + b.w / 2);
  const dy = a.y + a.h / 2 - (b.y + b.h / 2);
  return Math.hypot(dx, dy);
}

/** The closest interactable whose rect, grown by `reach` pixels, overlaps the player. */
export function nearestInteractable(playerRect, interactables, reach) {
  let best = null;
  let bestDistance = Infinity;
  for (const item of interactables) {
    const grown = {
      x: item.rect.x - reach,
      y: item.rect.y - reach,
      w: item.rect.w + reach * 2,
      h: item.rect.h + reach * 2,
    };
    if (!overlaps(playerRect, grown)) continue;
    const d = centreDistance(playerRect, item.rect);
    if (d < bestDistance) {
      best = item;
      bestDistance = d;
    }
  }
  return best;
}
