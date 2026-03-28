// Generates short silent WAV files for local UI testing.
// Run once: node scripts/generate-dummy-audio.js
const fs   = require("fs");
const path = require("path");

const OUT_DIR     = path.join(__dirname, "..", "audio");
const DURATION_S  = 5;       // seconds per file (short for quick testing)
const SAMPLE_RATE = 22050;   // Hz – small files, still valid audio
const CHANNELS    = 1;
const BPS         = 16;

const FILES = [
  "practice_001.wav",
  "stim_001.wav",
  "stim_002.wav",
  "stim_003.wav",
  "stim_004.wav",
];

function silentWav(seconds) {
  const numSamples = Math.floor(SAMPLE_RATE * seconds);
  const dataSize   = numSamples * CHANNELS * (BPS / 8);
  const buf        = Buffer.alloc(44 + dataSize, 0);

  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16,                                  16); // chunk size
  buf.writeUInt16LE(1,                                   20); // PCM
  buf.writeUInt16LE(CHANNELS,                            22);
  buf.writeUInt32LE(SAMPLE_RATE,                         24);
  buf.writeUInt32LE(SAMPLE_RATE * CHANNELS * (BPS / 8), 28); // byte rate
  buf.writeUInt16LE(CHANNELS * (BPS / 8),                32); // block align
  buf.writeUInt16LE(BPS,                                 34);
  buf.write("data", 36);
  buf.writeUInt32LE(dataSize,                            40);
  // samples stay zero → silence

  return buf;
}

fs.mkdirSync(OUT_DIR, { recursive: true });
const wav = silentWav(DURATION_S);

FILES.forEach((name) => {
  const dest = path.join(OUT_DIR, name);
  fs.writeFileSync(dest, wav);
  console.log(`  created ${dest}  (${(wav.length / 1024).toFixed(0)} KB)`);
});

console.log(`\nDone — ${FILES.length} dummy WAV files (${DURATION_S}s silence each).`);
