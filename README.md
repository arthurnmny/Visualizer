# Tofutopia Visualizer

A beat-matched music visualizer PWA with GIF overlays and Milkdrop preset support. Hosted at [tofutopia.net](https://tofutopia.net).

---

## What It Does

The visualizer listens to audio through your microphone, detects beats in real time, and drives a fullscreen visual display that reacts to the music. You can overlay GIFs that animate on every beat, switch between visualizer modes, and use classic Milkdrop presets from the Winamp era.

It runs entirely in the browser — no install required. It can also be installed as a PWA (Progressive Web App) from the browser so it behaves like a native desktop or mobile app.

---

## Features

### Audio Input
- **Microphone input** via Web Audio API
- **Beat detection** using bass frequency energy variance — adapts to the volume and dynamics of whatever is playing
- **Tap BPM** — manually tap along to lock in the tempo if auto-detection is off
- **BPM clock** — once tempo is established, beat events are scheduled ahead of time using `audioCtx.currentTime` for tighter sync rather than just reacting to detected beats

### Visualizer Modes
- **Bars** — classic frequency bar chart, reacts to full spectrum
- **Wave** — dual mirrored waveform oscilloscope
- **Radial** — circular frequency display, radiates from center
- **Particles** — particle system driven by energy and beat events
- **Milkdrop** — Butterchurn WebGL renderer using original Winamp Milkdrop 2 preset equations

### Color Schemes
- Rainbow, Fire, Ice, Matrix, Mono

### GIF Overlay
- Load a GIF by pasting a direct URL
- Upload a GIF directly from your computer (no CORS issues)
- GIF animates on every detected beat
- Beat effects: Pulse, Shake, Spin, Bounce
- Position: Center, Top Left, Top Right, Bottom Left, Bottom Right
- Adjustable size

### PWA
- Installable from the browser on desktop and mobile
- Works offline after first visit (service worker caches assets)
- Standalone window mode — no browser chrome
- Landscape orientation optimized

---

## File Structure

```
Visualizer/
├── index.html              — app shell, loads everything
├── manifest.json           — PWA manifest (name, icons, display mode)
├── service-worker.js       — caches assets for offline use
├── favicon.ico
│
├── assets/
│   ├── icons/
│   │   ├── icon-192.png    — PWA icon (192x192)
│   │   ├── icon-512.png    — PWA icon (512x512)
│   │   └── icon-maskable.png — PWA maskable icon (512x512)
│   └── gifs/               — optional bundled GIFs
│
├── src/
│   ├── main.js             — entry point, wires all modules together
│   ├── audio.js            — Web Audio API, mic input, analyser setup
│   ├── bpm.js              — beat detection, tap tempo, BPM clock
│   ├── visualizer.js       — canvas rendering, all viz modes, Butterchurn
│   ├── gifs.js             — GIF overlay, beat effects, positioning
│   └── presets.js          — Milkdrop preset loading and management (future)
│
├── styles/
│   └── main.css            — all styles
│
└── presets/                — Milkdrop .json preset files
```

---

## How Each File Works

### `index.html`
The app shell. Contains the canvas, GIF overlay layer, controls footer, and the start screen. Loads `src/main.js` as an ES module. Everything else is driven by JavaScript.

### `manifest.json`
Tells the browser this is a PWA. Defines the app name, icons, theme color, display mode (standalone), and start URL. Required for the install prompt to appear.

### `service-worker.js`
Intercepts network requests and caches the app's core files on first load. On subsequent visits the app loads from cache, making it work offline and load instantly.

### `src/audio.js`
- Creates the `AudioContext`
- Requests mic permission via `getUserMedia`
- Creates an `AnalyserNode` and connects the mic source to it
- Exposes frequency data (`getByteFrequencyData`) and time domain data (`getByteTimeDomainData`) to the rest of the app each frame

### `src/bpm.js`
- Reads bass frequency energy from the analyser each frame
- Compares current energy against a rolling average to detect beats (energy variance method)
- Tracks beat timestamps and calculates BPM from the median interval
- Runs a predictive BPM clock using `audioCtx.currentTime` so beat events fire ahead of time rather than reactively
- Handles tap tempo as a manual override

### `src/visualizer.js`
- Owns the canvas and the `requestAnimationFrame` render loop
- Reads frequency and waveform data each frame from `audio.js`
- Renders the selected viz mode (bars, wave, radial, particles, milkdrop)
- On beat events from `bpm.js`, applies a beat pulse that scales visual intensity
- Butterchurn integration: creates a Butterchurn renderer, loads Milkdrop presets, feeds it the analyser node, renders to canvas

### `src/gifs.js`
- Manages the GIF `<img>` element overlaid on top of the canvas
- Handles loading from URL or local file upload
- On beat events, applies the selected effect (pulse, shake, spin, bounce) by animating CSS transform
- Handles positioning and sizing

### `src/main.js`
- Entry point
- Imports and initializes all modules
- Wires events between modules (e.g. beat detected in bpm.js → trigger effect in gifs.js and visualizer.js)
- Handles UI events from the controls footer (button clicks, select changes, slider input)

---

## Tech Stack

| Thing | What it is |
|---|---|
| Web Audio API | Browser-native audio processing and analysis |
| Canvas API | 2D rendering for bars, wave, radial, particles |
| WebGL / Butterchurn | Milkdrop preset rendering |
| ES Modules | Native browser module system, no bundler needed |
| PWA (manifest + service worker) | Installable, offline-capable app |
| Vercel | Hosting and auto-deployment from GitHub |
| GitHub | Version control and source of truth |

---

## Deployment

The project auto-deploys via Vercel on every push to the `main` branch on GitHub.

```
edit code in VSCode
→ test locally with Live Server
→ git add .
→ git commit -m "description of change"
→ git push
→ Vercel deploys automatically in ~30 seconds
→ live at tofutopia.net
```

---

## Local Development

1. Open the project folder in VSCode
2. Install the **Live Server** extension if you haven't
3. Right-click `index.html` → **Open with Live Server**
4. Browser opens at `http://127.0.0.1:5500`
5. Changes save → browser auto-refreshes

> Note: service worker and PWA install prompt only work on HTTPS (tofutopia.net), not on localhost. Everything else works locally.

### Baby Announcement Page

The baby announcement page is set up for Vercel hosting:

- Guest page: `/baby.html`
- Hidden feedback review page: `/baby-admin.html`
- Feedback API route: `/api/baby-feedback`

The API route stores messages in Vercel KV. In Vercel, add a KV/Redis
database to the project so these environment variables are available:

- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`

After that, pushing to GitHub will redeploy the page and feedback API.

---

## Roadmap

- [ ] Milkdrop preset browser — grid of presets, click to load, auto-crossfade
- [ ] VJ mode — map presets to keyboard keys, switch on the fly
- [ ] BPM-driven preset switching — auto-switch every N bars
- [ ] Play audio files directly in the app (MP3 upload)
- [ ] Fullscreen mode
- [ ] Mobile touch optimizations
- [ ] Custom preset editor
- [ ] Multiple simultaneous GIF layers
