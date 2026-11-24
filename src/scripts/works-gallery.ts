import { RecordPortal } from './record-portal';

/** 作品一覧の状態とイベントをこの要素の中だけに閉じ込める。 */
class WorksGallery extends HTMLElement {
  private controller?: AbortController;
  private kinds = new Set<string>();
  private sort = 'latest';
  private query = '';
  private roles = new Set<string>();
  private artists = new Set<string>();
  private recordPortal = new RecordPortal();

  connectedCallback() {
    this.controller?.abort();
    this.controller = new AbortController();
    const { signal } = this.controller;
    const toolbar = this.querySelector<HTMLElement>('[data-toolbar]')!;
    toolbar.hidden = false;
    const searchInput = this.querySelector<HTMLInputElement>('[data-search-input]')!;
    const searchToggle = this.querySelector<HTMLButtonElement>('[data-search-toggle]')!;
    const searchTags = this.querySelector<HTMLElement>('[data-search-tags]')!;
    const setSearchOpen = (open: boolean) => {
      toolbar.classList.toggle('is-search-open', open);
      searchTags.hidden = !open;
      searchToggle.setAttribute('aria-expanded', String(open));
      searchToggle.setAttribute('aria-label', open ? '検索を閉じる' : '検索を開く');
    };
    searchInput.addEventListener('focus', () => setSearchOpen(true), { signal });
    searchInput.addEventListener('input', event => {
      this.query = (event.target as HTMLInputElement).value;
      this.render();
    }, { signal });
    searchToggle.addEventListener('click', () => {
      const open = !toolbar.classList.contains('is-search-open');
      setSearchOpen(open);
      if (open) requestAnimationFrame(() => searchInput.focus());
      else searchToggle.focus();
    }, { signal });
    const closeSearch = () => {
      if (window.matchMedia('(max-width: 1240px)').matches) searchToggle.focus();
      else searchInput.focus();
      setSearchOpen(false);
    };
    toolbar.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      closeSearch();
    }, { signal });
    this.querySelector('[data-search-close]')!.addEventListener('click', closeSearch, { signal });
    this.querySelector('[data-search-reset]')!.addEventListener('click', () => {
      this.query = '';
      searchInput.value = '';
      this.roles.clear();
      this.artists.clear();
      this.render();
    }, { signal });
    const dialog = this.querySelector<HTMLDialogElement>('dialog')!;
    for (const card of this.querySelectorAll<HTMLElement>('[data-work]')) {
      card.addEventListener('pointerenter', () => this.recordPortal.show(card), { signal });
      card.addEventListener('pointerleave', () => {
        if (!card.querySelector(':focus-visible')) this.recordPortal.hide();
      }, { signal });
      card.addEventListener('focusin', () => this.recordPortal.show(card), { signal });
      card.addEventListener('focusout', event => {
        if (event.relatedTarget instanceof Node && card.contains(event.relatedTarget)) return;
        if (!card.matches(':hover')) this.recordPortal.hide();
      }, { signal });
    }
    this.addEventListener('click', event => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const tag = target.closest<HTMLButtonElement>('[data-search-tag]');
      if (tag) {
        const selection = tag.dataset.searchTag === 'role' ? this.roles : this.artists;
        const value = tag.dataset.tagValue!;
        if (selection.has(value)) selection.delete(value);
        else selection.add(value);
        this.render();
      }
      const filter = target.closest<HTMLButtonElement>('[data-filter]');
      if (filter) {
        if (filter.dataset.filter === 'kind') {
          const kind = filter.dataset.value!;
          if (this.kinds.has(kind)) this.kinds.delete(kind);
          else this.kinds.add(kind);
        }
        else this.sort = filter.dataset.value!;
        this.render();
      }
      const opener = target.closest('[data-open-work]');
      if (opener) {
        this.recordPortal.hide(true);
        const template = opener.closest('[data-work]')!.querySelector<HTMLTemplateElement>('template')!;
        this.querySelector('[data-dialog-content]')!.replaceChildren(template.content.cloneNode(true));
        dialog.showModal();
      }
      if (target.closest('[data-close-dialog]')) dialog.close();
    }, { signal });
    dialog.addEventListener('click', event => {
      const rect = dialog.getBoundingClientRect();
      if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
    }, { signal });
    this.render();
  }

  disconnectedCallback() { this.controller?.abort(); this.recordPortal.hide(true); }

  private render() {
    this.recordPortal.hide(true);
    const normalize = (value: string) => value.normalize('NFKC').toLocaleLowerCase('ja').replace(/[ァ-ヶ]/g, character => String.fromCharCode(character.charCodeAt(0) - 0x60)).trim();
    const terms = normalize(this.query).split(/\s+/).filter(Boolean);
    const cards = [...this.querySelectorAll<HTMLElement>('[data-work]')];
    const key = this.sort === 'popular' ? 'popularity' : 'latest';
    cards.sort((a, b) => Number(b.dataset[key]) - Number(a.dataset[key]));
    const grid = this.querySelector('[data-grid]')!;
    let count = 0;
    for (const card of cards) {
      const matchesKind = this.kinds.size !== 1 || this.kinds.has(card.dataset.kind ?? '');
      const matchesArtist = !this.artists.size || this.artists.has(card.dataset.artist ?? '');
      const cardRoles = (card.dataset.roles ?? '').split(' ');
      const matchesRoles = [...this.roles].every(role => cardRoles.includes(role));
      const text = normalize(card.dataset.search ?? '');
      card.hidden = !matchesKind || !matchesArtist || !matchesRoles || !terms.every(term => text.includes(term));
      if (!card.hidden) count++;
      grid.append(card);
    }
    this.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach(button => {
      const pressed = button.dataset.filter === 'kind' ? this.kinds.has(button.dataset.value!) : button.dataset.value === this.sort;
      button.setAttribute('aria-pressed', String(pressed));
    });
    this.querySelector('[data-results]')!.textContent = `${count}件の作品`;
    this.querySelectorAll<HTMLButtonElement>('[data-search-tag]').forEach(button => {
      const selection = button.dataset.searchTag === 'role' ? this.roles : this.artists;
      button.setAttribute('aria-pressed', String(selection.has(button.dataset.tagValue!)));
    });
    this.querySelector<HTMLElement>('[data-empty]')!.hidden = count !== 0;
  }
}

if (!customElements.get('works-gallery')) customElements.define('works-gallery', WorksGallery);
