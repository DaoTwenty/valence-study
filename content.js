// ============================================================================
// content.js – All editable study text
// ============================================================================
// Edit this file to customize the study without touching experiment logic.
// This file must be loaded before experiment.js (see index.html).
// ============================================================================

const CONTENT = {

  // --------------------------------------------------------------------------
  // Access code screen
  // --------------------------------------------------------------------------
  accessCode: {
    title: "Access Code",
    body:  "Please enter the access code provided to you by the researcher. " +
           "If you do not have a code, leave this blank and click <em>Continue</em>.",
    placeholder: "Access code (leave blank if none)",
    buttonLabel: "Continue",
  },

  // --------------------------------------------------------------------------
  // Consent / information sheet
  // --------------------------------------------------------------------------
  consent: {
    title: "Participant Information and Consent",
    paragraphs: [
      "<strong>Study Purpose:</strong> This study investigates how people perceive " +
      "emotions in computer-generated music. We are interested in your personal " +
      "emotional responses.",

      "<strong>Duration:</strong> Approximately 20–30 minutes.",

      "<strong>Procedures:</strong> You will listen to a series of short musical excerpts " +
      "(~30 seconds each) and rate the emotional valence (pleasantness/unpleasantness) " +
      "of each excerpt using a slider scale.",

      "<strong>Voluntary Participation:</strong> Your participation is entirely voluntary. " +
      "You may withdraw at any time without penalty by closing this window.",

      "<strong>Anonymity:</strong> No personally identifying information will be stored " +
      "alongside your responses. A randomly assigned ID is used instead of your name. " +
      "Data will be stored on encrypted university accounts and used solely for research.",

      "If you have questions, please contact the researcher before proceeding.",
    ],
    buttonLabel: "I have read the information above and consent to participate",
  },

  // --------------------------------------------------------------------------
  // General instructions
  // --------------------------------------------------------------------------
  instructions: {
    title: "Instructions",
    items: [
      "Please use <strong>headphones</strong> where possible.",
      "Complete this study in a <strong>quiet environment</strong>.",
      "Set your volume to a <strong>comfortable listening level</strong> before starting.",
      // Note: excerpt count is inserted automatically by experiment.js
      "After each excerpt, rate <strong>how pleasant or unpleasant the emotion evoked " +
      "by the music feels</strong> using a slider.",
      "The slider is <strong>disabled during playback</strong> — it becomes active once " +
      "the excerpt finishes.",
      "You must <strong>move the slider</strong> before you can proceed to the next excerpt.",
      "There are <strong>no right or wrong answers</strong> — respond based on your own impression.",
    ],
    buttonLabel: "Continue",
  },

  // --------------------------------------------------------------------------
  // Age question
  // --------------------------------------------------------------------------
  age: {
    title: "About You",
    label: "What is your age? (optional)",
    placeholder: "e.g., 25",
    buttonLabel: "Continue",
  },

  // --------------------------------------------------------------------------
  // Musical background questionnaire
  // --------------------------------------------------------------------------
  questionnaire: {
    title: "Musical Background",
    preamble: "Please answer the following questions about your musical experience.",
    questions: [
      {
        name: "musical_training_years",
        prompt: "How many years have you played a musical instrument or sung in a " +
                "structured setting (e.g., lessons, ensembles)?",
        options: ["None", "1–2 years", "3–5 years", "6–10 years", "10+ years"],
        required: true,
      },
      {
        name: "formal_music_education",
        prompt: "Have you received formal education in music theory, composition, or performance?",
        options: [
          "No",
          "Yes, up to high school",
          "Yes, university/college",
          "Yes, postgraduate/professional",
        ],
        required: true,
      },
      {
        name: "listening_frequency",
        prompt: "How often do you listen to music?",
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
  },

  // --------------------------------------------------------------------------
  // Valence concept explanation
  // --------------------------------------------------------------------------
  valenceConcept: {
    title: 'What do we mean by "valence"?',
    paragraphs: [
      "Emotions can feel more or less pleasant. In this study, we focus on " +
      "<strong>valence</strong> — how <strong>pleasant or unpleasant</strong> the emotion feels.",
    ],
    items: [
      "Music with <strong>low valence</strong> tends to feel unpleasant or negative " +
      "(for example: tense, disturbing, anxious, or very sad in a painful way).",
      "Music with <strong>high valence</strong> tends to feel pleasant or positive " +
      "(for example: joyful, peaceful, comforting, or uplifting).",
    ],
    footer: "When you rate each excerpt, please think about <strong>how the music makes " +
            "you feel emotionally</strong>, not whether you like the piece or consider it " +
            "good or bad music. There are no right or wrong answers.",
    buttonLabel: "I understand, let's begin the practice",
  },

  // --------------------------------------------------------------------------
  // Practice screens
  // --------------------------------------------------------------------------
  practiceIntro: {
    title: "Practice",
    body:  "You will now hear a short practice excerpt to familiarize yourself with " +
           "the interface before the main session begins.",
    reminders: [
      "The slider will be <strong>disabled during playback</strong>.",
      "After the excerpt ends, <strong>move the slider</strong> to indicate your rating.",
      "Click <strong>Next</strong> only after you have moved the slider.",
    ],
    buttonLabel: "Start Practice",
  },
  practiceEnd: {
    title: "Practice Complete",
    body:  "Great! You are ready to begin the main session. Please continue to rate " +
           "each excerpt as you did in practice.",
    buttonLabel: "Begin Main Study",
  },

  // --------------------------------------------------------------------------
  // Rating trial
  // --------------------------------------------------------------------------
  trial: {
    prompt:      "Please rate how pleasant or unpleasant the emotion evoked by this music feels to you.",
    listenFirst: "Listen to the excerpt before rating.",
    rateNow:     "✓ Now rate the excerpt and click Next.",
    sliderLocked: "Rating available after you listen to the full excerpt.",
    sliderReady:  "Move the slider to indicate your rating, then click Next.",
    labels:      ["Very unpleasant", "Neutral", "Very pleasant"],
    buttonLabel: "Next",
  },

  // --------------------------------------------------------------------------
  // Headphone check (3 dichotic lateralization trials)
  // --------------------------------------------------------------------------
  headphoneCheck: {
    title: "Headphone Check",
    instruction: "Press <strong>Play</strong> and listen carefully, then answer which ear heard the sound.",
    playLabel:   "▶ Play sound",
    playingLabel:"♪ Playing…",
    replayLabel: "↻ Play again",
    question:    "Which ear heard the sound?",
    choices:     ["Left ear", "Right ear", "Both / Not sure"],
    resultPass:  "✓ Headphones confirmed — you're good to go!",
    resultFail:  "⚠ We couldn't confirm headphone use. For best results, please use headphones.",
    buttonLabel: "Continue",
  },

  // --------------------------------------------------------------------------
  // Break screen (shown at the midpoint of the main block)
  // --------------------------------------------------------------------------
  breakScreen: {
    title: "Halfway there — take a short break",
    paragraphs: [
      "You've completed the first half of the excerpts.",
      "Take a moment to rest, stretch, or adjust your volume if needed.",
      "There's no time limit — continue when you're ready.",
    ],
    buttonLabel: "I'm ready to continue",
  },

  // --------------------------------------------------------------------------
  // Debrief
  // --------------------------------------------------------------------------
  debrief: {
    title: "Thank You!",
    paragraphs: [
      "You have completed all the musical excerpts. Thank you for participating in this study.",
      "Your responses will help us better understand how people perceive emotion in " +
      "computer-generated music.",
    ],
    commentsLabel: "Is there anything you would like to share about your experience? (optional)",
    commentsPlaceholder: "Any comments…",
    buttonLabel: "Submit",
  },
};
