// ============================================================================
// experiment.js – Valence Listening Test
// ============================================================================
//
// SETUP: Replace SCRIPT_URL with the deployed Google Apps Script web app URL.
//
const SCRIPT_URL = "REPLACE_WITH_YOUR_APPS_SCRIPT_URL";

// ── Helpers ──────────────────────────────────────────────────────────────────

function generateParticipantId() {
  return "P_" + Math.random().toString(36).substr(2, 9).toUpperCase();
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
    on_finish: function () {
      const el = document.getElementById("access-code-input");
      access_code = el ? el.value.trim() : "";
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

  const ageTrial = {
    type: jsPsychSurveyText,
    preamble: "<h2>About You</h2>",
    questions: [
      {
        prompt: "What is your age? (optional)",
        name: "age",
        placeholder: "e.g., 25",
        required: false,
        columns: 8,
      },
    ],
    on_finish: function (data) {
      jsPsych.data.addProperties({ q_age: data.response.age || "" });
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
  // Rating trial factory
  // ==========================================================================

  function buildRatingTrial(stim, blockType) {
    // Per-trial state (captured in closure)
    let t_trial_start = null;
    let t_audio_start = null;
    let t_audio_end = null;
    let t_first_slider_move = null;
    let slider_events = [];
    let mouse_clicks = [];
    let sliderInputListener = null;
    let clickListener = null;
    let sliderObserver = null;

    return {
      type: jsPsychAudioSliderResponse,
      stimulus: stim.file,
      labels: ["Very unpleasant", "Neutral", "Very pleasant"],
      slider_start: 50,
      min: 0,
      max: 100,
      step: 1,
      require_movement: true,
      response_allowed_while_playing: false,
      prompt: `<p class="trial-prompt">
        Please rate how pleasant or unpleasant the emotion evoked by this music feels to you.
      </p>`,

      on_start: function () {
        // Reset per-trial state
        t_trial_start = Date.now();
        t_audio_start = null;
        t_audio_end = null;
        t_first_slider_move = null;
        slider_events = [];
        mouse_clicks = [];
      },

      on_load: function () {
        // Approximate audio start time (audio begins playing shortly after load)
        t_audio_start = Date.now();

        // ── Detect audio end via MutationObserver on slider disabled attribute ──
        // When response_allowed_while_playing=false, jsPsych sets slider.disabled=true
        // during playback and removes it when audio ends.
        const slider = document.getElementById("jspsych-audio-slider-response-slider");
        if (slider) {
          sliderObserver = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
              if (mutation.attributeName === "disabled" && !slider.disabled) {
                t_audio_end = Date.now();
                sliderObserver.disconnect();
                sliderObserver = null;
              }
            });
          });
          sliderObserver.observe(slider, { attributes: true });

          // ── Slider interaction trace ────────────────────────────────────────
          sliderInputListener = function (e) {
            const t = Date.now();
            const value = parseInt(e.target.value, 10);
            if (t_first_slider_move === null) t_first_slider_move = t;
            slider_events.push({ t, value });
          };
          slider.addEventListener("input", sliderInputListener);
        }

        // ── Mouse click trace (optional) ────────────────────────────────────
        const container = document.getElementById("jspsych-content");
        if (container) {
          clickListener = function (e) {
            mouse_clicks.push({
              t: Date.now(),
              x: e.clientX,
              y: e.clientY,
              target:
                e.target.tagName +
                (e.target.id ? "#" + e.target.id : "") +
                (e.target.className
                  ? "." + String(e.target.className).trim().split(/\s+/).join(".")
                  : ""),
            });
          };
          container.addEventListener("click", clickListener);
        }
      },

      on_finish: function (data) {
        // ── Remove listeners ─────────────────────────────────────────────────
        const slider = document.getElementById("jspsych-audio-slider-response-slider");
        if (slider && sliderInputListener) {
          slider.removeEventListener("input", sliderInputListener);
        }
        if (sliderObserver) {
          sliderObserver.disconnect();
          sliderObserver = null;
        }
        const container = document.getElementById("jspsych-content");
        if (container && clickListener) {
          container.removeEventListener("click", clickListener);
        }

        // ── Attach custom fields to trial data ───────────────────────────────
        data.stim_id = stim.id;
        data.stim_file = stim.file;
        data.stim_group = stim.group || "";
        data.block_type = blockType;
        data.participant_id = participant_id;
        data.access_code = access_code;
        data.t_trial_start = t_trial_start;
        data.t_audio_start = t_audio_start;
        data.t_audio_end = t_audio_end;
        data.t_first_slider_move = t_first_slider_move;
        data.slider_events = slider_events;
        data.mouse_clicks = mouse_clicks;
        data.audio_played_full = t_audio_end !== null;

        if (t_audio_end && t_audio_start) {
          const dur = (t_audio_end - t_audio_start) / 1000;
          console.log(`[${stim.id}] approx. audio duration: ${dur.toFixed(1)}s`);
        }
      },
    };
  }

  // ==========================================================================
  // SCREENS 7–8 – Practice Trials
  // ==========================================================================

  const practiceStimuli = stimuli.filter((s) => s.group === "practice").slice(0, 2);
  // If no practice-tagged stimuli, fall back to first 1
  const practiceStimToUse =
    practiceStimuli.length > 0 ? practiceStimuli : stimuli.slice(0, 1);

  const practiceIntro = {
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      <div class="instructions-container">
        <h2>Practice</h2>
        <p>You will now hear <strong>${practiceStimToUse.length} short practice excerpt(s)</strong>
           to familiarize yourself with the interface before the main session begins.</p>
        <p>Remember:</p>
        <ul>
          <li>The slider will be <strong>disabled during playback</strong>.</li>
          <li>After the excerpt ends, <strong>move the slider</strong> to indicate your rating.</li>
          <li>Click <strong>Continue</strong> only after you have moved the slider.</li>
        </ul>
      </div>`,
    choices: ["Start Practice"],
  };

  const practiceTrials = practiceStimToUse.map((s) => buildRatingTrial(s, "practice"));

  const mainStimuli = stimuli.filter((s) => s.group !== "practice");
  const mainCount = mainStimuli.length > 0 ? mainStimuli.length : stimuli.length;

  const practiceEnd = {
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      <div class="instructions-container">
        <h2>Practice Complete</h2>
        <p>Great! You are ready to begin the main session.</p>
        <p>The main session consists of <strong>${mainCount} excerpts</strong>.
           Please continue to rate each one as you did in practice.</p>
      </div>`,
    choices: ["Begin Main Study"],
  };

  // ==========================================================================
  // MAIN RATING BLOCK
  // ==========================================================================

  const shuffled = jsPsych.randomization.shuffle(
    mainStimuli.length > 0 ? mainStimuli : stimuli
  );
  const mainTrials = shuffled.map((s) => buildRatingTrial(s, "main"));

  // ==========================================================================
  // DEBRIEF
  // ==========================================================================

  const debriefTrial = {
    type: jsPsychSurveyText,
    preamble: `
      <div class="debrief-container">
        <h2>Thank You!</h2>
        <p>You have completed all the musical excerpts. Thank you for participating in this study.</p>
        <p>Your responses will help us better understand how people perceive emotion in
           computer-generated music.</p>
      </div>`,
    questions: [
      {
        prompt: "Is there anything you would like to share about your experience in this study? (optional)",
        name: "debrief_comments",
        rows: 4,
        required: false,
      },
    ],
    button_label: "Submit",
    on_finish: function (data) {
      jsPsych.data.addProperties({
        debrief_comments: data.response.debrief_comments || "",
      });
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
    practiceIntro,
    ...practiceTrials,
    practiceEnd,
    ...mainTrials,
    debriefTrial,
  ];

  jsPsych.run(timeline);
}

// ============================================================================
// submitData() – POST all trial data to Google Apps Script
// ============================================================================

async function submitData(jsPsych) {
  const display = document.getElementById("jspsych-content") || document.body;
  display.innerHTML = `
    <div class="status-message">
      <p>Submitting your responses, please wait…</p>
    </div>`;

  // Collect rating trials only for submission (surveys are included via jsPsych
  // global properties on each rating trial, so the schema stays consistent).
  const allTrials = jsPsych.data.get().values();
  const ratingTrials = allTrials.filter(
    (t) => t.trial_type === "audio-slider-response"
  );

  const payload = {
    code: access_code,
    participant_id: participant_id,
    trials: ratingTrials,
  };

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
