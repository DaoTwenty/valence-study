# Setup & Deployment Checklist

## Audio hosting via Google Drive

GitHub can't serve large audio files. Host them on Google Drive instead:

1. Upload all `.wav` files to a Google Drive folder.
2. Right-click the folder → **Share → Anyone with the link → Viewer**.
3. For each file, get the direct download URL:
   - Open the file in Drive, copy its file ID from the URL:
     `https://drive.google.com/file/d/FILE_ID/view`
   - Direct URL format:
     `https://drive.google.com/uc?export=download&id=FILE_ID`
4. Edit `scripts/build-stimuli.js` — replace the local path mapping with the Drive URLs, OR maintain a manual `stimuli.json` with `"file": "https://drive.google.com/uc?export=download&id=FILE_ID"` for each stimulus.
5. **CORS note:** Google Drive direct-download URLs work for audio playback in the browser but will block the Web Audio API visualizer (CORS restriction). The audio still plays and all data is collected — only the frequency bars fall back to the idle flat line. If the visualizer matters, host on a CORS-enabled server (university web server, AWS S3 with a CORS policy, etc.).

---

## Local preview (do this first)

```bash
cd study-interface/

# Option A – Node.js (recommended)
npm start
# → open http://localhost:3000

# Option B – Python (no Node required)
npm run start:py
# → open http://localhost:3000
```

> **Do not open `index.html` directly as a file** (`file://`).
> The `fetch('stimuli.json')` call requires a real HTTP server.

---

## Before each push to GitHub Pages

- [ ] `stimuli.json` updated with real stimulus IDs and file paths
- [ ] Audio files uploaded / hosted and paths in `stimuli.json` are correct
- [ ] `SCRIPT_URL` in `experiment.js` replaced with the deployed Apps Script URL
- [ ] Consent text in `experiment.js` matches IRB/ethics approval wording
- [ ] Error overlay in `index.html` removed (the `window.addEventListener("error", ...)` block)
- [ ] Tested end-to-end locally (including data submission to Apps Script)

---

## GitHub Pages setup (one-time)

1. Create a new GitHub repository (e.g. `valence-study`).
2. From this directory:
   ```bash
   git init
   git remote add origin https://github.com/YOUR_USERNAME/valence-study.git
   git add .
   git commit -m "Initial study interface"
   git push -u origin main
   ```
3. In the repo on GitHub: **Settings → Pages → Source: Deploy from branch `main` / `/ (root)`**
4. Your live URL: `https://YOUR_USERNAME.github.io/valence-study/`

> Audio files are gitignored (`.gitignore`). Host them on a university server or
> use an absolute URL in `stimuli.json` pointing to wherever they live.
> Alternatively, enable [Git LFS](https://git-lfs.github.com/) for the `audio/` folder.

---

## Google Apps Script + Sheets setup (one-time)

1. Create a new **Google Spreadsheet** (e.g. "Valence Study Data").
2. Go to **Extensions → Apps Script**.
3. Delete the default `myFunction` code and paste the contents of `apps-script/Code.gs`.
4. Save, then run **`setupSheets`** once (click the function dropdown → select `setupSheets` → Run).
   - Grant permissions when prompted.
   - This creates the `Codes`, `ValidData`, and `UnverifiedData` tabs with headers.
5. **Deploy as Web App:**
   - Click **Deploy → New deployment**
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Click **Deploy** → copy the URL.
6. Open `experiment.js` and replace line 7:
   ```js
   const SCRIPT_URL = "REPLACE_WITH_YOUR_APPS_SCRIPT_URL";
   ```
   with the URL from step 5.
7. Every time you edit `Code.gs`, create a **new deployment version** (Deploy → Manage deployments → edit → new version). The URL stays the same.

---

## Access codes

In the `Codes` sheet, each row is:

| code | label | used |
|------|-------|------|
| STUDY2024A | Prolific batch 1 | FALSE |

- Replace example codes before going live.
- `used` is set to `TRUE` automatically after a valid submission (one-time use).
- To add codes in bulk, use the `addCodes()` helper in Apps Script.

---

## Adding / updating stimuli

1. Run synthesis pipeline → output `.wav` files into `audio/`.
2. Update `stimuli.json` with the new entries.
3. Tag practice excerpts with `"group": "practice"`.
4. `git add stimuli.json && git commit && git push`
5. GitHub Pages redeploys automatically within ~1 minute.

---

## Debugging blank screen / errors

1. Open browser DevTools → **Console** tab.
2. Reload the page and look for red errors.
3. Common causes:
   - CDN script failed to load (network issue or wrong version) — check **Network** tab for 404s.
   - `stimuli.json` missing or malformed — check for JSON syntax errors.
   - `SCRIPT_URL` still set to the placeholder string (only matters at submission, not on load).
4. The error overlay in `index.html` will also print the first JS error directly on the page.
