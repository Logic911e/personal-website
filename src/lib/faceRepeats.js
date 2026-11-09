/**
 * How many times a texture repeats across each face of a box, so a tile always covers the same
 * real-world size no matter how big the box is. Faces come in Three.js BoxGeometry order:
 * +x, -x, +y, -y, +z, -z. Each answer is [repeats across u, repeats across v].
 */
export function faceRepeats(w, h, d, tileW, tileH) {
  const side = [d / tileW, h / tileH]; // faces looking along x: depth across, height up
  const top = [w / tileW, d / tileH]; // faces looking along y: width across, depth up
  const front = [w / tileW, h / tileH]; // faces looking along z: width across, height up
  return [side, side, top, top, front, front];
}
