/**
 * Code Block Lock Filter Extension (FG-27)
 *
 * Enforces true read-only protection for locked code blocks (`locked=user` or `locked=agent`).
 * Intercepts any document mutations targeting a locked block's line range (from opening fence to
 * closing fence) and rejects the transaction with an actionable user notification.
 *
 * Exemptions:
 * - Transactions with `userEvent: 'cntxt.governance.update'` (dispatched by lock toggles or parameter updates).
 */

import { EditorState } from '@codemirror/state';
import { findCntxtContainers, findCodeBlocks } from './liveMarkdown/scanners';
import { parseBlockInfoString } from '../services/editor/cntxtBlockParser';
import { useNotificationStore } from '../store/notificationStore';

let lastLockNotificationTimestamp = 0;

export const codeBlockLockFilter = EditorState.transactionFilter.of((tr) => {
  if (!tr.docChanged) return tr;

  // Explicit governance and lifecycle transactions are permitted
  if (
    tr.isUserEvent('cntxt.governance.update') ||
    tr.isUserEvent('delete.codeblock')
  ) {
    return tr;
  }

  const startDoc = tr.startState.doc;
  const containers = findCntxtContainers(startDoc);
  const codeBlocks = findCodeBlocks(startDoc, containers);

  const lockedRanges: Array<{ from: number; to: number; label: string }> = [];

  for (const entry of containers.values()) {
    if (entry.role !== 'start' && entry.role !== 'single') continue;
    const c = entry.container;
    if (c.params.locked === 'user' || c.params.locked === 'agent') {
      const startLineObj = startDoc.line(c.startLine);
      const endLineObj = startDoc.line(c.endLine);
      lockedRanges.push({
        from: startLineObj.from,
        to: endLineObj.to,
        label: c.params.id || c.language || 'container',
      });
    }
  }

  for (const entry of codeBlocks.values()) {
    if (entry.role !== 'start' && entry.role !== 'single') continue;
    const b = entry.block;
    const parsed = parseBlockInfoString(b.language);
    if (parsed.params.locked === 'user' || parsed.params.locked === 'agent') {
      const startLineObj = startDoc.line(b.startLine);
      const endLineObj = startDoc.line(b.endLine);
      lockedRanges.push({
        from: startLineObj.from,
        to: endLineObj.to,
        label: parsed.params.id || parsed.type || 'code block',
      });
    }
  }

  if (lockedRanges.length === 0) return tr;

  let touchesLocked = false;
  let lockedLabel = '';

  tr.changes.iterChanges((fromA, toA) => {
    if (touchesLocked) return;
    for (const r of lockedRanges) {
      // Overlap condition:
      // Edit touches locked range if strictly overlapping range (fromA < r.to && toA > r.from)
      // or if insertion happens within [r.from, r.to)
      if (
        (fromA < r.to && toA > r.from) ||
        (fromA === toA && fromA >= r.from && fromA < r.to)
      ) {
        touchesLocked = true;
        lockedLabel = r.label;
        break;
      }
    }
  });

  if (touchesLocked) {
    const now = Date.now();
    if (now - lastLockNotificationTimestamp > 1500) {
      lastLockNotificationTimestamp = now;
      useNotificationStore
        .getState()
        .addNotification(
          'Block is Locked',
          `Block "${lockedLabel}" is locked (locked=user). Click the lock button on the header to unlock before editing.`,
          'warning'
        );
    }
    return []; // Reject the mutation transaction
  }

  return tr;
});
