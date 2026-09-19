# Pose Cognitive Trainer

Current version: **V1.0.0**

A responsive English/Hebrew Progressive Web App that presents shuffled pose numbers on a configurable active-time schedule.

## Run locally

On Windows, double-click `START-APP.bat`. Keep the black command window open while using the app and close it when finished.

Alternatively, service workers require HTTP rather than opening `index.html` directly. From this directory run:

```powershell
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Test

```powershell
node --test --test-isolation=none tests/core.test.mjs
```

## Publish

Upload the contents of this directory to a static HTTPS host such as GitHub Pages. The site can then be installed from Chrome, Edge, or Safari's **Add to Home Screen** command.

## Audio

The app includes packaged English and Hebrew MP3 recordings, providing consistent pronunciation and offline speech. See `audio/README.md` for the filenames and regeneration details.
