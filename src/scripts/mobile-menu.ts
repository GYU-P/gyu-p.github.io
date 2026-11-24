class MobileSiteMenu extends HTMLElement {
  private controller?: AbortController;
  private observer?: IntersectionObserver;
  private toolbarObserver?: ResizeObserver;

  connectedCallback() {
    this.controller = new AbortController();
    const { signal } = this.controller;
    const header = document.querySelector<HTMLElement>('[data-primary-menu]')!;
    const trigger = this.querySelector<HTMLButtonElement>('[data-menu-open]')!;
    const dialog = this.querySelector<HTMLDialogElement>('dialog')!;
    const toolbar = document.querySelector<HTMLElement>('[data-toolbar]');
    const update = () => {
      const mobile = matchMedia('(max-width: 840px)').matches;
      trigger.hidden = !mobile || header.getBoundingClientRect().bottom > 0;
      const top = toolbar ? Math.max(0, toolbar.getBoundingClientRect().bottom) + 12 : 12;
      trigger.style.setProperty('--mobile-menu-toggle-top', `${top}px`);
      if (!mobile && dialog.open) dialog.close();
    };
    this.observer = new IntersectionObserver(update, { threshold: 0 });
    this.observer.observe(header);
    window.addEventListener('resize', update, { signal, passive: true });
    window.addEventListener('scroll', update, { signal, passive: true });
    if (toolbar) {
      this.toolbarObserver = new ResizeObserver(update);
      this.toolbarObserver.observe(toolbar);
    }
    trigger.addEventListener('click', () => {
      const content = this.querySelector('[data-menu-content]')!;
      if (!content.childElementCount) content.append(this.querySelector<HTMLTemplateElement>('template')!.content.cloneNode(true));
      dialog.showModal();
      document.documentElement.classList.add('has-mobile-menu');
      trigger.setAttribute('aria-expanded', 'true');
    }, { signal });
    this.querySelector('[data-menu-close]')!.addEventListener('click', () => dialog.close(), { signal });
    dialog.addEventListener('close', () => {
      document.documentElement.classList.remove('has-mobile-menu');
      trigger.setAttribute('aria-expanded', 'false');
      trigger.focus({ preventScroll: true });
    }, { signal });
    update();
  }

  disconnectedCallback() {
    this.controller?.abort();
    this.observer?.disconnect();
    this.toolbarObserver?.disconnect();
    document.documentElement.classList.remove('has-mobile-menu');
  }
}

if (!customElements.get('mobile-site-menu')) customElements.define('mobile-site-menu', MobileSiteMenu);
