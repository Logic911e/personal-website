import { collides } from './collision.js';

// A long gap between frames (for example a background tab) must not turn into
// one giant step that jumps through a wall.
const MAX_DT_MS = 50;

/**
 * Move `rect` one frame in direction `dir` (each axis -1, 0 or 1).
 * Each axis is resolved separately so the player slides along walls.
 */
export function stepPlayer(rect, dir, dtMs, solids, speed = 80) {
  const dt = Math.min(dtMs, MAX_DT_MS) / 1000;
  const length = Math.hypot(dir.x, dir.y) || 1;
  const dx = (dir.x / length) * speed * dt;
  const dy = (dir.y / length) * speed * dt;

  let next = { ...rect };

  const tryX = { ...next, x: next.x + dx };
  if (!collides(tryX, solids)) next = tryX;

  const tryY = { ...next, y: next.y + dy };
  if (!collides(tryY, solids)) next = tryY;

  return next;
}
