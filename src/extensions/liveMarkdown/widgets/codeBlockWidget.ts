import { WidgetType, EditorView } from '@codemirror/view';
import { createElement, copyText } from '../../../adapters';
import { useNotificationStore } from '../../../store/notificationStore';
import { getLanguageMeta } from '../languageMeta';
import { getActiveBridge } from '../bridgeState';

export class CodeBlockHeaderWidget extends WidgetType {
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
        await copyText(this.codeContent, getActiveBridge() || undefined);
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
        useNotificationStore.getState().addNotification('Clipboard Error', 'Failed to copy code snippet to clipboard', 'error');
      }
    });

    header.appendChild(copyBtn);
    return header;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

export class CodeBlockFooterWidget extends WidgetType {
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
