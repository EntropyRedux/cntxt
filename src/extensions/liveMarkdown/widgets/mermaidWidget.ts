import { WidgetType, EditorView } from '@codemirror/view';
import { createElement, copyText } from '../../../adapters';
import { renderMermaidDiagram } from '../../../services/mermaidRenderer';
import { getActiveBridge } from '../bridgeState';

export class MermaidBlockWidget extends WidgetType {
  constructor(
    readonly code: string,
    readonly startPos: number,
    readonly themeName: string,
    readonly isDark: boolean
  ) {
    super();
  }

  eq(other: MermaidBlockWidget): boolean {
    return (
      this.code === other.code &&
      this.themeName === other.themeName &&
      this.isDark === other.isDark
    );
  }

  toDOM(view: EditorView): HTMLElement {
    const container = createElement('div', {
      className: 'cm-live-mermaid-container select-none cursor-pointer'
    });

    const header = createElement('div', {
      className: 'cm-live-mermaid-header'
    });

    const titleDiv = createElement('div', {
      className: 'flex items-center gap-2 font-medium text-xs text-[#EC4899]'
    });
    titleDiv.innerHTML = `<span class="w-2 h-2 rounded-full bg-[#EC4899] inline-block"></span><span>Mermaid Diagram</span>`;
    header.appendChild(titleDiv);

    const rightDiv = createElement('div', {
      className: 'flex items-center gap-2.5'
    });

    const editHint = createElement('span', {
      className: 'text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors',
      textContent: 'Click to edit'
    });
    rightDiv.appendChild(editHint);

    const copyBtn = createElement('button', {
      type: 'button',
      className: 'text-[10px] px-2 py-0.5 rounded bg-[var(--card-secondary-bg)] hover:bg-[var(--card-hover-bg)] text-[var(--text-secondary)] border border-[var(--border-subtle)] transition-colors cursor-pointer',
      textContent: 'Copy'
    });
    copyBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await copyText(this.code, getActiveBridge() || undefined);
      copyBtn.textContent = 'Copied!';
      setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2000);
    });
    rightDiv.appendChild(copyBtn);

    header.appendChild(rightDiv);
    container.appendChild(header);

    const canvas = createElement('div', {
      className: 'cm-live-mermaid-canvas'
    });
    canvas.innerHTML = '<span class="text-xs text-[var(--text-muted)] animate-pulse">Rendering diagram...</span>';
    container.appendChild(canvas);

    renderMermaidDiagram(this.code, this.themeName).then((res) => {
      if (res.isError) {
        canvas.innerHTML = `<div class="p-3 text-xs text-red-400 bg-red-950/20 rounded border border-red-800/40 w-full font-mono"><div class="font-bold mb-1">Mermaid Syntax Warning:</div><div class="text-[11px] opacity-80">${res.error || 'Check diagram syntax'}</div></div>`;
      } else {
        canvas.innerHTML = res.svg;
      }
      view.requestMeasure();
    });

    container.addEventListener('click', () => {
      view.dispatch({
        selection: { anchor: this.startPos }
      });
      view.focus();
    });

    return container;
  }

  ignoreEvent(): boolean {
    return true;
  }
}
