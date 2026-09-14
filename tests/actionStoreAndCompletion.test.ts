import { describe, it, expect, beforeEach } from 'vitest';
import { EditorState } from '@codemirror/state';
import { CompletionContext } from '@codemirror/autocomplete';
import { useActionStore } from '../src/store/actionStore';
import { useTemplateStore } from '../src/store/templateStore';
import { getFormulaFunctionsByCategory, FORMULA_FUNCTIONS } from '../src/services/formulaParser';
import { slashCommandExtension, STATIC_SLASH_COMMANDS, completionSource } from '../src/extensions/slashCommands';

describe('ActionStore & Category Management', () => {
  beforeEach(() => {
    useActionStore.setState({
      actions: [],
      collapsedCategories: [],
      categoryOrder: [],
      pinnedActionIds: [],
      selectedActionIds: [],
      showHidden: true,
      bulkMode: false
    });
  });

  it('creates and updates actions with category and code', () => {
    const store = useActionStore.getState();
    const id = store.createAction({
      name: 'Format Markdown',
      description: 'Cleans markdown syntax',
      code: 'api.insertAtCursor("cleaned");',
      category: 'FORMAT',
      type: 'command',
      enabled: true
    });

    expect(id).toBeDefined();
    const action = useActionStore.getState().actions.find(a => a.id === id);
    expect(action).toBeDefined();
    expect(action?.name).toBe('Format Markdown');
    expect(action?.category).toBe('FORMAT');

    // Update
    useActionStore.getState().updateAction(id, { name: 'Prettify Markdown' });
    const updated = useActionStore.getState().actions.find(a => a.id === id);
    expect(updated?.name).toBe('Prettify Markdown');
  });

  it('toggles action pin status and checks isActionPinned', () => {
    const store = useActionStore.getState();
    const id = store.createAction({
      name: 'Pinned Action',
      description: 'Favorite script',
      code: 'api.toast("hi");',
      category: 'GENERAL',
      type: 'command',
      enabled: true
    });

    expect(useActionStore.getState().isActionPinned(id)).toBe(false);
    useActionStore.getState().toggleActionPin(id);
    expect(useActionStore.getState().isActionPinned(id)).toBe(true);
    useActionStore.getState().toggleActionPin(id);
    expect(useActionStore.getState().isActionPinned(id)).toBe(false);
  });

  it('manages category collapsing and reordering', () => {
    const store = useActionStore.getState();
    store.createAction({ name: 'A1', description: '', code: 'code', category: 'DEV', type: 'command' });
    store.createAction({ name: 'B1', description: '', code: 'code', category: 'PROD', type: 'command' });

    const categories = useActionStore.getState().getAllCategories();
    expect(categories.map(c => c.name)).toContain('DEV');
    expect(categories.map(c => c.name)).toContain('PROD');

    // Toggle collapse
    useActionStore.getState().toggleCategoryCollapse('DEV');
    expect(useActionStore.getState().collapsedCategories).toContain('DEV');

    // Collapse and expand all
    useActionStore.getState().collapseAllCategories();
    expect(useActionStore.getState().collapsedCategories.length).toBeGreaterThanOrEqual(2);

    useActionStore.getState().expandAllCategories();
    expect(useActionStore.getState().collapsedCategories).toEqual([]);
  });

  it('supports bulk selection, bulk disable, and bulk delete', () => {
    const store = useActionStore.getState();
    const id1 = store.createAction({ name: 'Bulk1', description: '', code: 'code', category: 'DEV', type: 'command', enabled: true });
    const id2 = store.createAction({ name: 'Bulk2', description: '', code: 'code', category: 'DEV', type: 'command', enabled: true });

    useActionStore.getState().toggleSelection(id1);
    useActionStore.getState().toggleSelection(id2);
    expect(useActionStore.getState().selectedActionIds).toEqual([id1, id2]);

    // Bulk toggle enable
    useActionStore.getState().toggleActionsEnabledBulk([id1, id2], false);
    expect(useActionStore.getState().actions.find(a => a.id === id1)?.enabled).toBe(false);
    expect(useActionStore.getState().actions.find(a => a.id === id2)?.enabled).toBe(false);

    // Bulk delete
    useActionStore.getState().deleteActionsBulk([id1, id2]);
    expect(useActionStore.getState().actions.length).toBe(0);
    expect(useActionStore.getState().selectedActionIds).toEqual([]);
  });

  it('exports and imports actions correctly', () => {
    const store = useActionStore.getState();
    store.createAction({ name: 'Exportable', description: 'Desc', code: 'api.toast("1");', category: 'CUSTOM', type: 'button' });

    const exported = useActionStore.getState().exportActions();
    expect(exported).toContain('Exportable');

    // Reset and re-import
    useActionStore.setState({ actions: [] });
    expect(useActionStore.getState().actions.length).toBe(0);

    const count = useActionStore.getState().importActions(exported);
    expect(count).toBe(1);
    expect(useActionStore.getState().actions[0].name).toBe('Exportable');
  });
});

