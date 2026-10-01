import { WidgetType, EditorView } from '@codemirror/view';
import { createElement, getRuntimeBridge } from '../../../adapters';
import { getActiveBridge } from '../bridgeState';

export class TaskCheckboxWidget extends WidgetType {
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

export class BulletWidget extends WidgetType {
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

export class HrWidget extends WidgetType {
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

export class LinkWidget extends WidgetType {
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
      title: `Click or Ctrl+Right-click to open in browser: ${this.url}`,
      textContent: this.text || this.url
    }) as HTMLAnchorElement;
    
    const icon = createElement('span', {
      className: 'text-[0.75em] opacity-70 pointer-events-none',
      textContent: '↗'
    });
    a.appendChild(icon);

    const openLink = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const bridge = getActiveBridge() || getRuntimeBridge();
      bridge?.openExternalUrl?.(this.url);
    };

    a.addEventListener('click', (e) => {
      openLink(e);
    });

    a.addEventListener('contextmenu', (e) => {
      if (e.ctrlKey || e.metaKey) {
        openLink(e);
      }
    });

    return a;
  }

  ignoreEvent(): boolean {
    return true;
  }
}
