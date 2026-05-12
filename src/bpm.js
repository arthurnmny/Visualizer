function median(values) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

export class BPMController {
  constructor() {
    this.sensitivity = 8;
    this.energyHistory = [];
    this.lastBeatAt = 0;
    this.beatTimes = [];
    this.tapTimes = [];
    this.detectedBpm = null;
    this.manualBpm = 128;
    this.sourceMode = 'auto';
    this.beatPulse = 0;
  }

  setSensitivity(value) {
    this.sensitivity = Number(value);
  }

  setSourceMode(mode) {
    this.sourceMode = mode === 'manual' ? 'manual' : 'auto';
  }

  setManualBpm(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return this.manualBpm;
    }

    this.manualBpm = Math.min(240, Math.max(40, Math.round(parsed)));
    return this.manualBpm;
  }

  getEffectiveBpm() {
    if (this.sourceMode === 'manual') {
      return this.manualBpm;
    }

    return this.detectedBpm;
  }

  tap(now = performance.now()) {
    this.tapTimes.push(now);
    if (this.tapTimes.length > 6) {
      this.tapTimes.shift();
    }

    if (this.tapTimes.length < 2) {
      return this.manualBpm;
    }

    const intervals = [];
    for (let i = 1; i < this.tapTimes.length; i += 1) {
      intervals.push(this.tapTimes[i] - this.tapTimes[i - 1]);
    }

    const interval = median(intervals);
    this.manualBpm = Math.min(240, Math.max(40, Math.round(60000 / interval)));
    return this.manualBpm;
  }

  processFrame(frequencyData, now = performance.now()) {
    if (!frequencyData || frequencyData.length === 0) {
      this.beatPulse *= 0.92;
      return this.snapshot(false);
    }

    const bassBins = Math.max(8, Math.floor(frequencyData.length * 0.05));
    let bassEnergy = 0;
    for (let i = 0; i < bassBins; i += 1) {
      bassEnergy += frequencyData[i];
    }
    bassEnergy /= bassBins;

    this.energyHistory.push(bassEnergy);
    if (this.energyHistory.length > 43) {
      this.energyHistory.shift();
    }

    const averageEnergy = this.energyHistory.reduce((sum, value) => sum + value, 0) / this.energyHistory.length;
    const threshold = 1.95 - this.sensitivity * 0.035;
    const cooldownMs = 260;
    const beat = (
      this.energyHistory.length > 12 &&
      bassEnergy > averageEnergy * threshold &&
      now - this.lastBeatAt > cooldownMs
    );

    if (beat) {
      this.lastBeatAt = now;
      this.beatPulse = 1;
      this.beatTimes.push(now);
      if (this.beatTimes.length > 10) {
        this.beatTimes.shift();
      }

      if (this.beatTimes.length >= 4) {
        const intervals = [];
        for (let i = 1; i < this.beatTimes.length; i += 1) {
          intervals.push(this.beatTimes[i] - this.beatTimes[i - 1]);
        }

        const interval = median(intervals);
        const nextDetected = Math.round(60000 / interval);
        if (nextDetected >= 50 && nextDetected <= 220) {
          this.detectedBpm = nextDetected;
        }
      }
    } else {
      this.beatPulse *= 0.92;
    }

    return this.snapshot(beat);
  }

  snapshot(beat) {
    return {
      beat,
      pulse: this.beatPulse,
      detectedBpm: this.detectedBpm,
      manualBpm: this.manualBpm,
      effectiveBpm: this.getEffectiveBpm(),
      sourceMode: this.sourceMode,
    };
  }
}
