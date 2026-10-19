import { WidgetType, EditorView } from '@codemirror/view';
import { createElement, copyText, sanitizePreviewHtml } from '../../../adapters';
import { renderLatex, getKatex } from '../../../services/mathRenderer';
import { getActiveBridge } from '../bridgeState';

export class DisplayMathWidget extends WidgetType {
  constructor(
    readonly latex: string,
    readonly startPos: number
  ) {
    super();
  }

  eq(other: DisplayMathWidget): boolean {
    return this.latex === other.latex;
  }

  toDOM(view: EditorView): HTMLElement {
    const container = createElement('div', {
      className: 'cm-live-math-block select-none cursor-pointer group',
      'data-cntxt-math': 'true',
      title: 'Click to edit formula'
    });

    const rendered = renderLatex(this.latex, true);
    container.innerHTML = sanitizePreviewHtml(rendered.html);

    const copyBtn = createElement('button', {
      type: 'button',
      className: 'absolute top-1.5 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] px-1.5 py-0.5 rounded bg-[var(--card-bg)] text-[var(--text-muted)] hover:text-white border border-[var(--border-subtle)] cursor-pointer',
      textContent: 'Copy LaTeX'
    });
    copyBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await copyText(this.latex, getActiveBridge() || undefined);
      copyBtn.textContent = 'Copied!';
      setTimeout(() => { copyBtn.textContent = 'Copy LaTeX'; }, 2000);
    });
    container.appendChild(copyBtn);

    container.addEventListener('click', () => {
      view.dispatch({
        selection: { anchor: this.startPos }
      });
      view.focus();
    });

    if (rendered.isPending) {
      getKatex().then(() => {
        const fullRender = renderLatex(this.latex, true);
        container.innerHTML = sanitizePreviewHtml(fullRender.html);
        container.appendChild(copyBtn);
        view.requestMeasure();
      });
    } else {
      requestAnimationFrame(() => {
        view.requestMeasure();
      });
    }

    return container;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

export class InlineMathWidget extends WidgetType {
  constructor(readonly latex: string) {
    super();
  }

  eq(other: InlineMathWidget): boolean {
    return this.latex === other.latex;
  }

  toDOM(view: EditorView): HTMLElement {
    const span = createElement('span', { className: 'cm-live-math-inline', 'data-cntxt-math': 'true' });
    const rendered = renderLatex(this.latex, false);
    span.innerHTML = sanitizePreviewHtml(rendered.html);

    if (rendered.isPending) {
      getKatex().then(() => {
        const fullRender = renderLatex(this.latex, false);
        span.innerHTML = sanitizePreviewHtml(fullRender.html);
        view.requestMeasure();
      });
    }

    return span;
  }

  ignoreEvent(): boolean {
    return true;
  }
}
