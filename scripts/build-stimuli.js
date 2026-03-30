// Auto-generates stimuli.json from whatever audio files are in audio/.
// Run directly:  node scripts/build-stimuli.js
// Runs automatically via `npm start` (prestart hook).
//
// Optional: create audio-urls.json to override file paths with remote URLs
// (e.g. Google Drive direct-download links). Format:
//   { "000034": "https://drive.google.com/uc?export=download&id=FILE_ID", ... }
// Any filename not listed keeps its local audio/ path.

const fs   = require("fs");
const path = require("path");

const AUDIO_DIR   = path.join(__dirname, "..", "audio");
const OUT_FILE    = path.join(__dirname, "..", "stimuli.json");
const URLS_FILE   = path.join(__dirname, "..", "audio-urls.json");
const EXTS        = new Set([".wav", ".mp3", ".ogg", ".flac"]);

// Load optional remote URL overrides
let urlOverrides = {};
if (fs.existsSync(URLS_FILE)) {
  urlOverrides = JSON.parse(fs.readFileSync(URLS_FILE, "utf8"));
  console.log(`  Loaded ${Object.keys(urlOverrides).length} URL override(s) from audio-urls.json`);
}

const files = fs.readdirSync(AUDIO_DIR)
  .filter(f => EXTS.has(path.extname(f).toLowerCase()) && f !== ".gitkeep")
  .sort();

if (!files.length) {
  console.warn("  ⚠ No audio files found in audio/ — stimuli.json will be empty.");
}

const stimuli = files.map(f => {
  const id    = path.basename(f, path.extname(f));
  const file  = urlOverrides[id] || ("audio/" + f);
  const entry = { id, file };
  if (id.toLowerCase() === "practice") entry.group = "practice";
  return entry;
});

fs.writeFileSync(OUT_FILE, JSON.stringify(stimuli, null, 2));
console.log(`  Built stimuli.json → ${stimuli.length} stimulus/stimuli:`);
stimuli.forEach(s => console.log(`    ${s.id}  →  ${s.file}`));
