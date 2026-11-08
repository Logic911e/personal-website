import { describe, it, expect } from 'vitest';
import { loadMuted, saveMuted, effectiveMuted } from '../src/lib/mute.js';

function fakeStorage() {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => void data.set(k, String(v)),
  };
}

const blockedStorage = {
  getItem() {
    throw new Error('blocked');
  },
  setItem() {
    throw new Error('blocked');
  },
};

describe('mute storage', () => {
  it('defaults to not muted', () => {
    expect(loadMuted(fakeStorage())).toBe(false);
  });

  it('remembers a muted choice', () => {
    const s = fakeStorage();
    saveMuted(true, s);
    expect(loadMuted(s)).toBe(true);
  });

  it('remembers an unmuted choice after muting', () => {
    const s = fakeStorage();
    saveMuted(true, s);
    saveMuted(false, s);
    expect(loadMuted(s)).toBe(false);
  });

  it('does not crash when storage throws, and defaults to not muted', () => {
    expect(() => saveMuted(true, blockedStorage)).not.toThrow();
    expect(loadMuted(blockedStorage)).toBe(false);
  });

  it('does not crash when there is no storage at all', () => {
    expect(() => saveMuted(true, null)).not.toThrow();
    expect(loadMuted(null)).toBe(false);
  });
});

describe('effectiveMuted', () => {
  it('is muted when the visitor muted', () => {
    expect(effectiveMuted(true, false)).toBe(true);
  });

  it('is muted while the tab is hidden', () => {
    expect(effectiveMuted(false, true)).toBe(true);
  });

  it('is not muted when neither applies', () => {
    expect(effectiveMuted(false, false)).toBe(false);
  });

  it('never changes the saved mute choice', () => {
    const s = fakeStorage();
    saveMuted(false, s);
    effectiveMuted(false, true); // tab hidden
    effectiveMuted(false, false); // tab shown again
    expect(loadMuted(s)).toBe(false);
    saveMuted(true, s);
    effectiveMuted(true, true);
    effectiveMuted(true, false);
    expect(loadMuted(s)).toBe(true);
  });
});
