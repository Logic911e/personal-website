import { describe, it, expect } from 'vitest';
import { TEXTURES, TEXTURE_NAMES, texturePixels } from '../src/lib/pixelTextures.js';
import { faceRepeats } from '../src/lib/faceRepeats.js';

describe('texture list', () => {
  it('has the seven textures the room uses', () => {
    expect([...TEXTURE_NAMES].sort()).toEqual(['carpet', 'curtain', 'door', 'planks', 'plaster', 'weave', 'wood']);
  });

  it('gives every texture a pixel size and a real-world tile size in metres', () => {
    for (const name of TEXTURE_NAMES) {
      const t = TEXTURES[name];
      expect(t.width).toBeGreaterThan(0);
      expect(t.height).toBeGreaterThan(0);
      expect(t.tileW).toBeGreaterThan(0);
      expect(t.tileH).toBeGreaterThan(0);
    }
  });
});

describe('texturePixels', () => {
  it.each(TEXTURE_NAMES)('%s fills width x height RGBA bytes', (name) => {
    const { width, height, data } = texturePixels(name);
    expect(data).toBeInstanceOf(Uint8ClampedArray);
    expect(data).toHaveLength(width * height * 4);
  });

  it.each(TEXTURE_NAMES)('%s is fully opaque', (name) => {
    const { data } = texturePixels(name);
    for (let i = 3; i < data.length; i += 4) expect(data[i]).toBe(255);
  });

  it.each(TEXTURE_NAMES)('%s has real detail, not one flat shade', (name) => {
    const { data } = texturePixels(name);
    const shades = new Set();
    for (let i = 0; i < data.length; i += 4) shades.add(data[i]);
    expect(shades.size).toBeGreaterThanOrEqual(3);
  });

  it.each(TEXTURE_NAMES)('%s stays light enough to tint with a colour', (name) => {
    const { data } = texturePixels(name);
    for (let i = 0; i < data.length; i += 4) expect(data[i]).toBeGreaterThanOrEqual(120);
  });

  it.each(TEXTURE_NAMES)('%s is grey (red, green and blue match) so the box colour tints it', (name) => {
    const { data } = texturePixels(name);
    for (let i = 0; i < data.length; i += 4) {
      expect(data[i + 1]).toBe(data[i]);
      expect(data[i + 2]).toBe(data[i]);
    }
  });

  it.each(TEXTURE_NAMES)('%s comes out identical every time', (name) => {
    expect(Array.from(texturePixels(name).data)).toEqual(Array.from(texturePixels(name).data));
  });

  it('refuses an unknown texture name', () => {
    expect(() => texturePixels('marble')).toThrow(/unknown texture/i);
  });
});

describe('faceRepeats', () => {
  // BoxGeometry face order: +x, -x, +y, -y, +z, -z
  it('repeats once per tile along each face, in box face order', () => {
    // box 1 wide (x), 2 tall (y), 4 deep (z); tile 0.5 x 0.5
    expect(faceRepeats(1, 2, 4, 0.5, 0.5)).toEqual([
      [8, 4], [8, 4], // +x, -x: u runs along depth, v along height
      [2, 8], [2, 8], // +y, -y: u along width, v along depth
      [2, 4], [2, 4], // +z, -z: u along width, v along height
    ]);
  });

  it('uses the tile width for u and the tile height for v', () => {
    const [px] = faceRepeats(0.9, 2.1, 0.25, 0.9, 2.1);
    expect(px).toEqual([0.25 / 0.9, 1]);
    const pz = faceRepeats(0.9, 2.1, 0.25, 0.9, 2.1)[4];
    expect(pz).toEqual([1, 1]);
  });
});
