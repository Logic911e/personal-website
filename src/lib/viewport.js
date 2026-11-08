import { MOBILE_MAX_WIDTH } from '../config.js';

/**
 * Phones, small windows and touch-only devices get the plain project list instead of the game.
 * `forceGame` (the ?game=1 link) lets a visitor in anyway.
 */
export function shouldUseFallback({ width, touchOnly, forceGame = false }) {
  if (forceGame) return false;
  return touchOnly || width < MOBILE_MAX_WIDTH;
}
