const KEY = 'bedroom.muted';

function defaultStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null; // some browsers throw just for touching localStorage
  }
}

/** Whether the visitor chose to mute. Falls back to "not muted" if storage is unavailable. */
export function loadMuted(storage = defaultStorage()) {
  try {
    return storage?.getItem(KEY) === 'true';
  } catch {
    return false;
  }
}

/** Remember the mute choice. Silently does nothing if storage is unavailable. */
export function saveMuted(muted, storage = defaultStorage()) {
  try {
    storage?.setItem(KEY, String(muted));
  } catch {
    // private window or blocked storage: the choice just lasts for this visit
  }
}
