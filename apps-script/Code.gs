// ============================================================================
// Code.gs – Google Apps Script backend for the Valence Listening Test
// ============================================================================
//
// SETUP (run once):
//   1. Open your Google Spreadsheet.
//   2. Extensions > Apps Script – paste this file.
//   3. Run setupSheets() once to create / update sheet headers.
//   4. Deploy as Web App: Execute as Me, Who has access: Anyone.
//   5. Paste the deployment URL into experiment.js as SCRIPT_URL.
//   6. After any edit here, create a new deployment version so the URL updates.
//
// ============================================================================

// ---------------------------------------------------------------------------
// doPost
// ---------------------------------------------------------------------------
function doPost(e) {
  try {
    var raw  = e.postData.contents;
    var data = JSON.parse(raw);

    var code           = (data.code           || "").toString().trim();
    var participant_id = (data.participant_id  || "").toString().trim();
    var trials         = Array.isArray(data.trials) ? data.trials : [];
    var demo           = data.demographics || {};   // age, questionnaire, debrief

    var ss              = SpreadsheetApp.getActiveSpreadsheet();
    var codesSheet      = ss.getSheetByName("Codes");
    var validSheet      = ss.getSheetByName("ValidData");
    var unverifiedSheet = ss.getSheetByName("UnverifiedData");

    if (!codesSheet || !validSheet || !unverifiedSheet) {
      throw new Error("Required sheets not found. Run setupSheets() first.");
    }

    // ── Validate access code ─────────────────────────────────────────────
    var codeValid    = false;
    var codeRowIndex = -1;

    if (code !== "") {
      var codesData = codesSheet.getDataRange().getValues();
      for (var i = 1; i < codesData.length; i++) {
        if (codesData[i][0].toString().trim() === code) {
          codeValid    = true;
          codeRowIndex = i + 1;
          break;
        }
      }
    }

    var targetSheet = codeValid ? validSheet : unverifiedSheet;
    var timestamp   = new Date().toISOString();

    // ── Build rows (one per trial) ───────────────────────────────────────
    var rows = [];
    for (var j = 0; j < trials.length; j++) {
      var t = trials[j];
      rows.push([
        // ── Core trial fields ──────────────────────────────────────────
        timestamp,
        code,
        codeValid,
        participant_id,
        t.stim_id             !== undefined ? t.stim_id             : "",
        t.stim_file           !== undefined ? t.stim_file           : "",
        t.block_type          !== undefined ? t.block_type          : "",
        t.trial_index         !== undefined ? t.trial_index         : "",
        t.response            !== undefined ? t.response            : "",
        t.rt                  !== undefined ? t.rt                  : "",
        t.t_trial_start       !== undefined ? t.t_trial_start       : "",
        t.t_audio_start       !== undefined ? t.t_audio_start       : "",
        t.t_audio_end         !== undefined ? t.t_audio_end         : "",
        t.t_first_slider_move !== undefined ? t.t_first_slider_move : "",
        t.audio_played_full   !== undefined ? t.audio_played_full   : "",
        JSON.stringify(t.slider_events || []),
        JSON.stringify(t.mouse_clicks  || []),
        // ── Demographics (same value on every trial row) ───────────────
        demo.q_listening_frequency   || "",
        demo.q_music_practice_years  || "",
        demo.q_music_engagement      || "",
        demo.q_music_formal_education|| "",
        demo.debrief_comments        || "",
        // ── Full trial object for re-parsing ──────────────────────────
        JSON.stringify(t),
      ]);
    }

    if (rows.length > 0) {
      var lastRow = targetSheet.getLastRow();
      targetSheet
        .getRange(lastRow + 1, 1, rows.length, rows[0].length)
        .setValues(rows);
    }

    // ── Mark code as used ────────────────────────────────────────────────
    if (codeValid && codeRowIndex > 0) {
      codesSheet.getRange(codeRowIndex, 3).setValue(true);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ status: "ok", valid: codeValid }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    Logger.log("doPost error: " + err.toString());
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ---------------------------------------------------------------------------
// doGet – health check
// ---------------------------------------------------------------------------
function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ status: "ok", message: "Backend running." }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ---------------------------------------------------------------------------
// setupSheets – run once (or again after column changes)
// ---------------------------------------------------------------------------
function setupSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var dataHeaders = [
    // Core
    "timestamp", "access_code", "code_valid", "participant_id",
    "stim_id", "stim_file", "block_type", "trial_index",
    "response", "rt",
    "t_trial_start", "t_audio_start", "t_audio_end", "t_first_slider_move",
    "audio_played_full", "slider_events_json", "mouse_clicks_json",
    // Demographics
    "q_listening_frequency", "q_music_practice_years",
    "q_music_engagement", "q_music_formal_education", "debrief_comments",
    // Raw
    "raw_json",
  ];

  ["ValidData", "UnverifiedData"].forEach(function (name) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) sheet = ss.insertSheet(name);

    // Write / overwrite header row
    sheet.getRange(1, 1, 1, dataHeaders.length).setValues([dataHeaders]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, dataHeaders.length)
         .setBackground("#d9ead3")
         .setFontWeight("bold");
  });

  // Codes sheet
  var codesSheet = ss.getSheetByName("Codes");
  if (!codesSheet) codesSheet = ss.insertSheet("Codes");
  if (codesSheet.getLastRow() === 0) {
    codesSheet.getRange(1, 1, 1, 3).setValues([["code", "label", "used"]]);
    codesSheet.setFrozenRows(1);
    codesSheet.getRange(1, 1, 1, 3).setBackground("#cfe2f3").setFontWeight("bold");
    codesSheet.getRange(2, 1, 3, 3).setValues([
      ["STUDY2024A", "Prolific batch 1", false],
      ["STUDY2024B", "Prolific batch 1", false],
      ["STUDY2024C", "Lab participant",  false],
    ]);
  }

  SpreadsheetApp.getUi().alert("Setup complete.");
}

// ---------------------------------------------------------------------------
// addCodes helper
// ---------------------------------------------------------------------------
function addCodes(codeRows) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Codes");
  sheet.getRange(sheet.getLastRow() + 1, 1, codeRows.length, 3).setValues(codeRows);
}
