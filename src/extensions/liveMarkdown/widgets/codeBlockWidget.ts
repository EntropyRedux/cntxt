import { WidgetType, EditorView } from '@codemirror/view';
import { createElement, copyText } from '../../../adapters';
import { useNotificationStore } from '../../../store/notificationStore';
import { getLanguageMeta } from '../languageMeta';
import { getActiveBridge } from '../bridgeState';
import {
  toggleCodeBlockCollapseEffect,
  openCntxtReplyInputEffect,
  setCntxtBlockHoverEffect,
} from '../collapseState';
import {
  parseBlockInfoString,
  serializeBlockInfoString,
} from '../../../services/editor/cntxtBlockParser';
import { CntxtBlockParams } from '../../../../contracts/data_shapes';

export const STATUS_CYCLE = ['draft', 'review', 'approved', 'done'];

/**
 * Pure Lucide icon SVGs (matching lucide-react 24x24 stroke geometry).
 * Zero emojis or non-Lucide glyphs.
 */
export const LUCIDE_SVGS = {
  chevronRight:
    '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>',
  chevronDown:
    '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
  lock:
    '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  unlock:
    '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>',
  bot:
    '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>',
  hash:
    '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" x2="20" y1="9" y2="9"/><line x1="4" x2="20" y1="15" y2="15"/><line x1="10" x2="8" y1="3" y2="21"/><line x1="16" x2="14" y1="3" y2="21"/></svg>',
  tag:
    '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/></svg>',
  link2:
    '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 17H7A5 5 0 0 1 7 7h2"/><path d="M15 7h2a5 5 0 1 1 0 10h-2"/><line x1="8" x2="16" y1="12" y2="12"/></svg>',
  circleDot:
    '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>',
  checkCircle2:
    '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>',
  trash2:
    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>',
  copy:
    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>',
  check:
    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--status-success)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  slidersHorizontal:
    '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" x2="14" y1="4" y2="4"/><line x1="10" x2="3" y1="4" y2="4"/><line x1="21" x2="12" y1="12" y2="12"/><line x1="8" x2="3" y1="12" y2="12"/><line x1="21" x2="16" y1="20" y2="20"/><line x1="12" x2="3" y1="20" y2="20"/><line x1="14" x2="14" y1="2" y2="6"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="16" x2="16" y1="18" y2="22"/></svg>',
  chevronsDownUp:
    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m7 20 5-5 5 5"/><path d="m7 4 5 5 5-5"/></svg>',
  messageSquarePlus:
    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M12 7v6"/><path d="M9 10h6"/></svg>',
  send:
    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/></svg>',
  x:
    '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
  moreHorizontal:
    '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/><circle cx="5" cy="12" r="1.2"/></svg>',
  duplicate:
    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>',
  wrapText:
    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" x2="21" y1="6" y2="6"/><path d="M3 12h15a3 3 0 1 1 0 6h-4"/><polyline points="16 16 14 18 16 20"/><line x1="3" x2="10" y1="18" y2="18"/></svg>',
  sparkles:
    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>',
  settings:
    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  languages:
    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>',
};

export function getStatusColors(status: string): { text: string; bg: string; border: string } {
  const s = status.toLowerCase();
  if (s === 'approved' || s === 'done' || s === 'complete' || s === 'ready') {
    return {
      text: '#10B981',
      bg: 'rgba(16, 185, 129, 0.14)',
      border: 'rgba(16, 185, 129, 0.35)',
    };
  }
  if (s === 'review' || s === 'pending' || s === 'in-progress' || s === 'active') {
    return {
      text: '#38BDF8',
      bg: 'rgba(56, 189, 248, 0.14)',
      border: 'rgba(56, 189, 248, 0.35)',
    };
  }
  if (s === 'rejected' || s === 'blocked' || s === 'error') {
    return {
      text: '#F87171',
      bg: 'rgba(248, 113, 113, 0.14)',
      border: 'rgba(248, 113, 113, 0.35)',
    };
  }
  return {
    text: '#FBBF24',
    bg: 'rgba(251, 191, 36, 0.14)',
    border: 'rgba(251, 191, 36, 0.35)',
  };
}

/**
 * Helper to surgically update the opening fence line's `| params` inside the active EditorView.
 */
