import React from 'react';
import {
  Lock,
  Unlock,
  ShieldCheck,
  UserCheck,
  Tag,
  Hash,
  Type,
  Bot,
  ExternalLink,
  Copy,
  Check,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { CntxtParsedBlock, CntxtBlockParams, CntxtLockValue } from '../../../contracts/data_shapes';
import { editorRegistry } from '../../services/editor/editorRegistry';
import { copyText } from '../../adapters';
import { useNotificationStore } from '../../store/notificationStore';

interface ActiveBlockInspectorProps {
  block: CntxtParsedBlock;
  tabId: string | null;
  onMutateParams: (updater: (prev: CntxtBlockParams) => CntxtBlockParams) => void;
  onExitInspector: () => void;
}

export const ActiveBlockInspector: React.FC<ActiveBlockInspectorProps> = ({
  block,
  tabId,
  onMutateParams,
  onExitInspector,
}) => {
  const [copiedLink, setCopiedLink] = React.useState(false);
  const params = block.params || {};
  const isUserLocked = params.locked === 'user';
  const isAgentLocked = params.locked === 'agent';

  const blockTitle = params.rendererParams?.title || params.label || '';
  const blockId = params.id || 'unnamed-block';
  const blockStatus = params.status || 'draft';
  const blockSource = params.source || '';
  const blockTags = (params.tags || []).join(', ');

  const handleCopyCitation = () => {
    const citation = `[[#^${blockId}]]`;
    copyText(citation);
    setCopiedLink(true);
    useNotificationStore.getState().addNotification(
      'Citation Copied',
      `Copied ${citation} to clipboard`,
      'info'
    );
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleJumpToBlock = () => {
    if (!tabId) return;
    const view = editorRegistry.getView(tabId);
    if (view && block.position.startLine) {
      const lineObj = view.state.doc.line(block.position.startLine);
      view.dispatch({
        selection: { anchor: lineObj.from },
        scrollIntoView: true,
      });
      view.focus();
    }
  };

  return (
    <div className="space-y-3.5">
      {/* Active Block Header Badge */}
      <div className="p-2.5 rounded-md bg-[var(--card-bg)] border border-[var(--border-subtle)] space-y-2">
        <div className="flex items-center justify-between gap-1.5 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)] animate-pulse shrink-0" />
            <span className="text-xs font-mono font-semibold text-[var(--accent-primary)] truncate">
              #{blockId}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[var(--sidebar-bg)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
              L{block.position.startLine}–L{block.position.endLine}
            </span>
            <button
              type="button"
              onClick={handleJumpToBlock}
              className="p-1 rounded hover:bg-[var(--card-hover-bg)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
              title="Jump to this block in the editor"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Lock & Type Indicators */}
        <div className="flex items-center gap-2 pt-1 border-t border-[var(--border-subtle)] text-[11px]">
          <span className="px-1.5 py-0.5 rounded bg-[var(--sidebar-bg)] font-mono text-[var(--text-muted)] border border-[var(--border-subtle)]">
            {block.type || 'markdown'}
          </span>

          <span
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded font-medium border ${
              isUserLocked
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                : isAgentLocked
                ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            }`}
          >
            {isUserLocked ? (
              <>
                <Lock className="w-3 h-3" />
                <span>locked=user</span>
              </>
            ) : isAgentLocked ? (
              <>
                <ShieldCheck className="w-3 h-3" />
                <span>locked=agent</span>
              </>
            ) : (
              <>
                <Unlock className="w-3 h-3" />
                <span>unlocked</span>
              </>
            )}
          </span>

          <button
            type="button"
            onClick={handleCopyCitation}
            className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-medium text-[var(--accent-primary)] hover:bg-[var(--accent-container)] border border-[var(--border-subtle)] transition-all cursor-pointer"
            title="Copy block citation ([[#^block-id]])"
          >
            {copiedLink ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            <span>{copiedLink ? 'Copied' : 'Cite'}</span>
          </button>
        </div>
      </div>

      {/* Two-Way Governance Form */}
      <div className="space-y-3">
        {/* Title */}
        <div>
          <label className="text-[11px] font-semibold tracking-wider text-[var(--text-muted)] uppercase flex items-center gap-1 mb-1">
            <Type className="w-3 h-3 text-[var(--accent-primary)]" />
            <span>Title / Label</span>
          </label>
          <input
            type="text"
            value={blockTitle}
            onChange={(e) => {
              const newTitle = e.target.value;
              onMutateParams((prev) => ({
                ...prev,
                label: newTitle || undefined,
                rendererParams: {
                  ...(prev.rendererParams || {}),
                  title: newTitle || undefined,
                },
              }));
            }}
            placeholder="Title displayed in block header"
            className="w-full px-2.5 py-1.5 rounded-md text-xs bg-[var(--input-bg)] text-[var(--text-primary)] border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] focus:outline-hidden transition-all"
          />
        </div>

        {/* Status & Lock */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] font-semibold tracking-wider text-[var(--text-muted)] uppercase flex items-center gap-1 mb-1">
              <UserCheck className="w-3 h-3 text-[var(--text-muted)]" />
              <span>Status</span>
            </label>
            <select
              value={blockStatus}
              onChange={(e) => {
                const newStatus = e.target.value;
                onMutateParams((prev) => ({
                  ...prev,
                  status: newStatus,
                }));
              }}
              className="w-full px-2 py-1.5 rounded-md text-xs bg-[var(--input-bg)] text-[var(--text-primary)] border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] focus:outline-hidden transition-all cursor-pointer"
            >
              <option value="draft">draft</option>
              <option value="review">review</option>
              <option value="ready">ready</option>
              <option value="approved">approved</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold tracking-wider text-[var(--text-muted)] uppercase flex items-center gap-1 mb-1">
              <Lock className="w-3 h-3 text-[var(--text-muted)]" />
              <span>Governance Lock</span>
            </label>
            <select
              value={params.locked || 'none'}
              onChange={(e) => {
                const val = e.target.value;
                onMutateParams((prev) => {
                  const updated = { ...prev };
                  if (val === 'none') {
                    delete updated.locked;
                  } else {
                    updated.locked = val as CntxtLockValue;
                  }
                  return updated;
                });
              }}
              className="w-full px-2 py-1.5 rounded-md text-xs bg-[var(--input-bg)] text-[var(--text-primary)] border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] focus:outline-hidden transition-all cursor-pointer"
            >
              <option value="none">Unlocked</option>
              <option value="user">locked=user (Human)</option>
              <option value="agent">locked=agent (Agent)</option>
            </select>
          </div>
        </div>

        {/* Source & Tags */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] font-semibold tracking-wider text-[var(--text-muted)] uppercase flex items-center gap-1 mb-1">
              <Bot className="w-3 h-3 text-[var(--text-muted)]" />
              <span>Source / Actor</span>
            </label>
            <input
              type="text"
              value={blockSource}
              onChange={(e) => {
                const newSource = e.target.value;
                onMutateParams((prev) => ({
                  ...prev,
                  source: newSource || undefined,
                }));
              }}
              placeholder="@user or @agent"
              className="w-full px-2 py-1.5 rounded-md text-xs bg-[var(--input-bg)] text-[var(--text-primary)] border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] focus:outline-hidden transition-all"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold tracking-wider text-[var(--text-muted)] uppercase flex items-center gap-1 mb-1">
              <Tag className="w-3 h-3 text-[var(--text-muted)]" />
              <span>Tags (comma-sep)</span>
            </label>
            <input
              type="text"
              value={blockTags}
              onChange={(e) => {
                const tagsArr = e.target.value
                  .split(',')
                  .map((t) => t.trim())
                  .filter(Boolean);
                onMutateParams((prev) => ({
                  ...prev,
                  tags: tagsArr.length > 0 ? tagsArr : undefined,
                }));
              }}
              placeholder="e.g. plan, arch"
              className="w-full px-2 py-1.5 rounded-md text-xs bg-[var(--input-bg)] text-[var(--text-primary)] border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] focus:outline-hidden transition-all"
            />
          </div>
        </div>
      </div>

      {/* Switch back to Creator Catalog */}
      <div className="pt-2 border-t border-[var(--border-subtle)]">
        <button
          type="button"
          onClick={onExitInspector}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] border border-[var(--border-subtle)] transition-all cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
          <span>Switch to Block Creator Palette</span>
        </button>
      </div>
    </div>
  );
};
