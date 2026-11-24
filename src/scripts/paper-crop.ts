/** 固定ツールバーに、背後の紙と同じ位置の模様を重ねる。 */
export class PaperCrop {
  private controller = new AbortController();
  private observer?: ResizeObserver;
  private image = new Image();
  private frameId = 0;

  constructor(private frame: HTMLElement, private toolbar: HTMLElement) {}

  start() {
    const { signal } = this.controller;
    this.image.addEventListener('load', this.schedule, { signal });
    this.image.src = '/images/paper-soft-brighter.png';
    window.addEventListener('scroll', this.schedule, { passive: true, signal });
    window.addEventListener('resize', this.schedule, { passive: true, signal });
    this.frame.querySelector('.site-main')?.addEventListener('scroll', this.schedule, { passive: true, signal });
    this.observer = new ResizeObserver(this.schedule);
    this.observer.observe(this.frame);
    this.observer.observe(this.toolbar);
    this.schedule();
  }

  stop() {
    this.controller.abort();
    this.observer?.disconnect();
    cancelAnimationFrame(this.frameId);
  }

  private schedule = () => {
    if (this.frameId) return;
    this.frameId = requestAnimationFrame(() => {
      this.frameId = 0;
      this.update();
    });
  };

  private update() {
    const { naturalWidth, naturalHeight } = this.image;
    if (!naturalWidth || !naturalHeight) return;
    const frame = this.frame.getBoundingClientRect();
    const toolbar = this.toolbar.getBoundingClientRect();
    const mobile = window.matchMedia('(max-width: 840px)').matches;
    const tileWidth = Number.parseFloat(getComputedStyle(this.frame).getPropertyValue('--paper-mobile-width'));
    const scale = mobile ? (Number.isFinite(tileWidth) ? tileWidth : frame.width) / naturalWidth : Math.max(frame.width / naturalWidth, frame.height / naturalHeight);
    const imageWidth = naturalWidth * scale;
    const imageHeight = naturalHeight * scale;
    const x = frame.left + (frame.width - imageWidth) / 2 - toolbar.left;
    const y = frame.top + (mobile ? 0 : (frame.height - imageHeight) / 2) - toolbar.top;
    this.toolbar.style.setProperty('--paper-crop-width', `${imageWidth}px`);
    this.toolbar.style.setProperty('--paper-crop-height', `${imageHeight}px`);
    this.toolbar.style.setProperty('--paper-crop-x', `${x}px`);
    this.toolbar.style.setProperty('--paper-crop-y', `${y}px`);
    for (const control of this.toolbar.querySelectorAll<HTMLElement>('.works-search, .segmented-control')) {
      const rect = control.getBoundingClientRect();
      control.style.setProperty('--paper-control-x', `${x + toolbar.left - rect.left}px`);
      control.style.setProperty('--paper-control-y', `${y + toolbar.top - rect.top}px`);
    }
    this.toolbar.classList.add('has-paper-crop');
  }
}
