/**
 * Active Block & Code Block Builder Store (FG-26)
 *
 * Headless Zustand store managing active block cursor tracking,
 * dual-mode UI switching (Creator Catalog vs Active Inspector),
 * two-way header parameter synchronization, and block insertion.
 */

import { create } from 'zustand';
import {
  CntxtBlockArchetype,
  CntxtParsedBlock,
  CntxtParsedDocument,
  CntxtBlockParams,
  CntxtLockValue,
} from '../../contracts/data_shapes';
import {
  parseCntxtDocument,
} from '../services/editor/cntxtBlockParser';
import {
  BLOCK_PRESET_DEFINITIONS,
  ARCHETYPES,
  assembleBlockString,
  generateBlockSlug,
} from '../services/editor/blockPresetCatalog';
import { editorRegistry } from '../services/editor/editorRegistry';
import { mutateHeaderLineParams } from '../extensions/liveMarkdown/widgets/codeBlockWidget';
import { useTabStore } from './tabStore';
import { useNotificationStore } from './notificationStore';

export interface BlockFormDraft {
  title: string;
  id: string;
  status: string;
  locked: 'none' | 'user' | 'agent';
  source: string;
  tags: string;
  content: string;
  language: string;
  preferredFence: '~~~' | '```';
}

interface ActiveBlockStoreState {
  // Cursor & Inspection State
  activeTabId: string | null;
  cursorLine: number;
  isInsideBlock: boolean;
  activeBlock: CntxtParsedBlock | null;
  parsedDoc: CntxtParsedDocument | null;
  lastParsedContent: string | null;

  // View Mode & Selection
  manualMode: 'creator' | 'inspector' | null;
  selectedArchetype: CntxtBlockArchetype;
  selectedPresetId: string;
  formDraft: BlockFormDraft;

  // Actions
  setCursorLocation: (tabId: string, line: number, docContent: string) => void;
  setManualMode: (mode: 'creator' | 'inspector' | null) => void;
  selectArchetype: (archetype: CntxtBlockArchetype) => void;
  selectPreset: (presetId: string) => void;
  updateFormDraft: (patch: Partial<BlockFormDraft>) => void;
  resetFormDraftFromPreset: (presetId: string) => void;
  mutateActiveBlockParams: (updater: (prev: CntxtBlockParams) => CntxtBlockParams) => void;
  insertBlockAtCursor: () => boolean;
  wrapSelectionInBlock: () => boolean;
  clearActiveBlock: () => void;
}

const initialPreset = BLOCK_PRESET_DEFINITIONS[0];

const createDefaultDraft = (preset = initialPreset): BlockFormDraft => {
  const initialTitle = preset.name;
  return {
    title: initialTitle,
    id: generateBlockSlug(initialTitle, preset.archetype),
    status: (preset.defaultParams.status as string) || 'draft',
    locked: (preset.defaultParams.locked as 'user' | 'agent') || 'agent',
    source: preset.defaultParams.source || '@agent',
    tags: (preset.defaultParams.tags || []).join(', '),
    content: preset.defaultContent,
    language: preset.language,
    preferredFence: preset.preferredFence || '~~~',
  };
};