export function mutateHeaderLineParams(
  view: EditorView,
  startLine: number | undefined,
  updater: (current: CntxtBlockParams) => CntxtBlockParams,
  newType?: string
) {
  if (startLine === undefined || startLine < 1 || startLine > view.state.doc.lines) {
    return;
  }
  const lineObj = view.state.doc.line(startLine);
  const fenceMatch = lineObj.text.match(/^(\s*)(```+|~~~+)(.*)$/);
  if (!fenceMatch) return;

  const indent = fenceMatch[1];
  const fence = fenceMatch[2];
  const parsed = parseBlockInfoString(fenceMatch[3].trim());
  const nextParams = updater({ ...parsed.params });
  const targetType = newType !== undefined ? newType : (parsed.type || 'markdown');
  const newInfo = serializeBlockInfoString(targetType, nextParams, true);
  const nextLineText = `${indent}${fence}${newInfo}`;

  if (nextLineText !== lineObj.text) {
    view.dispatch({
      changes: { from: lineObj.from, to: lineObj.to, insert: nextLineText },
      userEvent: 'cntxt.governance.update',
    });
  }
}

let activeCodeBlockPopover: HTMLElement | null = null;
let activePopoverCleanup: (() => void) | null = null;

export function closeActiveCodeBlockPopover() {
  if (activePopoverCleanup) {
    activePopoverCleanup();
    activePopoverCleanup = null;
  }
  if (activeCodeBlockPopover) {
    const parentHeader = activeCodeBlockPopover.closest('.cm-live-codeblock-header') as HTMLElement | null;
    if (parentHeader) {
      parentHeader.style.zIndex = '';
    }
    activeCodeBlockPopover.remove();
    activeCodeBlockPopover = null;
  }
}

/**
 * Anchored 3-Dot Context Menu for code blocks
 */
function openCodeBlockContextMenu(
  anchorBtn: HTMLElement,
  view: EditorView,
  widget: CodeBlockHeaderWidget,
  parsed: ReturnType<typeof parseBlockInfoString>
) {
  closeActiveCodeBlockPopover();

  const headerEl = anchorBtn.closest('.cm-live-codeblock-header') as HTMLElement | null;
  if (!headerEl) return;
  headerEl.style.zIndex = '35';

  const menu = createElement('div', {
    className:
      'cm-codeblock-dropdown absolute right-2 top-full mt-1.5 w-56 rounded-lg bg-[var(--modal-bg)] border border-[var(--border-primary)] shadow-2xl py-1 z-50 text-[11.5px] font-sans backdrop-blur-md select-none',
  });
  menu.style.zIndex = '100';

  const addItem = (
    label: string,
    iconSvg: string,
    onClick: () => void,
    variant: 'default' | 'danger' | 'accent' = 'default'
  ) => {
    const item = createElement('button', {
      type: 'button',
      className: `w-full flex items-center gap-2.5 px-3 py-1.5 text-left text-[11px] cursor-pointer transition-colors ${
        variant === 'danger'
          ? 'text-[var(--status-error)] hover:bg-[var(--status-error)]/10'
          : variant === 'accent'
            ? 'text-[var(--accent-primary)] hover:bg-[var(--accent-container)]'
            : 'text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)]'
      }`,
    });
    const iconSpan = createElement('span', {
      className: 'w-4 h-4 flex items-center justify-center shrink-0 opacity-80',
    });
    iconSpan.innerHTML = iconSvg;
    item.appendChild(iconSpan);
    item.appendChild(createElement('span', { className: 'flex-1', textContent: label }));

    item.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    item.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeActiveCodeBlockPopover();
      onClick();
    });
    menu.appendChild(item);
  };

  const addDivider = () => {
    menu.appendChild(
      createElement('div', {
        className: 'my-1 border-t border-[var(--border-subtle)]',
      })
    );
  };

  // 1. Copy with Fences
  addItem('Copy with Fences', LUCIDE_SVGS.copy, async () => {
    if (widget.startLine !== undefined && widget.endLine !== undefined) {
      const doc = view.state.doc;
      if (widget.startLine <= doc.lines && widget.endLine <= doc.lines) {
        const fullBlockText = doc.sliceString(
          doc.line(widget.startLine).from,
          doc.line(widget.endLine).to
        );
        await copyText(fullBlockText, getActiveBridge() || undefined);
        useNotificationStore
          .getState()
          .addNotification('Copied', 'Block copied to clipboard with fences', 'info');
      }
    }
  });

  // 2. Duplicate Block
  addItem('Duplicate Block', LUCIDE_SVGS.duplicate, () => {
    if (widget.startLine !== undefined && widget.endLine !== undefined) {
      const doc = view.state.doc;
      if (widget.startLine <= doc.lines && widget.endLine <= doc.lines) {
        const fullBlockText = doc.sliceString(
          doc.line(widget.startLine).from,
          doc.line(widget.endLine).to
        );
        const endPos = doc.line(widget.endLine).to;
        view.dispatch({
          changes: { from: endPos, insert: '\n\n' + fullBlockText },
        });
        useNotificationStore
          .getState()
          .addNotification('Duplicated', 'Block duplicated below', 'info');
      }
    }
  });

  // 3. Toggle Word Wrap
  const isWrapped = parsed.params.rendererParams?.wrap === 'true';
  addItem(isWrapped ? 'Disable Word Wrap' : 'Enable Word Wrap', LUCIDE_SVGS.wrapText, () => {
    mutateHeaderLineParams(view, widget.startLine, (p) => {
      const nextRenderer = { ...(p.rendererParams || {}) };
      if (isWrapped) {
        delete nextRenderer.wrap;
      } else {
        nextRenderer.wrap = 'true';
      }
      return { ...p, rendererParams: nextRenderer };
    });
    useNotificationStore
      .getState()
      .addNotification(
        'Word Wrap',
        isWrapped ? 'Word wrap disabled for block' : 'Word wrap enabled for block',
        'info'
      );
  });

  addDivider();

  // 4. Convert to Rich Deliverable
  const isRich = widget.isRichContainer || parsed.isRichContainer;
  addItem(
    isRich ? 'Convert to Monospace Code' : 'Convert to Rich Deliverable',
    LUCIDE_SVGS.sparkles,
    () => {
      if (widget.startLine !== undefined && widget.endLine !== undefined) {
        const doc = view.state.doc;
        const lineObj = doc.line(widget.startLine);
        const fenceMatch = lineObj.text.match(/^(\s*)(```+|~~~+)(.*)$/);
        if (!fenceMatch) return;
        const indent = fenceMatch[1];
        if (isRich) {
          const nextInfo = serializeBlockInfoString('text', {}, false);
          view.dispatch({
            changes: { from: lineObj.from, to: lineObj.to, insert: `${indent}\`\`\`${nextInfo}` },
            userEvent: 'cntxt.governance.update',
          });
        } else {
          const nextParams: CntxtBlockParams = {
            ...parsed.params,
            id: parsed.params.id || `deliverable-${Date.now().toString(36)}`,
            status: parsed.params.status || 'review',
          };
          const nextInfo = serializeBlockInfoString('markdown', nextParams, true);
          view.dispatch({
            changes: { from: lineObj.from, to: lineObj.to, insert: `${indent}~~~${nextInfo}` },
            userEvent: 'cntxt.governance.update',
          });
        }
        useNotificationStore
          .getState()
          .addNotification(
            'Block Converted',
            isRich ? 'Converted to plain code block' : 'Converted to CNTXT Rich Deliverable',
            'success'
          );
      }
    }
  );

  // 5. Change Language
  addItem('Change Language...', LUCIDE_SVGS.languages, () => {
    openLanguagePromptPopover(anchorBtn, view, widget, parsed);
  });

  addDivider();

  // 6. Configure Parameters...
  addItem('⚙️ Configure Parameters...', LUCIDE_SVGS.settings, () => {
    openCodeBlockParamPopover(anchorBtn, view, widget, parsed);
  });

  addDivider();

  // 7. Delete Block
  addItem(
    'Delete Block',
    LUCIDE_SVGS.trash2,
    () => {
      if (parsed.params.locked === 'user') {
        useNotificationStore
          .getState()
          .addNotification('Block Locked', 'Unlock this block before deleting.', 'warning');
        return;
      }
      if (widget.startLine !== undefined && widget.endLine !== undefined) {
        const doc = view.state.doc;
        if (widget.startLine <= doc.lines && widget.endLine <= doc.lines) {
          const from = doc.line(widget.startLine).from;
          let to = doc.line(widget.endLine).to;
          if (to < doc.length) to += 1;
          view.dispatch({
            changes: { from, to, insert: '' },
            userEvent: 'delete.codeblock',
          });
          useNotificationStore
            .getState()
            .addNotification('Block Deleted', 'Block deleted (Ctrl+Z to undo)', 'info');
        }
      }
    },
    'danger'
  );

  headerEl.appendChild(menu);
  activeCodeBlockPopover = menu;

  const onDocMouseDown = (e: MouseEvent) => {
    if (!menu.contains(e.target as Node) && !anchorBtn.contains(e.target as Node)) {
      closeActiveCodeBlockPopover();
      if (!headerEl.contains(e.target as Node)) {
        view.dispatch({
          effects: setCntxtBlockHoverEffect.of(null),
        });
      }
    }
  };
  const onDocKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeActiveCodeBlockPopover();
      view.dispatch({
        effects: setCntxtBlockHoverEffect.of(null),
      });
    }
  };

  setTimeout(() => {
    document.addEventListener('mousedown', onDocMouseDown, true); // platform-leak-ignore: CodeMirror DOM popover listener
    document.addEventListener('keydown', onDocKeyDown, true); // platform-leak-ignore: CodeMirror DOM popover listener
  }, 10);

  activePopoverCleanup = () => {
    document.removeEventListener('mousedown', onDocMouseDown, true); // platform-leak-ignore: CodeMirror DOM popover listener
    document.removeEventListener('keydown', onDocKeyDown, true); // platform-leak-ignore: CodeMirror DOM popover listener
  };
}

