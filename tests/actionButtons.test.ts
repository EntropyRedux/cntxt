import { describe, it, expect, beforeEach } from 'vitest';
import { useActionStore } from '../src/store/actionStore';
import { useTabStore } from '../src/store/tabStore';
import { useNotificationStore } from '../src/store/notificationStore';
import { executeActionById } from '../src/services/actionExecutor';

describe('Action Buttons Regex & Parsing', () => {
  const actionRegex = /\[\[action:([^\]|\n]+)(?:\|([^\]\n]+))?\]\]/g;

  it('matches standard action syntax [[action:id]]', () => {
    const text = 'Before [[action:act1789342015718hjzxl]] After';
    const matches = Array.from(text.matchAll(actionRegex));
    expect(matches).toHaveLength(1);
    expect(matches[0][1].trim()).toBe('act1789342015718hjzxl');
    expect(matches[0][2]).toBeUndefined();
  });

  it('matches action with custom label [[action:id|Custom Label]]', () => {
    const text = 'Click here: [[action:act_123_abc|Run Benchmark]]';
    const matches = Array.from(text.matchAll(actionRegex));
    expect(matches).toHaveLength(1);
    expect(matches[0][1].trim()).toBe('act_123_abc');
    expect(matches[0][2]?.trim()).toBe('Run Benchmark');
  });

  it('matches multiple action buttons on a line or document', () => {
    const text = '[[action:btn_1]] and [[action:btn_2|Second]] in document';
    const matches = Array.from(text.matchAll(actionRegex));
    expect(matches).toHaveLength(2);
    expect(matches[0][1].trim()).toBe('btn_1');
    expect(matches[1][1].trim()).toBe('btn_2');
    expect(matches[1][2]?.trim()).toBe('Second');
  });
});

