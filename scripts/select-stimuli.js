#!/usr/bin/env node
// ============================================================================
// select-stimuli.js  –  Interactive stimulus curator
// ============================================================================
//
// Usage:
//   node scripts/select-stimuli.js [options]
//
// Options:
//   --trials   N   Number of final stimuli to select  (default: 20)
//   --bins     N   Number of valence bins              (default: 5)
//   --reset        Discard saved session and start fresh
//
// Workflow:
//   1. Divides the valence range into equal bins and allocates slots evenly.
//   2. For each bin shows a candidate – press SPACE to play (afplay/mpv/ffplay),
//      ENTER to accept, R to replace with another from the same bin,
//      S to skip (mark as rejected), Q to quit and save progress.
//   3. When all slots are filled, copies accepted files to audio/ and rebuilds
//      stimuli.json via the existing build-stimuli.js script.
//
// State is saved to audio_candidates/.session.json so you can quit and resume.
// ============================================================================

const fs            = require("fs");
const path          = require("path");
const readline      = require("readline");
const { execSync, spawnSync } = require("child_process");

// ── Config ────────────────────────────────────────────────────────────────────

const CANDIDATES_DIR  = path.join(__dirname, "..", "audio_candidates");
const AUDIO_CAND_DIR  = path.join(CANDIDATES_DIR, "audio");
const INDEX_FILE      = path.join(CANDIDATES_DIR, "index.json");
const SESSION_FILE    = path.join(CANDIDATES_DIR, ".session.json");
const DEST_AUDIO_DIR  = path.join(__dirname, "..", "audio");
const BUILD_SCRIPT    = path.join(__dirname, "build-stimuli.js");

const args   = process.argv.slice(2);
const getArg = (flag, def) => {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] ? Number(args[i + 1]) : def;
};
const TOTAL_TRIALS = getArg("--trials", 20);
const RESET        = args.includes("--reset");

// Compute max bins later, once we know the available entries.
// Placeholder — resolved after entries are loaded.
let NUM_BINS = getArg("--bins", 0); // 0 = auto

// ── ANSI helpers ──────────────────────────────────────────────────────────────

const c = {
  reset:  "\x1b[0m",
  bold:   "\x1b[1m",
  dim:    "\x1b[2m",
  cyan:   "\x1b[36m",
  green:  "\x1b[32m",
  yellow: "\x1b[33m",
  red:    "\x1b[31m",
  blue:   "\x1b[34m",
  magenta:"\x1b[35m",
};
const fmt = (color, str) => color + str + c.reset;
const bold   = s => fmt(c.bold, s);
const dim    = s => fmt(c.dim, s);
const cyan   = s => fmt(c.cyan, s);
const green  = s => fmt(c.green, s);
const yellow = s => fmt(c.yellow, s);
const red    = s => fmt(c.red, s);
const blue   = s => fmt(c.blue, s);
const magenta = s => fmt(c.magenta, s);

// ── Load index ────────────────────────────────────────────────────────────────

const allEntries = JSON.parse(fs.readFileSync(INDEX_FILE, "utf8"));

// Keep only entries whose audio file exists locally
const entries = allEntries.filter(e => {
  const filename = path.basename(e.audio_output_path);
  return fs.existsSync(path.join(AUDIO_CAND_DIR, filename));
});

if (!entries.length) {
  console.error(red("No audio files found in audio_candidates/audio/"));
  process.exit(1);
}

// ── Bin layout ────────────────────────────────────────────────────────────────

const allValences = entries.map(e => e.valence_fused);
const vMin        = Math.min(...allValences);
const vMax        = Math.max(...allValences);

