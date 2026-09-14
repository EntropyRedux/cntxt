import { Extension, RangeSetBuilder, Text, StateField, EditorState, Facet, StateEffect } from '@codemirror/state';
import { EditorView, Decoration, DecorationSet, WidgetType } from '@codemirror/view';

export const refreshLiveMarkdownEffect = StateEffect.define<void>();

export const liveThemeFacet = Facet.define<string, string>({
  combine: (values) => values[values.length - 1] || 'contextpad-dark'
});
import { renderLatex } from '../services/mathRenderer';
import { renderMermaidDiagram } from '../services/mermaidRenderer';
import { 
  parseMarkdownTableLines, 
  isTableSeparatorLine, 
  formatTableCellHtml, 
  ParsedTable 
} from '../services/tableParser';
import { createElement, createTextNode, appendToBody, removeFromBody, isDarkTheme, copyText, getDocumentTheme } from '../adapters';
import { IRuntimeBridge } from '../ui-contract/bridgeContract';
import { useActionStore } from '../store/actionStore';
import { executeActionById } from '../services/actionExecutor';

let activeBridge: IRuntimeBridge | null = null;

export function setLiveMarkdownBridge(bridge?: IRuntimeBridge) {
  if (bridge) activeBridge = bridge;
}

// =========================================================================
// Language Meta Helper for Code Block Badges
// =========================================================================