describe('Action Executor Service', () => {
  beforeEach(() => {
    useActionStore.setState({
      actions: [],
      selectedCategory: 'All',
      searchQuery: '',
      isActionEditorOpen: false,
      editingAction: null,
      isRunningAction: false
    });
    useTabStore.setState({
      tabs: [{ id: 'tab_test', title: 'Test.md', content: 'Line 1\nLine 2\nLine 3', isDirty: false }],
      activeTabId: 'tab_test'
    });
    useNotificationStore.setState({ notifications: [] });
  });

  it('handles missing action gracefully without throwing', async () => {
    const success = await executeActionById('non_existent_id');
    expect(success).toBe(false);
    const notifications = useNotificationStore.getState().notifications;
    expect(notifications.some(n => n.title === 'Action Not Found')).toBe(true);
  });

  it('handles disabled action gracefully', async () => {
    useActionStore.setState({
      actions: [{
        id: 'disabled_act',
        name: 'Disabled Test',
        description: 'Disabled action',
        code: 'FORMULA: UPPER("disabled")',
        category: 'TEST',
        type: 'button',
        enabled: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }]
    });

    const success = await executeActionById('disabled_act');
    expect(success).toBe(false);
    const notifications = useNotificationStore.getState().notifications;
    expect(notifications.some(n => n.title === 'Action Disabled')).toBe(true);
  });

  it('executes formula action with tab store fallback', async () => {
    useActionStore.setState({
      actions: [{
        id: 'formula_act',
        name: 'Line Counter Action',
        description: 'Counts document lines',
        code: 'FORMULA: "Lines: " + LINES()',
        category: 'GENERAL',
        type: 'button',
        enabled: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }]
    });

    const success = await executeActionById('formula_act');
    expect(success).toBe(true);
    const tab = useTabStore.getState().tabs.find(t => t.id === 'tab_test');
    expect(tab?.content).toContain('Lines: 3');
  });

  it('executes formula action with mock EditorView', async () => {
    useActionStore.setState({
      actions: [{
        id: 'formula_act',
        name: 'Line Counter Action',
        description: 'Counts document lines',
        code: 'FORMULA: "Lines: " + LINES()',
        category: 'GENERAL',
        type: 'button',
        enabled: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }]
    });

    let dispatchedChanges: any = null;
    const mockView: any = {
      state: {
        doc: {
          toString: () => 'Row A\nRow B\nRow C',
          lines: 3,
          length: 17
        },
        selection: {
          main: { from: 0, to: 0, head: 0, empty: true }
        },
        replaceSelection: (val: string) => ({ insert: val })
      },
      dispatch: (tr: any) => {
        dispatchedChanges = tr;
      }
    };

    const success = await executeActionById('formula_act', mockView);
    expect(success).toBe(true);
    expect(dispatchedChanges?.changes?.insert).toBe('Lines: 3');
  });

  it('executes javascript code action in sandbox with mock EditorView', async () => {
    let replacedText = '';
    const mockView: any = {
      state: {
        doc: {
          toString: () => 'Initial Document Content',
          length: 24
        },
        selection: {
          main: { from: 0, to: 0, head: 0, empty: true }
        },
        sliceDoc: () => ''
      },
      dispatch: (tr: any) => {
        if (tr.changes?.insert) {
          replacedText = tr.changes.insert;
        }
      }
    };

    useActionStore.setState({
      actions: [{
        id: 'js_act',
        name: 'Append Text Action',
        description: 'Appends text to editor',
        code: 'api.setText(api.getText() + "\\nAppended by Action");',
        category: 'GENERAL',
        type: 'button',
        enabled: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }]
    });

    const success = await executeActionById('js_act', mockView);
    expect(success).toBe(true);
    expect(replacedText).toBe('Initial Document Content\nAppended by Action');
  });

  it('transforms selected text without removing or clearing it', async () => {
    let capturedChange: any = null;
    let capturedSelection: any = null;

    const mockView: any = {
      state: {
        doc: {
          toString: () => 'Hello World and CNTXT',
          lines: 1,
          length: 21
        },
        selection: {
          main: { from: 6, to: 11, head: 11, empty: false }
        },
        sliceDoc: (from: number, to: number) => 'Hello World and CNTXT'.slice(from, to)
      },
      dispatch: (tr: any) => {
        capturedChange = tr.changes;
        capturedSelection = tr.selection;
      }
    };

    useActionStore.setState({
      actions: [{
        id: 'act_upper_sel',
        name: 'UPPER Selection',
        description: 'Converts selection to uppercase',
        code: 'FORMULA: UPPER(selection)',
        category: 'Formatting',
        type: 'button',
        enabled: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }]
    });

    const success = await executeActionById('act_upper_sel', mockView);
    expect(success).toBe(true);
    // Verified: transforms 'World' (from: 6, to: 11) to 'WORLD'
    expect(capturedChange?.from).toBe(6);
    expect(capturedChange?.to).toBe(11);
    expect(capturedChange?.insert).toBe('WORLD');
    // Verified: maintains selection over the transformed text
    expect(capturedSelection?.anchor).toBe(6);
    expect(capturedSelection?.head).toBe(11);
  });

  it('inserts non-transform formula without deleting active selection', async () => {
    let capturedChange: any = null;

    const mockView: any = {
      state: {
        doc: {
          toString: () => 'Selected Notes text',
          lines: 1,
          length: 19
        },
        selection: {
          main: { from: 0, to: 14, head: 14, empty: false }
        },
        sliceDoc: (from: number, to: number) => 'Selected Notes text'.slice(from, to)
      },
      dispatch: (tr: any) => {
        capturedChange = tr.changes;
      }
    };

    useActionStore.setState({
      actions: [{
        id: 'act_today_ins',
        name: 'Insert Today',
        description: 'Inserts current date',
        code: 'FORMULA: TODAY()',
        category: 'Utility',
        type: 'button',
        enabled: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }]
    });

    const success = await executeActionById('act_today_ins', mockView);
    expect(success).toBe(true);
    // Verified: does NOT replace 0..14; inserts AFTER selection at pos 14
    expect(capturedChange?.from).toBe(14);
    expect(capturedChange?.to).toBeUndefined();
    expect(capturedChange?.insert).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('honors selectionBehavior="insert" to keep original text even when referencing selection', async () => {
    let capturedChange: any = null;

    const mockView: any = {
      state: {
        doc: {
          toString: () => 'Hello World and CNTXT',
          lines: 1,
          length: 21
        },
        selection: {
          main: { from: 6, to: 11, head: 11, empty: false }
        },
        sliceDoc: (from: number, to: number) => 'Hello World and CNTXT'.slice(from, to)
      },
      dispatch: (tr: any) => {
        capturedChange = tr.changes;
      }
    };

    useActionStore.setState({
      actions: [{
        id: 'act_annotator',
        name: 'Annotate Selection',
        description: 'Appends annotation without removing text',
        code: 'FORMULA: " (" + UPPER(selection) + ")"',
        selectionBehavior: 'insert',
        category: 'Custom',
        type: 'button',
        enabled: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }]
    });

    const success = await executeActionById('act_annotator', mockView);
    expect(success).toBe(true);
    // Verified: Inserts at cursor (pos 11) without removing selected range (6..11)
    expect(capturedChange?.from).toBe(11);
    expect(capturedChange?.to).toBeUndefined();
    expect(capturedChange?.insert).toBe(' (WORLD)');
  });

  it('honors selectionBehavior="replace" to force replacement of selected text', async () => {
    let capturedChange: any = null;

    const mockView: any = {
      state: {
        doc: {
          toString: () => 'Selected Notes text',
          lines: 1,
          length: 19
        },
        selection: {
          main: { from: 0, to: 14, head: 14, empty: false }
        },
        sliceDoc: (from: number, to: number) => 'Selected Notes text'.slice(from, to)
      },
      dispatch: (tr: any) => {
        capturedChange = tr.changes;
      }
    };

    useActionStore.setState({
      actions: [{
        id: 'act_force_replace',
        name: 'Replace With Date',
        description: 'Replaces selection with date',
        code: 'FORMULA: TODAY()',
        selectionBehavior: 'replace',
        category: 'Utility',
        type: 'button',
        enabled: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }]
    });

    const success = await executeActionById('act_force_replace', mockView);
    expect(success).toBe(true);
    // Verified: Replaces range 0..14
    expect(capturedChange?.from).toBe(0);
    expect(capturedChange?.to).toBe(14);
    expect(capturedChange?.insert).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('honors INSERT() formula directive to avoid deleting text', async () => {
    let capturedChange: any = null;

    const mockView: any = {
      state: {
        doc: {
          toString: () => 'Active Section Target',
          lines: 1,
          length: 21
        },
        selection: {
          main: { from: 0, to: 14, head: 14, empty: false }
        },
        sliceDoc: (from: number, to: number) => 'Active Section Target'.slice(from, to)
      },
      dispatch: (tr: any) => {
        capturedChange = tr.changes;
      }
    };

    useActionStore.setState({
      actions: [{
        id: 'act_insert_directive',
        name: 'Insert Directive Action',
        description: 'Formula explicitly uses INSERT directive',
        code: 'FORMULA: INSERT(" [" + UPPER(selection) + "]")',
        category: 'Custom',
        type: 'button',
        enabled: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }]
    });

    const success = await executeActionById('act_insert_directive', mockView);
    expect(success).toBe(true);
    // Verified: from is 14, to is undefined
    expect(capturedChange?.from).toBe(14);
    expect(capturedChange?.to).toBeUndefined();
    expect(capturedChange?.insert).toBe(' [ACTIVE SECTION]');
  });
});
