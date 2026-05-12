import { loadGifLibrary } from './assets.js';

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function drawCenteredFrame(ctx, bitmap, width, height, pulse) {
  const scale = Math.min(width / bitmap.width, height / bitmap.height);
  const beatScale = 1 + pulse * 0.06;
  const drawWidth = bitmap.width * scale * beatScale;
  const drawHeight = bitmap.height * scale * beatScale;
  const x = (width - drawWidth) / 2;
  const y = (height - drawHeight) / 2;

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.shadowBlur = 18 + pulse * 18;
  ctx.shadowColor = 'rgba(57, 255, 20, 0.25)';
  ctx.drawImage(bitmap, x, y, drawWidth, drawHeight);
  ctx.restore();
}

export class SyncedGifMode {
  constructor({ manifestUrl = '/assets/gifs/library.json', onStatus = () => {} } = {}) {
    this.manifestUrl = manifestUrl;
    this.onStatus = onStatus;
    this.assets = [];
    this.cache = new Map();
    this.currentAsset = null;
    this.currentDecoded = null;
    this.currentIndex = -1;
    this.playbackMs = 0;
    this.lastRenderAt = 0;
    this.beatCount = 0;
    this.loadingKey = null;
    this.initialized = false;
    this.unsupported = typeof window.ImageDecoder === 'undefined';
  }

  async init() {
    if (this.initialized) {
      return;
    }

    if (this.unsupported) {
      this.onStatus('gif-cycle: ImageDecoder is not available in this browser');
      this.initialized = true;
      return;
    }

    try {
      this.assets = await loadGifLibrary(this.manifestUrl);
      if (this.assets.length === 0) {
        this.onStatus('gif-cycle: add files to assets/gifs and list them in library.json');
      } else {
        this.onStatus(`gif-cycle: ${this.assets.length} file(s) ready`);
      }
    } catch (error) {
      console.warn(error);
      this.onStatus('gif-cycle: could not load assets/gifs/library.json');
    }

    this.initialized = true;
  }

  async reload() {
    this.initialized = false;
    this.assets = [];
    this.currentAsset = null;
    this.currentDecoded = null;
    this.currentIndex = -1;
    this.playbackMs = 0;
    this.lastRenderAt = 0;
    await this.init();
  }

  onBeat(effectiveBpm) {
    this.beatCount += 1;
    if (this.beatCount % 8 !== 0) {
      return;
    }

    void this.pickAsset(effectiveBpm, true);
  }

  async pickAsset(targetBpm, shouldCycle = false) {
    if (!this.initialized) {
      await this.init();
    }

    if (this.assets.length === 0) {
      return;
    }

    const goal = targetBpm || this.currentAsset?.sourceBpm || this.assets[0].sourceBpm;
    const ordered = [...this.assets].sort((a, b) => {
      const diffA = Math.abs(a.sourceBpm - goal);
      const diffB = Math.abs(b.sourceBpm - goal);
      return diffA - diffB || a.name.localeCompare(b.name);
    });

    const closestDiff = Math.abs(ordered[0].sourceBpm - goal);
    const candidates = ordered.filter((asset) => Math.abs(asset.sourceBpm - goal) <= closestDiff + 4);
    const currentCandidateIndex = candidates.findIndex((asset) => asset.url === this.currentAsset?.url);
    const nextIndex = shouldCycle && candidates.length > 1
      ? (Math.max(currentCandidateIndex, 0) + 1) % candidates.length
      : 0;
    const nextAsset = candidates[nextIndex];

    if (!nextAsset) {
      return;
    }

    if (this.currentAsset?.url === nextAsset.url && this.currentDecoded) {
      return;
    }

    await this.activateAsset(nextAsset);
  }

