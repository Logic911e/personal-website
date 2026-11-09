// A Rect is { x, y, w, h }. In the 3D room, x is world x and y is world z
// (the floor plan), so w is the x-extent and h is the z-extent.

export function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/** True when `rect` overlaps any solid. Touching edges do not count. */
export function collides(rect, solids) {
  return solids.some((s) => overlaps(rect, s));
}
