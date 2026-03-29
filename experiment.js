// ============================================================================
// experiment.js – Valence Listening Test
// ============================================================================
//
// SETUP: Replace SCRIPT_URL with the deployed Google Apps Script web app URL.
//
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwhM3uZM_R9dHbC-XQs2TCNjV7JHIYPRiR4ajc68hL5gq6_CB_dFE1vjnlLyIFjTq8d/exec";

// ── Helpers ──────────────────────────────────────────────────────────────────

function generateParticipantId() {
  return "P_" + Math.random().toString(36).slice(2, 11).toUpperCase();
}

// ── Session globals ──────────────────────────────────────────────────────────

let access_code = "";
const participant_id = generateParticipantId();

// ============================================================================
// init() – load stimuli then build and run the jsPsych timeline
// ============================================================================

async function init() {
  // ── Load stimuli manifest ─────────────────────────────────────────────────
  let stimuli = [];
  try {
    const resp = await fetch("stimuli.json");
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    stimuli = await resp.json();
  } catch (err) {
    document.body.innerHTML = `
      <div class="status-message error">
        <p><strong>Error loading stimuli.</strong></p>
        <p>Could not load <code>stimuli.json</code>: ${err.message}</p>
        <p>Please contact the researcher.</p>
      </div>`;
    return;
  }

  if (!stimuli.length) {
    document.body.innerHTML = `<div class="status-message error"><p>stimuli.json is empty. Please add stimuli.</p></div>`;
    return;
  }

  // ── Initialize jsPsych ───────────────────────────────────────────────────
  const jsPsych = initJsPsych({
    use_webaudio: true,
    on_finish: () => submitData(jsPsych),
  });

  jsPsych.data.addProperties({ participant_id, access_code });

  // ==========================================================================
  // SCREEN 1 – Access Code
  // ==========================================================================

  const accessCodeTrial = {
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      <div class="access-code-container">
        <h2>Access Code</h2>
        <p>Please enter the access code provided to you by the researcher.<br/>
           If you do not have a code, leave this blank and click <em>Continue</em>.</p>
        <input type="text" id="access-code-input"
               placeholder="Access code (leave blank if none)"
               autocomplete="off" />
      </div>`,
    choices: ["Continue"],
    on_load: function () {
      // Capture value immediately on every keystroke so on_finish doesn't
      // depend on the DOM still being present.
      const el = document.getElementById("access-code-input");
      if (el) {
        el.addEventListener("input", function () {
          access_code = el.value.trim();
        });
      }
    },
    on_finish: function () {
      // access_code already updated live via on_load listener;
      // fall back to direct read just in case.
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
        <h2>Participant Information and Consent</h2>
        <p><strong>Study Purpose:</strong> This study investigates how people perceive emotions in
           computer-generated music. We are interested in your personal emotional responses.</p>
        <p><strong>Duration:</strong> Approximately 20–30 minutes.</p>
        <p><strong>Procedures:</strong> You will listen to a series of short musical excerpts
           (~30 seconds each) and rate the emotional valence (pleasantness/unpleasantness) of
           each excerpt using a slider scale.</p>
        <p><strong>Voluntary Participation:</strong> Your participation is entirely voluntary.
           You may withdraw at any time without penalty by closing this window.</p>
        <p><strong>Anonymity:</strong> No personally identifying information will be stored
           alongside your responses. A randomly assigned ID is used instead of your name.
           Data will be stored on encrypted university accounts and used solely for research.</p>
        <p>If you have questions, please contact the researcher before proceeding.</p>
      </div>`,
    choices: ["I have read the information above and consent to participate"],
  };

  // ==========================================================================
  // SCREEN 3 – General Instructions
  // ==========================================================================

  const instructionsTrial = {
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      <div class="instructions-container">
        <h2>Instructions</h2>
        <ul>
          <li>Please use <strong>headphones</strong> where possible.</li>
          <li>Complete this study in a <strong>quiet environment</strong>.</li>
          <li>Set your volume to a <strong>comfortable listening level</strong> before starting.</li>
          <li>You will hear <strong>~${stimuli.filter(s => s.group !== "practice").length} excerpts</strong>,
              each approximately 30 seconds long.</li>
          <li>After each excerpt, rate <strong>how pleasant or unpleasant the emotion evoked
              by the music feels</strong> using a slider.</li>
          <li>The slider is <strong>disabled during playback</strong> — it becomes active once
              the excerpt finishes.</li>
          <li>You must <strong>move the slider</strong> before you can proceed to the next excerpt.</li>
          <li>There are <strong>no right or wrong answers</strong> — respond based on your
              own impression.</li>
        </ul>
      </div>`,
    choices: ["Continue"],
  };

  // ==========================================================================
  // SCREEN 4 – Age (optional)
  // ==========================================================================

  let _age = "";
  const ageTrial = {
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      <div class="access-code-container">
        <h2>About You</h2>
        <label for="age-input">What is your age? (optional)</label>
        <input type="number" id="age-input" min="1" max="120"
               placeholder="e.g., 25" autocomplete="off" />
      </div>`,
    choices: ["Continue"],
    on_load: function () {
      const el = document.getElementById("age-input");
      if (el) el.addEventListener("input", () => { _age = el.value.trim(); });
    },
    on_finish: function () {
      const el = document.getElementById("age-input");
      if (el) _age = el.value.trim();
      jsPsych.data.addProperties({ q_age: _age });
    },
  };

  // ==========================================================================
  // SCREEN 5 – Musical Background Questionnaire
  // ==========================================================================

  const questionnaireTrial = {
    type: jsPsychSurveyMultiChoice,
    preamble: "<h2>Musical Background</h2><p>Please answer the following questions about your musical experience.</p>",
    questions: [
      {
        prompt: "How many years have you played a musical instrument or sung in a structured setting (e.g., lessons, ensembles)?",
        name: "musical_training_years",
        options: ["None", "1–2 years", "3–5 years", "6–10 years", "10+ years"],
        required: true,
      },
      {
        prompt: "Have you received formal education in music theory, composition, or performance?",
        name: "formal_music_education",
        options: [
          "No",
          "Yes, up to high school",
          "Yes, university/college",
          "Yes, postgraduate/professional",
        ],
        required: true,
      },
      {
        prompt: "How often do you listen to music?",
        name: "listening_frequency",
        options: [
          "Less than once a week",
          "1–3 days per week",
          "4–6 days per week",
          "Every day",
          "Several hours per day",
        ],
        required: true,
      },
    ],
    on_finish: function (data) {
      jsPsych.data.addProperties({
        q_musical_training: data.response.musical_training_years,
        q_formal_education: data.response.formal_music_education,
        q_listening_frequency: data.response.listening_frequency,
      });
    },
  };

  // ==========================================================================
  // SCREEN 6 – Valence Concept Explanation
  // ==========================================================================

  const valenceConcept = {
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      <div class="concept-container">
        <h2>What do we mean by "valence"?</h2>
        <p>Emotions can feel more or less pleasant. In this study, we focus on
           <strong>valence</strong> — how <strong>pleasant or unpleasant</strong>
           the emotion feels.</p>
        <ul>
          <li>Music with <strong>low valence</strong> tends to feel unpleasant or negative
              (for example: tense, disturbing, anxious, or very sad in a painful way).</li>
          <li>Music with <strong>high valence</strong> tends to feel pleasant or positive
              (for example: joyful, peaceful, comforting, or uplifting).</li>
        </ul>
        <p>When you rate each excerpt, please think about
           <strong>how the music makes you feel emotionally</strong>, not whether you
           like the piece or consider it good or bad music.</p>
        <p>There are no right or wrong answers. We are interested in your personal impression.</p>
      </div>`,
    choices: ["I understand, let's begin the practice"],
  };

  // ==========================================================================
  // Rating trial factory – fully custom HTML player
  // ==========================================================================

  function buildRatingTrial(stim, blockType) {
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

    return {
      type: jsPsychHtmlButtonResponse,
      button_html: '<button class="jspsych-btn" id="next-btn" disabled>%choice%</button>',
      choices: ["Next"],

      stimulus: `
        <div class="rating-trial">
          <p class="trial-prompt">
            Please rate how pleasant or unpleasant the emotion evoked by this music feels to you.
          </p>
          <p class="listen-status" id="listen-status">
            Listen to the excerpt before rating.
          </p>

          <!-- ── Audio player ── -->
          <div class="audio-player">
            <button class="play-pause-btn" id="play-pause-btn" disabled title="Loading…">▶</button>
            <div class="viz-container" id="viz-container">
              <canvas id="viz-canvas"></canvas>
            </div>
            <span class="time-display" id="time-display">0:00 / 0:00</span>
          </div>

          <!-- ── Valence slider ── -->
          <div class="slider-section">
            <p class="slider-hint" id="slider-hint">
              Rating available after you listen to the full excerpt.
            </p>
            <div class="slider-wrapper">
              <input type="range" id="valence-slider"
                     min="0" max="100" value="50" step="1" disabled />
              <div class="slider-labels">
                <span>Very unpleasant</span>
                <span>Neutral</span>
                <span>Very pleasant</span>
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

        // ── DPI-aware canvas resize ────────────────────────────────────────
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
          const m = Math.floor(s / 60);
          return m + ":" + String(Math.floor(s % 60)).padStart(2, "0");
        }

        // ── Read CSS vars so bars respect dark/light theme ────────────────
        function cssVar(name) {
          return getComputedStyle(document.documentElement)
            .getPropertyValue(name).trim();
        }

        // ── Draw loop: frequency bars + playhead ───────────────────────────
        function draw() {
          rafId = requestAnimationFrame(draw);
          const W = canvas._cssW || canvas.width;
          const H = canvas._cssH || canvas.height;

          ctx2d.clearRect(0, 0, W, H);

          // Frequency bars
          if (analyser && freqData && !audioEl.paused && !audioEl.ended) {
            analyser.getByteFrequencyData(freqData);
          }

          const NUM_BARS = 52;
          const gap      = 2;
          const barW     = (W - gap * (NUM_BARS - 1)) / NUM_BARS;
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

            // Interpolate between bar-lo and bar-hi based on energy
            const grad = ctx2d.createLinearGradient(x, y + bH, x, y);
            grad.addColorStop(0, cssVar("--bar-lo"));
            grad.addColorStop(1, cssVar("--bar-hi"));
            ctx2d.fillStyle = v > 0 ? grad : cssVar("--bar-idle");
            ctx2d.beginPath();
            ctx2d.roundRect(x, y, barW, bH, 2);
            ctx2d.fill();
          }

          // Idle centre line when paused / ended
          if (!isPlaying) {
            ctx2d.strokeStyle = cssVar("--bar-idle");
            ctx2d.lineWidth   = 1;
            ctx2d.beginPath();
            ctx2d.moveTo(0, H / 2);
            ctx2d.lineTo(W, H / 2);
            ctx2d.stroke();
          }

          // Playhead
          if (audioEl.duration) {
            const pct = audioEl.currentTime / audioEl.duration;
            const px  = pct * W;
            ctx2d.strokeStyle = cssVar("--playhead");
            ctx2d.lineWidth   = 2;
            ctx2d.beginPath();
            ctx2d.moveTo(px, 0);
            ctx2d.lineTo(px, H);
            ctx2d.stroke();

            timeDisplay.textContent =
              fmt(audioEl.currentTime) + " / " + fmt(audioEl.duration);
          }
        }

        // ── Build audio element ────────────────────────────────────────────
        audioEl = new Audio(stim.file);

        audioEl.addEventListener("canplaythrough", function () {
          playBtn.disabled        = false;
          playBtn.title           = "Play";
          timeDisplay.textContent = "0:00 / " + fmt(audioEl.duration);
          rafId = requestAnimationFrame(draw);   // start idle draw loop
        }, { once: true });

        audioEl.addEventListener("error", function () {
          listenStatus.textContent = "⚠ Audio failed to load: " + stim.file;
          listenStatus.style.color = "var(--danger)";
        });

        audioEl.addEventListener("play", function () {
          playBtn.textContent = "⏸";
          playBtn.title       = "Pause";
          if (!t_audio_start) t_audio_start = Date.now();

          // ── Wire up Web Audio API on first play (requires user gesture) ──
          if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioCtx.createAnalyser();
            analyser.fftSize        = 256;   // 128 bins
            analyser.smoothingTimeConstant = 0.78;
            const source = audioCtx.createMediaElementSource(audioEl);
            source.connect(analyser);
            analyser.connect(audioCtx.destination);
            freqData = new Uint8Array(analyser.frequencyBinCount);
          }
          if (audioCtx.state === "suspended") audioCtx.resume();
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

            slider.disabled        = false;
            vizContainer.classList.add("seekable");
            sliderHint.textContent = "Move the slider to indicate your rating, then click Next.";
            sliderHint.classList.add("hint-active");
            listenStatus.textContent = "✓ Now rate the excerpt and click Next.";
            listenStatus.classList.add("status-ready");
          }
        });

        // ── Play / pause toggle ────────────────────────────────────────────
        playBtn.addEventListener("click", function () {
          if (audioEl.paused || audioEl.ended) {
            audioEl.play().catch(() => {});
          } else {
            audioEl.pause();
          }
        });

        // ── Seek by clicking the visualizer (after first listen) ──────────
        vizContainer.addEventListener("click", function (e) {
          if (!hasListenedOnce || !audioEl.duration) return;
          const rect = vizContainer.getBoundingClientRect();
          audioEl.currentTime = ((e.clientX - rect.left) / rect.width) * audioEl.duration;
        });

        // ── Slider interaction trace ───────────────────────────────────────
        slider.addEventListener("input", function () {
          const t = Date.now(), value = parseInt(slider.value, 10);
          if (t_first_slider_move === null) t_first_slider_move = t;
          slider_events.push({ t, value });
          nextBtn.disabled = false;
        });

        // ── Mouse click trace ──────────────────────────────────────────────
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
        const slider = document.getElementById("valence-slider");

        data.response            = slider ? parseInt(slider.value, 10) : null;
        data.stim_id             = stim.id;
        data.stim_file           = stim.file;
        data.stim_group          = stim.group || "";
        data.block_type          = blockType;
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
  // SCREENS 7–8 – Practice Trials
  // ==========================================================================

  // Practice: only include if stimuli.json has entries tagged group="practice"
  const practiceStimuli = stimuli.filter((s) => s.group === "practice").slice(0, 2);
  const hasPractice     = practiceStimuli.length > 0;

  const practiceIntro = {
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      <div class="instructions-container">
        <h2>Practice</h2>
        <p>You will now hear <strong>${practiceStimuli.length} short practice excerpt(s)</strong>
           to familiarize yourself with the interface before the main session begins.</p>
        <p>Remember:</p>
        <ul>
          <li>The slider will be <strong>disabled during playback</strong>.</li>
          <li>After the excerpt ends, <strong>move the slider</strong> to indicate your rating.</li>
          <li>Click <strong>Next</strong> only after you have moved the slider.</li>
        </ul>
      </div>`,
    choices: ["Start Practice"],
  };

  const practiceTrials = practiceStimuli.map((s) => buildRatingTrial(s, "practice"));

  // Main block: everything not tagged as practice
  const mainStimuli  = stimuli.filter((s) => s.group !== "practice");
  const practiceEnd = {
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      <div class="instructions-container">
        <h2>Practice Complete</h2>
        <p>Great! You are ready to begin the main session.</p>
        <p>The main session consists of <strong>${mainStimuli.length} excerpts</strong>.
           Please continue to rate each one as you did in practice.</p>
      </div>`,
    choices: ["Begin Main Study"],
  };

  // ==========================================================================
  // MAIN RATING BLOCK
  // ==========================================================================

  const shuffled   = jsPsych.randomization.shuffle(mainStimuli);
  const mainTrials = shuffled.map((s) => buildRatingTrial(s, "main"));

  // ==========================================================================
  // DEBRIEF
  // ==========================================================================

  let _debriefComments = "";
  const debriefTrial = {
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      <div class="debrief-container">
        <h2>Thank You!</h2>
        <p>You have completed all the musical excerpts. Thank you for participating in this study.</p>
        <p>Your responses will help us better understand how people perceive emotion in
           computer-generated music.</p>
        <label for="debrief-input">
          Is there anything you would like to share about your experience? (optional)
        </label>
        <textarea id="debrief-input" rows="4"
                  placeholder="Any comments…"></textarea>
      </div>`,
    choices: ["Submit"],
    on_load: function () {
      const el = document.getElementById("debrief-input");
      if (el) el.addEventListener("input", () => { _debriefComments = el.value.trim(); });
    },
    on_finish: function () {
      const el = document.getElementById("debrief-input");
      if (el) _debriefComments = el.value.trim();
      jsPsych.data.addProperties({ debrief_comments: _debriefComments });
    },
  };

  // ==========================================================================
  // ASSEMBLE AND RUN TIMELINE
  // ==========================================================================

  const timeline = [
    accessCodeTrial,
    consentTrial,
    instructionsTrial,
    ageTrial,
    questionnaireTrial,
    valenceConcept,
    ...(hasPractice ? [practiceIntro, ...practiceTrials, practiceEnd] : []),
    ...mainTrials,
    debriefTrial,
  ];

  jsPsych.run(timeline);
}

// ============================================================================
// submitData() – POST all trial data to Google Apps Script
//   • When SCRIPT_URL is still the placeholder, runs in mock mode:
//     logs the payload to the console and shows a success screen.
// ============================================================================

const IS_MOCK = SCRIPT_URL.startsWith("REPLACE_WITH");

async function submitData(jsPsych) {
  const display = document.getElementById("jspsych-content") || document.body;
  display.innerHTML = `
    <div class="status-message">
      <p>Submitting your responses, please wait…</p>
    </div>`;

  const allTrials = jsPsych.data.get().values();
  const ratingTrials = allTrials.filter(
    (t) => t.block_type === "practice" || t.block_type === "main"
  );

  const payload = {
    code: access_code,
    participant_id: participant_id,
    trials: ratingTrials,
  };

  // ── Mock mode (local dev) ────────────────────────────────────────────────
  if (IS_MOCK) {
    console.log("=== MOCK SUBMIT (SCRIPT_URL not set) ===");
    console.log("Participant ID :", participant_id);
    console.log("Access code    :", access_code || "(none)");
    console.log("Trials         :", ratingTrials.length);
    console.log("Full payload   :", payload);
    display.innerHTML = `
      <div class="status-message">
        <h2>Mock Submission Complete</h2>
        <p>Running in <strong>local dev mode</strong> — no data was sent to a server.</p>
        <p>Open the browser console to inspect the full payload.</p>
        <p style="font-size:0.85rem;color:#666">Participant ID: ${participant_id}</p>
      </div>`;
    return;
  }

  try {
    // NOTE: Using text/plain avoids CORS pre-flight OPTIONS request.
    // Apps Script still receives the JSON body via e.postData.contents.
    const resp = await fetch(SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) throw new Error(`Server returned HTTP ${resp.status}`);
    const result = await resp.json();

    if (result.status === "ok") {
      display.innerHTML = `
        <div class="status-message">
          <h2>Submission Complete</h2>
          <p>Your responses have been recorded. Thank you for participating!</p>
          ${result.completion_code
            ? `<p>Your completion code: <strong>${result.completion_code}</strong></p>`
            : ""}
        </div>`;
    } else {
      throw new Error(result.error || "Unknown server error");
    }
  } catch (err) {
    console.error("Submission error:", err);
    display.innerHTML = `
      <div class="status-message error">
        <h2>Submission Error</h2>
        <p>There was a problem submitting your data. Please contact the researcher with the
           information below.</p>
        <p><strong>Participant ID:</strong> ${participant_id}</p>
        <p><strong>Error:</strong> ${err.message}</p>
      </div>`;
  }
}

// ── Start ─────────────────────────────────────────────────────────────────────
init();
