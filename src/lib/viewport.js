import { MOBILE_MAX_WIDTH } from '../config.js';

/** Phones, small windows and touch-only devices get the plain project list instead of the game. */
export function shouldUseFallback({ width, touchOnly }) {
  return touchOnly || width < MOBILE_MAX_WIDTH;
}
