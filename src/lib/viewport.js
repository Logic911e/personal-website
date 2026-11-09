import { MOBILE_MAX_WIDTH } from '../config.js';

/**
 * Phones, small windows and touch-only devices get the plain project list instead of the game.
 * `forceGame` (the ?game=1 link) lets a visitor in anyway.
 */
export function shouldUseFallback({ width, touchOnly, forceGame = false }) {
  if (forceGame) return false;
  return touchOnly || width < MOBILE_MAX_WIDTH;
}

/** A touch-only device that was forced into the game (?game=1) has no keyboard or mouse to play with. */
export function needsKeyboardMouse({ touchOnly, forceGame }) {
  return touchOnly && forceGame;
}
