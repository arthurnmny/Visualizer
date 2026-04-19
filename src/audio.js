export class AudioEngine {
  constructor() {
    this.audioContext = null;
    this.stream = null;
    this.source = null;
    this.analyser = null;
    this.freqData = null;
    this.timeData = null;
  }

  async startMicrophone() {
    if (this.audioContext && this.analyser) {
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      return this;
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });

    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    this.audioContext = new AudioContextCtor();
    this.stream = stream;
    this.source = this.audioContext.createMediaStreamSource(stream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.82;
    this.source.connect(this.analyser);

    this.freqData = new Uint8Array(this.analyser.frequencyBinCount);
    this.timeData = new Uint8Array(this.analyser.fftSize);

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    return this;
  }

  stop() {
    if (this.stream) {
      for (const track of this.stream.getTracks()) {
        track.stop();
      }
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }

    this.audioContext = null;
    this.stream = null;
    this.source = null;
    this.analyser = null;
    this.freqData = null;
    this.timeData = null;
  }

  isReady() {
    return Boolean(this.analyser && this.freqData && this.timeData);
  }

  sample() {
    if (!this.isReady()) {
      return null;
    }

    this.analyser.getByteFrequencyData(this.freqData);
    this.analyser.getByteTimeDomainData(this.timeData);

    return {
      frequencyData: this.freqData,
      timeData: this.timeData,
      audioTime: this.audioContext.currentTime,
      analyser: this.analyser,
    };
  }
}
