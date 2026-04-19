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
    this.bpm = null;
    this.beatPulse = 0;
  }

  setSensitivity(value) {
    this.sensitivity = Number(value);
  }

  tap(now = performance.now()) {
    this.tapTimes.push(now);
    if (this.tapTimes.length > 6) {
      this.tapTimes.shift();
    }

    if (this.tapTimes.length < 2) {
      return this.bpm;
    }

    const intervals = [];
    for (let i = 1; i < this.tapTimes.length; i += 1) {
      intervals.push(this.tapTimes[i] - this.tapTimes[i - 1]);
    }

    const interval = median(intervals);
    this.bpm = Math.round(60000 / interval);
    return this.bpm;
  }

  processFrame(frequencyData, now = performance.now()) {
    if (!frequencyData || frequencyData.length === 0) {
      this.beatPulse *= 0.92;
      return { beat: false, bpm: this.bpm, pulse: this.beatPulse };
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
        const detectedBpm = Math.round(60000 / interval);
        if (detectedBpm >= 50 && detectedBpm <= 220) {
          this.bpm = detectedBpm;
        }
      }
    } else {
      this.beatPulse *= 0.92;
    }

    return { beat, bpm: this.bpm, pulse: this.beatPulse };
  }
}
