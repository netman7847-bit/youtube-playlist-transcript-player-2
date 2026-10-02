# Deploy as a completely separate application

## 1. Create a NEW GitHub repository

1. Open https://github.com/new and create a repository named **youtube-playlist-transcript-player**.
2. Choose public or private. A private repository can still deploy a publicly accessible Render web service.
3. Extract the ZIP. Open the extracted `youtube-playlist-transcript-player` folder.
4. In the new repository, choose **Add file → Upload files**. Upload the **contents** of that folder, not the ZIP. `app.py`, `requirements.txt`, `render.yaml`, and `public/` must be at the repository root.
5. Commit the upload. Check that `fonts/` and the two PNG icons were included.
6. Keep your original YouTube Transcript Player repository untouched.

If using Git instead of the upload screen, run these inside this new folder and substitute your GitHub username:

```sh
git init
git add .
git commit -m "Create separate YouTube Playlist Transcript Player"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/youtube-playlist-transcript-player.git
git push -u origin main
```

## 2. Create a NEW Render Web Service

Open https://dashboard.render.com and choose **New → Web Service**. Connect the **new repository** above. Do not open or edit the existing player's service.

| Setting | Value |
|---|---|
| Name | `youtube-playlist-transcript-player` (add a suffix if already taken) |
| Runtime / Language | Python 3 |
| Branch | `main` |
| Root Directory | **Leave blank** when app.py is at the repository root |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `gunicorn app:app --bind 0.0.0.0:$PORT --workers 2 --threads 4 --timeout 90` |
| Health Check Path | `/health` |
| Environment variable | `PYTHON_VERSION` = `3.12.8` |

Choose an instance plan offered in your dashboard and create the service. Wait for the deployment to finish and use the **new service's** HTTPS URL.

Alternative: **New → Blueprint**, select the new repository, and apply its `render.yaml`. This also defines a newly named service. Review the proposed service name and plan before creating it. Use either the manual Web Service route or Blueprint, not both.

The ZIP is deployment-ready source; it does not itself create a remote repository or service. No credentials are bundled. This project uses Python, so there is no `package.json` and no `npm start` deployment command.

## 3. Verify the new service

1. Confirm the new URL ends in `/health` and shows `status: ok` with this app's name.
2. Open the URL without `/health`. Add two embeddable YouTube videos.
3. Test Previous/Next, mobile up/down controls, and desktop dragging.
4. Let the first video finish with Auto-play next enabled. If your browser blocks it, press Play in the next video.
5. Generate the selected video's transcript. If YouTube blocks Render, import an SRT/VTT file and test search, sections, and exports.
6. Save a playlist and reload. It should remain on the same browser/device.
7. Confirm your original player's separate URL still works.

## 4. Install the PWA

**Samsung Galaxy S25 Ultra, Galaxy Tab S8, or Google Pixel:** Open the **new HTTPS URL** in Chrome. Use the app's Install app button when offered, or Chrome's menu → Install app / Add to Home screen. Open from the new home-screen icon.

**Windows 11:** Open the new URL in Chrome or Edge. Use the address-bar install icon, or the browser menu's app installation option. Installation is offered when the browser's PWA criteria are met; menu wording can vary.

Localhost can be used for desktop installation testing. A plain HTTP LAN address on a phone usually does not qualify; use the Render HTTPS URL. Installation does not remove the internet requirement for YouTube.

## Troubleshooting

- **Build cannot find requirements.txt:** Verify root-level files and blank Root Directory. If you intentionally uploaded the entire project folder as a nested folder, set Root Directory to that folder's exact name.
- **Wrong app appears:** Check the new repository and the new service URL, rather than modifying the existing service.
- **Transcript fetch fails:** Try the right caption language or import subtitles. No-caption videos require captions from another source; audio transcription is not included.
- **Playlist missing on another device:** Back up on the first device and restore on the second. Browser storage does not sync.
- **App changes appear late:** Refresh with an internet connection. The service worker uses network-first refreshes for shell files.

References: https://render.com/docs/deploy-flask and https://render.com/docs/blueprint-spec ; https://github.com/jdepoix/youtube-transcript-api ; https://developers.google.com/youtube/iframe_api_reference
