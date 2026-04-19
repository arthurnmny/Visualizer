const PALETTE_MAP = {
  rainbow: ['#39ff14', '#00d8ff', '#ff49db', '#ffe066'],
  fire: ['#ff5e00', '#ffb703', '#ffd166', '#6a040f'],
  ice: ['#7bdff2', '#b2f7ef', '#eff7f6', '#00bbf9'],
  matrix: ['#39ff14', '#1a7a09', '#7aff7a', '#c8ffc8'],
  mono: ['#ffffff', '#b8b8b8', '#6c6c6c', '#1f1f1f'],
};

export class Visualizer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.mode = 'bars';
    this.colorScheme = 'rainbow';
    this.particles = Array.from({ length: 80 }, () => this.createParticle());
    this.resize();
  }

  setMode(mode) {
    this.mode = mode;
  }

  setColorScheme(scheme) {
    this.colorScheme = scheme;
  }

  resize() {
    const ratio = window.devicePixelRatio || 1;
    const { clientWidth, clientHeight } = this.canvas;
    this.canvas.width = Math.max(1, Math.floor(clientWidth * ratio));
    this.canvas.height = Math.max(1, Math.floor(clientHeight * ratio));
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  render({ frequencyData, timeData, pulse = 0, active = false, now = performance.now() }) {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    const colors = PALETTE_MAP[this.colorScheme] || PALETTE_MAP.rainbow;

    this.ctx.clearRect(0, 0, width, height);

    const background = this.ctx.createRadialGradient(
      width / 2,
      height / 2,
      Math.min(width, height) * 0.05,
      width / 2,
      height / 2,
      Math.max(width, height) * 0.7
    );
    background.addColorStop(0, `${colors[0]}18`);
    background.addColorStop(1, '#000000');
    this.ctx.fillStyle = background;
    this.ctx.fillRect(0, 0, width, height);

    if (!active || !frequencyData || !timeData) {
      this.drawIdle(now, colors);
      return;
    }

    switch (this.mode) {
      case 'wave':
        this.drawWave(timeData, pulse, colors, width, height);
        break;
      case 'radial':
        this.drawRadial(frequencyData, pulse, colors, width, height);
        break;
      case 'particles':
        this.drawParticles(frequencyData, pulse, colors, width, height);
        break;
      case 'milkdrop':
        this.drawMilkdropFallback(frequencyData, timeData, pulse, colors, width, height, now);
        break;
      case 'bars':
      default:
        this.drawBars(frequencyData, pulse, colors, width, height);
        break;
    }
  }

  drawIdle(now, colors) {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    const lines = 36;
    for (let i = 0; i < lines; i += 1) {
      const x = (width / lines) * i;
      const amp = 24 + Math.sin(now * 0.002 + i * 0.4) * 18;
      this.ctx.strokeStyle = `${colors[i % colors.length]}66`;
      this.ctx.beginPath();
      this.ctx.moveTo(x, height / 2 - amp);
      this.ctx.lineTo(x, height / 2 + amp);
      this.ctx.stroke();
    }
  }

  drawBars(frequencyData, pulse, colors, width, height) {
    const barCount = 64;
    const step = Math.max(1, Math.floor(frequencyData.length / barCount));
    const barWidth = width / barCount;
    for (let i = 0; i < barCount; i += 1) {
      const value = frequencyData[i * step] / 255;
      const barHeight = value * height * (0.18 + pulse * 0.04 + 0.72);
      this.ctx.fillStyle = colors[i % colors.length];
      this.ctx.fillRect(i * barWidth, height - barHeight, barWidth - 2, barHeight);
    }
  }

  drawWave(timeData, pulse, colors, width, height) {
    this.ctx.lineWidth = 2 + pulse * 2;
    this.ctx.strokeStyle = colors[0];
    this.ctx.beginPath();
    for (let i = 0; i < timeData.length; i += 1) {
      const x = (i / (timeData.length - 1)) * width;
      const centered = (timeData[i] - 128) / 128;
      const y = height / 2 + centered * height * 0.24;
      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }
    this.ctx.stroke();
  }

  drawRadial(frequencyData, pulse, colors, width, height) {
    const cx = width / 2;
    const cy = height / 2;
    const count = 96;
    const step = Math.max(1, Math.floor(frequencyData.length / count));
    const baseRadius = Math.min(width, height) * 0.18;
    for (let i = 0; i < count; i += 1) {
      const value = frequencyData[i * step] / 255;
      const angle = (Math.PI * 2 * i) / count;
      const inner = baseRadius;
      const outer = baseRadius + value * Math.min(width, height) * (0.2 + pulse * 0.05);
      this.ctx.strokeStyle = colors[i % colors.length];
      this.ctx.beginPath();
      this.ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
      this.ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
      this.ctx.stroke();
    }
  }

  drawParticles(frequencyData, pulse, colors, width, height) {
    const avgEnergy = frequencyData.reduce((sum, value) => sum + value, 0) / frequencyData.length / 255;
    for (const particle of this.particles) {
      particle.y -= particle.speed + avgEnergy * 5;
      particle.x += Math.sin((particle.y + particle.seed) * 0.02) * (1 + pulse * 4);
      if (particle.y < -20) {
        Object.assign(particle, this.createParticle(width, height));
        particle.y = height + 20;
      }

      this.ctx.fillStyle = `${colors[particle.colorIndex % colors.length]}cc`;
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.radius + pulse * 3, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  drawMilkdropFallback(frequencyData, timeData, pulse, colors, width, height, now) {
    this.drawRadial(frequencyData, pulse, colors, width, height);
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'screen';
    this.ctx.translate(width / 2, height / 2);
    this.ctx.strokeStyle = `${colors[2]}88`;
    this.ctx.lineWidth = 1.5 + pulse * 1.5;
    this.ctx.beginPath();
    for (let i = 0; i < timeData.length; i += 8) {
      const angle = (Math.PI * 8 * i) / timeData.length + now * 0.0015;
      const radius = 30 + (timeData[i] / 255) * Math.min(width, height) * 0.22;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }
    this.ctx.closePath();
    this.ctx.stroke();
    this.ctx.restore();
  }

  createParticle(width = this.canvas.clientWidth, height = this.canvas.clientHeight) {
    return {
      x: Math.random() * Math.max(1, width),
      y: Math.random() * Math.max(1, height),
      radius: 1 + Math.random() * 3,
      speed: 0.5 + Math.random() * 1.8,
      seed: Math.random() * 1000,
      colorIndex: Math.floor(Math.random() * 4),
    };
  }
}
