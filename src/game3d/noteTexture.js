import * as THREE from 'three';

const W = 140; // small on purpose: chunky pixel text fits the blocky look
const H = 100;

function wrapLines(ctx, text, maxWidth) {
  const lines = [];
  let line = '';
  for (const word of text.split(' ')) {
    const attempt = line ? `${line} ${word}` : word;
    if (ctx.measureText(attempt).width <= maxWidth || !line) {
      line = attempt;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

/** A small piece of lined paper with the label written on it. */
export function makeNoteTexture(label) {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#f7f3e3';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#cfd8e6';
  ctx.lineWidth = 1;
  for (let y = 22; y < H; y += 14) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(W, y + 0.5);
    ctx.stroke();
  }
  ctx.fillStyle = '#2a2a33';
  ctx.font = 'bold 15px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lines = wrapLines(ctx, label, W - 16);
  const lineHeight = 18;
  const top = H / 2 - ((lines.length - 1) * lineHeight) / 2 + 6;
  lines.forEach((line, i) => ctx.fillText(line, W / 2, top + i * lineHeight));

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter; // keep the pixels crisp
  texture.minFilter = THREE.LinearFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