function getLanguageMeta(rawLang: string): { name: string; color: string; bg: string } {
  const lang = rawLang.toLowerCase().trim();
  switch (lang) {
    case 'ts':
    case 'typescript':
      return { name: 'TypeScript', color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.15)' };
    case 'js':
    case 'javascript':
    case 'jsx':
      return { name: 'JavaScript', color: '#FBBF24', bg: 'rgba(251, 191, 36, 0.15)' };
    case 'tsx':
      return { name: 'TSX', color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.15)' };
    case 'py':
    case 'python':
      return { name: 'Python', color: '#34D399', bg: 'rgba(52, 211, 153, 0.15)' };
    case 'json':
      return { name: 'JSON', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)' };
    case 'html':
      return { name: 'HTML', color: '#FB923C', bg: 'rgba(251, 146, 60, 0.15)' };
    case 'css':
    case 'scss':
    case 'sass':
      return { name: 'CSS', color: '#818CF8', bg: 'rgba(129, 140, 248, 0.15)' };
    case 'sql':
      return { name: 'SQL', color: '#C084FC', bg: 'rgba(192, 132, 252, 0.15)' };
    case 'sh':
    case 'bash':
    case 'shell':
    case 'zsh':
      return { name: 'Bash', color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' };
    case 'md':
    case 'markdown':
      return { name: 'Markdown', color: '#F472B6', bg: 'rgba(244, 114, 182, 0.15)' };
    case 'mermaid':
      return { name: 'Mermaid Diagram', color: '#EC4899', bg: 'rgba(236, 72, 153, 0.15)' };
    case 'latex':
    case 'math':
    case 'katex':
      return { name: 'LaTeX Math', color: '#6366F1', bg: 'rgba(99, 102, 241, 0.15)' };
    case 'rs':
    case 'rust':
      return { name: 'Rust', color: '#FB923C', bg: 'rgba(251, 146, 60, 0.15)' };
    case 'go':
    case 'golang':
      return { name: 'Go', color: '#22D3EE', bg: 'rgba(34, 211, 238, 0.15)' };
    case 'cpp':
    case 'c++':
    case 'c':
      return { name: 'C / C++', color: '#60A5FA', bg: 'rgba(96, 165, 250, 0.15)' };
    case 'yaml':
    case 'yml':
      return { name: 'YAML', color: '#F87171', bg: 'rgba(248, 113, 113, 0.15)' };
    case 'xml':
      return { name: 'XML', color: '#FBBF24', bg: 'rgba(251, 191, 36, 0.15)' };
    case 'dockerfile':
    case 'docker':
      return { name: 'Docker', color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.15)' };
    default:
      return { 
        name: rawLang ? rawLang.toUpperCase() : 'Code', 
        color: '#A1A1AA', 
        bg: 'rgba(161, 161, 170, 0.15)' 
      };
  }
}

// =========================================================================
// Mermaid Diagram Widget
// =========================================================================

class MermaidBlockWidget extends WidgetType {
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
      await copyText(this.code, activeBridge || undefined);
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

// =========================================================================
// LaTeX Display Math Block Widget
// =========================================================================

class DisplayMathWidget extends WidgetType {
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
      title: 'Click to edit formula'
    });

    const rendered = renderLatex(this.latex, true);
    container.innerHTML = rendered.html;

    const copyBtn = createElement('button', {
      type: 'button',
      className: 'absolute top-1.5 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] px-1.5 py-0.5 rounded bg-[var(--card-bg)] text-[var(--text-muted)] hover:text-white border border-[var(--border-subtle)] cursor-pointer',
      textContent: 'Copy LaTeX'
    });
    copyBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await copyText(this.latex, activeBridge || undefined);
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

    requestAnimationFrame(() => {
      view.requestMeasure();
    });

    return container;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

// =========================================================================
// LaTeX Inline Math Widget
// =========================================================================

class InlineMathWidget extends WidgetType {
  constructor(readonly latex: string) {
    super();
  }

  eq(other: InlineMathWidget): boolean {
    return this.latex === other.latex;
  }

  toDOM(): HTMLElement {
    const span = createElement('span', { className: 'cm-live-math-inline' });
    const rendered = renderLatex(this.latex, false);
    span.innerHTML = rendered.html;
    return span;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

// =========================================================================
// Markdown Table Block Widget
// =========================================================================

class TableBlockWidget extends WidgetType {
  constructor(
    readonly table: ParsedTable,
    readonly startPos: number
  ) {
    super();
  }

  eq(other: TableBlockWidget): boolean {
    return this.table.rawMarkdown === other.table.rawMarkdown;
  }

  toDOM(view: EditorView): HTMLElement {
    const container = createElement('div', {
      className: 'cm-live-table-container select-none cursor-pointer group relative',
      title: 'Click anywhere on table to edit'
    });

    const table = createElement('table', { className: 'cm-live-table' });

    // thead
    const thead = createElement('thead');
    const headerRow = createElement('tr');
    this.table.headers.forEach((headerText, i) => {
      const th = createElement('th', {
        className: `text-${this.table.alignments[i] || 'left'}`
      });
      th.innerHTML = formatTableCellHtml(headerText);
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // tbody
    const tbody = createElement('tbody');
    this.table.rows.forEach((rowCells) => {
      const tr = createElement('tr');
      rowCells.forEach((cellText, i) => {
        const td = createElement('td', {
          className: `text-${this.table.alignments[i] || 'left'}`
        });
        td.innerHTML = formatTableCellHtml(cellText);
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    container.appendChild(table);

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

// =========================================================================
// Custom Standard Code Block Widgets
// =========================================================================

class CodeBlockHeaderWidget extends WidgetType {
  constructor(
    readonly language: string,
    readonly codeContent: string,
    readonly linePos: number
  ) {
    super();
  }

  eq(other: CodeBlockHeaderWidget): boolean {
    return (
      this.language === other.language &&
      this.codeContent === other.codeContent &&
      this.linePos === other.linePos
    );
  }

  toDOM(view: EditorView): HTMLElement {
    const meta = getLanguageMeta(this.language);

    const header = createElement('div', {
      className: 'cm-live-codeblock-header select-none flex items-center justify-between px-3 py-1.5 border-b border-[#2E2E38] bg-[#16161B] text-[#A1A1AA] rounded-t-[7px] w-full cursor-pointer'
    });

    header.addEventListener('click', (e) => {
      if (!(e.target as HTMLElement)?.closest('.cm-live-copy-code-btn')) {
        view.dispatch({
          selection: { anchor: this.linePos }
        });
        view.focus();
      }
    });

    const left = createElement('div', {
      className: 'flex items-center gap-2'
    });

    const dot = createElement('span', {
      className: 'w-2 h-2 rounded-full inline-block shrink-0'
    });
    dot.style.backgroundColor = meta.color;
    left.appendChild(dot);

    const badge = createElement('span', {
      className: 'px-2 py-0.5 rounded text-[10px] font-mono font-semibold tracking-wider uppercase'
    });
    badge.style.color = meta.color;
    badge.style.backgroundColor = meta.bg;
    badge.textContent = meta.name;
    left.appendChild(badge);

    header.appendChild(left);

    const copyBtn = createElement('button', {
      type: 'button',
      className: 'cm-live-copy-code-btn flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium text-[#A1A1AA] hover:text-white hover:bg-[#27272F] transition-all cursor-pointer',
      title: 'Copy code snippet',
      'aria-label': `Copy ${meta.name} code snippet`
    });

    const copyIcon = createElement('span');
    copyIcon.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
    copyBtn.appendChild(copyIcon);

    const copyLabel = createElement('span');
    copyLabel.textContent = 'Copy';
    copyBtn.appendChild(copyLabel);

    copyBtn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    copyBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        await copyText(this.codeContent, activeBridge || undefined);
        copyLabel.textContent = 'Copied!';
        copyBtn.classList.add('text-[#10B981]');
        copyIcon.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`;
        setTimeout(() => {
          copyLabel.textContent = 'Copy';
          copyBtn.classList.remove('text-[#10B981]');
          copyIcon.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
        }, 2000);
      } catch (err) {
        console.error('Failed to copy code snippet', err);
      }
    });

    header.appendChild(copyBtn);
    return header;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

class CodeBlockFooterWidget extends WidgetType {
  toDOM(): HTMLElement {
    return createElement('div', {
      className: 'cm-live-codeblock-footer select-none h-1.5 w-full'
    });
  }
  eq(): boolean {
    return true;
  }
  ignoreEvent(): boolean {
    return true;
  }
}

class TaskCheckboxWidget extends WidgetType {
  constructor(
    readonly isChecked: boolean,
    readonly linePos: number
  ) {
    super();
  }

  eq(other: TaskCheckboxWidget): boolean {
    return this.isChecked === other.isChecked && this.linePos === other.linePos;
  }

  toDOM(view: EditorView): HTMLElement {
    const wrap = createElement('span', {
      className: 'cm-live-task-wrap inline-flex items-center mr-2 align-middle select-none'
    });
    
    const input = createElement('input', {
      type: 'checkbox',
      className: 'cm-live-checkbox cursor-pointer w-4 h-4 rounded border border-[#52525B] bg-[#27272F] accent-[#007ACC] transition-transform hover:scale-110',
      'aria-label': this.isChecked ? 'Completed task item' : 'Incomplete task item'
    }) as HTMLInputElement;
    input.checked = this.isChecked;

    input.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const line = view.state.doc.lineAt(this.linePos);
      const match = line.text.match(/^(\s*[-*+]\s*\[)([ xX])(\])/);
      if (match) {
        const checkPos = line.from + match[1].length;
        const newChar = this.isChecked ? ' ' : 'x';
        view.dispatch({
          changes: { from: checkPos, to: checkPos + 1, insert: newChar }
        });
      }
    });

    wrap.appendChild(input);
    return wrap;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

class BulletWidget extends WidgetType {
  toDOM(): HTMLElement {
    return createElement('span', {
      className: 'cm-live-bullet-dot text-[#007ACC] font-bold mr-2 select-none inline-block text-base leading-none',
      textContent: '•'
    });
  }
  eq(): boolean {
    return true;
  }
  ignoreEvent(): boolean {
    return true;
  }
}

class HrWidget extends WidgetType {
  toDOM(): HTMLElement {
    const hrContainer = createElement('div', {
      className: 'cm-live-hr-wrap py-3 select-none w-full'
    });
    const hr = createElement('hr', {
      className: 'border-t border-[#3F3F46] my-0 w-full'
    });
    hrContainer.appendChild(hr);
    return hrContainer;
  }
  eq(): boolean {
    return true;
  }
  ignoreEvent(): boolean {
    return true;
  }
}

class LinkWidget extends WidgetType {
  constructor(readonly text: string, readonly url: string) {
    super();
  }

  eq(other: LinkWidget): boolean {
    return this.text === other.text && this.url === other.url;
  }

  toDOM(): HTMLElement {
    const a = createElement('a', {
      className: 'cm-live-link text-[var(--accent-primary)] underline underline-offset-2 hover:opacity-80 cursor-pointer inline-flex items-center gap-1 font-medium bg-[var(--accent-container)]/30 px-1.5 py-0.5 rounded text-[0.95em] transition-colors',
      href: this.url,
      target: '_blank',
      rel: 'noopener noreferrer',
      title: `Open link: ${this.url}`,
      textContent: this.text || this.url
    }) as HTMLAnchorElement;
    
    const icon = createElement('span', {
      className: 'text-[0.75em] opacity-70',
      textContent: '↗'
    });
    a.appendChild(icon);

    a.addEventListener('click', (e) => {
      e.stopPropagation();
    });
    return a;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

// =========================================================================
// Action Button Widget: [[action:actionId]] or [[action:actionId|Label]]
// =========================================================================

class ActionButtonWidget extends WidgetType {
  constructor(
    readonly rawToken: string,
    readonly actionId: string,
    readonly customLabel: string | undefined,
    readonly actionName: string,
    readonly codeType: string | undefined,
    readonly from: number,
    readonly to: number
  ) {
    super();
  }

  eq(other: ActionButtonWidget): boolean {
    return (
      this.rawToken === other.rawToken &&
      this.actionId === other.actionId &&
      this.customLabel === other.customLabel &&
      this.actionName === other.actionName &&
      this.codeType === other.codeType
    );
  }

  toDOM(view: EditorView): HTMLElement {
    const action = useActionStore.getState().actions.find(a => a.id === this.actionId);
    const label = this.customLabel || action?.name || this.actionId;
    const isFormula = action?.codeType === 'formula' || action?.code?.startsWith('FORMULA:');
    const isMissing = !action;

    if (isMissing) {
      const missingSpan = createElement('span', {
        className: 'cm-action-missing-widget',
        title: `Action "${this.actionId}" not found in Action Scripts library.\nClick to place cursor here to edit syntax.`
      });
      missingSpan.innerHTML = `<span class="opacity-75">⚠️</span><span class="cm-action-missing-name">${this.customLabel || this.rawToken}</span><span class="cm-action-missing-badge">(missing)</span>`;
      missingSpan.addEventListener('mousedown', (e) => e.stopPropagation());
      missingSpan.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        let targetPos = this.from;
        try {
          const domPos = view.posAtDOM(missingSpan);
          if (domPos !== null && domPos !== undefined) targetPos = domPos;
        } catch {}
        view.dispatch({ selection: { anchor: targetPos } });
        view.focus();
      });
      return missingSpan;
    }

    const btn = createElement('button', {
      type: 'button',
      className: 'cm-action-btn-widget group',
      title: `Action: ${action.name}\n${action.description ? action.description + '\n' : ''}• Click to run action\n• Alt+Click to edit syntax`
    });

    const playIcon = createElement('span', {
      className: 'cm-action-btn-icon'
    });
    playIcon.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="6 3 20 12 6 21 6 3"/></svg>`;
    btn.appendChild(playIcon);

    const labelSpan = createElement('span', {
      className: 'cm-action-btn-label',
      textContent: label
    });
    btn.appendChild(labelSpan);

    if (isFormula) {
      const fxBadge = createElement('span', {
        className: 'cm-action-badge-fx',
        textContent: 'fx'
      });
      btn.appendChild(fxBadge);
    }

    const typeBadge = createElement('span', {
      className: 'cm-action-badge-type',
      textContent: 'BTN'
    });
    btn.appendChild(typeBadge);

    // Prevent losing text selection on mousedown
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.altKey || e.ctrlKey) {
        let targetPos = this.from;
        try {
          const domPos = view.posAtDOM(btn);
          if (domPos !== null && domPos !== undefined) targetPos = domPos;
        } catch {}
        view.dispatch({ selection: { anchor: targetPos } });
        view.focus();
        return;
      }

      btn.classList.add('is-running');
      try {
        await executeActionById(this.actionId, view);
      } finally {
        btn.classList.remove('is-running');
      }
    });

    return btn;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

class ImageWidget extends WidgetType {
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
      await copyText(this.src, activeBridge || undefined);
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

// =========================================================================
// Fenced Code Block Scanning & Structure
// =========================================================================

interface CodeBlockInfo {
  startLine: number;
  endLine: number;
  language: string;
  isClosed: boolean;
  codeContent: string;
}

interface CodeBlockLineEntry {
  block: CodeBlockInfo;
  role: 'start' | 'mid' | 'end' | 'single';
}

function findCodeBlocks(doc: Text): Map<number, CodeBlockLineEntry> {
  const codeBlocksByLine = new Map<number, CodeBlockLineEntry>();
  let currentStartLine = -1;
  let currentFence = '';
  let currentLang = '';
  let codeLines: string[] = [];

  for (let lineNum = 1; lineNum <= doc.lines; lineNum++) {
    const line = doc.line(lineNum);
    const lineText = line.text;
    const fenceMatch = lineText.match(/^(\s*)(```+|~~~+)(.*)$/);

    if (currentStartLine === -1) {
      if (fenceMatch) {
        currentStartLine = lineNum;
        currentFence = fenceMatch[2].slice(0, 3);
        currentLang = fenceMatch[3].trim();
        codeLines = [];
      }
    } else {
      if (fenceMatch && fenceMatch[2].startsWith(currentFence)) {
        const block: CodeBlockInfo = {
          startLine: currentStartLine,
          endLine: lineNum,
          language: currentLang,
          isClosed: true,
          codeContent: codeLines.join('\n')
        };

        if (currentStartLine === lineNum) {
          codeBlocksByLine.set(lineNum, { block, role: 'single' });
        } else {
          codeBlocksByLine.set(currentStartLine, { block, role: 'start' });
          for (let mid = currentStartLine + 1; mid < lineNum; mid++) {
            codeBlocksByLine.set(mid, { block, role: 'mid' });
          }
          codeBlocksByLine.set(lineNum, { block, role: 'end' });
        }

        currentStartLine = -1;
        currentFence = '';
        currentLang = '';
        codeLines = [];
      } else {
        codeLines.push(lineText);
      }
    }
  }

  if (currentStartLine !== -1) {
    const block: CodeBlockInfo = {
      startLine: currentStartLine,
      endLine: doc.lines,
      language: currentLang,
      isClosed: false,
      codeContent: codeLines.join('\n')
    };
    codeBlocksByLine.set(currentStartLine, { block, role: 'start' });
    for (let mid = currentStartLine + 1; mid <= doc.lines; mid++) {
      codeBlocksByLine.set(mid, { block, role: 'mid' });
    }
  }

  return codeBlocksByLine;
}

// =========================================================================
// LaTeX Math Blocks ($$ ... $$) Scanner
// =========================================================================

interface MathBlockInfo {
  startLine: number;
  endLine: number;
  latex: string;
}

function findMathBlocks(
  doc: Text,
  codeBlocksByLine: Map<number, CodeBlockLineEntry>
): Map<number, MathBlockInfo> {
  const mathBlocks = new Map<number, MathBlockInfo>();
  let currentStartLine = -1;
  let lines: string[] = [];

  for (let lineNum = 1; lineNum <= doc.lines; lineNum++) {
    if (codeBlocksByLine.has(lineNum)) continue;

    const line = doc.line(lineNum);
    const trimmed = line.text.trim();

    // Single-line display math: $$ formula $$
    if (currentStartLine === -1 && trimmed.startsWith('$$') && trimmed.endsWith('$$') && trimmed.length >= 4) {
      const latex = trimmed.slice(2, -2).trim();
      const info: MathBlockInfo = { startLine: lineNum, endLine: lineNum, latex };
      mathBlocks.set(lineNum, info);
      continue;
    }

    // Multi-line display math starting with $$
    if (currentStartLine === -1) {
      if (trimmed.startsWith('$$')) {
        currentStartLine = lineNum;
        lines = [trimmed.replace(/^\$\$/, '')];
      }
    } else {
      if (trimmed.endsWith('$$') || trimmed === '$$') {
        lines.push(trimmed.replace(/\$\$$/, ''));
        const info: MathBlockInfo = {
          startLine: currentStartLine,
          endLine: lineNum,
          latex: lines.join('\n').trim()
        };
        for (let l = currentStartLine; l <= lineNum; l++) {
          mathBlocks.set(l, info);
        }
        currentStartLine = -1;
        lines = [];
      } else {
        lines.push(line.text);
      }
    }
  }

  return mathBlocks;
}

// =========================================================================
// Markdown Table Scanner
// =========================================================================

interface TableBlockInfo {
  startLine: number;
  endLine: number;
  table: ParsedTable;
}

function findTables(
  doc: Text,
  codeBlocksByLine: Map<number, CodeBlockLineEntry>,
  mathBlocksByLine: Map<number, MathBlockInfo>
): Map<number, TableBlockInfo> {
  const tables = new Map<number, TableBlockInfo>();
  let lineNum = 1;

  while (lineNum <= doc.lines) {
    if (codeBlocksByLine.has(lineNum) || mathBlocksByLine.has(lineNum)) {
      lineNum++;
      continue;
    }

    const line = doc.line(lineNum);
    const lineText = line.text;

    // A table header must contain '|' and be immediately followed by a separator row
    if (lineText.includes('|') && lineNum < doc.lines) {
      if (!codeBlocksByLine.has(lineNum + 1) && !mathBlocksByLine.has(lineNum + 1)) {
        const nextLine = doc.line(lineNum + 1).text;
        if (isTableSeparatorLine(nextLine)) {
          const tableLines = [lineText, nextLine];
          let endLine = lineNum + 1;
          for (let l = lineNum + 2; l <= doc.lines; l++) {
            if (codeBlocksByLine.has(l) || mathBlocksByLine.has(l)) break;
            const currText = doc.line(l).text;
            if (!currText.trim() || !currText.includes('|')) break;
            tableLines.push(currText);
            endLine = l;
          }

          const parsed = parseMarkdownTableLines(tableLines);
          if (parsed) {
            const info: TableBlockInfo = {
              startLine: lineNum,
              endLine,
              table: parsed
            };
            for (let l = lineNum; l <= endLine; l++) {
              tables.set(l, info);
            }
            lineNum = endLine + 1;
            continue;
          }
        }
      }
    }
    lineNum++;
  }

  return tables;
}

// =========================================================================
// Range Deco Item Interface
// =========================================================================
interface RangeDecoItem {
  from: number;
  to: number;
  deco: Decoration;
}

// =========================================================================
// Decoration Builder
// =========================================================================

function buildDecorations(state: EditorState): DecorationSet {
  try {
    const builder = new RangeSetBuilder<Decoration>();
    const doc = state.doc;

    // Detect whether current app theme is dark and get current theme name
    const facetTheme = state.facet(liveThemeFacet);
    const currentTheme = facetTheme || getDocumentTheme();
    const isDark = currentTheme === 'google-material-3' || currentTheme === 'parchment' || currentTheme === 'github-light' ? false : isDarkTheme();

    // 1. Scan document structures
    const codeBlocksByLine = findCodeBlocks(doc);
    const mathBlocksByLine = findMathBlocks(doc, codeBlocksByLine);
    const tableBlocksByLine = findTables(doc, codeBlocksByLine, mathBlocksByLine);

    // 2. Determine active lines where the cursor / selection currently sits
    const activeLines = new Set<number>();
    const isSelectionActive = !state.selection.main.empty;
    // When the user is actively selecting text across ranges, do not mark lines as raw-editing
    // to prevent jarring layout shifts under the cursor while dragging
    if (!isSelectionActive) {
      for (const range of state.selection.ranges) {
        if (range.empty) {
          activeLines.add(doc.lineAt(range.head).number);
        }
      }
    }

    let pos = 0;
    const docLen = doc.length;
    while (pos <= docLen) {
      const line = doc.lineAt(pos);
      const isLineActive = activeLines.has(line.number);

      // =====================================================================
      // A. Fenced Code Block Container (Mermaid, LaTeX, or standard Code)
      // =====================================================================
      const codeBlockEntry = codeBlocksByLine.get(line.number);
      if (codeBlockEntry) {
        const { role, block } = codeBlockEntry;
        const lang = block.language.toLowerCase().trim();

        // Check if cursor is anywhere inside this code block
        let isBlockActive = false;
        for (let l = block.startLine; l <= block.endLine; l++) {
          if (activeLines.has(l)) {
            isBlockActive = true;
            break;
          }
        }

        // --- Mermaid Diagram Full Replacement Widget ---
        if (lang === 'mermaid' && !isBlockActive && block.isClosed) {
          if (line.number === block.startLine) {
            const startLineObj = doc.line(block.startLine);
            const endLineObj = doc.line(block.endLine);
            builder.add(
              startLineObj.from,
              endLineObj.to,
              Decoration.replace({
                widget: new MermaidBlockWidget(block.codeContent, startLineObj.from, currentTheme, isDark),
                block: true
              })
            );
            pos = endLineObj.to + 1;
            continue;
          } else {
            pos = line.to + 1;
            continue;
          }
        }

        // --- LaTeX Math Code Block Full Replacement Widget ---
        if ((lang === 'latex' || lang === 'math' || lang === 'katex') && !isBlockActive && block.isClosed) {
          if (line.number === block.startLine) {
            const startLineObj = doc.line(block.startLine);
            const endLineObj = doc.line(block.endLine);
            builder.add(
              startLineObj.from,
              endLineObj.to,
              Decoration.replace({
                widget: new DisplayMathWidget(block.codeContent, startLineObj.from),
                block: true
              })
            );
            pos = endLineObj.to + 1;
            continue;
          } else {
            pos = line.to + 1;
            continue;
          }
        }

        // --- Standard Code Block Rendering ---
        if (isLineActive) {
          builder.add(
            line.from,
            line.from,
            Decoration.line({ class: `cm-live-codeblock-${role} cm-live-active-row` })
          );
          pos = line.to + 1;
          continue;
        }

        if (role === 'start') {
          builder.add(
            line.from,
            line.from,
            Decoration.line({ class: 'cm-live-codeblock-start' })
          );
          builder.add(
            line.from,
            line.to,
            Decoration.replace({
              widget: new CodeBlockHeaderWidget(block.language, block.codeContent, line.from)
            })
          );
        } else if (role === 'mid') {
          builder.add(
            line.from,
            line.from,
            Decoration.line({ class: 'cm-live-codeblock-mid' })
          );
        } else if (role === 'end') {
          builder.add(
            line.from,
            line.from,
            Decoration.line({ class: 'cm-live-codeblock-end' })
          );
          builder.add(
            line.from,
            line.to,
            Decoration.replace({
              widget: new CodeBlockFooterWidget()
            })
          );
        } else if (role === 'single') {
          builder.add(
            line.from,
            line.from,
            Decoration.line({ class: 'cm-live-codeblock-single' })
          );
        }

        pos = line.to + 1;
        continue;
      }

      // =====================================================================
      // B. Display LaTeX Math Block ($$ ... $$)
      // =====================================================================
      const mathBlock = mathBlocksByLine.get(line.number);
      if (mathBlock) {
        let isBlockActive = false;
        for (let l = mathBlock.startLine; l <= mathBlock.endLine; l++) {
          if (activeLines.has(l)) {
            isBlockActive = true;
            break;
          }
        }

        if (!isBlockActive) {
          if (line.number === mathBlock.startLine) {
            const startLineObj = doc.line(mathBlock.startLine);
            const endLineObj = doc.line(mathBlock.endLine);
            builder.add(
              startLineObj.from,
              endLineObj.to,
              Decoration.replace({
                widget: new DisplayMathWidget(mathBlock.latex, startLineObj.from),
                block: true
              })
            );
            pos = endLineObj.to + 1;
            continue;
          } else {
            pos = line.to + 1;
            continue;
          }
        } else {
          // Block is being edited - show raw markdown for focused lines
          builder.add(line.from, line.from, Decoration.line({ class: 'cm-live-active-row' }));
          pos = line.to + 1;
          continue;
        }
      }

      // =====================================================================
      // C. Markdown Table Block
      // =====================================================================
      const tableBlock = tableBlocksByLine.get(line.number);
      if (tableBlock) {
        let isTableActive = false;
        for (let l = tableBlock.startLine; l <= tableBlock.endLine; l++) {
          if (activeLines.has(l)) {
            isTableActive = true;
            break;
          }
        }

        if (!isTableActive) {
          if (line.number === tableBlock.startLine) {
            const startLineObj = doc.line(tableBlock.startLine);
            const endLineObj = doc.line(tableBlock.endLine);
            builder.add(
              startLineObj.from,
              endLineObj.to,
              Decoration.replace({
                widget: new TableBlockWidget(tableBlock.table, startLineObj.from),
                block: true
              })
            );
            pos = endLineObj.to + 1;
            continue;
          } else {
            pos = line.to + 1;
            continue;
          }
        } else {
          // Table row is being edited
          builder.add(line.from, line.from, Decoration.line({ class: 'cm-live-active-row' }));
          pos = line.to + 1;
          continue;
        }
      }

      // =====================================================================
      // D. Regular Markdown Row
      // =====================================================================

      let lineDeco: Decoration | null = isLineActive ? Decoration.line({ class: 'cm-live-active-row' }) : null;
      const rangeDecos: RangeDecoItem[] = [];
      const lineText = line.text;

      // 1. Headings (# H1, ## H2, ### H3, etc.)
      const headingMatch = lineText.match(/^(#{1,6})\s+(.*)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const markerLen = headingMatch[1].length + 1;
        lineDeco = Decoration.line({ 
          class: `cm-live-heading cm-live-h${level}${isLineActive ? ' cm-live-active-row' : ''}` 
        });
        if (isLineActive) {
          rangeDecos.push({
            from: line.from,
            to: line.from + markerLen,
            deco: Decoration.mark({ class: 'cm-live-heading-marker' })
          });
        } else {
          rangeDecos.push({
            from: line.from,
            to: line.from + markerLen,
            deco: Decoration.replace({})
          });
        }
      }

      // 2. Blockquotes (> quote)
      const quoteMatch = lineText.match(/^>\s*(.*)$/);
      if (quoteMatch && !headingMatch) {
        lineDeco = Decoration.line({ 
          class: `cm-live-blockquote${isLineActive ? ' cm-live-active-row' : ''}` 
        });
        const prefixLen = lineText.startsWith('> ') ? 2 : 1;
        if (isLineActive) {
          rangeDecos.push({
            from: line.from,
            to: Math.min(line.from + prefixLen, line.to),
            deco: Decoration.mark({ class: 'cm-live-heading-marker' })
          });
        } else {
          rangeDecos.push({
            from: line.from,
            to: Math.min(line.from + prefixLen, line.to),
            deco: Decoration.replace({})
          });
        }
      }

      // 3. Task checkboxes (- [ ] / - [x])
      const taskMatch = lineText.match(/^(\s*[-*+]\s*\[)([ xX])(\])\s*(.*)$/);
      if (taskMatch) {
        const isChecked = taskMatch[2].toLowerCase() === 'x';
        const prefixLen = taskMatch[1].length + 2;
        lineDeco = Decoration.line({ 
          class: (isChecked ? 'cm-live-task-done' : 'cm-live-task-item') + (isLineActive ? ' cm-live-active-row' : '') 
        });
        rangeDecos.push({
          from: line.from,
          to: line.from + prefixLen,
          deco: Decoration.replace({
            widget: new TaskCheckboxWidget(isChecked, line.from)
          })
        });
      }

      // 4. Horizontal Rules (---, ***, ___)
      const hrMatch = lineText.match(/^(\-{3,}|\*{3,}|_{3,})\s*$/);
      if (hrMatch) {
        rangeDecos.push({
          from: line.from,
          to: line.to,
          deco: Decoration.replace({ widget: new HrWidget() })
        });
      }

      // 5. Bullet Lists (- list, * list, + list)
      const bulletMatch = lineText.match(/^(\s*)([-*+])\s+(.*)$/);
      if (bulletMatch && !taskMatch && !hrMatch) {
        const indent = bulletMatch[1].length;
        const markerPos = line.from + indent;
        if (!isLineActive) {
          rangeDecos.push({
            from: markerPos,
            to: markerPos + 2,
            deco: Decoration.replace({ widget: new BulletWidget() })
          });
        }
      }

      // 6. Inline Formatting (LaTeX Math, Links, Code, Bold, Italic, Strikethrough, Tags)
      if (!hrMatch) {
        let match: RegExpExecArray | null;

        // Inline LaTeX Math: $formula$ (must not be $$)
        const inlineMathRegex = /(?<!\$)\$(?!\$)([^\$\n]+?)(?<!\$)\$(?!\$)/g;
        while ((match = inlineMathRegex.exec(lineText)) !== null) {
          const start = line.from + match.index;
          const end = start + match[0].length;
          rangeDecos.push({
            from: start,
            to: end,
            deco: Decoration.replace({
              widget: new InlineMathWidget(match[1])
            })
          });
        }

        // Images: ![alt](url "optional title")
        const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
        while ((match = imageRegex.exec(lineText)) !== null) {
          const start = line.from + match.index;
          const end = start + match[0].length;
          const alt = match[1];
          let rawTarget = match[2].trim();
          let src = rawTarget;
          let title = '';

          const titleMatch = rawTarget.match(/^(\S+)\s+["'](.*)["']$/);
          if (titleMatch) {
            src = titleMatch[1];
            title = titleMatch[2];
          }

          rangeDecos.push({
            from: start,
            to: end,
            deco: Decoration.replace({
              widget: new ImageWidget(alt, src, title, start, end)
            })
          });
        }

        // Action Buttons: [[action:actionId]] or [[action:actionId|Label]]
        const actionButtonRegex = /\[\[action:([^\]|\n]+)(?:\|([^\]\n]+))?\]\]/g;
        while ((match = actionButtonRegex.exec(lineText)) !== null) {
          const start = line.from + match.index;
          const end = start + match[0].length;
          const actionId = match[1].trim();
          const customLabel = match[2]?.trim();
          const action = useActionStore.getState().actions.find(a => a.id === actionId);
          rangeDecos.push({
            from: start,
            to: end,
            deco: Decoration.replace({
              widget: new ActionButtonWidget(
                match[0],
                actionId,
                customLabel,
                action?.name || actionId,
                action?.codeType,
                start,
                end
              )
            })
          });
        }

        // Links: [text](url) - negative lookbehind prevents matching ![alt](url)
        const linkRegex = /(?<!\!)\[([^\]]+)\]\(([^)]+)\)/g;
        while ((match = linkRegex.exec(lineText)) !== null) {
          const start = line.from + match.index;
          const end = start + match[0].length;
          rangeDecos.push({
            from: start,
            to: end,
            deco: Decoration.replace({
              widget: new LinkWidget(match[1], match[2])
            })
          });
        }

        // Inline Code: `code`
        const codeRegex = /`([^`\n]+)`/g;
        while ((match = codeRegex.exec(lineText)) !== null) {
          const start = line.from + match.index;
          const end = start + match[0].length;
          if (isLineActive) {
            rangeDecos.push({
              from: start,
              to: end,
              deco: Decoration.mark({ class: 'cm-live-code-pill font-mono' })
            });
          } else {
            rangeDecos.push({
              from: start,
              to: start + 1,
              deco: Decoration.replace({})
            });
            rangeDecos.push({
              from: start + 1,
              to: end - 1,
              deco: Decoration.mark({ class: 'cm-live-code-pill' })
            });
            rangeDecos.push({
              from: end - 1,
              to: end,
              deco: Decoration.replace({})
            });
          }
        }

        // Bold: **bold** or __bold__
        const boldRegex = /(\*\*|__)(?!\s)(.+?)(?<!\s)\1/g;
        while ((match = boldRegex.exec(lineText)) !== null) {
          const start = line.from + match.index;
          const end = start + match[0].length;
          if (isLineActive) {
            rangeDecos.push({
              from: start,
              to: end,
              deco: Decoration.mark({ class: 'cm-live-bold' })
            });
          } else {
            rangeDecos.push({
              from: start,
              to: start + 2,
              deco: Decoration.replace({})
            });
            rangeDecos.push({
              from: start + 2,
              to: end - 2,
              deco: Decoration.mark({ class: 'cm-live-bold' })
            });
            rangeDecos.push({
              from: end - 2,
              to: end,
              deco: Decoration.replace({})
            });
          }
        }

        // Italic: *italic* or _italic_
        const italicRegex = /(?<!\*)\*([^*\n]+)\*(?!\*)|(?<!_)_([^_\n]+)_(?!_)/g;
        while ((match = italicRegex.exec(lineText)) !== null) {
          const start = line.from + match.index;
          const end = start + match[0].length;
          if (isLineActive) {
            rangeDecos.push({
              from: start,
              to: end,
              deco: Decoration.mark({ class: 'cm-live-italic' })
            });
          } else {
            rangeDecos.push({
              from: start,
              to: start + 1,
              deco: Decoration.replace({})
            });
            rangeDecos.push({
              from: start + 1,
              to: end - 1,
              deco: Decoration.mark({ class: 'cm-live-italic' })
            });
            rangeDecos.push({
              from: end - 1,
              to: end,
              deco: Decoration.replace({})
            });
          }
        }

        // Strikethrough: ~~strike~~
        const strikeRegex = /~~([^~\n]+)~~/g;
        while ((match = strikeRegex.exec(lineText)) !== null) {
          const start = line.from + match.index;
          const end = start + match[0].length;
          if (isLineActive) {
            rangeDecos.push({
              from: start,
              to: end,
              deco: Decoration.mark({ class: 'cm-live-strikethrough' })
            });
          } else {
            rangeDecos.push({
              from: start,
              to: start + 2,
              deco: Decoration.replace({})
            });
            rangeDecos.push({
              from: start + 2,
              to: end - 2,
              deco: Decoration.mark({ class: 'cm-live-strikethrough' })
            });
            rangeDecos.push({
              from: end - 2,
              to: end,
              deco: Decoration.replace({})
            });
          }
        }

        // Tags: #tag
        const tagRegex = /(?<=\s|^)#([a-zA-Z0-9_\-]+)/g;
        while ((match = tagRegex.exec(lineText)) !== null) {
          if (!headingMatch || match.index > 0) {
            const start = line.from + match.index;
            const end = start + match[0].length;
            rangeDecos.push({
              from: start,
              to: end,
              deco: Decoration.mark({ class: 'cm-live-tag' })
            });
          }
        }
      }

      if (lineDeco) {
        builder.add(line.from, line.from, lineDeco);
      }

      rangeDecos.sort((a, b) => a.from - b.from || a.to - b.to);

      let lastReplaceEnd = -1;
      for (const item of rangeDecos) {
        const isReplace = !item.deco.spec.class;
        if (isReplace) {
          if (item.from < lastReplaceEnd) continue;
          lastReplaceEnd = item.to;
        }
        if (item.from <= item.to && item.from >= line.from && item.to <= line.to) {
          builder.add(item.from, item.to, item.deco);
        }
      }

      pos = line.to + 1;
    }

    return builder.finish();
  } catch (err) {
    console.warn('Live markdown decoration error:', err);
    return Decoration.none;
  }
}

// =========================================================================
// CodeMirror StateField for Live Rendered Markdown Mode
// =========================================================================

export const liveMarkdownField = StateField.define<DecorationSet>({
  create(state) {
    return buildDecorations(state);
  },
  update(decorations, tr) {
    const prevTheme = tr.startState.facet(liveThemeFacet);
    const nextTheme = tr.state.facet(liveThemeFacet);
    if (
      tr.docChanged || 
      tr.selection || 
      prevTheme !== nextTheme ||
      tr.effects.some(e => e.is(refreshLiveMarkdownEffect))
    ) {
      return buildDecorations(tr.state);
    }
    return decorations.map(tr.changes);
  },
  provide: (f) => EditorView.decorations.from(f)
});

export function liveMarkdownExtension(
  enabled: boolean, 
  bridge?: IRuntimeBridge, 
  themeName: string = 'contextpad-dark'
): Extension {
  if (bridge) {
    activeBridge = bridge;
  }
  if (!enabled) return [];
  return [liveThemeFacet.of(themeName), liveMarkdownField];
}
