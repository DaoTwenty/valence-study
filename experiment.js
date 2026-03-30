// ============================================================================
// experiment.js – Valence Listening Test (logic only – edit text in content.js)
// ============================================================================

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwhM3uZM_R9dHbC-XQs2TCNjV7JHIYPRiR4ajc68hL5gq6_CB_dFE1vjnlLyIFjTq8d/exec";
const BACKUP_PREFIX = "valence_backup_";

// ── Session globals ───────────────────────────────────────────────────────────

function generateParticipantId() {
  return "P_" + Math.random().toString(36).slice(2, 11).toUpperCase();
}

let access_code      = "";
const participant_id = generateParticipantId();

const demographics = {
  q_listening_frequency:   "",
  q_music_practice_years:  "",
  q_music_engagement:      "",
  q_music_formal_education:"",
  debrief_comments:     "",
};

// ============================================================================
// Headphone check helpers
// ============================================================================

function playTone(pan) {
  const AudioCtx = window.AudioContext || /** @type {any} */ (window).webkitAudioContext;
  const ctx = new AudioCtx();
  try {
    const osc    = ctx.createOscillator();
    const panner = ctx.createStereoPanner();
    const gain   = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 200;
    panner.pan.value    = pan;
    gain.gain.value     = 0.35;
    gain.gain.setTargetAtTime(0, ctx.currentTime + 1.2, 0.15);
    osc.connect(panner);
    panner.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 1.6);
  } catch (e) {
    console.warn("Tone error:", e);
  }
  return ctx;
}

function buildHeadphoneCheckBlock(_jsPsych) {
  const C = CONTENT;
  // pan: -1 = left (correct index 0), +1 = right (correct index 1)
  const checks = [{ pan: -1 }, { pan: 1 }, { pan: -1 }];
  let passed = 0;

  const checkTrials = checks.map(function (check, idx) {
    let toneCtx = null;

    return {
      type: jsPsychHtmlButtonResponse,
      stimulus: `
        <div class="headphone-check">
          <h2>${C.headphoneCheck.title} <span class="check-counter">${idx + 1} / ${checks.length}</span></h2>
          <p>${C.headphoneCheck.instruction}</p>
          <button class="tone-btn" id="hp-play-btn">${C.headphoneCheck.playLabel}</button>
          <p class="hp-question" id="hp-question">${C.headphoneCheck.question}</p>
        </div>`,
      choices: C.headphoneCheck.choices,
      // Start with answer buttons disabled; enable after tone
      button_html: '<button class="jspsych-btn hp-choice" disabled>%choice%</button>',
      on_load: function () {
        const playBtn    = document.getElementById("hp-play-btn");
        const choiceBtns = document.querySelectorAll(".hp-choice");

        playBtn.addEventListener("click", function () {
          if (toneCtx) { toneCtx.close(); toneCtx = null; }
          playBtn.disabled    = true;
          playBtn.textContent = C.headphoneCheck.playingLabel;
          tonePlayed          = true;
          toneCtx = playTone(check.pan);

          setTimeout(function () {
            playBtn.disabled    = false;
            playBtn.textContent = C.headphoneCheck.replayLabel;
            document.getElementById("hp-question").classList.add("hp-question-visible");
            choiceBtns.forEach(function (btn) { btn.disabled = false; });
          }, 1700);
        });
      },
      on_finish: function (data) {
        if (toneCtx) { toneCtx.close(); toneCtx = null; }
        const correctIndex = check.pan < 0 ? 0 : 1;
        data.block_type    = "headphone_check";
        data.hp_pan        = check.pan;
        data.hp_correct    = data.response === correctIndex;
        if (data.hp_correct) passed++;
      },
    };
  });

  const resultTrial = {
    type: jsPsychHtmlButtonResponse,
    stimulus: function () {
      const ok = passed >= 2;
      return `
        <div class="headphone-check">
          <h2>${C.headphoneCheck.title}</h2>
          <p class="${ok ? "hp-pass" : "hp-fail"}">
            ${ok ? C.headphoneCheck.resultPass : C.headphoneCheck.resultFail}
          </p>
        </div>`;
    },
    choices: [C.headphoneCheck.buttonLabel],
  };

  return [...checkTrials, resultTrial];
}

