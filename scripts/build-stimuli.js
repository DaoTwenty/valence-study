// Auto-generates stimuli.json from whatever audio files are in audio/.
// Run directly:  node scripts/build-stimuli.js
// Runs automatically via `npm start` (prestart hook).

const fs   = require("fs");
const path = require("path");

const AUDIO_DIR = path.join(__dirname, "..", "audio");
const OUT_FILE  = path.join(__dirname, "..", "stimuli.json");
const EXTS      = new Set([".wav", ".mp3", ".ogg", ".flac"]);

const files = fs.readdirSync(AUDIO_DIR)
  .filter(f => EXTS.has(path.extname(f).toLowerCase()) && f !== ".gitkeep")
  .sort();

if (!files.length) {
  console.warn("  ⚠ No audio files found in audio/ — stimuli.json will be empty.");
}

const stimuli = files.map(f => {
  const id    = path.basename(f, path.extname(f));
  const entry = { id, file: "audio/" + f };
  if (id.toLowerCase() === "practice") entry.group = "practice";
  return entry;
});

fs.writeFileSync(OUT_FILE, JSON.stringify(stimuli, null, 2));
console.log(`  Built stimuli.json → ${stimuli.length} stimulus/stimuli:`);
stimuli.forEach(s => console.log(`    ${s.id}  →  ${s.file}`));