/**
 * Anchored Parameter Configuration Popover (The In-Context Builder)
 */
function openCodeBlockParamPopover(
  anchorBtn: HTMLElement,
  view: EditorView,
  widget: CodeBlockHeaderWidget,
  parsed: ReturnType<typeof parseBlockInfoString>
) {
  closeActiveCodeBlockPopover();

  const headerEl = anchorBtn.closest('.cm-live-codeblock-header') as HTMLElement | null;
  if (!headerEl) return;
  headerEl.style.zIndex = '35';

  const popover = createElement('div', {
    className:
      'cm-codeblock-param-popover absolute right-2 top-full mt-1.5 w-80 rounded-xl bg-[var(--modal-bg)] border border-[var(--border-primary)] shadow-2xl p-3 z-50 text-[11.5px] font-sans backdrop-blur-md select-none',
  });
  popover.style.zIndex = '100';

  // Header
  const popHeader = createElement('div', {
    className: 'flex items-center justify-between pb-2 mb-2 border-b border-[var(--border-subtle)]',
  });
  const popTitle = createElement('span', {
    className: 'font-semibold text-[var(--text-primary)] text-[12px] flex items-center gap-1.5',
    textContent: 'Block Parameters & Governance',
  });
  const closeBtn = createElement('button', {
    type: 'button',
    className: 'p-1 rounded hover:bg-[var(--card-hover-bg)] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer',
    title: 'Close',
  });
  closeBtn.innerHTML = LUCIDE_SVGS.x;
  closeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeActiveCodeBlockPopover();
  });
  popHeader.appendChild(popTitle);
  popHeader.appendChild(closeBtn);
  popover.appendChild(popHeader);

  // Field: ID
  const idRow = createElement('div', { className: 'mb-2' });
  idRow.appendChild(createElement('label', { className: 'block text-[10.5px] font-medium text-[var(--text-secondary)] mb-1', textContent: 'Block ID' }));
  const idInput = createElement('input', {
    type: 'text',
    className: 'w-full px-2 py-1 rounded bg-[var(--card-secondary-bg)] border border-[var(--border-subtle)] text-[11px] font-mono text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]',
    placeholder: 'e.g. arch-spec-1',
  }) as HTMLInputElement;
  idInput.value = parsed.params.id || '';
  idRow.appendChild(idInput);
  popover.appendChild(idRow);

  // Field: Status (Cycle pills)
  const statusRow = createElement('div', { className: 'mb-2' });
  statusRow.appendChild(createElement('label', { className: 'block text-[10.5px] font-medium text-[var(--text-secondary)] mb-1', textContent: 'Status' }));
  const statusWrap = createElement('div', { className: 'flex items-center gap-1.5' });
  let selectedStatus = parsed.params.status || 'review';
  const statusButtons: HTMLButtonElement[] = [];

  STATUS_CYCLE.forEach((st) => {
    const btn = createElement('button', {
      type: 'button',
      className: `px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wide border cursor-pointer transition-all ${
        selectedStatus.toLowerCase() === st
          ? 'bg-[var(--accent-container)] text-[var(--accent-primary)] border-[var(--accent-primary)]'
          : 'bg-[var(--card-secondary-bg)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
      }`,
      textContent: st,
    }) as HTMLButtonElement;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      selectedStatus = st;
      statusButtons.forEach((b) => {
        b.className = `px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wide border cursor-pointer transition-all ${
          b.textContent?.toLowerCase() === st
            ? 'bg-[var(--accent-container)] text-[var(--accent-primary)] border-[var(--accent-primary)]'
            : 'bg-[var(--card-secondary-bg)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
        }`;
      });
    });
    statusButtons.push(btn);
    statusWrap.appendChild(btn);
  });
  statusRow.appendChild(statusWrap);
  popover.appendChild(statusRow);

  // Field: Lock State
  const lockRow = createElement('div', { className: 'mb-2' });
  lockRow.appendChild(createElement('label', { className: 'block text-[10.5px] font-medium text-[var(--text-secondary)] mb-1', textContent: 'Lock Protection' }));
  const lockWrap = createElement('div', { className: 'flex items-center gap-1.5' });
  let selectedLock: 'unlocked' | 'user' = parsed.params.locked === 'user' ? 'user' : 'unlocked';
  const lockPills: HTMLButtonElement[] = [];

  const updateLockPills = () => {
    lockPills.forEach((p) => {
      const isAct = (p.dataset.lock === selectedLock);
      p.className = `flex-1 py-1 rounded text-[10.5px] font-medium text-center border cursor-pointer transition-all ${
        isAct
          ? 'bg-[var(--accent-container)] text-[var(--accent-primary)] border-[var(--accent-primary)]'
          : 'bg-[var(--card-secondary-bg)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
      }`;
    });
  };

  const unlockedPill = createElement('button', {
    type: 'button',
    textContent: 'Unlocked (Editable)',
  }) as HTMLButtonElement;
  unlockedPill.dataset.lock = 'unlocked';
  unlockedPill.addEventListener('click', (e) => {
    e.preventDefault();
    selectedLock = 'unlocked';
    updateLockPills();
  });
  lockPills.push(unlockedPill);
  lockWrap.appendChild(unlockedPill);

  const lockedPill = createElement('button', {
    type: 'button',
    textContent: '🔒 Locked by User',
  }) as HTMLButtonElement;
  lockedPill.dataset.lock = 'user';
  lockedPill.addEventListener('click', (e) => {
    e.preventDefault();
    selectedLock = 'user';
    updateLockPills();
  });
  lockPills.push(lockedPill);
  lockWrap.appendChild(lockedPill);
  updateLockPills();
  lockRow.appendChild(lockWrap);
  popover.appendChild(lockRow);

  // Field: Tags
  const tagsRow = createElement('div', { className: 'mb-2' });
  tagsRow.appendChild(createElement('label', { className: 'block text-[10.5px] font-medium text-[var(--text-secondary)] mb-1', textContent: 'Tags (comma separated)' }));
  const tagsInput = createElement('input', {
    type: 'text',
    className: 'w-full px-2 py-1 rounded bg-[var(--card-secondary-bg)] border border-[var(--border-subtle)] text-[11px] font-mono text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]',
    placeholder: 'e.g. deliverable, spec, v1',
  }) as HTMLInputElement;
  tagsInput.value = (parsed.params.tags || []).join(', ');
  tagsRow.appendChild(tagsInput);
  popover.appendChild(tagsRow);

  // Field: Title / Label
  const titleRow = createElement('div', { className: 'mb-3' });
  titleRow.appendChild(createElement('label', { className: 'block text-[10.5px] font-medium text-[var(--text-secondary)] mb-1', textContent: 'Title / Label' }));
  const titleInput = createElement('input', {
    type: 'text',
    className: 'w-full px-2 py-1 rounded bg-[var(--card-secondary-bg)] border border-[var(--border-subtle)] text-[11px] font-mono text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]',
    placeholder: 'e.g. Sprint Architecture Spec',
  }) as HTMLInputElement;
  titleInput.value = parsed.params.label || '';
  titleRow.appendChild(titleInput);
  popover.appendChild(titleRow);

  // Apply Button
  const applyBtn = createElement('button', {
    type: 'button',
    className: 'w-full py-1.5 rounded-lg bg-[var(--accent-primary)] text-white font-medium text-[11.5px] cursor-pointer hover:opacity-90 active:scale-98 transition-all',
    textContent: 'Apply Parameters',
  });
  applyBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();

    const cleanId = idInput.value.trim();
    const cleanTags = tagsInput.value.split(',').map((t) => t.trim()).filter(Boolean);
    const cleanTitle = titleInput.value.trim();

    mutateHeaderLineParams(view, widget.startLine, (p) => {
      const next: CntxtBlockParams = { ...p };
      if (cleanId) next.id = cleanId;
      else delete next.id;

      if (cleanTags.length > 0) next.tags = cleanTags;
      else delete next.tags;

      if (selectedLock === 'user') next.locked = 'user';
      else delete next.locked;

      if (selectedStatus) next.status = selectedStatus;

      if (cleanTitle) next.label = cleanTitle;
      else delete next.label;

      return next;
    });

    closeActiveCodeBlockPopover();
    useNotificationStore.getState().addNotification('Parameters Updated', 'Block parameters saved', 'success');
  });
  popover.appendChild(applyBtn);

  headerEl.appendChild(popover);
  activeCodeBlockPopover = popover;

  const onDocMouseDown = (e: MouseEvent) => {
    if (!popover.contains(e.target as Node) && !anchorBtn.contains(e.target as Node)) {
      closeActiveCodeBlockPopover();
      if (!headerEl.contains(e.target as Node)) {
        view.dispatch({
          effects: setCntxtBlockHoverEffect.of(null),
        });
      }
    }
  };
  const onDocKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeActiveCodeBlockPopover();
      view.dispatch({
        effects: setCntxtBlockHoverEffect.of(null),
      });
    }
  };

  setTimeout(() => {
    document.addEventListener('mousedown', onDocMouseDown, true); // platform-leak-ignore: CodeMirror DOM popover listener
    document.addEventListener('keydown', onDocKeyDown, true); // platform-leak-ignore: CodeMirror DOM popover listener
    idInput.focus();
  }, 10);

  activePopoverCleanup = () => {
    document.removeEventListener('mousedown', onDocMouseDown, true); // platform-leak-ignore: CodeMirror DOM popover listener
    document.removeEventListener('keydown', onDocKeyDown, true); // platform-leak-ignore: CodeMirror DOM popover listener
  };
}