// ============================================================================
// init()
// ============================================================================

async function init() {
  // ── Load stimuli ──────────────────────────────────────────────────────────
  let stimuli = [];
  try {
    const resp = await fetch("stimuli.json");
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    stimuli = await resp.json();
  } catch (err) {
    document.getElementById("jspsych-target").innerHTML = `
      <div class="status-message error">
        <p><strong>Error loading stimuli.</strong></p>
        <p>Could not load <code>stimuli.json</code>: ${err.message}</p>
      </div>`;
    return;
  }
  if (!stimuli.length) {
    document.getElementById("jspsych-target").innerHTML = `<div class="status-message error"><p>stimuli.json is empty.</p></div>`;
    return;
  }

  // ── jsPsych ───────────────────────────────────────────────────────────────
  const jsPsych = initJsPsych({
    display_element: "jspsych-target",
    use_webaudio: true,
    on_finish: () => submitData(jsPsych),
  });
  jsPsych.data.addProperties({ participant_id, access_code });

  const C = CONTENT;

  // ==========================================================================
  // SCREEN 1 – Access Code
  // ==========================================================================

  const accessCodeTrial = {
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      <div class="access-code-container">
        <h2>${C.accessCode.title}</h2>
        <p>${C.accessCode.body}</p>
        <input type="text" id="access-code-input"
               placeholder="${C.accessCode.placeholder}" autocomplete="off" />
      </div>`,
    choices: [C.accessCode.buttonLabel],
    on_load: function () {
      const el = document.getElementById("access-code-input");
      if (el) el.addEventListener("input", () => { access_code = el.value.trim(); });
    },
    on_finish: function () {
      const el = document.getElementById("access-code-input");
      if (el) access_code = el.value.trim();
      jsPsych.data.addProperties({ access_code });
    },
  };

  // ==========================================================================
  // SCREEN 2 – Consent
  // ==========================================================================

  const consentTrial = {
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      <div class="consent-container">
        <h2>${C.consent.title}</h2>
        ${C.consent.paragraphs.map(p => `<p>${p}</p>`).join("")}
      </div>`,
    choices: [C.consent.buttonLabel],
  };

  // ==========================================================================
  // SCREEN 3 – Instructions
  // ==========================================================================

  const mainCount = stimuli.filter(s => s.group !== "practice").length;

  const instructionsTrial = {
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      <div class="instructions-container">
        <h2>${C.instructions.title}</h2>
        <ul>
          ${C.instructions.items.map(item => `<li>${item}</li>`).join("")}
          <li>You will hear <strong>~${mainCount} excerpts</strong>, each approximately 30 seconds long.</li>
        </ul>
      </div>`,
    choices: [C.instructions.buttonLabel],
  };

  // ==========================================================================
  // SCREEN 4 – Musical Background
  // ==========================================================================

  const questionnaireTrial = {
    type: jsPsychSurveyMultiChoice,
    preamble: `<h2>${C.questionnaire.title}</h2><p>${C.questionnaire.preamble}</p>`,
    questions: C.questionnaire.questions,
    on_finish: function (data) {
      demographics.q_listening_frequency   = data.response.listening_frequency    || "";
      demographics.q_music_practice_years  = data.response.music_practice_years   || "";
      demographics.q_music_engagement      = data.response.music_engagement       || "";
      demographics.q_music_formal_education= data.response.music_formal_education || "";
      jsPsych.data.addProperties({
        q_listening_frequency:   demographics.q_listening_frequency,
        q_music_practice_years:  demographics.q_music_practice_years,
        q_music_engagement:      demographics.q_music_engagement,
        q_music_formal_education:demographics.q_music_formal_education,
      });
    },
  };

  // ==========================================================================
  // SCREEN 6 – Valence Concept
  // ==========================================================================

  const valenceConcept = {
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      <div class="concept-container">
        <h2>${C.valenceConcept.title}</h2>
        ${C.valenceConcept.paragraphs.map(p => `<p>${p}</p>`).join("")}
        <ul>${C.valenceConcept.items.map(i => `<li>${i}</li>`).join("")}</ul>
        <p>${C.valenceConcept.footer}</p>
      </div>`,
    choices: [C.valenceConcept.buttonLabel],
  };

  // ==========================================================================
  // SCREEN 7 – Headphone Check
  // ==========================================================================

  const headphoneCheckTrials = buildHeadphoneCheckBlock(jsPsych);

  // ==========================================================================
  // Rating trial factory
  // ==========================================================================

  function buildRatingTrial(stim, blockType, trialNum, totalTrials) {
    let t_trial_start       = null;
    let t_audio_start       = null;
    let t_audio_end         = null;
    let t_first_slider_move = null;
    let slider_events       = [];
    let mouse_clicks        = [];
    let audioEl             = null;
    let rafId               = null;
    let audioCtx            = null;
    let analyser            = null;
    let sliderValue         = 50;

    const progressPct = totalTrials > 0 ? Math.round((trialNum / totalTrials) * 100) : 0;
    const isMain      = blockType === "main";

    return {
      type: jsPsychHtmlButtonResponse,
      button_html: '<button class="jspsych-btn" id="next-btn" disabled>%choice%</button>',
      choices: [C.trial.buttonLabel],

      stimulus: `
        <div class="rating-trial">
          ${isMain ? `
          <div class="trial-progress">
            <div class="trial-progress-fill" style="width:${progressPct}%"></div>
          </div>
          <p class="trial-counter">${trialNum} / ${totalTrials}</p>
          ` : `<p class="trial-counter practice-label">Practice</p>`}

          <p class="trial-prompt">${C.trial.prompt}</p>
          <p class="listen-status" id="listen-status">${C.trial.listenFirst}</p>

          <div class="audio-player">
            <button class="play-pause-btn" id="play-pause-btn" disabled title="Loading…">▶</button>
            <div class="viz-container" id="viz-container">
              <canvas id="viz-canvas"></canvas>
            </div>
            <span class="time-display" id="time-display">0:00 / 0:00</span>
          </div>

          <div class="slider-section">
            <p class="slider-hint" id="slider-hint">${C.trial.sliderLocked}</p>
            <div class="slider-wrapper">
              <input type="range" id="valence-slider" min="0" max="100" value="50" step="1" disabled />
              <div class="slider-labels">
                ${C.trial.labels.map(l => `<span>${l}</span>`).join("")}
              </div>
            </div>
          </div>
        </div>`,

      on_start: function () {
        t_trial_start       = Date.now();
        t_audio_start       = null;
        t_audio_end         = null;
        t_first_slider_move = null;
        slider_events       = [];
        mouse_clicks        = [];
        sliderValue         = 50;
      },

      on_load: function () {
        const playBtn      = document.getElementById("play-pause-btn");
        const timeDisplay  = document.getElementById("time-display");
        const slider       = document.getElementById("valence-slider");
        const sliderHint   = document.getElementById("slider-hint");
        const listenStatus = document.getElementById("listen-status");
        const nextBtn      = document.getElementById("next-btn");
        const canvas       = document.getElementById("viz-canvas");
        const vizContainer = document.getElementById("viz-container");
        const ctx2d        = canvas.getContext("2d");

        let hasListenedOnce = false;
        let freqData        = null;

        function resizeCanvas() {
          const dpr  = window.devicePixelRatio || 1;
          const rect = vizContainer.getBoundingClientRect();
          canvas.width  = rect.width  * dpr;
          canvas.height = rect.height * dpr;
          ctx2d.scale(dpr, dpr);
          canvas._cssW = rect.width;
          canvas._cssH = rect.height;
        }
        resizeCanvas();

        function fmt(s) {
          return Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");
        }
        function cssVar(name) {
          return getComputedStyle(document.body).getPropertyValue(name).trim();
        }

        function draw() {
          rafId = requestAnimationFrame(draw);
          const W = canvas._cssW || canvas.width;
          const H = canvas._cssH || canvas.height;
          ctx2d.clearRect(0, 0, W, H);

          if (analyser && freqData && !audioEl.paused && !audioEl.ended) {
            analyser.getByteFrequencyData(freqData);
          }

          const NUM_BARS  = 52;
          const gap       = 2;
          const barW      = (W - gap * (NUM_BARS - 1)) / NUM_BARS;
          const isPlaying = analyser && freqData && !audioEl.paused && !audioEl.ended;

          for (let i = 0; i < NUM_BARS; i++) {
            let v = 0;
            if (isPlaying) {
              const bin = Math.floor(i * (freqData.length * 0.6) / NUM_BARS);
              v = freqData[bin] / 255;
            }
            const bH = Math.max(2, v * H * 0.85);
            const x  = i * (barW + gap);
            const y  = (H - bH) / 2;

            const grad = ctx2d.createLinearGradient(x, y + bH, x, y);
            grad.addColorStop(0, cssVar("--bar-lo"));
            grad.addColorStop(1, cssVar("--bar-hi"));
            ctx2d.fillStyle = v > 0 ? grad : cssVar("--bar-idle");
            ctx2d.beginPath();
            ctx2d.roundRect(x, y, barW, bH, 2);
            ctx2d.fill();
          }

          if (!isPlaying) {
            ctx2d.strokeStyle = cssVar("--bar-idle");
            ctx2d.lineWidth   = 1;
            ctx2d.beginPath();
            ctx2d.moveTo(0, H / 2);
            ctx2d.lineTo(W, H / 2);
            ctx2d.stroke();
          }

          if (audioEl.duration) {
            const px = (audioEl.currentTime / audioEl.duration) * W;
            ctx2d.strokeStyle = cssVar("--playhead");
            ctx2d.lineWidth   = 2;
            ctx2d.beginPath();
            ctx2d.moveTo(px, 0);
            ctx2d.lineTo(px, H);
            ctx2d.stroke();
            timeDisplay.textContent = fmt(audioEl.currentTime) + " / " + fmt(audioEl.duration);
          }
        }

        // ── Audio element ──────────────────────────────────────────────────
        audioEl = new Audio(stim.file);

        audioEl.addEventListener("canplaythrough", function () {
          playBtn.disabled        = false;
          playBtn.title           = "Play";
          timeDisplay.textContent = "0:00 / " + fmt(audioEl.duration);
          rafId = requestAnimationFrame(draw);
        }, { once: true });

        audioEl.addEventListener("error", function () {
          listenStatus.textContent = "⚠ Audio failed to load: " + stim.file;
          listenStatus.style.color = "var(--danger)";
        });

        audioEl.addEventListener("play", function () {
          playBtn.textContent = "⏸";
          playBtn.title       = "Pause";
          if (!t_audio_start) t_audio_start = Date.now();

          // Wire Web Audio API on first play; degrade gracefully on CORS failure
          if (!audioCtx) {
            try {
              const WACtx = window.AudioContext || /** @type {any} */ (window).webkitAudioContext;
              audioCtx = new WACtx();
              analyser = audioCtx.createAnalyser();
              analyser.fftSize = 256;
              analyser.smoothingTimeConstant = 0.78;
              const source = audioCtx.createMediaElementSource(audioEl);
              source.connect(analyser);
              analyser.connect(audioCtx.destination);
              freqData = new Uint8Array(analyser.frequencyBinCount);
            } catch (e) {
              // CORS or policy error – visualizer runs in idle mode, audio still plays
              console.warn("Web Audio API unavailable:", e.message);
              if (audioCtx) { audioCtx.close(); audioCtx = null; }
              analyser = null;
            }
          }
          if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
        });

        audioEl.addEventListener("pause", function () {
          playBtn.textContent = "▶";
          playBtn.title       = hasListenedOnce ? "Play" : "Resume";
        });

        audioEl.addEventListener("ended", function () {
          playBtn.textContent = "↻";
          playBtn.title       = "Play again";
          if (!hasListenedOnce) {
            hasListenedOnce = true;
            t_audio_end     = Date.now();
            slider.disabled = false;
            vizContainer.classList.add("seekable");
            sliderHint.textContent = C.trial.sliderReady;
            sliderHint.classList.add("hint-active");
            listenStatus.textContent = C.trial.rateNow;
            listenStatus.classList.add("status-ready");
          }
        });

        playBtn.addEventListener("click", function () {
          if (audioEl.paused || audioEl.ended) audioEl.play().catch(() => {});
          else audioEl.pause();
        });

        vizContainer.addEventListener("click", function (e) {
          if (!hasListenedOnce || !audioEl.duration) return;
          const rect = vizContainer.getBoundingClientRect();
          audioEl.currentTime = ((e.clientX - rect.left) / rect.width) * audioEl.duration;
        });

        slider.addEventListener("input", function () {
          const t = Date.now();
          sliderValue = parseInt(slider.value, 10);
          if (t_first_slider_move === null) t_first_slider_move = t;
          slider_events.push({ t, value: sliderValue });
          nextBtn.disabled = false;
        });

        const container = document.getElementById("jspsych-content");
        if (container) {
          container._clickTrace = function (e) {
            mouse_clicks.push({
              t: Date.now(), x: e.clientX, y: e.clientY,
              target: e.target.tagName + (e.target.id ? "#" + e.target.id : ""),
            });
          };
          container.addEventListener("click", container._clickTrace);
        }
      },

      on_finish: function (data) {
        if (audioEl)  { audioEl.pause(); audioEl.src = ""; }
        if (rafId)    { cancelAnimationFrame(rafId); rafId = null; }
        if (audioCtx) { audioCtx.close(); audioCtx = null; }
        const container = document.getElementById("jspsych-content");
        if (container && container._clickTrace) {
          container.removeEventListener("click", container._clickTrace);
          delete container._clickTrace;
        }

        data.valence_response    = sliderValue;
        data.stim_id             = stim.id;
        data.stim_file           = stim.file;
        data.stim_group          = stim.group || "";
        data.block_type          = blockType;
        data.trial_num           = trialNum;
        data.trial_total         = totalTrials;
        data.participant_id      = participant_id;
        data.access_code         = access_code;
        data.t_trial_start       = t_trial_start;
        data.t_audio_start       = t_audio_start;
        data.t_audio_end         = t_audio_end;
        data.t_first_slider_move = t_first_slider_move;
        data.slider_events       = slider_events;
        data.mouse_clicks        = mouse_clicks;
        data.audio_played_full   = t_audio_end !== null;
      },
    };
  }

  // ==========================================================================
  // Practice
  // ==========================================================================

  const practiceStimuli = stimuli.filter(s => s.group === "practice").slice(0, 2);
  const hasPractice     = practiceStimuli.length > 0;

  const practiceIntro = {
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      <div class="instructions-container">
        <h2>${C.practiceIntro.title}</h2>
        <p>${C.practiceIntro.body}</p>
        <ul>${C.practiceIntro.reminders.map(r => `<li>${r}</li>`).join("")}</ul>
      </div>`,
    choices: [C.practiceIntro.buttonLabel],
  };

  const practiceTrials = practiceStimuli.map((s, i) =>
    buildRatingTrial(s, "practice", i + 1, practiceStimuli.length, 10)
  );

  // ==========================================================================
  // Main block + break at midpoint
  // ==========================================================================

  const mainStimuli  = stimuli.filter(s => s.group !== "practice");
  const shuffled     = jsPsych.randomization.shuffle(mainStimuli);
  const total        = shuffled.length;
  const midpoint     = Math.ceil(total / 2);

  const breakScreen = {
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      <div class="instructions-container">
        <h2>${C.breakScreen.title}</h2>
        ${C.breakScreen.paragraphs.map(p => `<p>${p}</p>`).join("")}
      </div>`,
    choices: [C.breakScreen.buttonLabel],
  };

  const mainTrials = shuffled.map((s, i) =>
    buildRatingTrial(s, "main", i + 1, total)
  );

  // Splice break screen after the midpoint trial (only if > 4 main trials)
  const mainWithBreak = total > 4
    ? [...mainTrials.slice(0, midpoint), breakScreen, ...mainTrials.slice(midpoint)]
    : mainTrials;

  const practiceEnd = {
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      <div class="instructions-container">
        <h2>${C.practiceEnd.title}</h2>
        <p>${C.practiceEnd.body}</p>
        <p>The main session consists of <strong>${total} excerpts</strong>.</p>
      </div>`,
    choices: [C.practiceEnd.buttonLabel],
  };

  // ==========================================================================
  // Debrief
  // ==========================================================================

  const debriefTrial = {
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      <div class="debrief-container">
        <h2>${C.debrief.title}</h2>
        ${C.debrief.paragraphs.map(p => `<p>${p}</p>`).join("")}
        <label for="debrief-input">${C.debrief.commentsLabel}</label>
        <textarea id="debrief-input" rows="4"
                  placeholder="${C.debrief.commentsPlaceholder}"></textarea>
      </div>`,
    choices: [C.debrief.buttonLabel],
    on_load: function () {
      const el = document.getElementById("debrief-input");
      if (el) el.addEventListener("input", () => { demographics.debrief_comments = el.value.trim(); });
    },
    on_finish: function () {
      const el = document.getElementById("debrief-input");
      if (el) demographics.debrief_comments = el.value.trim();
    },
  };

  // ==========================================================================
  // Timeline
  // ==========================================================================

  const timeline = [
    accessCodeTrial,
    consentTrial,
    instructionsTrial,
    questionnaireTrial,
    valenceConcept,
    ...headphoneCheckTrials,
    ...(hasPractice ? [practiceIntro, ...practiceTrials, practiceEnd] : []),
    ...mainWithBreak,
    debriefTrial,
  ];

  jsPsych.run(timeline);
}

