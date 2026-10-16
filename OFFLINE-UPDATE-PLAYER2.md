# Player 2 offline workspace update

This is the Player 2 package only. It was assembled from the current `youtube-playlist-transcript-player-2` source at commit `9208cc0f` and the Player 2 portion of Offline Workspace update 1.0.0.

## What changed

- Adds the protected `/offline/` workspace and its static offline assets.
- Replaces the Flask service worker route and `public/sw.js` so offline assets can be prepared and served correctly.
- Updates `public/index.html` with the offline workspace bridge scripts.
- Preserves the online playlist player, transcript retrieval, authentication, export endpoints, and existing environment settings.
- Does not modify Player 1 or LiveCaptionDesktopPWA.

## Local Whisper behavior

Whisper runs in the browser on a local video/audio file after the model is downloaded. Full-file transcription has hard limits of 100 MiB and 30 minutes because the entire audio is decoded into memory. The model then receives 20-second inference windows. The app does not split a longer source file into smaller files or automatically process it in separate 5/30-minute sections.

The transcript's 5/10/15/30/60-minute grouping is a separate display/export option. It organizes timestamped caption lines; it does not affect audio decoding or transcription limits.

Synchronized playback is a different mode that buffers and recognizes audio as playback proceeds. It may be slower than playback on some devices and stops if the device cannot keep up. Test with short clips first.

## Deploying

1. Back up the current Player 2 repository and record its Render deployment.
2. Extract the ZIP. Merge the included files into the existing Player 2 repository root; do not upload the enclosing folder as a nested directory.
3. Keep the current `APP_USERNAME`, `APP_PASSWORD`, `AUTH_ENABLED`, and `SUPADATA_API_KEY` settings. This update needs no new API key.
4. Commit and wait for Render to report the deployment as live.
5. Sign in and open `/offline/`. While online, choose **Prepare offline interface** and **Download & verify Whisper** on each device/browser that needs offline transcription.
6. Verify ordinary YouTube playback and captions, then test the offline workspace with a short local file before relying on it.

Local transcripts, downloaded models, and saved media are per browser and per device. The app does not download YouTube videos or make Premium downloads available as local files.

