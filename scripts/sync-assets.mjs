import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const wasmSrc = path.join(rootDir, 'node_modules', 'cdp-wasm', 'wasm');
const wasmDest = path.join(rootDir, 'public', 'wasm');

const audioSrc = path.resolve(rootDir, '..', 'site', 'assets');
const audioDest = path.join(rootDir, 'public', 'audio');

const CURATED_WAVS = [
  'count.wav',
  'capm.wav',
  'capmc.wav',
  'trcdt.wav',
  'flex.wav',
  'vocalsnd.wav',
  'drumsnd.wav',
  'hornsnd.wav',
  'bellsnd.wav',
  'frogs3cdt.wav',
  'gongvib.wav',
  'donkey1g44.wav',
  'marimba.wav',
  'gtrcdt.wav',
  'cymcdt.wav',
  'dingcdt.wav',
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

if (!fs.existsSync(wasmSrc)) {
  console.error(`ERROR: cdp-wasm wasm directory not found at ${wasmSrc}. Run npm install first.`);
  process.exit(1);
}

ensureDir(wasmDest);
const wasmFiles = fs.readdirSync(wasmSrc);
let copiedWasm = 0;
for (const file of wasmFiles) {
  const srcPath = path.join(wasmSrc, file);
  const destPath = path.join(wasmDest, file);
  const stat = fs.statSync(srcPath);
  if (stat.isFile()) {
    fs.copyFileSync(srcPath, destPath);
    copiedWasm++;
  }
}
console.log(`Synced ${copiedWasm} cdp-wasm files -> public/wasm/`);

if (!fs.existsSync(audioSrc)) {
  console.error(`ERROR: source audio directory not found at ${audioSrc}.`);
  process.exit(1);
}

ensureDir(audioDest);
let copiedAudio = 0;
for (const wav of CURATED_WAVS) {
  const srcPath = path.join(audioSrc, wav);
  const destPath = path.join(audioDest, wav);
  if (!fs.existsSync(srcPath)) {
    console.error(`ERROR: missing curated source WAV: ${srcPath}`);
    process.exit(1);
  }
  fs.copyFileSync(srcPath, destPath);
  copiedAudio++;
}
console.log(`Synced ${copiedAudio} curated source WAVs -> public/audio/`);
