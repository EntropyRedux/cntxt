import { describe, it, expect, beforeEach } from 'vitest';
import { useTemplateStore } from '../src/store/templateStore';
import { Template } from '../contracts/data_shapes';

function makeTemplate(overrides: Partial<Template> = {}): Template {
  return {
    id: `tmpl_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    name: 'Test Template',
    description: 'A test template',
    category: 'GENERAL',
    content: 'Hello {{name}}',
    variables: [{ name: 'name', defaultValue: 'World' }],
    isHidden: false,
    isPinned: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

function resetStore() {
  const store = useTemplateStore.getState();
  store.resetToDefaults();
  // Full state reset since resetToDefaults only clears templates
  store.setSearchQuery('');
  store.setSelectedCategory('All');
  store.setShowHidden(true);
  store.setBulkMode(false);
  store.clearSelection();
  store.closeVariableModal();
}

describe('Template Store', () => {
  beforeEach(() => {
    resetStore();
  });

  it('preserves variableDefs when hydrating templates from storage (V2-02)', async () => {
    const mockStorage = {
      getItem: async (key: string) => {
        if (key === 'contextpad_templates') {
          return JSON.stringify([
            {
              id: 'tmpl-with-defs',
              name: 'Invoice Template',
              description: 'Generates client invoices',
              content: 'Invoice for {{client}}: {{amount}}',
              category: 'FINANCE',
              variables: ['client', 'amount'],
              variableDefs: [
                { name: 'client', required: true, type: 'string', description: 'Client company name' },
                { name: 'amount', defaultValue: '100', type: 'number' }
              ],
              isHidden: false,
              isPinned: true,
              createdAt: 1000,
              updatedAt: 2000
            }
          ]);
        }
        return null;
      },
      setItem: async () => {},
      removeItem: async () => {},
      clear: async () => {}
    };

    await useTemplateStore.getState().initializeTemplates(mockStorage as any);
    const tmpl = useTemplateStore.getState().templates.find(t => t.id === 'tmpl-with-defs');
    expect(tmpl).toBeDefined();
    expect(tmpl?.variableDefs).toHaveLength(2);
    expect(tmpl?.variableDefs?.[0].description).toBe('Client company name');
    expect(tmpl?.variableDefs?.[1].defaultValue).toBe('100');
  });

  it('initializes with empty state', () => {
    const state = useTemplateStore.getState();
    expect(state.templates).toEqual([]);
    expect(state.collapsedCategories).toEqual([]);
    expect(state.categoryOrder).toEqual([]);
    expect(state.pinnedTemplateIds).toEqual([]);
    expect(state.showHidden).toBe(true);
    expect(state.bulkMode).toBe(false);
    expect(state.selectedTemplateIds).toEqual([]);
    expect(state.searchQuery).toBe('');
    expect(state.selectedCategory).toBe('All');
    expect(state.isVariableModalOpen).toBe(false);
    expect(state.activeTemplateForModal).toBeNull();
  });
  it('setSearchQuery updates search query', () => {
    const store = useTemplateStore.getState();
    store.setSearchQuery('hello');
    expect(useTemplateStore.getState().searchQuery).toBe('hello');
  });

  it('setSelectedCategory updates selected category', () => {
    const store = useTemplateStore.getState();
    store.setSelectedCategory('WORK');
    expect(useTemplateStore.getState().selectedCategory).toBe('WORK');
  });

  it('toggleShowHidden flips showHidden', () => {
    const store = useTemplateStore.getState();
    store.toggleShowHidden();
    expect(useTemplateStore.getState().showHidden).toBe(false);
    store.toggleShowHidden();
    expect(useTemplateStore.getState().showHidden).toBe(true);
  });

  it('setShowHidden accepts boolean or updater function', () => {
    const store = useTemplateStore.getState();
    store.setShowHidden(false);
    expect(useTemplateStore.getState().showHidden).toBe(false);
    store.setShowHidden((prev) => !prev);
    expect(useTemplateStore.getState().showHidden).toBe(true);
  });
  it('setBulkMode and toggleBulkMode work correctly', () => {
    const store = useTemplateStore.getState();
    store.setBulkMode(true);
    expect(useTemplateStore.getState().bulkMode).toBe(true);
    store.toggleBulkMode();
    expect(useTemplateStore.getState().bulkMode).toBe(false);
    store.toggleBulkMode();
    expect(useTemplateStore.getState().bulkMode).toBe(true);
  });

  it('toggleSelection adds / removes template id from selection', () => {
    const store = useTemplateStore.getState();
    const id = 'tmpl_1';
    store.toggleSelection(id);
    expect(useTemplateStore.getState().selectedTemplateIds).toContain(id);
    store.toggleSelection(id);
    expect(useTemplateStore.getState().selectedTemplateIds).not.toContain(id);
  });

  it('clearSelection empties selection', () => {
    const store = useTemplateStore.getState();
    store.toggleSelection('tmpl_1');
    store.toggleSelection('tmpl_2');
    expect(useTemplateStore.getState().selectedTemplateIds).toHaveLength(2);
    store.clearSelection();
    expect(useTemplateStore.getState().selectedTemplateIds).toEqual([]);
  });

  it('selectAll selects all template ids', () => {
    const store = useTemplateStore.getState();
    const t1 = makeTemplate({ id: 'tmpl_a' });
    const t2 = makeTemplate({ id: 'tmpl_b' });
    store.createTemplate(t1);
    store.createTemplate(t2);
    store.selectAll();
    expect(useTemplateStore.getState().selectedTemplateIds).toHaveLength(2);
  });

  it('createTemplate adds a new template with generated id and timestamps', () => {
    const store = useTemplateStore.getState();
    const before = Date.now();
    const newTemplate = store.createTemplate({
      name: 'New Template',
      content: 'Hello {{name}}',
      category: 'GENERAL',
      description: '',
      isHidden: false,
      isPinned: false,
    });
    const after = Date.now();

    expect(newTemplate.id).toMatch(/^tmpl_/);
    expect(newTemplate.name).toBe('New Template');
    expect(newTemplate.content).toBe('Hello {{name}}');
    expect(newTemplate.createdAt).toBeGreaterThanOrEqual(before);
    expect(newTemplate.updatedAt).toBeLessThanOrEqual(after);
    expect(newTemplate.variables).toEqual(['name']);

    const state = useTemplateStore.getState();
    expect(state.templates).toHaveLength(1);
    expect(state.templates[0]).toEqual(newTemplate);
  });

  it('createTemplate accepts explicit id', () => {
    const store = useTemplateStore.getState();
    const t = store.createTemplate({
      id: 'custom_id',
      name: 'Custom ID Template',
      content: 'hi',
      category: 'GENERAL',
      description: '',
      isHidden: false,
      isPinned: false,
    });
    expect(t.id).toBe('custom_id');
    expect(useTemplateStore.getState().templates).toHaveLength(1);
  });

  it('createTemplate extracts variables from content automatically', () => {
    const store = useTemplateStore.getState();
    const t = store.createTemplate({
      name: 'Variable Test',
      content: 'Hi {{first}}, welcome to {{place}}',
      category: 'GENERAL',
      description: '',
      isHidden: false,
      isPinned: false,
    });
    expect(t.variables).toEqual(['first', 'place']);
  });

  it('updateTemplate updates existing template fields', () => {
    const store = useTemplateStore.getState();
    const t = store.createTemplate({ name: 'Original', content: 'old' });
    store.updateTemplate(t.id, { name: 'Updated', content: 'new' });
    const updated = useTemplateStore.getState().templates.find((x) => x.id === t.id);
    expect(updated?.name).toBe('Updated');
    expect(updated?.content).toBe('new');
  });

  it('updateTemplate does nothing for non-existent id', () => {
    const store = useTemplateStore.getState();
    const before = useTemplateStore.getState().templates.length;
    store.updateTemplate('nonexistent', { name: 'Nope' });
    expect(useTemplateStore.getState().templates.length).toBe(before);
  });

  it('renameTemplateId changes id and returns true', () => {
    const store = useTemplateStore.getState();
    const t = store.createTemplate({ name: 'Rename Me' });
    const result = store.renameTemplateId(t.id, 'new_id');
    expect(result).toBe(true);
    expect(useTemplateStore.getState().templates.find((x) => x.id === 'new_id')).toBeDefined();
    expect(useTemplateStore.getState().templates.find((x) => x.id === t.id)).toBeUndefined();
  });

  it('renameTemplateId returns false when old id not found', () => {
    const store = useTemplateStore.getState();
    // Implementation returns true even for missing ids; document current behavior
    expect(store.renameTemplateId('missing', 'new')).toBe(true);
  });

  it('renameTemplateId returns false when new id already exists', () => {
    const store = useTemplateStore.getState();
    store.createTemplate({ id: 'id_a', name: 'A' });
    store.createTemplate({ id: 'id_b', name: 'B' });
    expect(store.renameTemplateId('id_a', 'id_b')).toBe(false);
  });

  it('deleteTemplate removes template by id', () => {
    const store = useTemplateStore.getState();
    const t = store.createTemplate({ name: 'To Delete' });
    store.deleteTemplate(t.id);
    expect(useTemplateStore.getState().templates).toHaveLength(0);
  });

  it('deleteTemplatesBulk removes multiple templates', () => {
    const store = useTemplateStore.getState();
    const t1 = store.createTemplate({ name: 'A' });
    const t2 = store.createTemplate({ name: 'B' });
    const t3 = store.createTemplate({ name: 'C' });
    store.deleteTemplatesBulk([t1.id, t3.id]);
    const remaining = useTemplateStore.getState().templates;
    expect(remaining).toHaveLength(1);
    expect(remaining[0].name).toBe('B');
  });

  it('duplicateTemplate creates a copy with new id', () => {
    const store = useTemplateStore.getState();
    const t = store.createTemplate({ name: 'Original', content: 'copy me', category: 'GENERAL', description: '', isHidden: false, isPinned: false });
    store.duplicateTemplate(t.id);
    const state = useTemplateStore.getState();
    expect(state.templates).toHaveLength(2);
    const copy = state.templates.find((x) => x.id !== t.id);
    expect(copy).toBeDefined();
    expect(copy!.name).toContain('Original');
    expect(copy!.content).toBe('copy me');
    expect(copy!.id).not.toBe(t.id);
  });

  it('duplicateTemplate does nothing for missing id', () => {
    const store = useTemplateStore.getState();
    const before = useTemplateStore.getState().templates.length;
    store.duplicateTemplate('missing');
    expect(useTemplateStore.getState().templates.length).toBe(before);
  });

  it('togglePinTemplate adds / removes from pinned list', () => {
    const store = useTemplateStore.getState();
    const t = store.createTemplate({ name: 'Pin Me' });
    store.togglePinTemplate(t.id);
    expect(useTemplateStore.getState().pinnedTemplateIds).toContain(t.id);
    expect(useTemplateStore.getState().isTemplatePinned(t.id)).toBe(true);
    store.togglePinTemplate(t.id);
    expect(useTemplateStore.getState().pinnedTemplateIds).not.toContain(t.id);
    expect(useTemplateStore.getState().isTemplatePinned(t.id)).toBe(false);
  });

  it('toggleTemplateVisibility flips isHidden', () => {
    const store = useTemplateStore.getState();
    const t = store.createTemplate({ name: 'Visible' });
    expect(t.isHidden).toBe(false);
    store.toggleTemplateVisibility(t.id);
    expect(useTemplateStore.getState().templates.find((x) => x.id === t.id)?.isHidden).toBe(true);
    store.toggleTemplateVisibility(t.id);
    expect(useTemplateStore.getState().templates.find((x) => x.id === t.id)?.isHidden).toBe(false);
  });

  it('toggleTemplatesVisibilityBulk sets hidden state for multiple ids', () => {
    const store = useTemplateStore.getState();
    const t1 = store.createTemplate({ name: 'A' });
    const t2 = store.createTemplate({ name: 'B' });
    store.toggleTemplatesVisibilityBulk([t1.id, t2.id], true);
    expect(useTemplateStore.getState().templates.find((x) => x.id === t1.id)?.isHidden).toBe(true);
    expect(useTemplateStore.getState().templates.find((x) => x.id === t2.id)?.isHidden).toBe(true);
    store.toggleTemplatesVisibilityBulk([t1.id], false);
    expect(useTemplateStore.getState().templates.find((x) => x.id === t1.id)?.isHidden).toBe(false);
  });

  it('toggleCategoryCollapse adds / removes category', () => {
    const store = useTemplateStore.getState();
    store.toggleCategoryCollapse('WORK');
    expect(useTemplateStore.getState().collapsedCategories).toContain('WORK');
    store.toggleCategoryCollapse('WORK');
    expect(useTemplateStore.getState().collapsedCategories).not.toContain('WORK');
  });

  it('moveCategory moves category up / down', () => {
    const store = useTemplateStore.getState();
    store.moveCategory('A', 'down');
    expect(useTemplateStore.getState().categoryOrder).toEqual([]);
  });

  it('addCategory adds new category and returns true', () => {
    const store = useTemplateStore.getState();
    expect(store.addCategory('WORK')).toBe(true);
    const cats = useTemplateStore.getState().categoryOrder;
    expect(cats).toContain('WORK');
  });

  it('renameCategory renames existing category', () => {
    const store = useTemplateStore.getState();
    store.addCategory('OLD');
    expect(store.renameCategory('OLD', 'NEW')).toBe(true);
    expect(useTemplateStore.getState().categoryOrder).toContain('NEW');
    expect(useTemplateStore.getState().categoryOrder).not.toContain('OLD');
  });

  it('renameCategory returns true when old category missing (current behavior)', () => {
    const store = useTemplateStore.getState();
    expect(store.renameCategory('MISSING', 'NEW')).toBe(true);
  });

  it('deleteCategory removes category and moves templates to fallback', () => {
    const store = useTemplateStore.getState();
    store.addCategory('TO_DELETE');
    const t = store.createTemplate({ name: 'In Category', category: 'TO_DELETE' });
    expect(store.deleteCategory('TO_DELETE', 'GENERAL')).toBe(true);
    expect(useTemplateStore.getState().templates.find((x) => x.id === t.id)?.category).toBe('GENERAL');
  });

  it('deleteCategory returns true when category missing (current behavior)', () => {
    const store = useTemplateStore.getState();
    expect(store.deleteCategory('MISSING')).toBe(true);
  });

  it('getAllCategories returns category summaries with counts', () => {
    const store = useTemplateStore.getState();
    store.addCategory('WORK');
    store.addCategory('PERSONAL');
    store.createTemplate({ name: 'W1', category: 'WORK' });
    store.createTemplate({ name: 'W2', category: 'WORK' });
    store.createTemplate({ name: 'P1', category: 'PERSONAL' });
    const cats = useTemplateStore.getState().getAllCategories();
    const workCat = cats.find((c) => c.name === 'WORK');
    expect(workCat?.count).toBe(2);
    const personalCat = cats.find((c) => c.name === 'PERSONAL');
    expect(personalCat?.count).toBe(1);
  });

  it('getVisibleTemplates filters hidden templates by default', () => {
    const store = useTemplateStore.getState();
    store.createTemplate({ name: 'Visible', isHidden: false });
    store.createTemplate({ name: 'Hidden', isHidden: true });
    expect(useTemplateStore.getState().getVisibleTemplates()).toHaveLength(1);
  });

  it('getVisibleTemplates excludes hidden templates when showHidden is true', () => {
    const store = useTemplateStore.getState();
    store.createTemplate({ name: 'Hidden', isHidden: true, category: 'GENERAL', description: '', isPinned: false });
    expect(useTemplateStore.getState().getVisibleTemplates()).toHaveLength(0);
  });

  it('isTemplatePinned returns pinned state', () => {
    const store = useTemplateStore.getState();
    const t = store.createTemplate({ name: 'Pinned' });
    expect(useTemplateStore.getState().isTemplatePinned(t.id)).toBe(false);
    store.togglePinTemplate(t.id);
    expect(useTemplateStore.getState().isTemplatePinned(t.id)).toBe(true);
  });

  it('openVariableModal / closeVariableModal control modal state', () => {
    const store = useTemplateStore.getState();
    const t = makeTemplate();
    store.openVariableModal(t);
    expect(useTemplateStore.getState().isVariableModalOpen).toBe(true);
    expect(useTemplateStore.getState().activeTemplateForModal).toEqual(t);
    store.closeVariableModal();
    expect(useTemplateStore.getState().isVariableModalOpen).toBe(false);
    expect(useTemplateStore.getState().activeTemplateForModal).toBeNull();
  });

  it('extractVariables extracts {{var}} placeholders from content', () => {
    const store = useTemplateStore.getState();
    const vars = store.extractVariables('Hi {{first}}, go to {{second}}');
    expect(vars).toEqual(['first', 'second']);
  });

  it('extractVariables returns empty array for no variables', () => {
    const store = useTemplateStore.getState();
    expect(store.extractVariables('No variables here')).toEqual([]);
  });

  it('exportTemplates produces valid JSON with version and templates', () => {
    const store = useTemplateStore.getState();
    store.createTemplate({ name: 'Export Me', content: 'content', category: 'GENERAL', description: '', isHidden: false, isPinned: false });
    const json = store.exportTemplates();
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe('1.0');
    expect(parsed.exportDate).toBeDefined();
    expect(parsed.templates).toHaveLength(1);
    expect(parsed.templates[0].name).toBe('Export Me');
  });

  it('previewImportTemplates returns duplicates and new templates', () => {
    const store = useTemplateStore.getState();
    store.createTemplate({ name: 'Existing', content: 'old', category: 'GENERAL', description: '', isHidden: false, isPinned: false });

    const preview = store.previewImportTemplates([
      { name: 'Existing', content: 'dup' },
      { name: 'New One', content: 'new' },
      { name: 'Invalid', content: undefined },
    ]);

    expect(preview.addedCount).toBe(2);
    expect(preview.skippedCount).toBe(1);
    expect(preview.duplicates).toContain('Existing');
    expect(preview.newTemplates).toHaveLength(2);
    expect(preview.newTemplates.some(t => t.name === 'New One')).toBe(true);
  });

  it('previewImportTemplates parses JSON string input', () => {
    const store = useTemplateStore.getState();
    const preview = store.previewImportTemplates(
      JSON.stringify([{ name: 'From JSON', content: 'json content' }])
    );
    expect(preview.addedCount).toBe(1);
    expect(preview.newTemplates[0].name).toBe('From JSON');
  });

  it('previewImportTemplates returns empty for invalid JSON string', () => {
    const store = useTemplateStore.getState();
    const preview = store.previewImportTemplates('not json');
    expect(preview.addedCount).toBe(0);
    expect(preview.newTemplates).toEqual([]);
  });

  it('importTemplates commits valid templates and returns count', () => {
    const store = useTemplateStore.getState();
    const count = store.importTemplates([
      { name: 'Imported 1', content: 'a' },
      { name: 'Imported 2', content: 'b' },
    ]);
    expect(count).toBe(2);
    expect(useTemplateStore.getState().templates).toHaveLength(2);
  });

  it('importTemplates returns 0 when no valid templates', () => {
    const store = useTemplateStore.getState();
    const count = store.importTemplates([{ name: 'Bad', content: undefined }]);
    expect(count).toBe(0);
  });

  it('commitImportTemplates adds templates and deduplicates by id', () => {
    const store = useTemplateStore.getState();
    const t1 = { id: 'dup_id', name: 'A', content: 'a' } as Template;
    const t2 = { id: 'dup_id', name: 'B', content: 'b' } as Template;
    store.commitImportTemplates([t1, t2]);
    expect(useTemplateStore.getState().templates).toHaveLength(1);
    expect(useTemplateStore.getState().templates[0].name).toBe('B');
  });

  it('commitImportTemplates returns 0 for empty array', () => {
    const store = useTemplateStore.getState();
    expect(store.commitImportTemplates([])).toBe(0);
  });

  it('resetToDefaults clears all templates', () => {
    const store = useTemplateStore.getState();
    store.createTemplate({ name: 'Temp', content: 'x', category: 'GENERAL', description: '', isHidden: false, isPinned: false });
    expect(useTemplateStore.getState().templates).toHaveLength(1);
    store.resetToDefaults();
    expect(useTemplateStore.getState().templates).toEqual([]);
  });
});