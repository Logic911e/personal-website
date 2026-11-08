import { describe, it, expect } from 'vitest';
import { applyLook, moveDir } from '../src/lib/look.js';

const MAX_PITCH = (85 * Math.PI) / 180;
const none = { forward: false, back: false, left: false, right: false };

describe('moveDir', () => {
  it('walks toward -z when facing the back wall (yaw 0)', () => {
    const d = moveDir({ ...none, forward: true }, 0);
    expect(d.x).toBeCloseTo(0);
    expect(d.y).toBeCloseTo(-1);
  });

  it('strafes right along +x at yaw 0', () => {
    const d = moveDir({ ...none, right: true }, 0);
    expect(d.x).toBeCloseTo(1);
    expect(d.y).toBeCloseTo(0);
  });

  it('walks toward -x after turning left a quarter turn', () => {
    const d = moveDir({ ...none, forward: true }, Math.PI / 2);
    expect(d.x).toBeCloseTo(-1);
    expect(d.y).toBeCloseTo(0);
  });

  it('walks backward away from where you face', () => {
    const d = moveDir({ ...none, back: true }, 0);
    expect(d.y).toBeCloseTo(1);
  });

  it('cancels opposing keys', () => {
    const d = moveDir({ forward: true, back: true, left: true, right: true }, 1.2);
    expect(d.x).toBeCloseTo(0);
    expect(d.y).toBeCloseTo(0);
  });

  it('gives no movement with no keys', () => {
    const d = moveDir(none, 2);
    expect(Math.hypot(d.x, d.y)).toBeCloseTo(0);
  });
});

describe('applyLook', () => {
  it('turns right when the mouse moves right', () => {
    expect(applyLook({ yaw: 0, pitch: 0 }, 100, 0, 0.002).yaw).toBeLessThan(0);
  });

  it('looks down when the mouse moves down', () => {
    expect(applyLook({ yaw: 0, pitch: 0 }, 0, 100, 0.002).pitch).toBeLessThan(0);
  });

  it('clamps looking up at 85 degrees however far the mouse goes', () => {
    expect(applyLook({ yaw: 0, pitch: 0 }, 0, -1e6, 0.002).pitch).toBeCloseTo(MAX_PITCH);
  });

  it('clamps looking down at 85 degrees however far the mouse goes', () => {
    expect(applyLook({ yaw: 0, pitch: 0 }, 0, 1e6, 0.002).pitch).toBeCloseTo(-MAX_PITCH);
  });

  it('keeps yaw within -pi..pi after a huge turn', () => {
    const { yaw } = applyLook({ yaw: 0, pitch: 0 }, 1e6, 0, 0.002);
    expect(yaw).toBeGreaterThanOrEqual(-Math.PI);
    expect(yaw).toBeLessThanOrEqual(Math.PI);
  });

  it('leaves the view alone when the mouse does not move', () => {
    expect(applyLook({ yaw: 0.4, pitch: -0.2 }, 0, 0)).toEqual({ yaw: 0.4, pitch: -0.2 });
  });
});
