# YouTube Playlist Transcript Player

A separate, self-contained application for managing YouTube queues and working with the currently selected video's transcript. It has no references to your existing player's files, repository, service, or storage keys.

## Start on Windows

1. Extract this ZIP into a **new folder**.
2. Open a terminal in the folder containing `app.py` and `requirements.txt`.
3. Install Python 3.12 if needed, then run:

```powershell
py -3.12 -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
.venv\Scripts\python app.py
```

4. Open **http://localhost:3000**. Keep the terminal open. Stop with Ctrl+C.

macOS/Linux:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python app.py
```

## Features and use

- Paste YouTube watch, short-link, Shorts, live, or embed URLs. An optional name helps you identify each video.
- Add/remove videos; drag rows on desktop or use the up/down buttons on mobile.
- Click a row to play it. Previous/Next follow the **current queue order**. The next video starts when YouTube reports the current video ended, if Auto-play next is enabled.
- Reordering retains the selected video and never triggers transcript retrieval. Removing the selected video stops it and selects a remaining neighbor without auto-playing.
- The working queue persists automatically. Name and save additional playlists. Load or delete them, or back up/restore JSON to transfer to another browser/device.
- Select a video, choose a caption language code (`en`, `es`, etc.), and press **Generate transcript**. Only that video's captions are requested.
- Import SRT/VTT captions if automatic retrieval is unavailable. Imported subtitles attach to the selected video.
- Search transcript text and click a timestamp to seek playback.
- Select the entire transcript or 5/10/15/30/60-minute sections. Cues are grouped by their starting timestamp; a cue crossing a boundary stays intact in its starting section.
- Export TXT, Markdown, DOCX, PDF, CSV, SRT, or VTT. Exports always contain **all loaded cues**, even when search filters the screen. Text, Markdown, Word and PDF include section headings; CSV has a section column; SRT/VTT preserve continuous original timings for subtitle compatibility.

## Important behavior

**Transcript generation means retrieving available YouTube captions**, including YouTube's automatic captions. This version does not run speech recognition on audio from videos without captions. Captions may be missing, incorrect, language-specific, inaccessible, or blocked by YouTube. Hosting IPs, including Render IPs, may be blocked. Importing a subtitle file remains available. No paid transcription account, proxy, or API key is required or configured.

Playlists persist in browser localStorage, separately on each browser, device, and service URL. They do not sync through an account. Clearing browser/site data deletes them; use Backup playlists to preserve them. Transcripts are held in memory for the current session, keyed by video ID, and survive queue rearrangements but not a browser reload; export to preserve them.

Video playback depends on YouTube's embedding permissions. Private, age-restricted, removed, or embedding-disabled videos might not play. Browsers may block automatic playback; the app tells you to press Play. At the last video, playback stops without looping. No arbitrary web-video playback is included.

The PWA caches the app interface for offline access to playlists. Video playback, automatic caption retrieval, and exports through the server require a connection. The app has no login screen; a normal Render web service URL is publicly reachable. Each visitor sees their own browser's playlists.

## New GitHub repository and separate Render deployment

Read **DEPLOYMENT.md** for the step-by-step instructions. The provided `render.yaml` creates a separately named Python web service. No existing service IDs, repository remotes, deployment hooks, or credentials are included.

## Structure

- `app.py`: Flask server, explicitly requested caption retrieval, seven export formats.
- `public/core.js`: pure URL parsing, queue moves, subtitle parsing utilities.
- `public/app.js`: playlist state and YouTube playback; separate transcript session cache.
- `public/index.html`, `style.css`: responsive interface.
- `public/sw.js`, manifest and icons: installable PWA shell.
- `fonts/`: embedded DejaVu font and its license for PDF output. Broad Latin/Greek/Cyrillic coverage; some scripts and emoji may require an additional font.
- `tests/`: backend, utility and browser integration tests.

## Test commands

```sh
python -m pip install -r requirements-dev.txt
python -m pytest -q
node --test tests/core.test.cjs
python -m playwright install chromium
# Start app.py in another terminal, then:
python tests/browser_qa.py
```

The browser suite mocks YouTube's iframe API and transcript response so queue and transcript behavior can be tested repeatably. Real YouTube availability remains an external dependency. See TEST-REPORT.md for the actual checks performed with this package.