/**
 * Anchored Quick Language Selector Popover
 */
function openLanguagePromptPopover(
  anchorBtn: HTMLElement,
  view: EditorView,
  widget: CodeBlockHeaderWidget,
  parsed: ReturnType<typeof parseBlockInfoString>
) {
  closeActiveCodeBlockPopover();

  const headerEl = anchorBtn.closest('.cm-live-codeblock-header') as HTMLElement | null;
  if (!headerEl) return;
  headerEl.style.zIndex = '35';

  const popover = createElement('div', {
    className:
      'cm-codeblock-lang-popover absolute right-2 top-full mt-1.5 w-64 rounded-xl bg-[var(--modal-bg)] border border-[var(--border-primary)] shadow-2xl p-2.5 z-50 text-[11.5px] font-sans backdrop-blur-md select-none',
  });
  popover.style.zIndex = '100';

  const title = createElement('div', {
    className: 'font-semibold text-[var(--text-primary)] text-[11px] mb-2',
    textContent: 'Change Language / Mode',
  });
  popover.appendChild(title);

  // Common quick chips
  const quickLangs = ['python', 'typescript', 'javascript', 'bash', 'json', 'sql', 'yaml', 'markdown', 'rust', 'html', 'css'];
  const chipsWrap = createElement('div', { className: 'flex flex-wrap gap-1 mb-2.5' });

  const langInput = createElement('input', {
    type: 'text',
    className: 'w-full px-2 py-1 rounded bg-[var(--card-secondary-bg)] border border-[var(--border-subtle)] text-[11px] font-mono text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] mb-2',
    placeholder: 'Type language name...',
  }) as HTMLInputElement;
  langInput.value = parsed.type || 'text';

  quickLangs.forEach((ql) => {
    const chip = createElement('button', {
      type: 'button',
      className: `px-1.5 py-0.5 rounded text-[10px] font-mono border cursor-pointer transition-colors ${
        (parsed.type || '').toLowerCase() === ql
          ? 'bg-[var(--accent-container)] text-[var(--accent-primary)] border-[var(--accent-primary)]'
          : 'bg-[var(--card-secondary-bg)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
      }`,
      textContent: ql,
    });
    chip.addEventListener('click', (e) => {
      e.preventDefault();
      langInput.value = ql;
    });
    chipsWrap.appendChild(chip);
  });
  popover.appendChild(chipsWrap);
  popover.appendChild(langInput);

  const applyBtn = createElement('button', {
    type: 'button',
    className: 'w-full py-1 rounded bg-[var(--accent-primary)] text-white font-medium text-[11px] cursor-pointer hover:opacity-90',
    textContent: 'Set Language',
  });
  applyBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const newLang = langInput.value.trim().toLowerCase() || 'text';
    mutateHeaderLineParams(view, widget.startLine, (p) => p, newLang);
    closeActiveCodeBlockPopover();
    useNotificationStore.getState().addNotification('Language Updated', `Language set to ${newLang}`, 'info');
  });
  popover.appendChild(applyBtn);

  headerEl.appendChild(popover);
  activeCodeBlockPopover = popover;

  const onDocMouseDown = (e: MouseEvent) => {
    if (!popover.contains(e.target as Node) && !anchorBtn.contains(e.target as Node)) {
      closeActiveCodeBlockPopover();
      if (!headerEl.contains(e.target as Node)) {
        view.dispatch({
          effects: setCntxtBlockHoverEffect.of(null),
        });
      }
    }
  };
  const onDocKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeActiveCodeBlockPopover();
      view.dispatch({
        effects: setCntxtBlockHoverEffect.of(null),
      });
    } else if (e.key === 'Enter') {
      applyBtn.click();
    }
  };

  setTimeout(() => {
    document.addEventListener('mousedown', onDocMouseDown, true); // platform-leak-ignore: CodeMirror DOM popover listener
    document.addEventListener('keydown', onDocKeyDown, true); // platform-leak-ignore: CodeMirror DOM popover listener
    langInput.focus();
    langInput.select();
  }, 10);

  activePopoverCleanup = () => {
    document.removeEventListener('mousedown', onDocMouseDown, true); // platform-leak-ignore: CodeMirror DOM popover listener
    document.removeEventListener('keydown', onDocKeyDown, true); // platform-leak-ignore: CodeMirror DOM popover listener
  };
}