describe('Formula Functions Registry', () => {
  it('groups formula functions by category', () => {
    const grouped = getFormulaFunctionsByCategory();
    expect(Object.keys(grouped).length).toBeGreaterThan(0);
    expect(grouped['Text']).toBeDefined();
    expect(grouped['Markdown']).toBeDefined();
    expect(grouped['DateTime']).toBeDefined();
  });

  it('ensures each formula function has name, description, and example', () => {
    expect(FORMULA_FUNCTIONS.length).toBeGreaterThan(20);
    for (const fn of FORMULA_FUNCTIONS) {
      expect(fn.name).toBeTruthy();
      expect(fn.description).toBeTruthy();
      expect(fn.example).toBeTruthy();
      expect(fn.category).toBeTruthy();
    }
  });
});

describe('Slash Command & Autocompletion Extension', () => {
  it('instantiates slashCommandExtension without runtime errors', () => {
    const ext = slashCommandExtension();
    expect(ext).toBeDefined();
    expect(Array.isArray(ext)).toBe(true);
  });

  it('includes default static slash commands', () => {
    const labels = STATIC_SLASH_COMMANDS.map(c => c.label);
    expect(labels).toContain('/image');
    expect(labels).toContain('/system-prompt');
    expect(labels).toContain('/table-template');
    expect(labels).toContain('/mermaid-graph');
  });

  it('triggers completion palette synchronously on explicit trigger (Ctrl+Space)', () => {
    useActionStore.setState({
      actions: [
        {
          id: 'act-1',
          name: 'Format Markdown',
          description: 'Cleans syntax',
          code: 'api.insertAtCursor("clean");',
          category: 'FORMAT',
          type: 'command',
          enabled: true,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ]
    });

    useTemplateStore.setState({
      templates: [
        {
          id: 'tmpl-1',
          name: 'Meeting Notes',
          description: 'Template for syncs',
          category: 'GENERAL',
          content: '# Meeting Notes\n{{TOPIC}}',
          variables: ['TOPIC'],
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ]
    });

    // 1. Explicit trigger on empty document (Ctrl+Space)
    const stateEmpty = EditorState.create({ doc: '' });
    const contextEmpty = new CompletionContext(stateEmpty, 0, true);
    const resultEmpty = completionSource(contextEmpty);

    expect(resultEmpty).not.toBeNull();
    expect(resultEmpty?.from).toBe(0);
    const labelsEmpty = resultEmpty?.options.map(o => o.label) || [];
    expect(labelsEmpty).toContain('Format Markdown');
    expect(labelsEmpty).toContain('Meeting Notes');
    expect(labelsEmpty).toContain('/image');

    // 2. Explicit trigger touching a non-matching word (Ctrl+Space after arbitrary text)
    // Should fall back to context.pos so the palette is not suppressed
    const stateArbitrary = EditorState.create({ doc: 'Random nonmatching text' });
    const contextArbitrary = new CompletionContext(stateArbitrary, 23, true);
    const resultArbitrary = completionSource(contextArbitrary);

    expect(resultArbitrary).not.toBeNull();
    expect(resultArbitrary?.from).toBe(23); // Does not collapse to from: 19 which would drop all results
    expect(resultArbitrary?.options.length).toBeGreaterThan(10);

    // 3. Explicit trigger matching an action prefix (Ctrl+Space after typing 'format')
    const stateMatch = EditorState.create({ doc: 'format' });
    const contextMatch = new CompletionContext(stateMatch, 6, true);
    const resultMatch = completionSource(contextMatch);

    expect(resultMatch).not.toBeNull();
    expect(resultMatch?.from).toBe(0); // Word start for clean replacement

    // 4. Inline slash trigger (/...)
    const stateSlash = EditorState.create({ doc: '/' });
    const contextSlash = new CompletionContext(stateSlash, 1, false);
    const resultSlash = completionSource(contextSlash);

    expect(resultSlash).not.toBeNull();
    expect(resultSlash?.from).toBe(0);
    const slashLabels = resultSlash?.options.map(o => o.label) || [];
    expect(slashLabels).toContain('/image');
    expect(slashLabels).toContain('/format-markdown');

    // 5. Inactive when neither explicit nor slash
    const stateInactive = EditorState.create({ doc: 'hello' });
    const contextInactive = new CompletionContext(stateInactive, 5, false);
    const resultInactive = completionSource(contextInactive);
    expect(resultInactive).toBeNull();
  });
});
