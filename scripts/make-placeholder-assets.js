// Generates the placeholder art and music in public/assets/.
// Run with: node scripts/make-placeholder-assets.js
// Replace the generated files with your own; this script only exists so the
// site has something to show before your art and songs are ready.
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

// ---- Placeholder tile sheet: two 16x16 floor tiles side by side (32x16 PNG) ----
import { deflateSync } from 'node:zlib';

function crc32(buf) {
  let c;
  let crc = 0xffffffff;
  for (const byte of buf) {
    c = (crc ^ byte) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type), data]);
  const out = Buffer.alloc(body.length + 8);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(crc32(body), body.length + 4);
  return out;
}

function makePng(width, height, pixelAt) {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 3 + 1)] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const [r, g, b] = pixelAt(x, y);
      const i = y * (width * 3 + 1) + 1 + x * 3;
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: RGB
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const FLOOR_A = [74, 61, 99];
const FLOOR_B = [84, 71, 110];
writeFileSync(
  new URL('tiles.png', assets),
  makePng(32, 16, (x, y) => (x < 16 ? FLOOR_A : FLOOR_B)),
);
console.log('wrote public/assets/tiles.png');

mkdirSync(new URL('music/', assets), { recursive: true });
writeFileSync(new URL('music/entry.wav', assets), makeWav());
console.log('wrote public/assets/music/entry.wav');