export class CodeBlockHeaderWidget extends WidgetType {
  constructor(
    readonly language: string,
    readonly codeContent: string,
    readonly linePos: number,
    readonly startLine?: number,
    readonly endLine?: number,
    readonly isCollapsed: boolean = false,
    readonly lineCount: number = 0,
    readonly isRichContainer: boolean = false
  ) {
    super();
  }

  eq(other: CodeBlockHeaderWidget): boolean {
    return (
      this.language === other.language &&
      this.linePos === other.linePos &&
      this.startLine === other.startLine &&
      this.endLine === other.endLine &&
      this.isCollapsed === other.isCollapsed &&
      this.lineCount === other.lineCount &&
      this.isRichContainer === other.isRichContainer
    );
  }

  updateDOM(_dom: HTMLElement, _view: EditorView): boolean {
    return false;
  }

  toDOM(view: EditorView): HTMLElement {
    const parsed = parseBlockInfoString(this.language);
    const isCntxt = parsed.isCNTXT;
    const isRich = this.isRichContainer || parsed.isRichContainer;
    const params = parsed.params;

    const meta = getLanguageMeta(
      parsed.type || (isRich ? 'markdown' : this.language)
    );

    const header = createElement('div', {
      className: `cm-live-codeblock-header group relative ${
        isRich
          ? 'cm-cntxt-container-header'
          : isCntxt
            ? 'cm-live-codeblock-header-governed'
            : ''
      } ${
        this.isCollapsed
          ? 'cm-codeblock-header-collapsed rounded-[7px] border-b-transparent shadow-sm'
          : 'rounded-t-[7px]'
      } select-none flex items-center justify-between px-3.5 py-2 border-b border-[var(--codeblock-header-border)] bg-[var(--codeblock-header-bg)] text-[var(--text-secondary)] w-full cursor-pointer gap-2`,
    });

    if (isRich && this.startLine !== undefined) {
      header.addEventListener('mouseenter', () => {
        view.dispatch({
          effects: setCntxtBlockHoverEffect.of(this.startLine!),
        });
      });
      header.addEventListener('mouseleave', (e: MouseEvent) => {
        if (activeCodeBlockPopover) {
          return;
        }
        const rel = e.relatedTarget as HTMLElement | null;
        if (
          rel &&
          (header.contains(rel) ||
            rel.closest(
              '.cm-codeblock-dropdown, .cm-codeblock-param-popover, .cm-codeblock-lang-popover'
            ))
        ) {
          return;
        }
        view.dispatch({
          effects: setCntxtBlockHoverEffect.of(null),
        });
      });
    }

    header.addEventListener('click', (e) => {
      const target = e.target as HTMLElement | null;
      if (
        !target?.closest('.cm-live-copy-code-btn') &&
        !target?.closest('.cm-live-clear-code-btn') &&
        !target?.closest('.cm-live-collapse-btn') &&
        !target?.closest('.cm-cntxt-gov-pill') &&
        !target?.closest('.cm-codeblock-menu-btn') &&
        !target?.closest('.cm-codeblock-dropdown') &&
        !target?.closest('.cm-codeblock-param-popover') &&
        !target?.closest('.cm-codeblock-lang-popover')
      ) {
        if (this.isCollapsed && this.startLine !== undefined) {
          view.dispatch({
            effects: toggleCodeBlockCollapseEffect.of(this.startLine),
          });
          return;
        }
        // Do not focus this.linePos (the raw fence line) to avoid fence traps.
      }
    });

    const left = createElement('div', {
      className: 'flex items-center gap-1.5 overflow-hidden min-w-0 flex-1',
    });

    // 1. Collapse toggle button (Lucide chevron)
    const collapseBtn = createElement('button', {
      type: 'button',
      className:
        'cm-live-collapse-btn p-1 -ml-1 rounded hover:bg-[var(--card-hover-bg)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all cursor-pointer flex items-center justify-center shrink-0',
      title: this.isCollapsed ? 'Expand block' : 'Collapse block',
      'aria-label': this.isCollapsed ? 'Expand block' : 'Collapse block',
    });
    collapseBtn.innerHTML = this.isCollapsed ? LUCIDE_SVGS.chevronRight : LUCIDE_SVGS.chevronDown;

    collapseBtn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    collapseBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (this.startLine !== undefined) {
        const doc = view.state.doc;
        const headLine = doc.lineAt(view.state.selection.main.head).number;
        const shouldMoveCursor =
          !this.isCollapsed &&
          this.endLine !== undefined &&
          headLine > this.startLine &&
          headLine <= this.endLine;

        view.dispatch({
          effects: toggleCodeBlockCollapseEffect.of(this.startLine),
          ...(shouldMoveCursor ? { selection: { anchor: doc.line(this.startLine).from } } : {}),
        });
      }
    });
    left.appendChild(collapseBtn);

    // 2. Fixed Core Identity: Status dot & Source/Type badge
    const dot = createElement('span', {
      className: 'w-2 h-2 rounded-full inline-block shrink-0',
    });
    dot.style.backgroundColor = meta.color;
    left.appendChild(dot);

    const badge = createElement('span', {
      className:
        'px-2 py-0.5 rounded text-[10px] font-mono font-semibold tracking-wider uppercase shrink-0',
    });
    badge.style.color = meta.color;
    badge.style.backgroundColor = meta.bg;
    badge.textContent = meta.name;
    left.appendChild(badge);

    // 3. Collapsed line count pill
    if (this.isCollapsed && this.lineCount > 0) {
      const lineCountBadge = createElement('span', {
        className:
          'px-1.5 py-0.5 rounded text-[10px] font-mono font-medium text-[var(--text-muted)] bg-[var(--card-secondary-bg)] border border-[var(--border-subtle)] shrink-0',
        textContent: `${this.lineCount} ${this.lineCount === 1 ? 'line' : 'lines'}`,
      });
      left.appendChild(lineCountBadge);
    }

    // 4. Identity & Optional Custom Title
    if (isCntxt && params.label) {
      const titleSpan = createElement('span', {
        className:
          'text-[11px] font-semibold text-[var(--text-primary)] truncate max-w-[220px] min-w-[40px]',
        title: params.label,
        textContent: params.label,
      });
      left.appendChild(titleSpan);
    }

    header.appendChild(left);

    const right = createElement('div', {
      className: 'flex items-center gap-1.5 shrink-0',
    });

    const isUserLocked = params.locked === 'user';
    const isAgentLocked = params.locked === 'agent';

    // 5. Universal Lock Toggle Button (works on ALL code blocks)
    // If locked: always visible (opacity-100). If unlocked: fades in on header hover.
    const lockBtn = createElement('button', {
      type: 'button',
      className: `cm-cntxt-gov-pill cm-codeblock-action-btn flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium transition-all cursor-pointer shrink-0 border ${
        isUserLocked
          ? 'cm-cntxt-pill-user opacity-100'
          : isAgentLocked
            ? 'cm-cntxt-pill-agent opacity-100'
            : 'cm-codeblock-hover-action opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-[var(--card-secondary-bg)] border-[var(--border-subtle)]'
      }`,
      title: isUserLocked
        ? 'Locked by User — Click to unlock'
        : isAgentLocked
          ? 'Agent-Managed Block — Click to lock as User'
          : 'Lock block (prevents editing)',
    });

    const lockIconBox = createElement('span', {
      className: `cm-cntxt-pill-icon-box w-4 h-4 rounded flex items-center justify-center shrink-0 ${
        isUserLocked
          ? ''
          : isAgentLocked
            ? ''
            : 'bg-[var(--card-hover-bg)] text-[var(--text-muted)]'
      }`,
    });
    lockIconBox.innerHTML = isUserLocked
      ? LUCIDE_SVGS.lock
      : isAgentLocked
        ? LUCIDE_SVGS.bot
        : LUCIDE_SVGS.unlock;
    lockBtn.appendChild(lockIconBox);

    if (isUserLocked || isAgentLocked) {
      const lockLabelSpan = createElement('span', {
        className: 'cm-codeblock-btn-label pr-0.5',
        textContent: isUserLocked ? 'user' : 'agent',
      });
      lockBtn.appendChild(lockLabelSpan);
    }

    lockBtn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    lockBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      mutateHeaderLineParams(view, this.startLine, (p) => {
        const next = { ...p };
        if (next.locked === 'user') {
          delete next.locked;
        } else {
          next.locked = 'user';
        }
        return next;
      });
    });
    right.appendChild(lockBtn);

    // 5. Clear Button (respects `locked=user`, Lucide Trash2 icon, hover visible)
    const clearBtn = createElement('button', {
      type: 'button',
      className: `cm-live-clear-code-btn cm-codeblock-action-btn cm-codeblock-hover-action opacity-0 group-hover:opacity-100 flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium ${
        isUserLocked
          ? 'text-[var(--text-muted)] opacity-50 cursor-not-allowed'
          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] active:scale-95 cursor-pointer'
      } transition-all shrink-0`,
      title: isUserLocked
        ? 'Block is locked by user — unlock first to clear'
        : 'Clear block content (Undo with Ctrl+Z)',
      'aria-label': `Clear ${meta.name} block`,
    });

    const clearIcon = createElement('span', {
      className: 'flex items-center justify-center shrink-0',
    });
    clearIcon.innerHTML = LUCIDE_SVGS.trash2;
    clearBtn.appendChild(clearIcon);

    const clearLabel = createElement('span', { className: 'cm-codeblock-btn-label' });
    clearLabel.textContent = 'Clear';
    clearBtn.appendChild(clearLabel);

    clearBtn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    clearBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (isUserLocked) {
        useNotificationStore
          .getState()
          .addNotification('Block Locked', 'Unlock this block first before clearing.', 'warning');
        return;
      }

      if (
        this.startLine !== undefined &&
        this.endLine !== undefined &&
        this.endLine >= this.startLine
      ) {
        const doc = view.state.doc;
        if (this.startLine <= doc.lines && this.endLine <= doc.lines) {
          const startLineObj = doc.line(this.startLine);
          const from = Math.min(doc.length, startLineObj.to + 1);
          const endLineObj = doc.line(this.endLine);
          const to = endLineObj.from;
          if (to >= from) {
            const currentInner = doc.sliceString(from, to);
            if (currentInner !== '\n') {
              view.dispatch({
                changes: { from, to, insert: '\n' },
                selection: { anchor: from },
                userEvent: 'delete.codeblock',
              });
            } else {
              view.dispatch({
                selection: { anchor: from },
              });
            }
            view.focus();
            clearLabel.textContent = 'Cleared!';
            clearBtn.classList.add('text-[var(--status-success)]');
            setTimeout(() => {
              clearLabel.textContent = 'Clear';
              clearBtn.classList.remove('text-[var(--status-success)]');
            }, 1500);
          }
        }
      }
    });

    right.appendChild(clearBtn);

    // 7. Copy Button (Lucide Copy icon, hover visible)
    const copyBtn = createElement('button', {
      type: 'button',
      className:
        'cm-live-copy-code-btn cm-codeblock-action-btn cm-codeblock-hover-action opacity-0 group-hover:opacity-100 flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] active:scale-95 transition-all cursor-pointer shrink-0',
      title: 'Copy block content',
      'aria-label': `Copy ${meta.name} content`,
    });

    const copyIcon = createElement('span', {
      className: 'flex items-center justify-center shrink-0',
    });
    copyIcon.innerHTML = LUCIDE_SVGS.copy;
    copyBtn.appendChild(copyIcon);

    const copyLabel = createElement('span', { className: 'cm-codeblock-btn-label' });
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
        let contentToCopy = this.codeContent;
        if (this.startLine !== undefined && this.endLine !== undefined) {
          const doc = view.state.doc;
          if (this.startLine < doc.lines && this.endLine <= doc.lines) {
            const fromPos = doc.line(this.startLine + 1).from;
            const toPos = doc.line(this.endLine - 1).to;
            if (toPos >= fromPos) {
              contentToCopy = doc.sliceString(fromPos, toPos);
            }
          }
        }
        await copyText(contentToCopy, getActiveBridge() || undefined);
        copyLabel.textContent = 'Copied!';
        copyBtn.classList.add('text-[var(--status-success)]');
        copyIcon.innerHTML = LUCIDE_SVGS.check;
        setTimeout(() => {
          copyLabel.textContent = 'Copy';
          copyBtn.classList.remove('text-[var(--status-success)]');
          copyIcon.innerHTML = LUCIDE_SVGS.copy;
        }, 2000);
      } catch (err) {
        console.error('Failed to copy code snippet', err);
        useNotificationStore
          .getState()
          .addNotification('Clipboard Error', 'Failed to copy content to clipboard', 'error');
      }
    });

    right.appendChild(copyBtn);

    // 8. 3-Dot Menu Button (Lucide MoreHorizontal icon, hover visible)
    const menuBtn = createElement('button', {
      type: 'button',
      className:
        'cm-codeblock-menu-btn cm-codeblock-action-btn cm-codeblock-hover-action opacity-0 group-hover:opacity-100 flex items-center justify-center p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] active:scale-95 transition-all cursor-pointer shrink-0',
      title: 'Block actions & advanced setup...',
      'aria-label': 'Block menu',
    });
    const menuIcon = createElement('span', {
      className: 'flex items-center justify-center shrink-0',
    });
    menuIcon.innerHTML = LUCIDE_SVGS.moreHorizontal;
    menuBtn.appendChild(menuIcon);

    menuBtn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    menuBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openCodeBlockContextMenu(menuBtn, view, this, parsed);
    });

    right.appendChild(menuBtn);
    header.appendChild(right);
    return header;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

