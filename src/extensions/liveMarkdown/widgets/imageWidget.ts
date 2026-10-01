import { WidgetType, EditorView } from '@codemirror/view';
import { createElement, copyText, appendToBody, removeFromBody } from '../../../adapters';
import { getActiveBridge } from '../bridgeState';

export class ImageWidget extends WidgetType {
  constructor(
    readonly alt: string,
    readonly src: string,
    readonly title: string,
    readonly startPos: number,
    readonly endPos: number
  ) {
    super();
  }

  eq(other: ImageWidget): boolean {
    return (
      this.alt === other.alt &&
      this.src === other.src &&
      this.title === other.title &&
      this.startPos === other.startPos &&
      this.endPos === other.endPos
    );
  }

  toDOM(view: EditorView): HTMLElement {
    const container = createElement('span', {
      className: 'cm-live-image-figure block py-1 select-none'
    });

    const card = createElement('div', {
      className: 'cm-live-image-card group relative inline-flex flex-col rounded-xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--card-bg)] shadow-xs transition-all hover:shadow-md hover:border-[var(--border-primary)] max-w-full'
    });

    // Img element
    const img = createElement('img', {
      className: 'cm-live-img block max-w-full max-h-[460px] object-contain rounded-t-xl bg-[var(--canvas-bg)] cursor-zoom-in transition-transform duration-200',
      src: this.src,
      alt: this.alt || 'Document image',
      title: this.title || this.alt || 'Click to expand image',
      loading: 'lazy',
      referrerpolicy: 'no-referrer'
    }) as HTMLImageElement;

    img.onload = () => {
      view.requestMeasure();
    };

    // Error fallback
    img.onerror = () => {
      card.innerHTML = '';
      card.className =
        'inline-flex items-center gap-2 px-3 py-2 text-xs rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 font-sans my-1 max-w-full';
      card.innerHTML = `
        <span class="text-sm">⚠️</span>
        <span class="truncate max-w-xs font-mono text-[11px]">${this.alt || 'Image failed to load'}</span>
        <span class="text-[10px] text-red-300 opacity-70 truncate max-w-[120px]">${
          this.src.startsWith('data:') ? '[Embedded Image Data]' : this.src
        }</span>
      `;
      view.requestMeasure();
    };

    // Quick Action Bar on top right of the card
    const actionToolbar = createElement('div', {
      className: 'cm-live-image-toolbar absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-black/75 backdrop-blur-md rounded-lg p-1 text-white text-xs z-10 shadow-lg'
    });

    // 1. Copy image link / base64
    const copyBtn = createElement('button', {
      type: 'button',
      className: 'p-1 hover:bg-white/20 rounded transition-colors text-white/90 hover:text-white flex items-center justify-center',
      title: 'Copy Image Source / URL'
    });
    copyBtn.innerHTML = `
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
      </svg>
    `;
    copyBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      e.preventDefault();
      await copyText(this.src, getActiveBridge() || undefined);
      copyBtn.innerHTML = `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#34D399" stroke-width="2">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      `;
      setTimeout(() => {
        copyBtn.innerHTML = `
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
          </svg>
        `;
      }, 1500);
    });
    actionToolbar.appendChild(copyBtn);

    // 2. Expand / Lightbox click
    const zoomInModal = () => {
      const modal = createElement('div', {
        className: 'fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150 select-none'
      });

      const modalImg = createElement('img', {
        src: this.src,
        alt: this.alt,
        className: 'max-h-[90vh] max-w-[90vw] object-contain rounded-lg shadow-2xl'
      });

      const closeNotice = createElement('div', {
        className: 'absolute top-4 right-4 text-white/80 hover:text-white text-xs bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-xs cursor-pointer flex items-center gap-1.5'
      });
      closeNotice.innerHTML = `<span>Press ESC or click anywhere to close</span> ✕`;

      modal.appendChild(modalImg);
      modal.appendChild(closeNotice);

      const closeModal = () => {
        removeFromBody(modal);
      };

      modal.addEventListener('click', closeModal);
      appendToBody(modal);
    };

    img.addEventListener('click', (e) => {
      e.stopPropagation();
      zoomInModal();
    });

    const zoomBtn = createElement('button', {
      type: 'button',
      className: 'p-1 hover:bg-white/20 rounded transition-colors text-white/90 hover:text-white flex items-center justify-center',
      title: 'Zoom / Lightbox Preview'
    });
    zoomBtn.innerHTML = `
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="15 3 21 3 21 9"/>
        <polyline points="9 21 3 21 3 15"/>
        <line x1="21" y1="3" x2="14" y2="10"/>
        <line x1="3" y1="21" x2="10" y2="14"/>
      </svg>
    `;
    zoomBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      zoomInModal();
    });
    actionToolbar.appendChild(zoomBtn);

    // 3. Delete image from editor button
    const deleteBtn = createElement('button', {
      type: 'button',
      className: 'p-1 hover:bg-red-500/30 rounded transition-colors text-red-300 hover:text-red-200 flex items-center justify-center',
      title: 'Remove Image from Document'
    });
    deleteBtn.innerHTML = `
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="3 6 5 6 21 6"/>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
      </svg>
    `;
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (typeof this.startPos === 'number' && typeof this.endPos === 'number') {
        view.dispatch({
          changes: { from: this.startPos, to: this.endPos, insert: '' },
          userEvent: 'delete.image'
        });
      }
    });
    actionToolbar.appendChild(deleteBtn);

    card.appendChild(img);
    card.appendChild(actionToolbar);

    // Caption / Alt label
    if (this.alt && this.alt.trim()) {
      const caption = createElement('figcaption', {
        className: 'px-3 py-1.5 text-[11px] text-[var(--text-muted)] border-t border-[var(--border-subtle)] bg-[var(--card-secondary-bg)] text-center italic truncate max-w-full',
        textContent: this.alt.trim()
      });
      card.appendChild(caption);
    }

    container.appendChild(card);
    return container;
  }

  ignoreEvent(): boolean {
    return true;
  }
}