// Auto-detect max bins: highest value ≤ TOTAL_TRIALS where every bin
// contains at least one candidate file.
if (NUM_BINS === 0) {
  for (let b = TOTAL_TRIALS; b >= 1; b--) {
    const w    = (vMax - vMin) / b;
    const cnts = Array.from({ length: b }, () => 0);
    entries.forEach(e => {
      cnts[Math.min(b - 1, Math.floor((e.valence_fused - vMin) / w))]++;
    });
    if (cnts.every(c => c > 0)) { NUM_BINS = b; break; }
  }
  console.log(dim(`  Auto bin count: ${NUM_BINS} (highest with ≥1 candidate per bin)\n`));
}

const binWidth = (vMax - vMin) / NUM_BINS;

function getBin(valence) {
  return Math.min(NUM_BINS - 1, Math.floor((valence - vMin) / binWidth));
}

// Attach computed bin to each entry (overrides the original bin_index which
// may use a different range / count)
entries.forEach(e => { e._bin = getBin(e.valence_fused); });

// Group entries by bin
const byBin = Array.from({ length: NUM_BINS }, () => []);
entries.forEach(e => byBin[e._bin].push(e));

// Allocate slots per bin (distribute TOTAL_TRIALS as evenly as possible)
const slotsPerBin = Array.from({ length: NUM_BINS }, (_, i) => {
  const base  = Math.floor(TOTAL_TRIALS / NUM_BINS);
  const extra = i < (TOTAL_TRIALS % NUM_BINS) ? 1 : 0;
  return base + extra;
});

function binLabel(i) {
  const lo = (vMin + i * binWidth).toFixed(2);
  const hi = (vMin + (i + 1) * binWidth).toFixed(2);
  return `[${lo} – ${hi}]`;
}

// ── Session state ─────────────────────────────────────────────────────────────

let session = {
  accepted:  [],          // [{ id, file, valence, bin }]
  rejected:  new Set(),   // sample_ids we've already skipped
  queuePos:  {},          // { binIndex: nextCandidateIndex }
};

function saveSession() {
  const data = {
    accepted:  session.accepted,
    rejected:  [...session.rejected],
    queuePos:  session.queuePos,
  };
  fs.writeFileSync(SESSION_FILE, JSON.stringify(data, null, 2));
}

if (!RESET && fs.existsSync(SESSION_FILE)) {
  try {
    const saved = JSON.parse(fs.readFileSync(SESSION_FILE, "utf8"));
    session.accepted = saved.accepted || [];
    session.rejected = new Set(saved.rejected || []);
    session.queuePos = saved.queuePos || {};
    console.log(cyan(`\nResuming session: ${session.accepted.length} accepted so far.\n`));
  } catch (e) {
    console.warn(yellow("Could not parse session file – starting fresh."));
  }
} else if (RESET) {
  console.log(yellow("Resetting session.\n"));
}

// ── Candidate queue per bin ───────────────────────────────────────────────────
// Candidates are shuffled once per session so order is random but stable.

const shuffled = byBin.map((bin, i) => {
  const seed = i * 31337;
  return [...bin].sort((a, b) =>
    (parseInt(a.sample_id, 10) * 1103515245 + seed) % 2147483647 -
    (parseInt(b.sample_id, 10) * 1103515245 + seed) % 2147483647
  );
});

function nextCandidate(binIdx) {
  const queue = shuffled[binIdx];
  const start = session.queuePos[binIdx] || 0;
  for (let i = start; i < queue.length; i++) {
    const entry = queue[i];
    const isAccepted = session.accepted.some(a => a.id === entry.sample_id);
    const isRejected = session.rejected.has(entry.sample_id);
    if (!isAccepted && !isRejected) {
      session.queuePos[binIdx] = i + 1;
      return entry;
    }
  }
  return null; // exhausted
}

// ── Audio playback ────────────────────────────────────────────────────────────

let playProc = null;

