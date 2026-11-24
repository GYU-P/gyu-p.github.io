/** 右端のレコードとジャケットを前面に映し、スクロール領域による切り抜きを避ける。 */
export class RecordPortal {
  private source?: HTMLElement;
  private portal?: HTMLDivElement;
  private frame = 0;
  private positionFrame = 0;
  private closeTimer?: ReturnType<typeof setTimeout>;
  private onPosition = () => {
    if (this.positionFrame) return;
    this.positionFrame = requestAnimationFrame(() => {
      this.positionFrame = 0;
      this.position();
    });
  };

  show(card: HTMLElement) {
    if (innerWidth <= 840 || card.hidden || !matchMedia('(hover: hover)').matches) return;
    if (this.source === card) {
      if (this.closeTimer !== undefined) {
        clearTimeout(this.closeTimer);
        this.closeTimer = undefined;
        this.portal?.classList.add('is-active');
      }
      return;
    }
    this.hide(true);
    const original = card.querySelector<HTMLButtonElement>('.work-card__button');
    if (!original) return;
    this.source = card;
    const portal = document.createElement('div');
    portal.className = 'record-portal';
    portal.setAttribute('aria-hidden', 'true');
    for (const selector of ['.work-card__vinyl', '.work-card__jacket']) {
      const node = original.querySelector(selector)?.cloneNode(true);
      if (node) portal.append(node);
    }
    document.body.append(portal);
    this.portal = portal;
    card.classList.add('work-card--lifted');
    this.position();
    if (this.portal !== portal) return;
    // Record the resting transforms before starting the transition.
    // A single animation frame alone can be merged into the first paint.
    void portal.offsetWidth;
    this.frame = requestAnimationFrame(() => {
      if (this.portal === portal) portal.classList.add('is-active');
    });
    window.addEventListener('resize', this.onPosition, { passive: true });
    window.addEventListener('scroll', this.onPosition, { passive: true, capture: true });
  }

  hide(immediate = false) {
    cancelAnimationFrame(this.frame);
    if (!immediate && this.portal && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      if (this.closeTimer !== undefined) return;
      this.portal.classList.remove('is-active');
      // Keep the source hidden until both jacket and record have returned.
      this.closeTimer = setTimeout(() => this.hide(true), 520);
      return;
    }
    if (this.closeTimer !== undefined) clearTimeout(this.closeTimer);
    this.closeTimer = undefined;
    cancelAnimationFrame(this.positionFrame);
    this.positionFrame = 0;
    window.removeEventListener('scroll', this.onPosition, true);
    window.removeEventListener('resize', this.onPosition);
    this.source?.classList.remove('work-card--lifted');
    this.portal?.remove();
    this.source = undefined;
    this.portal = undefined;
  }

  private position() {
    if (!this.source || !this.portal) return;
    if (innerWidth <= 840 || this.source.hidden) { this.hide(true); return; }
    const rect = this.source.querySelector('.work-card__button')!.getBoundingClientRect();
    if (!rect.width || rect.bottom < 0 || rect.top > innerHeight) { this.hide(true); return; }
    Object.assign(this.portal.style, {
      left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`,
    });
  }
}
