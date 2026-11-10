import { EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { createElement, copyText } from '../../adapters';
import { useNotificationStore } from '../../store/notificationStore';
import { getActiveBridge } from './bridgeState';
import {
  codeBlockCollapseField,
  toggleCodeBlockCollapseEffect,
  openCntxtReplyInputEffect,
} from './collapseState';
import { findCntxtContainers } from './scanners';
import {
  parseBlockInfoString,
  appendUserInboxEntry,
} from '../../services/editor/cntxtBlockParser';
import {
  LUCIDE_SVGS,
  STATUS_CYCLE,
  getStatusColors,
  mutateHeaderLineParams,
} from './widgets/codeBlockWidget';
import { CntxtBlockParams } from '../../../contracts/data_shapes';

interface OverlayBlockDescriptor {
  startLine: number;
  endLine: number;
  language: string;
  params: CntxtBlockParams;
  codeContent: string;
  isCollapsed: boolean;
}

function collectCntxtBlocks(view: EditorView): OverlayBlockDescriptor[] {
  const doc = view.state.doc;
  const collapsedSet = view.state.field(codeBlockCollapseField, false) || new Set<number>();
  const containersByLine = findCntxtContainers(doc);

  const seenStartLines = new Set<number>();
  const result: OverlayBlockDescriptor[] = [];

  // Only Rich Containers (markdown |, cntxt |, deliverable |) receive the continuous
  // left margin accent rail (.cm-cntxt-left-rail) and floating viewport controls.
  // Governed code blocks retain self-contained code block card styling and in-context header controls.
  for (const entry of containersByLine.values()) {
    const c = entry.container;
    if (seenStartLines.has(c.startLine)) continue;
    seenStartLines.add(c.startLine);
    result.push({
      startLine: c.startLine,
      endLine: c.endLine,
      language: c.language,
      params: c.params,
      codeContent: c.codeContent,
      isCollapsed: collapsedSet.has(c.startLine),
    });
  }

  return result.sort((a, b) => a.startLine - b.startLine);
}

const activeOverlayDismissCallbacks = new Set<() => boolean>();

/**
 * Dismisses any open CNTXT block reply popover or floating control bar.
 * Returns true if an active overlay popover was open and dismissed.
 */
export function dismissActiveCntxtOverlayPopover(): boolean {
  let dismissed = false;
  for (const cb of activeOverlayDismissCallbacks) {
    if (cb()) {
      dismissed = true;
    }
  }
  return dismissed;
}

export const cntxtBlockOverlayPlugin = ViewPlugin.fromClass(
  class {
    private overlayLayer: HTMLElement;
    private openPopupStartLine: number | null = null;
    private activeReplyBlockStartLine: number | null = null;
    private draftCommentText = '';
    private rafId: number | null = null;
    private onScrollBound: () => void;
    private dismissCallback: () => boolean;

    constructor(private view: EditorView) {
      this.overlayLayer = createElement('div', {
        className: 'cm-cntxt-overlay-layer pointer-events-none',
      });
      this.overlayLayer.style.position = 'absolute';
      this.overlayLayer.style.inset = '0';
      this.overlayLayer.style.zIndex = '15';
      this.overlayLayer.style.overflow = 'visible';

      const scroller = this.view.scrollDOM;
      if (getComputedStyle(scroller).position === 'static') {
        scroller.style.position = 'relative';
      }
      scroller.appendChild(this.overlayLayer);

      this.onScrollBound = () => this.scheduleSync();
      scroller.addEventListener('scroll', this.onScrollBound, { passive: true });

      this.dismissCallback = () => {
        if (this.activeReplyBlockStartLine !== null || this.openPopupStartLine !== null) {
          this.activeReplyBlockStartLine = null;
          this.openPopupStartLine = null;
          this.draftCommentText = '';
          this.syncOverlay();
          return true;
        }
        return false;
      };
      activeOverlayDismissCallbacks.add(this.dismissCallback);

      this.scheduleSync();
    }

    update(update: ViewUpdate) {
      for (const tr of update.transactions) {
        for (const effect of tr.effects) {
          if (effect.is(openCntxtReplyInputEffect)) {
            if (this.activeReplyBlockStartLine !== effect.value) {
              this.draftCommentText = '';
            }
            this.activeReplyBlockStartLine = effect.value;
            this.openPopupStartLine = null;
          }
        }
      }

      if (
        update.docChanged ||
        update.viewportChanged ||
        update.geometryChanged ||
        update.selectionSet ||
        update.transactions.some((tr) => tr.effects.length > 0)
      ) {
        this.scheduleSync();
      }
    }

    private scheduleSync() {
      if (this.rafId !== null) return;
      this.rafId = requestAnimationFrame(() => {
        this.rafId = null;
        this.syncOverlay();
      });
    }

    private syncOverlay() {
      const scroller = this.view.scrollDOM;
      const contentDOM = this.view.contentDOM;
      if (!scroller || !contentDOM) return;

      const blocks = collectCntxtBlocks(this.view);
      this.overlayLayer.innerHTML = '';

      if (blocks.length === 0) return;

      const scrollerRect = scroller.getBoundingClientRect();
      const contentRect = contentDOM.getBoundingClientRect();
      const contentStyle = getComputedStyle(contentDOM);
      const padLeft = parseFloat(contentStyle.paddingLeft || '24') || 24;

      // Position the unbroken left accent line 14px to the left of the inner text/table column
      // so it never touches or cuts off on inline code blocks, tables, or Mermaid widgets
      const contentLeftInScroller =
        contentRect.left - scrollerRect.left + scroller.scrollLeft + padLeft;
      const railLeftPx = Math.max(6, contentLeftInScroller - 14);

      const scrollTop = scroller.scrollTop;
      const viewportHeight = scroller.clientHeight;
      const viewportTop = scrollTop;
      const viewportBottom = scrollTop + viewportHeight;

      const doc = this.view.state.doc;

      for (const blk of blocks) {
        if (blk.startLine < 1 || blk.startLine > doc.lines) continue;
        const startLineObj = doc.line(blk.startLine);
        const endLineObj = doc.line(Math.min(doc.lines, blk.endLine));

        const startBlock = this.view.lineBlockAt(startLineObj.from);
        const endBlock = blk.isCollapsed
          ? startBlock
          : this.view.lineBlockAt(endLineObj.to);

        const topPx = startBlock.top + 4;
        const bottomPx = Math.max(topPx + 24, endBlock.bottom - 4);
        const heightPx = bottomPx - topPx;

        // 1. Continuous Unbroken Left Accent Rail (`cm-cntxt-left-rail`)
        const rail = createElement('div', {
          className: `cm-cntxt-left-rail ${
            blk.params.locked === 'user'
              ? 'cm-cntxt-rail-locked-user'
              : blk.params.locked === 'agent'
                ? 'cm-cntxt-rail-locked-agent'
                : ''
          }`,
        });
        rail.style.position = 'absolute';
        rail.style.left = `${railLeftPx}px`;
        rail.style.top = `${topPx}px`;
        rail.style.height = `${heightPx}px`;
        this.overlayLayer.appendChild(rail);

        // 2. Scrollbar-Aligned Floating Action Button (for expanded CNTXT blocks in viewport)
        if (blk.isCollapsed) continue;
        if (bottomPx < viewportTop + 32 || topPx > viewportBottom - 32) continue;

        const visibleTop = Math.max(topPx, viewportTop);
        const visibleBottom = Math.min(bottomPx, viewportBottom);
        const idealCenterY = (visibleTop + visibleBottom) / 2;
        const clampedY = Math.max(
          topPx + 32,
          Math.min(bottomPx - 32, idealCenterY)
        );

        const floatingWrap = createElement('div', {
          className:
            'cm-cntxt-floating-controls pointer-events-auto flex items-center gap-1.5',
        });
        floatingWrap.style.position = 'absolute';
        floatingWrap.style.top = `${clampedY - 14}px`;
        floatingWrap.style.right = `${Math.max(10, scroller.scrollLeft ? 10 : 12)}px`;

        const isExpandedPopup = this.openPopupStartLine === blk.startLine;

        if (isExpandedPopup) {
          const popupBar = this.buildPopupControlBar(blk);
          floatingWrap.appendChild(popupBar);
        }

        const triggerBtn = createElement('button', {
          type: 'button',
          className: `cm-cntxt-floating-trigger w-7 h-7 rounded-lg flex items-center justify-center border transition-all cursor-pointer shadow-md ${
            isExpandedPopup
              ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)]'
              : 'bg-[var(--card-bg)]/95 hover:bg-[var(--card-hover-bg)] text-[var(--accent-primary)] border-[var(--border-primary)]'
          }`,
          title: isExpandedPopup
            ? 'Close CNTXT block controls'
            : `CNTXT Block Controls${blk.params.id ? ` (#${blk.params.id})` : ''}`,
          'aria-label': 'Toggle CNTXT block controls',
        });

        const iconBox = createElement('span', {
          className: 'w-4 h-4 rounded flex items-center justify-center',
        });
        iconBox.innerHTML = LUCIDE_SVGS.slidersHorizontal;
        triggerBtn.appendChild(iconBox);

        triggerBtn.addEventListener('mousedown', (e) => {
          e.preventDefault();
          e.stopPropagation();
        });
        triggerBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.openPopupStartLine =
            this.openPopupStartLine === blk.startLine ? null : blk.startLine;
          this.syncOverlay();
        });

        floatingWrap.appendChild(triggerBtn);
        this.overlayLayer.appendChild(floatingWrap);
      }

      // 3. Floating User Reply Popover (if active)
      if (this.activeReplyBlockStartLine !== null) {
        const replyBlk = blocks.find(
          (b) => b.startLine === this.activeReplyBlockStartLine
        );
        if (!replyBlk) {
          this.activeReplyBlockStartLine = null;
        } else {
          const replyModal = this.buildReplyPopover(replyBlk);
          this.overlayLayer.appendChild(replyModal);
        }
      }
    }

    private buildPopupControlBar(blk: OverlayBlockDescriptor): HTMLElement {
      const bar = createElement('div', {
        className:
          'cm-cntxt-floating-popup flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--modal-bg)]/95 backdrop-blur-md border border-[var(--border-primary)] shadow-lg text-[10.5px] font-mono',
      });

      const params = blk.params;

      // 0. Respond / Comment Button (cites line into user-inbox)
      if (params.id !== 'user-inbox') {
        const respondBtn = createElement('button', {
          type: 'button',
          className:
            'flex items-center gap-1 px-1.5 py-0.5 rounded text-[var(--accent-primary)] hover:text-white hover:bg-[var(--accent-primary)]/80 border border-[var(--accent-primary)]/30 cursor-pointer transition-colors',
          title: 'Respond or comment on this block (cites lines into user inbox)',
        });
        const respondIcon = createElement('span', {
          className: 'flex items-center justify-center',
        });
        respondIcon.innerHTML = LUCIDE_SVGS.messageSquarePlus;
        respondBtn.appendChild(respondIcon);
        respondBtn.appendChild(createElement('span', { textContent: 'Respond' }));

        respondBtn.addEventListener('mousedown', (e) => {
          e.preventDefault();
          e.stopPropagation();
        });
        respondBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.activeReplyBlockStartLine = blk.startLine;
          this.openPopupStartLine = null;
          this.syncOverlay();
        });
        bar.appendChild(respondBtn);
      }

      // 1. Block ID Copy Pill
      if (params.id) {
        const idBtn = createElement('button', {
          type: 'button',
          className:
            'flex items-center gap-1 px-1.5 py-0.5 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] border border-[var(--border-subtle)] cursor-pointer transition-colors',
          title: `Copy Block ID (#${params.id})`,
        });
        const hashIcon = createElement('span', {
          className: 'w-3.5 h-3.5 rounded bg-[var(--accent-container)] text-[var(--accent-primary)] flex items-center justify-center',
        });
        hashIcon.innerHTML = LUCIDE_SVGS.hash;
        idBtn.appendChild(hashIcon);
        const idLbl = createElement('span', { textContent: params.id });
        idBtn.appendChild(idLbl);

        idBtn.addEventListener('mousedown', (e) => {
          e.preventDefault();
          e.stopPropagation();
        });
        idBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          e.stopPropagation();
          await copyText(params.id!, getActiveBridge() || undefined);
          idLbl.textContent = 'Copied!';
          setTimeout(() => {
            idLbl.textContent = params.id!;
          }, 1200);
        });
        bar.appendChild(idBtn);
      }

      // 2. Status Cycler Button
      const currentStatus = params.status || 'draft';
      const statusColors = getStatusColors(currentStatus);
      const statusBtn = createElement('button', {
        type: 'button',
        className:
          'flex items-center gap-1 px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide cursor-pointer transition-transform active:scale-95',
        title: `Status: ${currentStatus} (Click to cycle)`,
      });
      statusBtn.style.color = statusColors.text;
      statusBtn.style.backgroundColor = statusColors.bg;
      statusBtn.style.border = `1px solid ${statusColors.border}`;

      const statusIcon = createElement('span', {
        className: 'flex items-center justify-center',
      });
      statusIcon.innerHTML = LUCIDE_SVGS.circleDot;
      statusBtn.appendChild(statusIcon);
      statusBtn.appendChild(createElement('span', { textContent: currentStatus }));

      statusBtn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
      statusBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const currIdx = STATUS_CYCLE.indexOf(currentStatus.toLowerCase());
        const nextStatus = STATUS_CYCLE[(currIdx + 1) % STATUS_CYCLE.length];
        mutateHeaderLineParams(this.view, blk.startLine, (p) => ({
          ...p,
          status: nextStatus,
        }));
      });
      bar.appendChild(statusBtn);

      // 3. Lock Toggle Button (Lucide icon in colored box)
      const isUserLocked = params.locked === 'user';
      const isAgentLocked = params.locked === 'agent';
      const lockBtn = createElement('button', {
        type: 'button',
        className: `flex items-center gap-1 px-1.5 py-0.5 rounded border cursor-pointer transition-colors ${
          isUserLocked
            ? 'text-amber-400 bg-amber-500/10 border-amber-500/35'
            : isAgentLocked
              ? 'text-sky-400 bg-sky-500/10 border-sky-500/35'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--card-secondary-bg)] border-[var(--border-subtle)]'
        }`,
        title: isUserLocked ? 'Unlock block' : 'Lock block as User',
      });
      const lockIconBox = createElement('span', {
        className: `w-3.5 h-3.5 rounded flex items-center justify-center ${
          isUserLocked
            ? 'bg-amber-500/25 text-amber-300'
            : isAgentLocked
              ? 'bg-sky-500/25 text-sky-300'
              : 'bg-[var(--card-hover-bg)] text-[var(--text-muted)]'
        }`,
      });
      lockIconBox.innerHTML = isUserLocked
        ? LUCIDE_SVGS.lock
        : isAgentLocked
          ? LUCIDE_SVGS.bot
          : LUCIDE_SVGS.unlock;
      lockBtn.appendChild(lockIconBox);
      lockBtn.appendChild(
        createElement('span', {
          textContent: isUserLocked ? 'user' : isAgentLocked ? 'agent' : 'lock',
        })
      );
      lockBtn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
      lockBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        mutateHeaderLineParams(this.view, blk.startLine, (p) => {
          const next = { ...p };
          if (next.locked === 'user') {
            delete next.locked;
          } else {
            next.locked = 'user';
          }
          return next;
        });
      });
      bar.appendChild(lockBtn);

      // 4. Copy Content Button
      const copyBtn = createElement('button', {
        type: 'button',
        className:
          'flex items-center gap-1 px-1.5 py-0.5 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] border border-[var(--border-subtle)] cursor-pointer transition-colors',
        title: 'Copy block content',
      });
      const copyIcon = createElement('span', {
        className: 'flex items-center justify-center',
      });
      copyIcon.innerHTML = LUCIDE_SVGS.copy;
      copyBtn.appendChild(copyIcon);
      const copyLbl = createElement('span', { textContent: 'Copy' });
      copyBtn.appendChild(copyLbl);
      copyBtn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
      copyBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await copyText(blk.codeContent, getActiveBridge() || undefined);
        copyLbl.textContent = 'Copied!';
        copyIcon.innerHTML = LUCIDE_SVGS.check;
        setTimeout(() => {
          copyLbl.textContent = 'Copy';
          copyIcon.innerHTML = LUCIDE_SVGS.copy;
        }, 1500);
      });
      bar.appendChild(copyBtn);

      // 5. Clear Content Button
      const clearBtn = createElement('button', {
        type: 'button',
        className: `flex items-center gap-1 px-1.5 py-0.5 rounded border border-[var(--border-subtle)] transition-colors ${
          isUserLocked
            ? 'text-[var(--text-muted)] opacity-50 cursor-not-allowed'
            : 'text-[var(--text-secondary)] hover:text-[var(--status-error)] hover:bg-[var(--card-hover-bg)] cursor-pointer'
        }`,
        title: isUserLocked ? 'Block is locked by user' : 'Clear block content',
      });
      const clearIcon = createElement('span', {
        className: 'flex items-center justify-center',
      });
      clearIcon.innerHTML = LUCIDE_SVGS.trash2;
      clearBtn.appendChild(clearIcon);
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
        const doc = this.view.state.doc;
        if (blk.startLine <= doc.lines && blk.endLine <= doc.lines) {
          const startLineObj = doc.line(blk.startLine);
          const from = Math.min(doc.length, startLineObj.to + 1);
          const endLineObj = doc.line(blk.endLine);
          const to = endLineObj.from;
          if (to >= from) {
            this.view.dispatch({
              changes: { from, to, insert: '\n' },
              selection: { anchor: from },
              userEvent: 'delete.codeblock',
            });
            this.openPopupStartLine = null;
          }
        }
      });
      bar.appendChild(clearBtn);

      // 6. Collapse Block Button (from anywhere in the block!)
      const collapseBtn = createElement('button', {
        type: 'button',
        className:
          'flex items-center gap-1 px-1.5 py-0.5 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] border border-[var(--border-subtle)] cursor-pointer transition-colors',
        title: 'Collapse CNTXT block',
      });
      const collapseIcon = createElement('span', {
        className: 'flex items-center justify-center text-[var(--accent-primary)]',
      });
      collapseIcon.innerHTML = LUCIDE_SVGS.chevronsDownUp;
      collapseBtn.appendChild(collapseIcon);
      collapseBtn.appendChild(createElement('span', { textContent: 'Collapse' }));
      collapseBtn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
      collapseBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const doc = this.view.state.doc;
        const startLineObj = doc.line(blk.startLine);
        this.openPopupStartLine = null;
        this.view.dispatch({
          effects: toggleCodeBlockCollapseEffect.of(blk.startLine),
          selection: { anchor: startLineObj.from },
          scrollIntoView: true,
        });
      });
      bar.appendChild(collapseBtn);

      return bar;
    }

    private buildReplyPopover(blk: OverlayBlockDescriptor): HTMLElement {
      const scroller = this.view.scrollDOM;
      const doc = this.view.state.doc;
      const sel = this.view.state.selection.main;

      let startLineNum = blk.startLine;
      let endLineNum = blk.endLine;
      let quoteSnippet = '';

      if (!sel.empty) {
        const fromLine = doc.lineAt(sel.from).number;
        const toLine = doc.lineAt(sel.to).number;
        if (toLine >= blk.startLine && fromLine <= blk.endLine) {
          startLineNum = Math.max(blk.startLine, fromLine);
          endLineNum = Math.min(blk.endLine, toLine);
          quoteSnippet = this.view.state.sliceDoc(sel.from, sel.to).trim();
        }
      } else {
        const cursorLine = doc.lineAt(sel.head).number;
        if (cursorLine >= blk.startLine && cursorLine <= blk.endLine) {
          startLineNum = cursorLine;
          endLineNum = cursorLine;
          quoteSnippet = doc.line(cursorLine).text.trim();
        }
      }

      const lineRange =
        startLineNum === endLineNum ? `L${startLineNum}` : `L${startLineNum}-L${endLineNum}`;
      const blockRef = blk.params.id || `line-${blk.startLine}`;

      const container = createElement('div', {
        className:
          'cm-cntxt-reply-popover pointer-events-auto absolute z-50 flex flex-col gap-2 p-3 rounded-xl bg-[var(--modal-bg,#18181b)] border border-[var(--border-primary,#3f3f46)] shadow-2xl backdrop-blur-md text-xs font-sans text-[var(--text-primary,#f4f4f5)] transition-all overflow-y-auto',
      });
      const viewportH = scroller.clientHeight || 400;
      const estimatedPopoverH = 220;
      const maxTopOffset = Math.max(8, viewportH - estimatedPopoverH - 12);
      const clampedOffset = Math.min(48, maxTopOffset);
      container.style.width = 'min(420px, calc(100vw - 24px))';
      container.style.right = '12px';
      container.style.top = `${Math.max(8, scroller.scrollTop + clampedOffset)}px`;
      container.style.maxHeight = `${Math.max(180, viewportH - 16)}px`;

      // Header row
      const header = createElement('div', {
        className:
          'flex items-center justify-between gap-2 border-b border-[var(--border-subtle,#27272a)] pb-2',
      });
      const titleGroup = createElement('div', { className: 'flex items-center gap-1.5' });
      const iconBox = createElement('span', {
        className:
          'w-5 h-5 rounded flex items-center justify-center bg-[var(--accent-primary,#6366f1)]/15 text-[var(--accent-primary,#6366f1)]',
      });
      iconBox.innerHTML = LUCIDE_SVGS.messageSquarePlus;
      titleGroup.appendChild(iconBox);
      titleGroup.appendChild(
        createElement('span', {
          className: 'font-semibold text-[12px] text-[var(--text-primary)]',
          textContent: 'Respond / Comment',
        })
      );
      header.appendChild(titleGroup);

      const badgeAndClose = createElement('div', { className: 'flex items-center gap-1.5' });
      const citeBadge = createElement('span', {
        className:
          'px-2 py-0.5 rounded font-mono text-[10px] bg-[var(--card-secondary-bg,#27272a)] text-[var(--text-secondary,#a1a1aa)] border border-[var(--border-subtle)]',
        textContent: `#${blockRef} · ${lineRange}`,
      });
      badgeAndClose.appendChild(citeBadge);

      const closeBtn = createElement('button', {
        type: 'button',
        className:
          'p-1 rounded hover:bg-[var(--card-hover-bg)] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer',
        title: 'Close',
      });
      closeBtn.innerHTML = LUCIDE_SVGS.x;
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.activeReplyBlockStartLine = null;
        this.draftCommentText = '';
        this.syncOverlay();
      });
      badgeAndClose.appendChild(closeBtn);
      header.appendChild(badgeAndClose);
      container.appendChild(header);

      // Quote preview if present
      if (quoteSnippet) {
        const previewBox = createElement('div', {
          className:
            'px-2.5 py-1.5 rounded-md bg-[var(--card-bg,#202023)] border-l-2 border-[var(--accent-primary,#6366f1)] text-[11px] italic text-[var(--text-secondary,#a1a1aa)] line-clamp-2',
          textContent: `"${quoteSnippet.length > 120 ? quoteSnippet.slice(0, 117) + '...' : quoteSnippet}"`,
        });
        container.appendChild(previewBox);
      }

      // Textarea input
      const textarea = createElement('textarea', {
        className:
          'w-full min-h-[72px] max-h-[160px] p-2 rounded-lg bg-[var(--input-bg,#121214)] border border-[var(--border-primary,#3f3f46)] focus:border-[var(--accent-primary,#6366f1)] focus:outline-none text-xs text-[var(--text-primary)] resize-y font-sans',
        placeholder:
          'Write comment or instructions for AI agent... (Shift+Enter for newline, Enter to submit)',
      }) as HTMLTextAreaElement;
      textarea.value = this.draftCommentText;
      textarea.addEventListener('input', () => {
        this.draftCommentText = textarea.value;
      });
      container.appendChild(textarea);

      // Action footer
      const footer = createElement('div', {
        className: 'flex items-center justify-between gap-2 pt-1 text-[11px]',
      });
      const hintText = createElement('span', {
        className: 'text-[10px] text-[var(--text-muted,#71717a)] truncate',
        textContent: 'Pins to id=user-inbox at top of doc',
      });
      footer.appendChild(hintText);

      const btnGroup = createElement('div', { className: 'flex items-center gap-1.5 shrink-0' });
      const cancelBtn = createElement('button', {
        type: 'button',
        className:
          'px-2.5 py-1 rounded-md text-[var(--text-secondary)] hover:bg-[var(--card-hover-bg)] cursor-pointer transition-colors',
        textContent: 'Cancel',
      });
      cancelBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.activeReplyBlockStartLine = null;
        this.draftCommentText = '';
        this.syncOverlay();
      });
      btnGroup.appendChild(cancelBtn);

      const submitComment = () => {
        const text = textarea.value.trim();
        if (!text) return;

        const rawDoc = this.view.state.doc.toString();
        const updatedDoc = appendUserInboxEntry(rawDoc, {
          blockId: blk.params.id,
          startLine: startLineNum,
          endLine: endLineNum,
          quotedText: quoteSnippet || undefined,
          comment: text,
        });

        if (updatedDoc !== rawDoc) {
          const scroller = this.view.scrollDOM;
          const priorScrollTop = scroller ? scroller.scrollTop : 0;
          const priorScrollLeft = scroller ? scroller.scrollLeft : 0;

          this.view.dispatch({
            changes: { from: 0, to: this.view.state.doc.length, insert: updatedDoc },
            userEvent: 'input.cntxt-inbox',
            scrollIntoView: false,
          });

          if (scroller) {
            scroller.scrollTop = priorScrollTop;
            scroller.scrollLeft = priorScrollLeft;
            requestAnimationFrame(() => {
              if (scroller) {
                scroller.scrollTop = priorScrollTop;
                scroller.scrollLeft = priorScrollLeft;
              }
            });
          }

          useNotificationStore
            .getState()
            .addNotification(
              'Comment Pinned',
              `Response cited to #${blockRef} (${lineRange}) added to user-inbox.`,
              'info'
            );
        }
        this.draftCommentText = '';
        this.activeReplyBlockStartLine = null;
        this.syncOverlay();
      };

      const sendBtn = createElement('button', {
        type: 'button',
        className:
          'flex items-center gap-1 px-3 py-1 rounded-md bg-[var(--accent-primary,#6366f1)] hover:bg-[var(--accent-hover,#4f46e5)] text-white font-medium cursor-pointer transition-colors shadow-sm',
        title: 'Submit response (Enter)',
      });
      const sendIcon = createElement('span', {
        className: 'w-3 h-3 flex items-center justify-center',
      });
      sendIcon.innerHTML = LUCIDE_SVGS.send;
      sendBtn.appendChild(sendIcon);
      sendBtn.appendChild(createElement('span', { textContent: 'Send' }));
      sendBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        submitComment();
      });
      btnGroup.appendChild(sendBtn);
      footer.appendChild(btnGroup);
      container.appendChild(footer);

      textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          e.stopPropagation();
          submitComment();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          this.activeReplyBlockStartLine = null;
          this.draftCommentText = '';
          this.syncOverlay();
        }
      });

      requestAnimationFrame(() => {
        textarea.focus();
      });

      return container;
    }

    destroy() {
      if (this.rafId !== null) {
        cancelAnimationFrame(this.rafId);
      }
      activeOverlayDismissCallbacks.delete(this.dismissCallback);
      this.view.scrollDOM.removeEventListener('scroll', this.onScrollBound);
      this.overlayLayer.remove();
    }
  }
);
