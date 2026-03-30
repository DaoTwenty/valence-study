// Reads selection.json (downloaded from selector.html) and copies chosen
// audio files into audio/, then rebuilds stimuli.json.
//
// Usage: node scripts/finalize-selection.js [path/to/selection.json]

const fs   = require("fs");
const path = require("path");

const selFile = process.argv[2] || path.join(__dirname, "..", "selection.json");
if (!fs.existsSync(selFile)) {
  console.error(`selection.json not found at ${selFile}`);
  console.error("Export it from the selector UI, move it to the project root, then run this script.");
  process.exit(1);
}

const selection   = JSON.parse(fs.readFileSync(selFile, "utf8"));
const srcDir      = path.join(__dirname, "..", "audio_candidates", "audio");
const destDir     = path.join(__dirname, "..", "audio");
const buildScript = path.join(__dirname, "build-stimuli.js");

console.log(`\nFinalizing ${selection.selected.length} / ${selection.trials} stimuli (${selection.bins} bins)\n`);

// Clear non-practice audio files from dest
fs.readdirSync(destDir)
  .filter(f => /\.(wav|mp3|ogg|flac)$/i.test(f) && path.basename(f, path.extname(f)).toLowerCase() !== "practice")
  .forEach(f => { fs.unlinkSync(path.join(destDir, f)); });

let copied = 0;
for (const item of selection.selected) {
  const src  = path.join(srcDir, item.file);
  const dest = path.join(destDir, item.file);
  if (!fs.existsSync(src)) { console.warn(`  ⚠ not found: ${item.file}`); continue; }
  fs.copyFileSync(src, dest);
  console.log(`  ✓  ${item.file}  (valence ${item.valence.toFixed(3)}, bin ${item.bin})`);
  copied++;
}

console.log(`\nCopied ${copied} file(s) to audio/`);
require(buildScript); // rebuild stimuli.json
console.log(`\nDone — run npm start to preview.\n`);
