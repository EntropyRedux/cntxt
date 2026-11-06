import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ARCHETYPES,
  BLOCK_PRESET_DEFINITIONS,
  generateBlockSlug,
  assembleBlockString,
} from '../src/services/editor/blockPresetCatalog';
import {
  validateBlockPreset,
  CntxtBlockArchetypeSchema,
  validateViewSettings,
} from '../src/contracts/boundarySchemas';
import { useActiveBlockStore } from '../src/store/activeBlockStore';
import { editorRegistry } from '../src/services/editor/editorRegistry';
import { useTabStore } from '../src/store/tabStore';
import { useNotificationStore } from '../src/store/notificationStore';

describe('FG-26: Code Block Builder & Primitive Primitives Overhaul', () => {
  beforeEach(() => {
    // Reset Zustand stores
    useActiveBlockStore.getState().selectArchetype('deliverable');
    useActiveBlockStore.setState({
      activeTabId: null,
      cursorLine: 1,
      isInsideBlock: false,
      activeBlock: null,
      parsedDoc: null,
      lastParsedContent: null,
      manualMode: null,
    });
    useNotificationStore.getState().clearAll();
  });

  describe('1. Archetypes & Preset Catalog', () => {
    it('contains all 6 canonical CNTXT archetypes', () => {
      const ids = ARCHETYPES.map((a) => a.id);
      expect(ids).toContain('deliverable');
      expect(ids).toContain('conversation');
      expect(ids).toContain('table');
      expect(ids).toContain('audit');
      expect(ids).toContain('diagram');
      expect(ids).toContain('code');
      expect(ids.length).toBe(6);
    });

    it('validates every default preset against CntxtBlockPresetSchema', () => {
      expect(BLOCK_PRESET_DEFINITIONS.length).toBeGreaterThanOrEqual(6);
      for (const preset of BLOCK_PRESET_DEFINITIONS) {
        const validation = validateBlockPreset(preset);
        expect(validation.success, `Preset ${preset.id} failed validation: ${validation.error?.message}`).toBe(true);
      }
    });

    it('generates clean kebab-cased slugs from arbitrary titles', () => {
      const slug1 = generateBlockSlug('Phase 1 Architecture Plan');
      expect(slug1).toMatch(/^phase-1-architecture-plan-[a-z0-9]+$/);

      const slug2 = generateBlockSlug('Special @# Characters & Symbols!!!');
      expect(slug2).toMatch(/^special-characters-symbols-[a-z0-9]+$/);

      const slugEmpty = generateBlockSlug('');
      expect(slugEmpty).toMatch(/^block-[a-z0-9]+$/);
    });

    it('assembles a collision-safe fenced block string with governance attributes', () => {
      const blockStr = assembleBlockString({
        language: 'markdown',
        params: {
          id: 'plan-101',
          status: 'draft',
          locked: 'agent',
          source: '@agent',
          rendererParams: { title: 'Test Plan' },
        },
        content: '## Executive Summary\nAll requirements met.\n',
        preferredFence: '~~~',
        isCNTXT: true,
      });

      expect(blockStr).toContain('~~~markdown | id=plan-101 locked=agent status=draft source=@agent title="Test Plan"');
      expect(blockStr).toContain('## Executive Summary\nAll requirements met.');
      expect(blockStr.endsWith('~~~\n')).toBe(true);
    });

    it('automatically increases fence length when inner content contains matching fences', () => {
      const innerContent = 'Here is a nested block:\n~~~markdown\nInner deliverable\n~~~\n';
      const blockStr = assembleBlockString({
        language: 'markdown',
        params: { id: 'outer-box' },
        content: innerContent,
        preferredFence: '~~~',
        isCNTXT: true,
      });

      // Must use at least ~~~~ to avoid premature closing
      expect(blockStr.startsWith('~~~~markdown | id=outer-box')).toBe(true);
      expect(blockStr.endsWith('~~~~\n')).toBe(true);
    });
  });

  describe('2. Boundary Schemas & ViewSettings Synchronization', () => {
    it('validates CntxtBlockArchetypeSchema', () => {
      expect(CntxtBlockArchetypeSchema.safeParse('deliverable').success).toBe(true);
      expect(CntxtBlockArchetypeSchema.safeParse('conversation').success).toBe(true);
      expect(CntxtBlockArchetypeSchema.safeParse('table').success).toBe(true);
      expect(CntxtBlockArchetypeSchema.safeParse('audit').success).toBe(true);
      expect(CntxtBlockArchetypeSchema.safeParse('diagram').success).toBe(true);
      expect(CntxtBlockArchetypeSchema.safeParse('code').success).toBe(true);
      expect(CntxtBlockArchetypeSchema.safeParse('unknown-type').success).toBe(false);
    });

    it('accepts activeSidebarTab: "code-blocks" in ViewSettingsSchema', () => {
      const res = validateViewSettings({
        activeSidebarTab: 'code-blocks',
        showSidebar: true,
        theme: 'contextpad-dark',
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.activeSidebarTab).toBe('code-blocks');
      }
    });
  });

  describe('3. Active Block Store State & Preset Switching', () => {
    it('initializes with default deliverable archetype and default draft', () => {
      const store = useActiveBlockStore.getState();
      expect(store.selectedArchetype).toBe('deliverable');
      expect(store.selectedPresetId).toBe(BLOCK_PRESET_DEFINITIONS[0].id);
      expect(store.formDraft.title).toBe(BLOCK_PRESET_DEFINITIONS[0].name);
      expect(store.formDraft.locked).toBe('agent');
      expect(store.formDraft.status).toBe('draft');
    });

    it('switches archetype and updates default preset and draft', () => {
      const { selectArchetype } = useActiveBlockStore.getState();
      selectArchetype('conversation');

      const store = useActiveBlockStore.getState();
      expect(store.selectedArchetype).toBe('conversation');
      expect(store.formDraft.language).toBe('conversation');
      expect(store.formDraft.source).toBe('@user');
      expect(store.formDraft.status).toBe('ready');
    });

    it('updates form draft and automatically updates ID slug when title changes', () => {
      const { updateFormDraft } = useActiveBlockStore.getState();
      updateFormDraft({ title: 'New Deliverable Milestone' });

      const store = useActiveBlockStore.getState();
      expect(store.formDraft.title).toBe('New Deliverable Milestone');
      expect(store.formDraft.id).toContain('new-deliverable-milestone');
    });

    it('allows manual view mode override between creator and inspector', () => {
      const { setManualMode } = useActiveBlockStore.getState();
      setManualMode('inspector');
      expect(useActiveBlockStore.getState().manualMode).toBe('inspector');

      setManualMode('creator');
      expect(useActiveBlockStore.getState().manualMode).toBe('creator');

      setManualMode(null);
      expect(useActiveBlockStore.getState().manualMode).toBeNull();
    });
  });

  describe('4. Cursor Observer & Active Block Detection', () => {
    const sampleDoc = `# My Project Document

Some introductory prose before code blocks.

~~~markdown | id=spec-deliverable tags=spec status=review locked=agent source=@agent title="Project Spec"
## Objectives
Here is the core objective.
~~~

Another middle paragraph.

\`\`\`typescript | id=helper-code status=ready
export function add(a: number, b: number): number {
  return a + b;
}
\`\`\`

Ending line of document.
`;

    it('detects when cursor enters a deliverable rich container block', () => {
      const { setCursorLocation } = useActiveBlockStore.getState();

      // Line 6 is inside the ~~~markdown block (which spans lines 5 to 8)
      setCursorLocation('tab-1', 6, sampleDoc);

      const store = useActiveBlockStore.getState();
      expect(store.isInsideBlock).toBe(true);
      expect(store.activeBlock).not.toBeNull();
      expect(store.activeBlock?.params.id).toBe('spec-deliverable');
      expect(store.activeBlock?.params.status).toBe('review');
      expect(store.activeBlock?.params.locked).toBe('agent');
      expect(store.activeBlock?.params.source).toBe('@agent');
      expect(store.activeBlock?.params.rendererParams?.title).toBe('Project Spec');
    });

    it('detects when cursor enters a typescript code block', () => {
      const { setCursorLocation } = useActiveBlockStore.getState();

      // Line 13 is inside the ```typescript block
      setCursorLocation('tab-1', 13, sampleDoc);

      const store = useActiveBlockStore.getState();
      expect(store.isInsideBlock).toBe(true);
      expect(store.activeBlock).not.toBeNull();
      expect(store.activeBlock?.params.id).toBe('helper-code');
      expect(store.activeBlock?.type).toBe('typescript');
    });

    it('detects when cursor is outside any block (in prose)', () => {
      const { setCursorLocation } = useActiveBlockStore.getState();

      // Line 3 is in introductory prose
      setCursorLocation('tab-1', 3, sampleDoc);

      const store = useActiveBlockStore.getState();
      expect(store.isInsideBlock).toBe(false);
      expect(store.activeBlock).toBeNull();

      // Line 10 is in middle paragraph
      setCursorLocation('tab-1', 10, sampleDoc);
      expect(useActiveBlockStore.getState().isInsideBlock).toBe(false);
      expect(useActiveBlockStore.getState().activeBlock).toBeNull();
    });
  });

  describe('5. Block Insertion & Selection Wrapping', () => {
    it('warns when attempting to insert block with no active tab open', () => {
      useTabStore.setState({ activeTabId: null, tabs: [] });
      const { insertBlockAtCursor } = useActiveBlockStore.getState();

      const result = insertBlockAtCursor();
      expect(result).toBe(false);

      const notifs = useNotificationStore.getState().notifications;
      expect(notifs.some((n) => n.title === 'No Document Open')).toBe(true);
    });

    it('calls editorRegistry.insertTextAtCursor when document is active', () => {
      useTabStore.setState({
        activeTabId: 'tab-test',
        tabs: [
          {
            id: 'tab-test',
            title: 'Doc.md',
            content: '',
            filePath: null,
            folderPath: null,
            isDirty: false,
            language: 'markdown',
          },
        ],
      });

      const spyInsert = vi.spyOn(editorRegistry, 'insertTextAtCursor').mockReturnValue(true);

      const { insertBlockAtCursor } = useActiveBlockStore.getState();
      const success = insertBlockAtCursor();

      expect(success).toBe(true);
      expect(spyInsert).toHaveBeenCalledWith(
        'tab-test',
        expect.stringContaining('~~~markdown | id=')
      );

      spyInsert.mockRestore();
    });

    it('wraps selected text using editorRegistry.replaceSelection', () => {
      useTabStore.setState({
        activeTabId: 'tab-test',
        tabs: [
          {
            id: 'tab-test',
            title: 'Doc.md',
            content: 'Selected text to wrap',
            filePath: null,
            folderPath: null,
            isDirty: false,
            language: 'markdown',
          },
        ],
      });

      const spyGetSelected = vi.spyOn(editorRegistry, 'getSelectedText').mockReturnValue('console.log("hello");');
      const spyReplace = vi.spyOn(editorRegistry, 'replaceSelection').mockReturnValue(true);

      const { wrapSelectionInBlock } = useActiveBlockStore.getState();
      const success = wrapSelectionInBlock();

      expect(success).toBe(true);
      expect(spyReplace).toHaveBeenCalledWith(
        'tab-test',
        expect.stringContaining('console.log("hello");')
      );

      spyGetSelected.mockRestore();
      spyReplace.mockRestore();
    });
  });
});
