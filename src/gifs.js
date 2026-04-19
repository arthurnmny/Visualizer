export class GifController {
  constructor(imageElement) {
    this.imageElement = imageElement;
    this.effect = 'pulse';
    this.position = 'center';
    this.size = 120;
    this.objectUrl = null;
    this.applyLayout();
  }

  setEffect(effect) {
    this.effect = effect;
  }

  setPosition(position) {
    this.position = position;
    this.applyLayout();
  }

  setSize(size) {
    this.size = Number(size);
    this.applyLayout();
  }

  loadFromUrl(url) {
    this.clearObjectUrl();
    this.imageElement.src = url;
    this.imageElement.style.display = 'block';
    this.applyLayout();
  }

  loadFromFile(file) {
    this.clearObjectUrl();
    this.objectUrl = URL.createObjectURL(file);
    this.imageElement.src = this.objectUrl;
    this.imageElement.style.display = 'block';
    this.applyLayout();
  }

  clear() {
    this.clearObjectUrl();
    this.imageElement.removeAttribute('src');
    this.imageElement.style.display = 'none';
  }

  triggerBeat() {
    if (!this.imageElement.src) {
      return;
    }

    const keyframes = this.getKeyframes();
    if (typeof this.imageElement.animate === 'function') {
      this.imageElement.animate(keyframes, {
        duration: 320,
        easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      });
    }
  }

  applyLayout() {
    const positions = {
      center: { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' },
      tl: { left: '5%', top: '8%', transform: 'translate(0, 0)' },
      tr: { left: 'auto', right: '5%', top: '8%', transform: 'translate(0, 0)' },
      bl: { left: '5%', top: 'auto', bottom: '8%', transform: 'translate(0, 0)' },
      br: { left: 'auto', right: '5%', top: 'auto', bottom: '8%', transform: 'translate(0, 0)' },
    };
    const layout = positions[this.position] || positions.center;

    this.imageElement.style.width = `${this.size}px`;
    this.imageElement.style.left = layout.left ?? 'auto';
    this.imageElement.style.right = layout.right ?? 'auto';
    this.imageElement.style.top = layout.top ?? 'auto';
    this.imageElement.style.bottom = layout.bottom ?? 'auto';
    this.imageElement.style.transform = layout.transform;
  }

  clearObjectUrl() {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
  }

  getKeyframes() {
    const base = this.imageElement.style.transform || 'translate(-50%, -50%)';
    switch (this.effect) {
      case 'shake':
        return [
          { transform: `${base} translateX(0)` },
          { transform: `${base} translateX(-12px)` },
          { transform: `${base} translateX(12px)` },
          { transform: `${base} translateX(0)` },
        ];
      case 'spin':
        return [
          { transform: `${base} rotate(0deg) scale(1)` },
          { transform: `${base} rotate(180deg) scale(1.08)` },
          { transform: `${base} rotate(360deg) scale(1)` },
        ];
      case 'bounce':
        return [
          { transform: `${base} translateY(0)` },
          { transform: `${base} translateY(-20px) scale(1.05)` },
          { transform: `${base} translateY(0)` },
        ];
      case 'pulse':
      default:
        return [
          { transform: `${base} scale(1)` },
          { transform: `${base} scale(1.12)` },
          { transform: `${base} scale(1)` },
        ];
    }
  }
}
