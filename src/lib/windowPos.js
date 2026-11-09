const TITLE_BAR_H = 24;
const MIN_VISIBLE_W = 40; // always keep this much of a window's width on screen so it can be grabbed

const finite = (n) => (Number.isFinite(n) ? n : 0);

/**
 * Keep a dragged window reachable: its title bar stays above the taskbar, and at least 40 px of it
 * stays on screen sideways. Positions are the window's top-left corner in pixels.
 */
export function clampWindow(pos, size, viewport, taskbarH = 32) {
  const minX = MIN_VISIBLE_W - finite(size.w);
  const maxX = Math.max(minX, finite(viewport.w) - MIN_VISIBLE_W);
  const maxY = Math.max(0, finite(viewport.h) - taskbarH - TITLE_BAR_H);
  return {
    x: Math.min(maxX, Math.max(minX, finite(pos.x))),
    y: Math.min(maxY, Math.max(0, finite(pos.y))),
  };
}

/** The taskbar clock: 12-hour, like 3:07 PM. */
export function formatClock(date) {
  const h = date.getHours();
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h % 12 === 0 ? 12 : h % 12}:${m} ${h < 12 ? 'AM' : 'PM'}`;
}
