import { AudioEngine } from './audio.js';
import { BPMController } from './bpm.js';
import { GifController } from './gifs.js';
import { SyncedGifMode } from './syncedGifMode.js';
import { Visualizer } from './visualizer.js';

const audio = new AudioEngine();
const bpm = new BPMController();

const elements = {
  canvas: document.querySelector('#canvas'),
  bpmNumber: document.querySelector('#bpm-number'),
  beatFlash: document.querySelector('#beat-flash'),
  startScreen: document.querySelector('#start-screen'),
  startMic: document.querySelector('#btn-start-mic'),
  micButton: document.querySelector('#btn-mic'),
  stopButton: document.querySelector('#btn-stop'),
  tapButton: document.querySelector('#btn-tap'),
  vizSelect: document.querySelector('#viz-select'),
  colorSelect: document.querySelector('#color-select'),
  sensitivity: document.querySelector('#sensitivity'),
  sensitivityValue: document.querySelector('#sens-val'),
  bpmSource: document.querySelector('#bpm-source'),
  manualBpm: document.querySelector('#manual-bpm'),
  gifCycleStatus: document.querySelector('#gif-cycle-status'),
  gifUrl: document.querySelector('#gif-url'),
  loadGif: document.querySelector('#btn-load-gif'),
  uploadGif: document.querySelector('#btn-upload-gif'),
  clearGif: document.querySelector('#btn-clear-gif'),
  gifFile: document.querySelector('#gif-file'),
  gifFx: document.querySelector('#gif-fx'),
  gifPos: document.querySelector('#gif-pos'),
  gifSize: document.querySelector('#gif-size'),
  gifEl: document.querySelector('#gif-el'),
};

const visualizer = new Visualizer(elements.canvas);
const gifs = new GifController(elements.gifEl);
const syncedGifMode = new SyncedGifMode({
  onStatus(message) {
    elements.gifCycleStatus.textContent = message;
  },
});

visualizer.setSyncedGifMode(syncedGifMode);

let flashTimeout = null;

function setRunningState(isRunning) {
  elements.micButton.classList.toggle('active', isRunning);
  elements.stopButton.disabled = !isRunning;
  if (isRunning) {
    elements.startScreen.classList.add('hidden');
  } else {
    elements.startScreen.classList.remove('hidden');
  }
}

async function startMicrophone() {
  try {
    await audio.startMicrophone();
    setRunningState(true);
  } catch (error) {
    console.error(error);
    window.alert('Microphone access failed. Check browser permissions and try again.');
    setRunningState(false);
  }
}

function stopMicrophone() {
  audio.stop();
  setRunningState(false);
}

function showBeatFlash() {
  elements.beatFlash.classList.add('active');
  window.clearTimeout(flashTimeout);
  flashTimeout = window.setTimeout(() => {
    elements.beatFlash.classList.remove('active');
  }, 80);
}

function updateBpmLabel(value) {
  elements.bpmNumber.textContent = value ? String(value) : '--';
}

function syncManualInputState() {
  const isManual = elements.bpmSource.value === 'manual';
  elements.manualBpm.disabled = !isManual;
}

function bindUi() {
  elements.startMic.addEventListener('click', startMicrophone);
  elements.micButton.addEventListener('click', startMicrophone);
  elements.stopButton.addEventListener('click', stopMicrophone);

  elements.tapButton.addEventListener('click', () => {
    const tapped = bpm.tap();
    elements.manualBpm.value = String(tapped);
    if (elements.bpmSource.value === 'manual') {
      updateBpmLabel(tapped);
    }
    showBeatFlash();
  });

  elements.vizSelect.addEventListener('change', async (event) => {
    visualizer.setMode(event.target.value);
    if (event.target.value === 'gif-cycle') {
      await syncedGifMode.init();
    }
  });

  elements.colorSelect.addEventListener('change', (event) => {
    visualizer.setColorScheme(event.target.value);
  });

  elements.sensitivity.addEventListener('input', (event) => {
    bpm.setSensitivity(event.target.value);
    elements.sensitivityValue.textContent = event.target.value;
  });

  elements.bpmSource.addEventListener('change', (event) => {
    bpm.setSourceMode(event.target.value);
    syncManualInputState();
    updateBpmLabel(bpm.getEffectiveBpm());
  });

  elements.manualBpm.addEventListener('input', (event) => {
    const manual = bpm.setManualBpm(event.target.value);
    elements.manualBpm.value = String(manual);
    if (elements.bpmSource.value === 'manual') {
      updateBpmLabel(manual);
    }
  });

  elements.loadGif.addEventListener('click', () => {
    const url = elements.gifUrl.value.trim();
    if (url) {
      gifs.loadFromUrl(url);
    }
  });

  elements.uploadGif.addEventListener('click', () => {
    elements.gifFile.click();
  });

  elements.clearGif.addEventListener('click', () => {
    gifs.clear();
    elements.gifUrl.value = '';
  });

  elements.gifFile.addEventListener('change', (event) => {
    const [file] = event.target.files;
    if (file) {
      gifs.loadFromFile(file);
    }
  });

  elements.gifFx.addEventListener('change', (event) => {
    gifs.setEffect(event.target.value);
  });

  elements.gifPos.addEventListener('change', (event) => {
    gifs.setPosition(event.target.value);
  });

  elements.gifSize.addEventListener('input', (event) => {
    gifs.setSize(event.target.value);
  });

  window.addEventListener('resize', () => {
    visualizer.resize();
  });

  bpm.setSensitivity(elements.sensitivity.value);
  bpm.setSourceMode(elements.bpmSource.value);
  bpm.setManualBpm(elements.manualBpm.value);
  visualizer.setMode(elements.vizSelect.value);
  visualizer.setColorScheme(elements.colorSelect.value);
  gifs.setEffect(elements.gifFx.value);
  gifs.setPosition(elements.gifPos.value);
  gifs.setSize(elements.gifSize.value);
  syncManualInputState();
  updateBpmLabel(bpm.getEffectiveBpm());
}

function frame(now) {
  const sample = audio.sample();
  let beatState = bpm.snapshot(false);

  if (sample) {
    beatState = bpm.processFrame(sample.frequencyData, now);
    if (beatState.beat) {
      gifs.triggerBeat();
      syncedGifMode.onBeat(beatState.effectiveBpm);
      showBeatFlash();
    }
  }

  updateBpmLabel(beatState.effectiveBpm);

  visualizer.render({
    frequencyData: sample?.frequencyData,
    timeData: sample?.timeData,
    pulse: beatState.pulse,
    active: Boolean(sample) || visualizer.mode === 'gif-cycle',
    now,
    effectiveBpm: beatState.effectiveBpm,
  });

  window.requestAnimationFrame(frame);
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  try {
    await navigator.serviceWorker.register('/service-worker.js');
  } catch (error) {
    console.warn('Service worker registration failed', error);
  }
}

bindUi();
visualizer.resize();
void syncedGifMode.init();
registerServiceWorker();
window.requestAnimationFrame(frame);
