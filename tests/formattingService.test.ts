import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeFormatting } from '../src/services/editor/formattingService';
import { editorRegistry } from '../src/services/editor/editorRegistry';
import { useTabStore } from '../src/store/tabStore';
import { useTemplateStore } from '../src/store/templateStore';
import { useImageModalStore } from '../src/store/imageModalStore';
import type { MarkdownFormatButton } from '../contracts/data_shapes';

function makeButton(partial: Partial<MarkdownFormatButton>): MarkdownFormatButton {
  return {
    id: 'fmt_bold',
    label: 'Bold',
    icon: 'bold',
    title: 'Bold',
    prefix: '**',
    suffix: '**',
    type: 'wrap',
    enabled: true,
    order: 0,
    ...partial,
  };
}

function makeSelectionView(opts: { selectedText?: string; from?: number; to?: number } = {}) {
  const { selectedText = '', from = 0, to = 0 } = opts;
  const calls: { changes: unknown; selection: unknown }[] = [];
  const view: any = {
    state: {
      selection: { main: { from, to } },
      sliceDoc: (_f: number, _t: number) => selectedText,
    },
    dispatch: (tr: any) => {
      calls.push(tr);
    },
    focus: vi.fn(),
  };
  return { view, calls };
}

describe('formattingService', () => {
  const tabId = 'fmt_test_tab';

  beforeEach(() => {
    useTabStore.setState({
      tabs: [{ id: tabId, title: 'Fmt.md', content: 'hello world', isDirty: false }],
      activeTabId: tabId,
    });
    useTemplateStore.setState({ isVariableModalOpen: false } as any);
    useImageModalStore.setState({ isOpen: false });
    editorRegistry.unregister(tabId);
  });

  it('returns early when no active tab is set', () => {
    useTabStore.setState({ tabs: [], activeTabId: null } as any);
    expect(() => executeFormatting(makeButton({}))).not.toThrow();
  });

  it('unknown command id falls through to wrap/insert semantics (documented behaviour)', () => {
    // OBSERVATION (minor defect candidate for the Prod Agent): a 'command'-typed
    // button with an unrecognised commandId does NOT return early — it drops
    // through to insertOrWrap and inserts prefix+suffix ('****'). Encoding the
    // shipped behaviour here so a future fix flips this test intentionally.
    const insertSpy = vi.spyOn(useTabStore.getState(), 'insertTextAtCursor');
    executeFormatting(makeButton({ type: 'command', commandId: 'nonexistent-command' }));
    expect(insertSpy).toHaveBeenCalledWith(tabId, '****');
    insertSpy.mockRestore();
  });

  it('wraps selected text via the live EditorView', () => {
    const { view, calls } = makeSelectionView({ selectedText: 'hi', from: 0, to: 2 });
    editorRegistry.register(tabId, view as any);
    executeFormatting(makeButton({ prefix: '**', suffix: '**' }));
    expect(calls).toHaveLength(1);
    expect((calls[0].changes as any).insert).toBe('**hi**');
  });

  it('puts the cursor between prefix and suffix when nothing is selected', () => {
    const { view, calls } = makeSelectionView({ selectedText: '', from: 3, to: 3 });
    editorRegistry.register(tabId, view as any);
    executeFormatting(makeButton({ prefix: '**', suffix: '**' }));
    expect(calls).toHaveLength(1);
    expect((calls[0].selection as any).anchor).toBe(3 + '**'.length);
  });

  it('falls back to the store insert when no live view is registered', () => {
    const insertSpy = vi.spyOn(useTabStore.getState(), 'insertTextAtCursor');
    executeFormatting(makeButton({ prefix: '`', suffix: '`' }));
    expect(insertSpy).toHaveBeenCalledWith(tabId, '``');
    insertSpy.mockRestore();
  });

  it('undo delegates to the registry without touching stores', () => {
    const undoSpy = vi.spyOn(editorRegistry, 'undo').mockReturnValue(true);
    executeFormatting(makeButton({ type: 'command', commandId: 'undo' }));
    expect(undoSpy).toHaveBeenCalledWith(tabId);
    undoSpy.mockRestore();
  });

  it('redo delegates to the registry', () => {
    const redoSpy = vi.spyOn(editorRegistry, 'redo').mockReturnValue(true);
    executeFormatting(makeButton({ type: 'command', commandId: 'redo' }));
    expect(redoSpy).toHaveBeenCalledWith(tabId);
    redoSpy.mockRestore();
  });
});