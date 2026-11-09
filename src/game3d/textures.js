import * as THREE from 'three';
import { texturePixels } from '../lib/pixelTextures.js';

const cache = new Map();

/** The Three.js texture for a named pixel texture: crisp pixels that repeat. Made once, then reused. */
export function getTexture(name) {
  if (!cache.has(name)) {
    const { width, height, data } = texturePixels(name);
    const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.NearestFilter; // no smoothing: keeps the blocky pixel look
    texture.minFilter = THREE.NearestMipmapLinearFilter; // sharp up close, no shimmer from far away
    texture.generateMipmaps = true;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.flipY = false;
    texture.needsUpdate = true;
    cache.set(name, texture);
  }
  return cache.get(name);
}
