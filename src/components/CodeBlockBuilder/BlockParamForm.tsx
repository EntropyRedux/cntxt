import React from 'react';
import {
  CornerDownLeft,
  WrapText,
  RotateCcw,
  Lock,
  UserCheck,
  Bot,
  Tag,
  Hash,
  Type,
  Code,
} from 'lucide-react';
import { BlockFormDraft } from '../../store/activeBlockStore';
import { CntxtBlockArchetype } from '../../../contracts/data_shapes';

interface BlockParamFormProps {
  draft: BlockFormDraft;
  selectedArchetype: CntxtBlockArchetype;
  onChange: (patch: Partial<BlockFormDraft>) => void;
  onReset: () => void;
  onInsert: () => void;
  onWrapSelection: () => void;
}

export const BlockParamForm: React.FC<BlockParamFormProps> = ({
  draft,
  selectedArchetype,
  onChange,
  onReset,
  onInsert,
  onWrapSelection,
}) => {
  return (
    <div className="space-y-3.5">
      {/* Title & ID */}
      <div className="space-y-2">
        <div>
          <label className="text-[11px] font-semibold tracking-wider text-[var(--text-muted)] uppercase flex items-center gap-1 mb-1">
            <Type className="w-3 h-3 text-[var(--accent-primary)]" />
            <span>Title / Label</span>
          </label>
          <input
            type="text"
            value={draft.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="e.g. Phase 1 Architecture Plan"
            className="w-full px-2.5 py-1.5 rounded-md text-xs bg-[var(--input-bg)] text-[var(--text-primary)] border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] focus:outline-hidden transition-all"
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold tracking-wider text-[var(--text-muted)] uppercase flex items-center gap-1 mb-1">
            <Hash className="w-3 h-3 text-[var(--text-muted)]" />
            <span>Block ID (Anchor Slug)</span>
          </label>
          <input
            type="text"
            value={draft.id}
            onChange={(e) => onChange({ id: e.target.value })}
            placeholder="e.g. plan-arch-123"
            className="w-full px-2.5 py-1.5 rounded-md text-xs font-mono bg-[var(--input-bg)] text-[var(--text-primary)] border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] focus:outline-hidden transition-all"
          />
        </div>
      </div>

      {/* Status & Lock */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] font-semibold tracking-wider text-[var(--text-muted)] uppercase flex items-center gap-1 mb-1">
            <UserCheck className="w-3 h-3 text-[var(--text-muted)]" />
            <span>Status</span>
          </label>
          <select
            value={draft.status}
            onChange={(e) => onChange({ status: e.target.value })}
            className="w-full px-2 py-1.5 rounded-md text-xs bg-[var(--input-bg)] text-[var(--text-primary)] border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] focus:outline-hidden transition-all cursor-pointer"
          >
            <option value="draft">Draft</option>
            <option value="review">Review</option>
            <option value="ready">Ready</option>
            <option value="approved">Approved</option>
          </select>
        </div>

        <div>
          <label className="text-[11px] font-semibold tracking-wider text-[var(--text-muted)] uppercase flex items-center gap-1 mb-1">
            <Lock className="w-3 h-3 text-[var(--text-muted)]" />
            <span>Governance Lock</span>
          </label>
          <select
            value={draft.locked}
            onChange={(e) =>
              onChange({ locked: e.target.value as 'none' | 'user' | 'agent' })
            }
            className="w-full px-2 py-1.5 rounded-md text-xs bg-[var(--input-bg)] text-[var(--text-primary)] border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] focus:outline-hidden transition-all cursor-pointer"
          >
            <option value="agent">Agent Lock (locked=agent)</option>
            <option value="user">User Lock (locked=user, Immutable)</option>
            <option value="none">Unlocked (None)</option>
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
            value={draft.source}
            onChange={(e) => onChange({ source: e.target.value })}
            placeholder="@agent or @user"
            className="w-full px-2 py-1.5 rounded-md text-xs bg-[var(--input-bg)] text-[var(--text-primary)] border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] focus:outline-hidden transition-all"
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold tracking-wider text-[var(--text-muted)] uppercase flex items-center gap-1 mb-1">
            <Tag className="w-3 h-3 text-[var(--text-muted)]" />
            <span>Tags (comma-separated)</span>
          </label>
          <input
            type="text"
            value={draft.tags}
            onChange={(e) => onChange({ tags: e.target.value })}
            placeholder="plan, deliverable"
            className="w-full px-2 py-1.5 rounded-md text-xs bg-[var(--input-bg)] text-[var(--text-primary)] border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] focus:outline-hidden transition-all"
          />
        </div>
      </div>

      {/* Language / Fence Type */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] font-semibold tracking-wider text-[var(--text-muted)] uppercase flex items-center gap-1 mb-1">
            <Code className="w-3 h-3 text-[var(--text-muted)]" />
            <span>Fence Type</span>
          </label>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => onChange({ preferredFence: '~~~' })}
              className={`flex-1 py-1 rounded text-xs font-mono font-medium border transition-all cursor-pointer ${
                draft.preferredFence === '~~~'
                  ? 'bg-[var(--accent-container)] text-[var(--accent-primary)] border-[var(--accent-primary)]'
                  : 'bg-[var(--sidebar-bg)] text-[var(--text-secondary)] border-[var(--border-subtle)]'
              }`}
            >
              ~~~ (Tildes)
            </button>
            <button
              type="button"
              onClick={() => onChange({ preferredFence: '```' })}
              className={`flex-1 py-1 rounded text-xs font-mono font-medium border transition-all cursor-pointer ${
                draft.preferredFence === '```'
                  ? 'bg-[var(--accent-container)] text-[var(--accent-primary)] border-[var(--accent-primary)]'
                  : 'bg-[var(--sidebar-bg)] text-[var(--text-secondary)] border-[var(--border-subtle)]'
              }`}
            >
              ``` (Backticks)
            </button>
          </div>
        </div>

        <div>
          <label className="text-[11px] font-semibold tracking-wider text-[var(--text-muted)] uppercase flex items-center gap-1 mb-1">
            <span>Language Identifier</span>
          </label>
          <input
            type="text"
            value={draft.language}
            onChange={(e) => onChange({ language: e.target.value })}
            placeholder="markdown, table, ts..."
            className="w-full px-2 py-1.5 rounded-md text-xs font-mono bg-[var(--input-bg)] text-[var(--text-primary)] border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] focus:outline-hidden transition-all"
          />
        </div>
      </div>

      {/* Initial Content */}
      <div>
        <label className="text-[11px] font-semibold tracking-wider text-[var(--text-muted)] uppercase block mb-1">
          Initial Block Content
        </label>
        <textarea
          rows={5}
          value={draft.content}
          onChange={(e) => onChange({ content: e.target.value })}
          placeholder="Type or paste block content here..."
          className="w-full px-2.5 py-2 rounded-md text-xs font-mono bg-[var(--input-bg)] text-[var(--text-primary)] border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] focus:outline-hidden transition-all resize-y"
        />
      </div>

      {/* Action Buttons */}
      <div className="pt-2 flex flex-col gap-2">
        <button
          type="button"
          onClick={onInsert}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-semibold bg-[var(--accent-primary)] text-[var(--accent-foreground,white)] hover:opacity-90 active:scale-98 transition-all cursor-pointer shadow-xs"
        >
          <CornerDownLeft className="w-3.5 h-3.5" />
          <span>Insert at Cursor</span>
        </button>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onWrapSelection}
            className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-[var(--card-bg)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:bg-[var(--card-hover-bg)] active:scale-98 transition-all cursor-pointer"
            title="Wraps currently highlighted text in the editor inside this block"
          >
            <WrapText className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
            <span>Wrap Selection</span>
          </button>

          <button
            type="button"
            onClick={onReset}
            className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] border border-[var(--border-subtle)] transition-all cursor-pointer"
            title="Reset form fields to preset defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>
    </div>
  );
};
