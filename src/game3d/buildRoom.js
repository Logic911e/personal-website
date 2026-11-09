import * as THREE from 'three';
import { getTexture } from './textures.js';
import { TEXTURES } from '../lib/pixelTextures.js';
import { faceRepeats } from '../lib/faceRepeats.js';

/**
 * Turn the room layout into Three.js objects: one block per box (flat colour, or a pixel
 * texture tinted by that colour), plus simple lighting. Box positions are the minimum corner in metres; a mesh is
 * centred, so it is offset by half its size.
 */
export function buildRoom(layout) {
  const group = new THREE.Group();
  group.name = 'room';

  const materials = new Map(); // one material per colour and texture keeps the scene light
  const materialFor = (color, texture) => {
    const key = `${color}|${texture ?? ''}`;
    if (!materials.has(key)) {
      materials.set(key, new THREE.MeshLambertMaterial({ color, map: texture ? getTexture(texture) : null }));
    }
    return materials.get(key);
  };

  // Stretch each face's texture coordinates so one tile always covers the same real-world size.
  const tileUvs = (geometry, b, tile) => {
    const uv = geometry.attributes.uv;
    faceRepeats(b.w, b.h, b.d, tile.tileW, tile.tileH).forEach(([ru, rv], face) => {
      for (let i = face * 4; i < face * 4 + 4; i++) uv.setXY(i, uv.getX(i) * ru, uv.getY(i) * rv);
    });
    uv.needsUpdate = true;
  };

  for (const b of layout.boxes) {
    const geometry = new THREE.BoxGeometry(b.w, b.h, b.d);
    if (b.texture) tileUvs(geometry, b, TEXTURES[b.texture]);
    const mesh = new THREE.Mesh(geometry, materialFor(b.color, b.texture));
    mesh.position.set(b.x + b.w / 2, b.y + b.h / 2, b.z + b.d / 2);
    mesh.name = b.name;
    group.add(mesh);
  }

  // Flat, even light with a little direction so block faces read like Minecraft's.
  group.add(new THREE.AmbientLight(0xfff1dc, 1.7));
  const sun = new THREE.DirectionalLight(0xffffff, 1.1);
  sun.position.set(layout.size.w * 0.3, 4, layout.size.l * 0.2);
  sun.target.position.set(layout.size.w / 2, 0, layout.size.l / 2);
  group.add(sun, sun.target);

  return group;
}
