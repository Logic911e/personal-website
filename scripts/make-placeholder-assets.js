// Generates the placeholder music in public/assets/music/ and six placeholder photos in public/assets/photos/.
// Run with: node scripts/make-placeholder-assets.js
// Replace the generated file with your own song; this script only exists so the
// site has something to play before your music is ready.
import { writeFileSync, mkdirSync } from 'node:fs';

const assets = new URL('../public/assets/', import.meta.url);

// ---- Placeholder music: an 8 second looping arpeggio (22050 Hz, mono, 16-bit WAV) ----
function makeWav() {
  const rate = 22050;
  const seconds = 8;
  const notes = [261.63, 329.63, 392.0, 523.25, 392.0, 329.63, 293.66, 392.0]; // C E G C' G E D G
  const noteLen = seconds / notes.length;
  const samples = new Int16Array(rate * seconds);
  for (let i = 0; i < samples.length; i++) {
    const t = i / rate;
    const n = Math.floor(t / noteLen);
    const local = t - n * noteLen;
    // quick attack, smooth fade so every note starts and ends at silence (clean loop)
    const env = Math.min(local / 0.02, 1) * Math.pow(1 - local / noteLen, 1.5);
    samples[i] = Math.round(Math.sin(2 * Math.PI * notes[n] * t) * env * 0.35 * 32767);
  }
  const data = Buffer.from(samples.buffer);
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16); // fmt chunk size
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(rate * 2, 28); // byte rate
  header.writeUInt16LE(2, 32); // block align
  header.writeUInt16LE(16, 34); // bits per sample
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

mkdirSync(new URL('music/', assets), { recursive: true });
writeFileSync(new URL('music/entry.wav', assets), makeWav());
console.log('wrote public/assets/music/entry.wav');

// ---- Placeholder photos: six flat 4:3 pictures, to be replaced with real ones (see docs/ROOM-GUIDE.md) ----
const COLOURS = ['#6d8fb3', '#b37a6d', '#7fa077', '#b3a46d', '#8f6db3', '#6db3aa'];
mkdirSync(new URL('photos/', assets), { recursive: true });
COLOURS.forEach((colour, i) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" shape-rendering="crispEdges">
  <rect width="400" height="300" fill="${colour}"/>
  <rect x="20" y="20" width="360" height="260" fill="none" stroke="#ffffff" stroke-width="4" stroke-dasharray="16 12"/>
  <text x="200" y="160" text-anchor="middle" font-family="monospace" font-size="32" font-weight="bold" fill="#ffffff">Photo ${i + 1}</text>
</svg>
`;
  writeFileSync(new URL(`photos/placeholder-${i + 1}.svg`, assets), svg);
});
console.log('wrote public/assets/photos/placeholder-1..6.svg');