function playAudio(filepath) {
  stopAudio();
  const players = ["afplay", "mpv --no-video", "ffplay -nodisp -autoexit"];
  for (const cmd of players) {
    const bin = cmd.split(" ")[0];
    try {
      execSync(`which ${bin}`, { stdio: "ignore" });
      const parts = [...cmd.split(" ").slice(1), filepath];
      playProc = spawnSync(cmd.split(" ")[0], parts, { stdio: "ignore" });
      return;
    } catch (_) {}
  }
  console.log(red("No audio player found. Install afplay (macOS), mpv, or ffplay."));
}

function stopAudio() {
  if (playProc) { try { process.kill(playProc.pid); } catch (_) {} playProc = null; }
}

// ── Readline prompt ───────────────────────────────────────────────────────────

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
function ask(q) { return new Promise(r => rl.question(q, r)); }

// ── Progress bar ──────────────────────────────────────────────────────────────

function drawDashboard() {
  console.clear();
  console.log(bold(cyan("\n  ╔══════════════════════════════════════╗")));
  console.log(bold(cyan(`  ║   Stimulus Selector  (${TOTAL_TRIALS} trials)     ║`)));
  console.log(bold(cyan("  ╚══════════════════════════════════════╝\n")));

  const acceptedByBin = Array.from({ length: NUM_BINS }, () => 0);
  session.accepted.forEach(a => acceptedByBin[a.bin]++);

  for (let i = 0; i < NUM_BINS; i++) {
    const have  = acceptedByBin[i];
    const need  = slotsPerBin[i];
    const avail = byBin[i].length;
    const filled = "█".repeat(have);
    const empty  = "░".repeat(Math.max(0, need - have));
    const bar    = have >= need ? green(filled) : cyan(filled) + dim(empty);
    const status = have >= need ? green("✓") : have > 0 ? yellow(`${have}/${need}`) : dim(`0/${need}`);
    const label  = binLabel(i).padEnd(18);
    console.log(`  Bin ${i} ${dim(label)} ${bar}  ${status}  ${dim(`(${avail} available)`)}`);
  }

  const total     = session.accepted.length;
  const pct       = Math.round((total / TOTAL_TRIALS) * 100);
  const bigBar    = "█".repeat(Math.round(pct / 5)) + "░".repeat(20 - Math.round(pct / 5));
  console.log(`\n  Overall  ${blue(bigBar)}  ${bold(`${total}/${TOTAL_TRIALS}`)}  ${dim(`(${pct}%)`)}\n`);
}

function acceptedByBinCount() {
  const counts = Array.from({ length: NUM_BINS }, () => 0);
  session.accepted.forEach(a => counts[a.bin]++);
  return counts;
}

// ── Main loop ─────────────────────────────────────────────────────────────────