export class CodeBlockFooterWidget extends WidgetType {
  constructor(
    readonly isRichContainer: boolean = false,
    readonly language: string = ''
  ) {
    super();
  }

  toDOM(): HTMLElement {
    const parsed = this.language ? parseBlockInfoString(this.language) : null;
    const isCntxt = parsed?.isCNTXT ?? false;
    const params = parsed?.params ?? {};
    const hasMetadata =
      isCntxt &&
      Boolean(
        params.id ||
          (params.tags && params.tags.length > 0) ||
          (params.link && params.link.length > 0)
      );

    if (!hasMetadata) {
      return createElement('div', {
        className: `cm-live-codeblock-footer ${this.isRichContainer ? 'cm-cntxt-container-footer' : ''} select-none h-2 w-full`,
      });
    }

    const footer = createElement('div', {
      className: `cm-live-codeblock-footer cm-cntxt-container-footer cm-cntxt-metadata-rail select-none flex items-center gap-2 py-1 px-2 w-full overflow-x-auto no-scrollbar`,
    });

    if (params.id) {
      const idPill = createElement('button', {
        type: 'button',
        className:
          'cm-cntxt-gov-pill flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-[var(--card-secondary-bg)] border border-[var(--border-subtle)] shrink-0 cursor-pointer transition-colors',
        title: `Block ID: ${params.id} (Click to copy ID)`,
      });
      const hashIcon = createElement('span', {
        className: 'flex items-center justify-center text-[var(--accent-primary)] shrink-0',
      });
      hashIcon.innerHTML = LUCIDE_SVGS.hash;
      idPill.appendChild(hashIcon);

      const idText = createElement('span', { textContent: params.id });
      idPill.appendChild(idText);

      idPill.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
      idPill.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await copyText(params.id!, getActiveBridge() || undefined);
        idText.textContent = 'Copied!';
        setTimeout(() => {
          idText.textContent = params.id!;
        }, 1200);
      });
      footer.appendChild(idPill);
    }

    if (params.tags && params.tags.length > 0) {
      for (const tag of params.tags) {
        const tagChip = createElement('span', {
          className:
            'flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-mono text-[var(--text-muted)] bg-[var(--card-secondary-bg)]/70 border border-[var(--border-subtle)] shrink-0',
        });
        const tagIcon = createElement('span', {
          className: 'flex items-center justify-center opacity-70 shrink-0',
        });
        tagIcon.innerHTML = LUCIDE_SVGS.tag;
        tagChip.appendChild(tagIcon);

        const tagText = createElement('span', { textContent: tag });
        tagChip.appendChild(tagText);
        footer.appendChild(tagChip);
      }
    }

    if (params.link && params.link.length > 0) {
      const linkChip = createElement('span', {
        className:
          'flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-mono text-[var(--accent-primary)] bg-[var(--card-secondary-bg)] border border-[var(--border-subtle)] shrink-0',
        title: `Links to: ${params.link.join(', ')}`,
      });
      const linkIcon = createElement('span', {
        className: 'flex items-center justify-center shrink-0',
      });
      linkIcon.innerHTML = LUCIDE_SVGS.link2;
      linkChip.appendChild(linkIcon);

      const linkText = createElement('span', {
        textContent: `${params.link[0]}${params.link.length > 1 ? ` +${params.link.length - 1}` : ''}`,
      });
      linkChip.appendChild(linkText);
      footer.appendChild(linkChip);
    }

    return footer;
  }

  eq(other: CodeBlockFooterWidget): boolean {
    return (
      this.isRichContainer === other.isRichContainer &&
      this.language === other.language
    );
  }

  ignoreEvent(): boolean {
    return true;
  }
}
