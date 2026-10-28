import { WidgetType, EditorView } from '@codemirror/view';
import { createElement, copyText } from '../../../adapters';
import { useNotificationStore } from '../../../store/notificationStore';
import { getLanguageMeta } from '../languageMeta';
import { getActiveBridge } from '../bridgeState';
import {
  toggleCodeBlockCollapseEffect,
  openCntxtReplyInputEffect,
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
  updater: (current: CntxtBlockParams) => CntxtBlockParams
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
  const newInfo = serializeBlockInfoString(parsed.type || 'markdown', nextParams, true);
  const nextLineText = `${indent}${fence}${newInfo}`;

  if (nextLineText !== lineObj.text) {
    view.dispatch({
      changes: { from: lineObj.from, to: lineObj.to, insert: nextLineText },
      userEvent: 'cntxt.governance.update',
    });
  }
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
    return true;
  }

  toDOM(view: EditorView): HTMLElement {
    const parsed = parseBlockInfoString(this.language);
    const isCntxt = parsed.isCNTXT;
    const isRich = this.isRichContainer || parsed.isRichContainer;
    const params = parsed.params;

    const meta = getLanguageMeta(
      isRich && isCntxt && (!parsed.type || parsed.type === 'markdown')
        ? 'deliverable'
        : this.language
    );

    const header = createElement('div', {
      className: `cm-live-codeblock-header ${isRich || isCntxt ? 'cm-cntxt-container-header' : ''} ${
        this.isCollapsed
          ? 'cm-codeblock-header-collapsed rounded-[7px] border-b-transparent shadow-sm'
          : 'rounded-t-[7px]'
      } select-none flex items-center justify-between px-3 py-1.5 border-b border-[var(--codeblock-header-border)] bg-[var(--codeblock-header-bg)] text-[var(--text-secondary)] w-full cursor-pointer gap-2`,
    });

    header.addEventListener('click', (e) => {
      const target = e.target as HTMLElement | null;
      if (
        !target?.closest('.cm-live-copy-code-btn') &&
        !target?.closest('.cm-live-clear-code-btn') &&
        !target?.closest('.cm-live-collapse-btn') &&
        !target?.closest('.cm-cntxt-gov-pill')
      ) {
        if (this.isCollapsed && this.startLine !== undefined) {
          view.dispatch({
            effects: toggleCodeBlockCollapseEffect.of(this.startLine),
          });
          return;
        }
        view.dispatch({
          selection: { anchor: this.linePos },
        });
        view.focus();
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
    badge.textContent =
      params.source && params.source.startsWith('@')
        ? `${params.source} · ${isRich ? 'CNTXT' : meta.name}`
        : meta.name;
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

    // 4. Fixed Core Header Params: Title (truncates cleanly) + Status Pill (with Lucide icon)
    // Secondary metadata (`#id`, `tags`, `link`) lives on the closing Footer Rail & Floating Action Bar
    if (isCntxt) {
      if (params.label) {
        const titleSpan = createElement('span', {
          className:
            'text-[11px] font-semibold text-[var(--text-primary)] truncate max-w-[220px] min-w-[40px]',
          title: params.label,
          textContent: params.label,
        });
        left.appendChild(titleSpan);
      }

      if (params.status) {
        const statusColors = getStatusColors(params.status);
        const isDoneStatus = ['approved', 'done', 'complete', 'ready'].includes(
          params.status.toLowerCase()
        );
        const statusPill = createElement('button', {
          type: 'button',
          className:
            'cm-cntxt-gov-pill cm-cntxt-status-pill flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wide shrink-0 cursor-pointer transition-transform active:scale-95',
          title: `Block Status: ${params.status} (Click to cycle status)`,
        });
        statusPill.style.color = statusColors.text;
        statusPill.style.backgroundColor = statusColors.bg;
        statusPill.style.border = `1px solid ${statusColors.border}`;

        const statusIcon = createElement('span', {
          className: 'flex items-center justify-center shrink-0',
        });
        statusIcon.innerHTML = isDoneStatus ? LUCIDE_SVGS.checkCircle2 : LUCIDE_SVGS.circleDot;
        statusPill.appendChild(statusIcon);

        const statusText = createElement('span', {
          className: 'cm-codeblock-btn-label',
          textContent: params.status,
        });
        statusPill.appendChild(statusText);

        statusPill.addEventListener('mousedown', (e) => {
          e.preventDefault();
          e.stopPropagation();
        });
        statusPill.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const currIdx = STATUS_CYCLE.indexOf((params.status || '').toLowerCase());
          const nextStatus = STATUS_CYCLE[(currIdx + 1) % STATUS_CYCLE.length];
          mutateHeaderLineParams(view, this.startLine, (p) => ({
            ...p,
            status: nextStatus,
          }));
        });
        left.appendChild(statusPill);
      }
    }

    header.appendChild(left);

    const right = createElement('div', {
      className: 'flex items-center gap-1.5 shrink-0',
    });

    // 5. Interactive Lock Toggle Button for CNTXT Blocks (Lucide icon in colored box)
    if (isCntxt) {
      const isUserLocked = params.locked === 'user';
      const isAgentLocked = params.locked === 'agent';
      const lockBtn = createElement('button', {
        type: 'button',
        className: `cm-cntxt-gov-pill cm-codeblock-action-btn flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium transition-all cursor-pointer shrink-0 border ${
          isUserLocked
            ? 'cm-cntxt-pill-user'
            : isAgentLocked
              ? 'cm-cntxt-pill-agent'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-[var(--card-secondary-bg)] border-[var(--border-subtle)]'
        }`,
        title: isUserLocked
          ? 'Locked by User — Agents cannot overwrite (Click to unlock)'
          : isAgentLocked
            ? 'Agent-Managed Block (Click to lock as User)'
            : 'Unlocked Block (Click to lock as User)',
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

      // 5B. Respond / Comment Button (opens inline citation reply input -> appends to #user-inbox)
      if (params.id !== 'user-inbox') {
        const respondBtn = createElement('button', {
          type: 'button',
          className:
            'cm-cntxt-gov-pill cm-codeblock-action-btn flex items-center gap-1.5 px-2 py-0.5 rounded text-[10.5px] font-medium text-[var(--accent-primary)] hover:bg-[var(--accent-container)] border border-[var(--border-subtle)] transition-all cursor-pointer shrink-0',
          title: 'Respond / Comment on highlighted lines (adds cited entry to #user-inbox)',
          'aria-label': 'Respond or comment on this block',
        });
        const respondIcon = createElement('span', {
          className: 'w-4 h-4 rounded bg-[var(--accent-container)] flex items-center justify-center shrink-0',
        });
        respondIcon.innerHTML = LUCIDE_SVGS.messageSquarePlus;
        respondBtn.appendChild(respondIcon);

        const respondLabel = createElement('span', {
          className: 'cm-codeblock-btn-label',
          textContent: 'Respond',
        });
        respondBtn.appendChild(respondLabel);

        respondBtn.addEventListener('mousedown', (e) => {
          e.preventDefault();
          e.stopPropagation();
        });
        respondBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (this.startLine !== undefined) {
            view.dispatch({
              effects: openCntxtReplyInputEffect.of(this.startLine),
            });
          }
        });
        right.appendChild(respondBtn);
      }
    }

    // 6. Clear Button (respects `locked=user`, Lucide Trash2 icon)
    const isUserLocked = isCntxt && params.locked === 'user';
    const clearBtn = createElement('button', {
      type: 'button',
      className: `cm-live-clear-code-btn cm-codeblock-action-btn flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium ${
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

    // 7. Copy Button (Lucide Copy icon)
    const copyBtn = createElement('button', {
      type: 'button',
      className:
        'cm-live-copy-code-btn cm-codeblock-action-btn flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] active:scale-95 transition-all cursor-pointer shrink-0',
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
        className: `cm-live-codeblock-footer ${this.isRichContainer ? 'cm-cntxt-container-footer' : ''} select-none h-1.5 w-full`,
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
