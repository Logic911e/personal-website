import * as THREE from 'three';

/**
 * Turn the room layout into Three.js objects: one flat-coloured block per box,
 * plus simple lighting. Box positions are the minimum corner in metres; a mesh is
 * centred, so it is offset by half its size.
 */
export function buildRoom(layout) {
  const group = new THREE.Group();
  group.name = 'room';

  const materials = new Map(); // one material per colour keeps the scene light
  const materialFor = (color) => {
    if (!materials.has(color)) materials.set(color, new THREE.MeshLambertMaterial({ color }));
    return materials.get(color);
  };

  for (const b of layout.boxes) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), materialFor(b.color));
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
