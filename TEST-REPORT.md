# Test report

## Verified in the build environment

- **16 Python tests passed:** app shell/health/PWA assets, video-ID/language validation, mocked successful caption retrieval, safe error response, all seven export formats, 5/10/15/30/60-minute boundary handling, invalid export rejection.
- **3 Node utility tests passed:** URL formats and hostile host rejection, immutable queue moves, SRT/VTT parsing with fractional timestamps and invalid input handling.
- **DOM integration suite passed using jsdom:** actual UI handlers for add/remove, drag-and-drop reorder, up/down moves, stable selected video after reorder, Previous/Next, ended-event automatic next, explicit-only transcript requests, search, segment headings, per-video transcript display, named saved playlists, load, and restoration in a fresh page DOM.
- TXT/MD/CSV/SRT/VTT were inspected by automated assertions; DOCX's document XML was inspected, and PDF output passed its file signature check.
- App served locally on port 3000. No existing player's files or services were accessed or changed.

## External and visual checks that remain

- **Real-browser UI tests were not executed:** downloading Chromium failed in this environment. The included `tests/browser_qa.py` is ready to check desktop dragging, downloads, JavaScript errors, and overflow at 390/768/1440px once Chromium is available. CSS has explicit responsive layouts, but a rendered visual check was unavailable.
- **Real YouTube caption request did not complete:** a sample network request reached the configured timeout and returned the intended user-facing error. Caption success was tested with a mocked provider response, not a successful live YouTube fetch. YouTube may block Render IPs.
- Actual YouTube playback, browser autoplay permission, Android/desktop installation prompts, HTTPS service-worker behavior, and offline shell caching require checks at the new deployed HTTPS URL.
- DOCX/PDF rendering in Office/a PDF viewer remains a post-deployment/manual check; exports were validated structurally, not visually.
- GitHub repository and Render service are **prepared, not remotely created or deployed**.

## Repeat the DOM suite

Requires Node.js and an optional development-only jsdom dependency:

```sh
npm install --prefix .qa-deps jsdom
# macOS/Linux:
NODE_PATH="$PWD/.qa-deps/node_modules" node tests/dom_qa.cjs
```

PowerShell:

```powershell
npm install --prefix .qa-deps jsdom
$env:NODE_PATH = "$PWD\.qa-deps\node_modules"
node tests/dom_qa.cjs
```

These npm commands are for the optional test suite. Production runs with Python, using requirements.txt.