async function main() {
  drawDashboard();
  console.log(dim("  Commands:  ENTER = accept   R = replace   S = skip   P = replay   Q = quit\n"));

  const counts = acceptedByBinCount();

  for (let binIdx = 0; binIdx < NUM_BINS; binIdx++) {
    while (counts[binIdx] < slotsPerBin[binIdx]) {
      const entry = nextCandidate(binIdx);
      if (!entry) {
        console.log(yellow(`  Bin ${binIdx}: no more candidates available (only ${counts[binIdx]}/${slotsPerBin[binIdx]} filled).`));
        break;
      }

      const filename  = path.basename(entry.audio_output_path);
      const filepath  = path.join(AUDIO_CAND_DIR, filename);

      drawDashboard();
      console.log(bold(`\n  Bin ${binIdx}  ${dim(binLabel(binIdx))}`));
      console.log(`  File    : ${cyan(entry.sample_id)}`);
      console.log(`  Valence : ${magenta(entry.valence_fused.toFixed(4))}  ${dim(`(essentia: ${entry.valence_essentia?.toFixed(2)}, vibenet: ${entry.valence_vibenet?.toFixed(2)})`)}`);
      console.log(`  Slots   : ${counts[binIdx] + 1} / ${slotsPerBin[binIdx]} in this bin\n`);

      console.log(dim("  Playing audio…"));
      playAudio(filepath);

      let decided = false;
      while (!decided) {
        const key = (await ask(
          `\n  ${bold("ENTER")} accept  ${bold("R")} replace  ${bold("S")} skip  ${bold("P")} replay  ${bold("Q")} quit  › `
        )).trim().toUpperCase();

        if (key === "" ) {
          // Accept
          session.accepted.push({
            id:      entry.sample_id,
            file:    filename,
            valence: entry.valence_fused,
            bin:     entry._bin,
          });
          counts[binIdx]++;
          saveSession();
          console.log(green(`  ✓ Accepted ${entry.sample_id}`));
          decided = true;

        } else if (key === "R") {
          // Replace – skip this, loop will pick next from same bin
          console.log(yellow(`  Replacing…`));
          decided = true;

        } else if (key === "S") {
          // Hard skip – won't appear again
          session.rejected.add(entry.sample_id);
          saveSession();
          console.log(dim(`  Skipped ${entry.sample_id}`));
          decided = true;

        } else if (key === "P") {
          console.log(dim("  Replaying…"));
          playAudio(filepath);

        } else if (key === "Q") {
          stopAudio();
          saveSession();
          console.log(yellow("\n  Progress saved. Run again to continue.\n"));
          rl.close();
          process.exit(0);

        } else {
          console.log(dim("  Unknown key. Use ENTER / R / S / P / Q."));
        }
      }
    }
  }

  // ── All slots filled ───────────────────────────────────────────────────────
  stopAudio();
  drawDashboard();

  if (session.accepted.length < TOTAL_TRIALS) {
    console.log(yellow(`\n  ⚠ Only ${session.accepted.length} / ${TOTAL_TRIALS} slots could be filled (not enough candidates in some bins).\n`));
  } else {
    console.log(green(`\n  ✓ All ${TOTAL_TRIALS} slots filled!\n`));
  }

  const confirm = (await ask("  Copy accepted files to audio/ and rebuild stimuli.json? [Y/n] ")).trim().toUpperCase();
  if (confirm === "N") {
    console.log(dim("  Aborted. Run again and choose Y when ready.\n"));
    rl.close();
    return;
  }

  // Copy files
  let copied = 0;
  for (const item of session.accepted) {
    const src  = path.join(AUDIO_CAND_DIR, item.file);
    const dest = path.join(DEST_AUDIO_DIR, item.file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      copied++;
    } else {
      console.warn(yellow(`  ⚠ Source not found: ${item.file}`));
    }
  }
  console.log(green(`\n  Copied ${copied} file(s) to audio/`));

  // Rebuild stimuli.json
  try {
    execSync(`node "${BUILD_SCRIPT}"`, { stdio: "inherit" });
  } catch (e) {
    console.error(red("  build-stimuli.js failed: " + e.message));
  }

  // Print valence distribution summary
  console.log(bold("\n  Final selection summary:"));
  const byBinFinal = Array.from({ length: NUM_BINS }, () => []);
  session.accepted.forEach(a => byBinFinal[a.bin].push(a.valence));
  for (let i = 0; i < NUM_BINS; i++) {
    const vals = byBinFinal[i];
    if (!vals.length) continue;
    const mean = (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(3);
    console.log(`  Bin ${i} ${dim(binLabel(i))}  ${vals.length} files  mean valence ${magenta(mean)}`);
  }
  const allV  = session.accepted.map(a => a.valence);
  const gMean = (allV.reduce((s, v) => s + v, 0) / allV.length).toFixed(3);
  console.log(bold(`\n  Overall mean valence: ${magenta(gMean)}`));
  console.log(green("\n  Done! Run `npm start` to preview.\n"));

  // Clear session
  fs.unlinkSync(SESSION_FILE);
  rl.close();
}

main().catch(err => {
  console.error(red("\nFatal error: " + err.message));
  rl.close();
  process.exit(1);
});
