// Conventions: yaw 0 looks toward -z (the back wall). Positive yaw turns the view left.
// Positive pitch looks up. Directions are in the floor plane: { x: world x, y: world z }.

const MAX_PITCH = (85 * Math.PI) / 180;
const TWO_PI = Math.PI * 2;

function wrapYaw(yaw) {
  return ((((yaw + Math.PI) % TWO_PI) + TWO_PI) % TWO_PI) - Math.PI;
}

/** Turn the view by a mouse movement. Pitch is clamped so the camera can never flip over. */
export function applyLook(state, dx, dy, sensitivity = 0.002) {
  let yaw = state.yaw - dx * sensitivity;
  if (yaw > Math.PI || yaw < -Math.PI) yaw = wrapYaw(yaw); // only wrap when needed, to avoid rounding drift
  const pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, state.pitch - dy * sensitivity));
  return { yaw, pitch };
}

/** Floor-plan direction for the held keys, rotated by where the player is facing. */
export function moveDir(keys, yaw) {
  const forward = (keys.forward ? 1 : 0) - (keys.back ? 1 : 0);
  const right = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);
  // forward vector = (-sin, -cos), right vector = (cos, -sin); "+ 0" turns -0 into 0
  return {
    x: forward * -sin + right * cos + 0,
    y: forward * -cos + right * -sin + 0,
  };
}
