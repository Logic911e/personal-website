import { NOTE_REACH } from '../config.js';

export const BOARD_W = 1.5; // metres
export const BOARD_H = 1.0;
const NOTE_W = 0.28;
const NOTE_H = 0.2;
const COLS = 5;
const ROWS = 4;
const MAX_NOTES = COLS * ROWS;
const MAX_TILT = 0.06; // radians

// Fixed, not random: the same note always sits at the same slight angle.
function tiltFor(index) {
  return (((index * 7) % 11) - 5) / 5 * MAX_TILT;
}

function slotAt(position, index, kind) {
  const col = position % COLS;
  const row = Math.floor(position / COLS);
  return {
    index,
    kind,
    u: -BOARD_W / 2 + (col + 0.5) * (BOARD_W / COLS),
    v: BOARD_H / 2 - (row + 0.5) * (BOARD_H / ROWS),
    w: NOTE_W,
    h: NOTE_H,
    tilt: tiltFor(position),
  };
}

/**
 * Where each note goes on the board. u/v are metres from the board centre (right, up).
 * Index is the project index; -1 is the "See all projects" note, -2 the blank "No projects yet" note.
 */
export function layoutNotes(count) {
  if (count <= 0) return [{ ...slotAt(0, -2, 'empty'), u: 0, v: 0 }];
  if (count <= MAX_NOTES) return Array.from({ length: count }, (_, i) => slotAt(i, i, 'project'));
  const slots = Array.from({ length: MAX_NOTES - 1 }, (_, i) => slotAt(i, i, 'project'));
  slots.push(slotAt(MAX_NOTES - 1, -1, 'more'));
  return slots;
}

/** Split text into user-perceived characters, so emoji and joined emoji stay in one piece. */
export function graphemes(text) {
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    return Array.from(new Intl.Segmenter().segment(text), (s) => s.segment);
  }
  return Array.from(text); // older browsers: whole code points
}

/** Shorten a title for a note. Cuts by whole characters (emoji stay in one piece). */
export function noteLabel(title, max = 18) {
  const chars = graphemes(title);
  if (chars.length <= max) return title;
  return chars.slice(0, max - 1).join('') + '…';
}

/** The note the crosshair is on: the nearest hit within reach, or null. */
export function pickNote(hits, reach = NOTE_REACH) {
  let best = null;
  for (const hit of hits) {
    if (typeof hit.noteIndex !== 'number') continue; // something else in the ray's path (a pin), not a note
    if (hit.distance > reach) continue;
    if (best === null || hit.distance < best.distance) best = hit;
  }
  return best === null ? null : best.noteIndex;
}

/**
 * What the crosshair is on: the nearest hit within reach that is a note (its index) or the computer monitor
 * ("computer"). Hits with no target, such as a pin stuck in a note, are ignored. Returns null for nothing.
 */
export function pickTarget(hits, reach = NOTE_REACH) {
  let best = null;
  for (const hit of hits) {
    if (typeof hit.target !== 'number' && hit.target !== 'computer') continue;
    if (hit.distance > reach) continue;
    if (best === null || hit.distance < best.distance) best = hit;
  }
  return best === null ? null : best.target;
}
