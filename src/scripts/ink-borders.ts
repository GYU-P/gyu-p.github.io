import InkStroke from './reference-ink.js';

type DrawTarget = { canvas: HTMLCanvasElement; options: Record<string, unknown> };
let nextInkIndex = 1;

function roundedRectangle(t: number, width: number, height: number, radius: number): [number, number] {
  const inset = 1;
  const r = Math.max(0, Math.min(radius, (width - 2 * inset) / 2, (height - 2 * inset) / 2));
  const horizontal = Math.max(0, width - 2 * inset - 2 * r);
  const vertical = Math.max(0, height - 2 * inset - 2 * r);
  const quarterArc = Math.PI * r / 2;
  const lengths = [horizontal, quarterArc, vertical, quarterArc, horizontal, quarterArc, vertical, quarterArc];
  const perimeter = lengths.reduce((sum, length) => sum + length, 0);
  let distance = ((t % 1 + 1) % 1) * perimeter;
  let section = 0;
  while (section < 7 && distance > lengths[section]) distance -= lengths[section++];
  const fraction = lengths[section] ? Math.min(1, distance / lengths[section]) : 0;
  const right = width - inset;
  const bottom = height - inset;
  switch (section) {
    case 0: return [inset + r + horizontal * fraction, inset];
    case 1: return [right - r + r * Math.cos(-Math.PI / 2 + quarterArc / r * fraction), inset + r + r * Math.sin(-Math.PI / 2 + quarterArc / r * fraction)];
    case 2: return [right, inset + r + vertical * fraction];
    case 3: return [right - r + r * Math.cos(Math.PI / 2 * fraction), bottom - r + r * Math.sin(Math.PI / 2 * fraction)];
    case 4: return [right - r - horizontal * fraction, bottom];
    case 5: return [inset + r + r * Math.cos(Math.PI / 2 + Math.PI / 2 * fraction), bottom - r + r * Math.sin(Math.PI / 2 + Math.PI / 2 * fraction)];
    case 6: return [inset, bottom - r - vertical * fraction];
    default: return [inset + r + r * Math.cos(Math.PI + Math.PI / 2 * fraction), inset + r + r * Math.sin(Math.PI + Math.PI / 2 * fraction)];
  }
}

/** 境界線を元デザインの濃淡・かすれで描画。サイズ変更時のみ再描画する。 */
class InkBorder extends HTMLElement {
  // Keep each element's pattern stable across redraws and reconnections.
  private readonly seedOffset = nextInkIndex++ * 1009;
  private observer?: ResizeObserver;
  private targets: DrawTarget[] = [];

  connectedCallback() {
    this.replaceChildren();
    this.targets = [];
    const shape = this.dataset.shape ?? 'rectangle';
    const isPaperEdge = this.parentElement?.classList.contains('paper-panel') ?? false;
    const thickness = isPaperEdge ? .42 : .7;
    const style = getComputedStyle(this);
    const color = style.getPropertyValue('--ink-color').trim() || style.getPropertyValue(isPaperEdge ? '--color-ink-edge' : '--color-ink-border').trim() || '#4b459c';
    const weight = Number.parseFloat(getComputedStyle(this).getPropertyValue('--ink-weight'));
    const texture = Number.parseFloat(getComputedStyle(this).getPropertyValue('--ink-texture'));
    const density = Number.parseFloat(getComputedStyle(this).getPropertyValue('--ink-density'));
    const configuredSeed = Number.parseFloat(this.dataset.seed ?? style.getPropertyValue('--ink-seed'));
    const baseSeed = Number.parseFloat(style.getPropertyValue('--ink-seed-base'));
    const seed = Number.isFinite(configuredSeed)
      ? Math.trunc(configuredSeed)
      : (Number.isFinite(baseSeed) ? Math.trunc(baseSeed) : 200) + this.seedOffset;
    const regularTexture = Number.parseFloat(style.getPropertyValue('--ink-texture-regular')) || 1;
    const standardDensity = Number.parseFloat(style.getPropertyValue('--ink-density-standard')) || 1.2;
    const add = (name: string, options: Record<string, unknown>) => {
      const edge = document.createElement('span');
      edge.className = `ink-edge ink-edge--${name}`;
      const canvas = document.createElement('canvas');
      edge.append(canvas);
      this.append(edge);
      this.targets.push({ canvas, options: { width: Number.isFinite(weight) ? weight : thickness, texture: Number.isFinite(texture) ? texture : regularTexture, density: Number.isFinite(density) ? density : standardDensity, color, seed: seed + this.targets.length * 17, padding: 1.5, ...options } });
    };
    if (shape === 'circle') add('circle', { shape: 'circle', width: Number.isFinite(weight) ? weight : .7, padding: 4 });
    else if (shape === 'line') add('line', { angle: 0, snapToPixels: true, width: Number.isFinite(weight) ? weight : .68 });
    else if (shape === 'vertical-line') add('line', { angle: 90, snapToPixels: true, width: Number.isFinite(weight) ? weight : .68 });
    else if (shape === 'vertical') {
      add('left', { angle: 90 });
      add('right', { angle: 90 });
    }
    else {
      const radius = parseFloat(getComputedStyle(this.parentElement!).borderTopLeftRadius) || 0;
      add('rectangle', { shape: 'custom', closed: true, path: (t: number, w: number, h: number) => roundedRectangle(t, w, h, radius) });
    }
    this.observer = new ResizeObserver(() => this.draw());
    this.observer.observe(this);
    for (const { canvas } of this.targets) this.observer.observe(canvas.parentElement!);
    this.draw();
  }

  disconnectedCallback() { this.observer?.disconnect(); }

  private draw() {
    if (getComputedStyle(this).display === 'none') return;
    if (this.targets.every(({ canvas }) => canvas.getBoundingClientRect().width < 3)) return;
    if (this.dataset.shape === 'line' || this.dataset.shape === 'vertical-line') {
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 3);
      const bounds = this.getBoundingClientRect();
      const vertical = this.dataset.shape === 'vertical-line';
      // Align the bitmap's edge, then snap the stroke inside the bitmap.
      // Moving an already rasterized stroke by half a device pixel would blur it again.
      const origin = vertical ? bounds.left : bounds.top;
      const offset = Math.round(origin * pixelRatio) / pixelRatio - origin;
      this.targets[0].canvas.parentElement!.style.transform = vertical ? `translateX(${offset}px)` : `translateY(${offset}px)`;
    }
    for (const { canvas, options } of this.targets) InkStroke.draw(canvas, options);
    this.parentElement?.classList.add('ink-border-ready');
  }
}

if (!customElements.get('ink-border')) customElements.define('ink-border', InkBorder);