export const useActiveBlockStore = create<ActiveBlockStoreState>((set, get) => ({
  activeTabId: null,
  cursorLine: 1,
  isInsideBlock: false,
  activeBlock: null,
  parsedDoc: null,
  lastParsedContent: null,
  manualMode: null,
  selectedArchetype: 'deliverable',
  selectedPresetId: initialPreset.id,
  formDraft: createDefaultDraft(initialPreset),

  setCursorLocation: (tabId: string, line: number, docContent: string) => {
    const { activeTabId, lastParsedContent, parsedDoc: existingDoc, manualMode } = get();

    let doc = existingDoc;
    // Re-parse AST only if tab changed or document content mutated
    if (tabId !== activeTabId || docContent !== lastParsedContent || !doc) {
      try {
        doc = parseCntxtDocument(docContent);
      } catch {
        doc = null;
      }
    }

    let foundBlock: CntxtParsedBlock | null = null;
    if (doc && doc.blocks.length > 0) {
      foundBlock = doc.blocks.find(
        (b) => b.position.startLine <= line && line <= b.position.endLine
      ) ?? null;
    }

    const isInside = foundBlock !== null;

    set({
      activeTabId: tabId,
      cursorLine: line,
      isInsideBlock: isInside,
      activeBlock: foundBlock,
      parsedDoc: doc,
      lastParsedContent: docContent,
    });
  },

  setManualMode: (mode) => set({ manualMode: mode }),

  selectArchetype: (archetype) => {
    const matchingPreset =
      BLOCK_PRESET_DEFINITIONS.find((p) => p.archetype === archetype) || BLOCK_PRESET_DEFINITIONS[0];
    set({
      selectedArchetype: archetype,
      selectedPresetId: matchingPreset.id,
      formDraft: createDefaultDraft(matchingPreset),
    });
  },

  selectPreset: (presetId) => {
    const preset = BLOCK_PRESET_DEFINITIONS.find((p) => p.id === presetId);
    if (!preset) return;
    set({
      selectedPresetId: preset.id,
      selectedArchetype: preset.archetype,
      formDraft: createDefaultDraft(preset),
    });
  },

  updateFormDraft: (patch) => {
    set((state) => {
      const updated = { ...state.formDraft, ...patch };
      // If title changed and user hasn't explicitly customized ID, auto-generate slug
      if (patch.title !== undefined && patch.id === undefined) {
        updated.id = generateBlockSlug(patch.title, state.selectedArchetype);
      }
      return { formDraft: updated };
    });
  },

  resetFormDraftFromPreset: (presetId) => {
    const preset = BLOCK_PRESET_DEFINITIONS.find((p) => p.id === presetId);
    if (preset) {
      set({ formDraft: createDefaultDraft(preset) });
    }
  },

  mutateActiveBlockParams: (updater) => {
    const { activeTabId, activeBlock } = get();
    if (!activeTabId || !activeBlock) return;

    const view = editorRegistry.getView(activeTabId);
    if (!view) return;

    // Mutate the header line surgically in CodeMirror
    mutateHeaderLineParams(view, activeBlock.position.startLine, (current) => {
      const updated = updater(current);
      return updated;
    });

    // Notify tab store of dirty state
    const currentDoc = view.state.doc.toString();
    useTabStore.getState().updateTabContent(activeTabId, currentDoc, false);
  },

  insertBlockAtCursor: () => {
    const { activeTabId, formDraft, selectedArchetype } = get();
    const tabStore = useTabStore.getState();
    const targetTabId = activeTabId || tabStore.activeTabId;
    if (!targetTabId) {
      useNotificationStore.getState().addNotification(
        'No Document Open',
        'Open or create a tab before inserting a block.',
        'warning'
      );
      return false;
    }

    const tagsArray = formDraft.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const blockParams: CntxtBlockParams = {
      id: formDraft.id.trim() || generateBlockSlug(formDraft.title, selectedArchetype),
      label: formDraft.title.trim() || undefined,
      status: formDraft.status || undefined,
      locked: formDraft.locked !== 'none' ? (formDraft.locked as CntxtLockValue) : undefined,
      source: formDraft.source.trim() || undefined,
      tags: tagsArray.length > 0 ? tagsArray : undefined,
    };

    if (formDraft.title.trim()) {
      blockParams.rendererParams = { title: formDraft.title.trim() };
    }

    const blockText = assembleBlockString({
      language: formDraft.language || 'markdown',
      params: blockParams,
      content: formDraft.content,
      preferredFence: formDraft.preferredFence,
      isCNTXT: true,
    });

    const success = editorRegistry.insertTextAtCursor(targetTabId, blockText);
    if (success) {
      useNotificationStore.getState().addNotification(
        'Block Inserted',
        `Inserted ${formDraft.title || 'CNTXT block'} at cursor.`,
        'success'
      );
    }
    return success;
  },

  wrapSelectionInBlock: () => {
    const { activeTabId, formDraft, selectedArchetype } = get();
    const tabStore = useTabStore.getState();
    const targetTabId = activeTabId || tabStore.activeTabId;
    if (!targetTabId) return false;

    const selectedText = editorRegistry.getSelectedText(targetTabId);
    if (!selectedText) {
      useNotificationStore.getState().addNotification(
        'Selection Empty',
        'Highlight text in the editor to wrap it in a code block.',
        'info'
      );
      return false;
    }

    const tagsArray = formDraft.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const blockParams: CntxtBlockParams = {
      id: formDraft.id.trim() || generateBlockSlug(formDraft.title, selectedArchetype),
      label: formDraft.title.trim() || undefined,
      status: formDraft.status || undefined,
      locked: formDraft.locked !== 'none' ? (formDraft.locked as CntxtLockValue) : undefined,
      source: formDraft.source.trim() || undefined,
      tags: tagsArray.length > 0 ? tagsArray : undefined,
    };

    if (formDraft.title.trim()) {
      blockParams.rendererParams = { title: formDraft.title.trim() };
    }

    const blockText = assembleBlockString({
      language: formDraft.language || 'markdown',
      params: blockParams,
      content: selectedText,
      preferredFence: formDraft.preferredFence,
      isCNTXT: true,
    });

    const success = editorRegistry.replaceSelection(targetTabId, blockText);
    if (success) {
      useNotificationStore.getState().addNotification(
        'Block Created',
        `Wrapped selected text in ${formDraft.title || 'CNTXT block'}.`,
        'success'
      );
    }
    return success;
  },

  clearActiveBlock: () => {
    set({
      isInsideBlock: false,
      activeBlock: null,
      manualMode: null,
    });
  },
}));
