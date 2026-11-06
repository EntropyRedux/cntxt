import React from 'react';
import {
  Boxes,
  Sliders,
  PlusCircle,
  FileCode,
  Sparkles,
} from 'lucide-react';
import { useActiveBlockStore } from '../../store/activeBlockStore';
import { useTabStore } from '../../store/tabStore';
import { ArchetypePicker } from '../CodeBlockBuilder/ArchetypePicker';
import { BlockParamForm } from '../CodeBlockBuilder/BlockParamForm';
import { ActiveBlockInspector } from '../CodeBlockBuilder/ActiveBlockInspector';

export const CodeBlockBuilderPanel: React.FC = () => {
  const {
    isInsideBlock,
    activeBlock,
    activeTabId,
    manualMode,
    selectedArchetype,
    selectedPresetId,
    formDraft,
    setManualMode,
    selectArchetype,
    selectPreset,
    updateFormDraft,
    resetFormDraftFromPreset,
    mutateActiveBlockParams,
    insertBlockAtCursor,
    wrapSelectionInBlock,
  } = useActiveBlockStore();

  const tabStore = useTabStore();
  const currentTabId = activeTabId || tabStore.activeTabId;
  const currentTab = tabStore.tabs.find((t) => t.id === currentTabId);

  // Determine effective view mode
  const effectiveMode: 'creator' | 'inspector' =
    manualMode !== null
      ? manualMode
      : isInsideBlock && activeBlock
      ? 'inspector'
      : 'creator';

  return (
    <div className="flex flex-col h-full bg-[var(--sidebar-bg)] text-[var(--text-primary)] select-none">
      {/* Top Segmented Mode Control */}
      <div className="p-2 border-b border-[var(--border-primary)] bg-[var(--sidebar-header-bg)]/50">
        <div className="flex rounded-md p-0.5 bg-[var(--card-bg)] border border-[var(--border-subtle)] text-xs">
          <button
            type="button"
            onClick={() => setManualMode('creator')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded font-medium transition-all cursor-pointer ${
              effectiveMode === 'creator'
                ? 'bg-[var(--accent-primary)] text-[var(--accent-foreground,white)] shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>New Block</span>
          </button>

          <button
            type="button"
            onClick={() => setManualMode('inspector')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded font-medium transition-all cursor-pointer relative ${
              effectiveMode === 'inspector'
                ? 'bg-[var(--accent-primary)] text-[var(--accent-foreground,white)] shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Inspector</span>
            {isInsideBlock && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 absolute top-1.5 right-2" />
            )}
          </button>
        </div>
      </div>

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {effectiveMode === 'inspector' ? (
          activeBlock ? (
            <ActiveBlockInspector
              block={activeBlock}
              tabId={currentTabId}
              onMutateParams={mutateActiveBlockParams}
              onExitInspector={() => setManualMode('creator')}
            />
          ) : (
            <div className="text-center py-8 px-3 space-y-3">
              <div className="w-10 h-10 mx-auto rounded-full bg-[var(--card-bg)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)]">
                <FileCode className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-[var(--text-primary)]">
                  No Code Block Under Cursor
                </p>
                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                  Move your cursor inside any fenced block in the active tab to inspect and edit its governance parameters live.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setManualMode('creator')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-[var(--accent-primary)] text-[var(--accent-foreground,white)] hover:opacity-90 transition-all cursor-pointer shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Create New Block</span>
              </button>
            </div>
          )
        ) : (
          <div className="space-y-4">
            <ArchetypePicker
              selectedArchetype={selectedArchetype}
              selectedPresetId={selectedPresetId}
              onSelectArchetype={selectArchetype}
              onSelectPreset={selectPreset}
            />

            <div className="pt-2 border-t border-[var(--border-subtle)]">
              <BlockParamForm
                draft={formDraft}
                selectedArchetype={selectedArchetype}
                onChange={updateFormDraft}
                onReset={() => resetFormDraftFromPreset(selectedPresetId)}
                onInsert={insertBlockAtCursor}
                onWrapSelection={wrapSelectionInBlock}
              />
            </div>
          </div>
        )}
      </div>

      {/* Bottom Status / Active Document Bar */}
      <div className="px-3 py-1.5 border-t border-[var(--border-primary)] bg-[var(--sidebar-header-bg)]/80 text-[10.5px] text-[var(--text-muted)] flex items-center justify-between shrink-0">
        <span className="truncate max-w-[180px]">
          {currentTab ? currentTab.title : 'No active tab'}
        </span>
        <span className="font-mono text-[9.5px]">CNTXT FG-26</span>
      </div>
    </div>
  );
};