  async activateAsset(asset) {
    if (this.loadingKey === asset.url) {
      return;
    }

    this.loadingKey = asset.url;
    this.onStatus(`gif-cycle: decoding ${asset.name}`);

    try {
      const decoded = await this.decodeAsset(asset);
      this.currentAsset = asset;
      this.currentDecoded = decoded;
      this.currentIndex = this.assets.findIndex((entry) => entry.url === asset.url);
      this.playbackMs = 0;
      this.lastRenderAt = 0;
      const animationLabel = decoded.frameCount > 1 ? `${decoded.frameCount} frames` : '1 frame only';
      this.onStatus(`gif-cycle: ${asset.name} @ ${asset.sourceBpm} BPM • ${animationLabel}`);
    } catch (error) {
      console.warn(error);
      this.onStatus(`gif-cycle: failed to decode ${asset.name}`);
    } finally {
      this.loadingKey = null;
    }
  }

  async decodeAsset(asset) {
    if (this.cache.has(asset.url)) {
      return this.cache.get(asset.url);
    }

    const response = await fetch(asset.url, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Unable to load ${asset.url}`);
    }

    const data = await response.arrayBuffer();
    const decoder = new ImageDecoder({ data: new Uint8Array(data), type: 'image/gif' });
    await decoder.completed;

    const track = decoder.tracks.selectedTrack;
    const frames = [];
    let totalDurationMs = 0;

    for (let frameIndex = 0; ; frameIndex += 1) {
      try {
        const result = await decoder.decode({ frameIndex });
        const bitmap = await createImageBitmap(result.image);
        const durationMs = Math.max(20, Math.round((result.image.duration || 100000) / 1000));
        totalDurationMs += durationMs;
        frames.push({
          bitmap,
          durationMs,
          endMs: totalDurationMs,
        });
        result.image.close();
      } catch (error) {
        if (frames.length > 0 && (error instanceof RangeError || error instanceof DOMException)) {
          break;
        }

        throw error;
      }
    }

    decoder.close();

    const decoded = {
      frameCount: frames.length,
      animated: Boolean(track?.animated),
      width: frames[0]?.bitmap.width || 1,
      height: frames[0]?.bitmap.height || 1,
      frames,
      totalDurationMs,
    };

    this.cache.set(asset.url, decoded);
    return decoded;
  }

  render(ctx, width, height, { now, pulse, effectiveBpm }) {
    if (!this.initialized) {
      void this.init();
    }

    if (this.unsupported) {
      this.drawMessage(ctx, width, height, 'ImageDecoder unavailable');
      return;
    }

    if (!this.currentDecoded) {
      void this.pickAsset(effectiveBpm, false);
      this.drawMessage(ctx, width, height, this.assets.length ? 'Loading GIFs...' : 'Add GIFs to assets/gifs/library.json');
      return;
    }

    const playbackRate = clamp((effectiveBpm || this.currentAsset.sourceBpm) / this.currentAsset.sourceBpm, 0.25, 4);
    const delta = this.lastRenderAt ? now - this.lastRenderAt : 0;
    this.lastRenderAt = now;

    if (this.currentDecoded.totalDurationMs > 0) {
      this.playbackMs = (this.playbackMs + delta * playbackRate) % this.currentDecoded.totalDurationMs;
    }

    const frame = this.currentDecoded.frames.find((entry) => this.playbackMs <= entry.endMs) || this.currentDecoded.frames[0];
    drawCenteredFrame(ctx, frame.bitmap, width, height, pulse);

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(16, height - 54, 220, 38);
    ctx.fillStyle = '#39ff14';
    ctx.font = '12px "Space Mono", monospace';
    ctx.fillText(this.currentAsset.name, 28, height - 30);
    ctx.fillStyle = '#9fe88f';
    ctx.fillText(`asset ${this.currentAsset.sourceBpm} BPM  ->  output ${Math.round(effectiveBpm || this.currentAsset.sourceBpm)} BPM`, 28, height - 14);
    ctx.restore();
  }

  drawMessage(ctx, width, height, message) {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(width * 0.2, height * 0.4, width * 0.6, 84);
    ctx.strokeStyle = '#39ff14';
    ctx.strokeRect(width * 0.2, height * 0.4, width * 0.6, 84);
    ctx.fillStyle = '#39ff14';
    ctx.font = '14px "Space Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(message, width / 2, height * 0.4 + 48);
    ctx.restore();
  }
}
