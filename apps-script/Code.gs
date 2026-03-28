// ============================================================================
// Code.gs – Google Apps Script backend for the Valence Listening Test
// ============================================================================
//
// SETUP INSTRUCTIONS (run once):
//   1. Open your Google Spreadsheet.
//   2. Go to Extensions > Apps Script, paste this file.
//   3. Run setupSheets() once from the editor to create the required tabs.
//   4. Deploy as Web App:
//        Execute as: Me
//        Who has access: Anyone
//   5. Copy the deployment URL and paste it into experiment.js as SCRIPT_URL.
//
// ============================================================================

// --------------------------------------------------------------------------
// doPost – main entry point for POST requests from the front end
// --------------------------------------------------------------------------
function doPost(e) {
  try {
    var raw = e.postData.contents;
    var data = JSON.parse(raw);

    var code           = (data.code           || "").toString().trim();
    var participant_id = (data.participant_id  || "").toString().trim();
    var trials         = Array.isArray(data.trials) ? data.trials : [];

    var ss              = SpreadsheetApp.getActiveSpreadsheet();
    var codesSheet      = ss.getSheetByName("Codes");
    var validSheet      = ss.getSheetByName("ValidData");
    var unverifiedSheet = ss.getSheetByName("UnverifiedData");

    if (!codesSheet || !validSheet || !unverifiedSheet) {
      throw new Error("Required sheets not found. Run setupSheets() first.");
    }

    // ── Validate access code ──────────────────────────────────────────────
    var codeValid    = false;
    var codeRowIndex = -1;

    if (code !== "") {
      var codesData = codesSheet.getDataRange().getValues();
      // Row 0 is header; data starts at row 1 (sheet row 2)
      for (var i = 1; i < codesData.length; i++) {
        if (codesData[i][0].toString().trim() === code) {
          codeValid    = true;
          codeRowIndex = i + 1; // 1-indexed sheet row
          break;
        }
      }
    }

    var targetSheet = codeValid ? validSheet : unverifiedSheet;
    var timestamp   = new Date().toISOString();

    // ── Build rows ────────────────────────────────────────────────────────
    var rows = [];
    for (var j = 0; j < trials.length; j++) {
      var t = trials[j];
      rows.push([
        timestamp,
        code,
        codeValid,
        participant_id,
        t.stim_id             !== undefined ? t.stim_id             : "",
        t.stim_file           !== undefined ? t.stim_file           : "",
        t.block_type          !== undefined ? t.block_type          : "",
        t.trial_index         !== undefined ? t.trial_index         : "",
        t.trial_type          !== undefined ? t.trial_type          : "",
        t.response            !== undefined ? t.response            : "",
        t.rt                  !== undefined ? t.rt                  : "",
        t.t_trial_start       !== undefined ? t.t_trial_start       : "",
        t.t_audio_start       !== undefined ? t.t_audio_start       : "",
        t.t_audio_end         !== undefined ? t.t_audio_end         : "",
        t.t_first_slider_move !== undefined ? t.t_first_slider_move : "",
        JSON.stringify(t.slider_events  || []),
        JSON.stringify(t.mouse_clicks   || []),
        JSON.stringify(t),                          // raw_json
      ]);
    }

    if (rows.length > 0) {
      var lastRow = targetSheet.getLastRow();
      targetSheet
        .getRange(lastRow + 1, 1, rows.length, rows[0].length)
        .setValues(rows);
    }

    // ── Mark code as used (one-time use) ──────────────────────────────────
    // Comment out the block below if you want codes to be reusable.
    if (codeValid && codeRowIndex > 0) {
      codesSheet.getRange(codeRowIndex, 3).setValue(true); // column C = "used"
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

// --------------------------------------------------------------------------
// doGet – simple health-check endpoint
// --------------------------------------------------------------------------
function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ status: "ok", message: "Valence study backend is running." }))
    .setMimeType(ContentService.MimeType.JSON);
}

// --------------------------------------------------------------------------
// setupSheets – run ONCE from the Apps Script editor to initialize the
//               spreadsheet structure.
// --------------------------------------------------------------------------
function setupSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // ── Data headers ─────────────────────────────────────────────────────────
  var dataHeaders = [
    "timestamp",
    "access_code",
    "code_valid",
    "participant_id",
    "stim_id",
    "stim_file",
    "block_type",
    "trial_index",
    "trial_type",
    "response",
    "rt",
    "t_trial_start",
    "t_audio_start",
    "t_audio_end",
    "t_first_slider_move",
    "slider_events_json",
    "mouse_clicks_json",
    "raw_json",
  ];

  ["ValidData", "UnverifiedData"].forEach(function (name) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
    }
    // Only write header if sheet is empty
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, dataHeaders.length).setValues([dataHeaders]);
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, dataHeaders.length)
           .setBackground("#d9ead3")
           .setFontWeight("bold");
    }
  });

  // ── Codes sheet ───────────────────────────────────────────────────────────
  var codesSheet = ss.getSheetByName("Codes");
  if (!codesSheet) {
    codesSheet = ss.insertSheet("Codes");
  }
  if (codesSheet.getLastRow() === 0) {
    codesSheet.getRange(1, 1, 1, 3).setValues([["code", "label", "used"]]);
    codesSheet.setFrozenRows(1);
    codesSheet.getRange(1, 1, 1, 3)
              .setBackground("#cfe2f3")
              .setFontWeight("bold");

    // Add example codes (delete or replace before deployment)
    var exampleCodes = [
      ["STUDY2024A", "Prolific batch 1", false],
      ["STUDY2024B", "Prolific batch 1", false],
      ["STUDY2024C", "Lab participant",  false],
    ];
    codesSheet.getRange(2, 1, exampleCodes.length, 3).setValues(exampleCodes);
  }

  Logger.log("Sheets initialized successfully.");
  SpreadsheetApp.getUi().alert("Setup complete! Sheets Codes, ValidData, and UnverifiedData are ready.");
}

// --------------------------------------------------------------------------
// addCodes – helper to bulk-add new codes from a 2D array.
// Usage: addCodes([["CODE1","label",false], ["CODE2","label",false]])
// --------------------------------------------------------------------------
function addCodes(codeRows) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Codes");
  var last  = sheet.getLastRow();
  sheet.getRange(last + 1, 1, codeRows.length, 3).setValues(codeRows);
}