// ============================================================================
// submitData() – with localStorage backup + download fallback
// ============================================================================

const IS_MOCK = SCRIPT_URL.startsWith("REPLACE_WITH");

async function submitData(jsPsych) {
  const display = document.getElementById("jspsych-content") || document.body;
  display.innerHTML = `<div class="status-message"><p>Submitting your responses, please wait…</p></div>`;

  const ratingTrials = jsPsych.data.get().values().filter(
    t => t.block_type === "practice" || t.block_type === "main"
  );

  const payload = {
    code:           access_code,
    participant_id: participant_id,
    demographics:   demographics,
    trials:         ratingTrials,
  };

  // ── Save to localStorage before attempting network POST ──────────────────
  const backupKey = BACKUP_PREFIX + participant_id;
  try { localStorage.setItem(backupKey, JSON.stringify(payload)); } catch (e) {}

  if (IS_MOCK) {
    console.log("=== MOCK SUBMIT ===");
    console.log("Participant ID :", participant_id);
    console.log("Demographics   :", demographics);
    console.log("Trials         :", ratingTrials.length);
    console.log("Full payload   :", payload);
    display.innerHTML = `
      <div class="status-message">
        <h2>Mock Submission Complete</h2>
        <p>Running in <strong>local dev mode</strong> — no data was sent to a server.</p>
        <p>Open the browser console to inspect the full payload.</p>
        <p style="font-size:0.85rem;color:var(--text-faint)">Participant ID: ${participant_id}</p>
      </div>`;
    return;
  }

  try {
    const resp = await fetch(SCRIPT_URL, {
      method:  "POST",
      headers: { "Content-Type": "text/plain" },
      body:    JSON.stringify(payload),
    });
    if (!resp.ok) throw new Error(`Server returned HTTP ${resp.status}`);
    const result = await resp.json();
    if (result.status !== "ok") throw new Error(result.error || "Unknown error");

    // ── Success – clear backup ───────────────────────────────────────────
    try { localStorage.removeItem(backupKey); } catch (e) {}

    display.innerHTML = `
      <div class="status-message">
        <h2>Submission Complete</h2>
        <p>Your responses have been recorded. Thank you for participating!</p>
        <p style="font-size:0.85rem;color:var(--text-faint)">Reference ID: ${participant_id}</p>
      </div>`;

  } catch (err) {
    console.error("Submission error:", err);

    // ── Failure – offer data download ────────────────────────────────────
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);

    display.innerHTML = `
      <div class="status-message error">
        <h2>Submission Error</h2>
        <p>There was a problem sending your data automatically.</p>
        <p>Please <strong>download your data file</strong> and email it to the researcher.</p>
        <a href="${url}" download="valence_${participant_id}.json" class="jspsych-btn download-btn">
          Download my data
        </a>
        <p style="margin-top:20px;font-size:0.85rem;color:var(--text-faint)">
          Participant ID: ${participant_id}<br/>
          Error: ${err.message}
        </p>
      </div>`;
  }
}

// ── Start ──────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", init);
