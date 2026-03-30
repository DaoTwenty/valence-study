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
      "emotions in music. We are interested in your personal " +
      "emotional responses.",

      "<strong>Duration:</strong> Approximately 30 minutes.",

      "<strong>Procedures:</strong> You will listen to a series of short musical excerpts " +
      "(~30 seconds each) and rate the <strong>valence</strong> of each excerpt — " +
      "how positive or negative the emotion expressed by the music is — using a slider scale.",

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
      "After each excerpt, rate <strong>how positive or negative the emotion expressed " +
      "by the music is</strong> using a slider.",
      "Focus on <strong>what the music conveys</strong>, not on whether you like or dislike the piece.",
      "There are <strong>no right or wrong answers</strong> — respond based on your impression of the music.",
      "The slider is <strong>disabled during playback</strong> — it becomes active once " +
      "the excerpt finishes.",
      "You must <strong>move the slider</strong> before you can proceed to the next excerpt.",
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
        name: "listening_frequency",
        prompt: "How often do you listen to music?",
        options: [
          "Rarely or never",
          "A few times a week",
          "Every day",
          "Several hours per day",
        ],
        required: true,
      },
      {
        name: "music_practice_years",
        prompt: "How many years have you actively practiced music in any form " +
                "(playing, singing, producing, DJing, composing, etc.)?",
        options: [
          "I don't practice music",
          "Less than 2 years",
          "2–5 years",
          "6–10 years",
          "More than 10 years",
        ],
        required: true,
      },
      {
        name: "music_engagement",
        prompt: "Which best describes your current relationship with music?",
        options: [
          "I mainly listen",
          "I make music as a hobby",
          "I make music semi-professionally",
          "I make music professionally",
        ],
        required: true,
      },
      {
        name: "music_formal_education",
        prompt: "Have you received any formal education in music " +
                "(e.g., conservatory, university music program, music theory courses)?",
        options: [
          "No formal education in music",
          "Some coursework (workshops, short courses)",
          "Completed a music program (diploma, bachelor's, or equivalent)",
          "Graduate-level music education (master's, doctorate, or equivalent)",
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
      "In this study, <strong>valence</strong> refers to how positive or negative the " +
      "emotion <strong>expressed by the music</strong> is — what the music conveys or communicates, " +
      "regardless of whether you personally like it.",
    ],
    items: [
      "<strong>Negative valence:</strong> the music sounds tense, dark, anxious, sorrowful, or unsettling.",
      "<strong>Positive valence:</strong> the music sounds joyful, bright, peaceful, uplifting, or warm.",
      "Two pieces can be equally intense but differ in valence — e.g. an energetic but dark track " +
      "vs. an energetic and euphoric one.",
    ],
    footer: "Focus on <strong>what the music expresses</strong>, not on your personal taste. " +
            "There are no right or wrong answers.",
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
    prompt:      "How positive or negative is the emotion expressed by this music?",
    listenFirst: "Listen to the excerpt before rating.",
    rateNow:     "✓ Now rate the excerpt and click Next.",
    sliderLocked: "Rating available after you listen to the full excerpt.",
    sliderReady:  "Move the slider to indicate your rating, then click Next.",
    labels:      ["Very negative", "Neutral", "Very positive"],
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
