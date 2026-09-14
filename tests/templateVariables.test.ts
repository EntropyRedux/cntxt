import { describe, it, expect, beforeEach } from 'vitest';
import { 
  extractTemplateVariables, 
  processTemplateVariables, 
  isSystemVariable 
} from '../src/services/editor/templateVariableService';
import { useTemplateStore } from '../src/store/templateStore';

describe('templateVariableService', () => {
  describe('extractTemplateVariables', () => {
    it('extracts variables enclosed in double curly braces', () => {
      const template = 'Hello {{SELECTION}}, today is {{DATE}} and time is {{TIME}}';
      const vars = extractTemplateVariables(template);
      expect(vars).toEqual(['SELECTION', 'DATE', 'TIME']);
    });

    it('deduplicates identical variables', () => {
      const template = '{{SELECTION}} and {{SELECTION}} for {{TOPIC}}';
      const vars = extractTemplateVariables(template);
      expect(vars).toEqual(['SELECTION', 'TOPIC']);
    });

    it('returns empty array when content has no placeholders', () => {
      expect(extractTemplateVariables('Just plain markdown')).toEqual([]);
      expect(extractTemplateVariables('')).toEqual([]);
    });

    it('trims whitespace inside placeholder braces', () => {
      const template = '{{  PROJECT_NAME  }} with {{   SELECTION }}';
      const vars = extractTemplateVariables(template);
      expect(vars).toEqual(['PROJECT_NAME', 'SELECTION']);
    });
  });

  describe('isSystemVariable', () => {
    it('identifies standard system macro names', () => {
      expect(isSystemVariable('SELECTION')).toBe(true);
      expect(isSystemVariable('DATE')).toBe(true);
      expect(isSystemVariable('TIME')).toBe(true);
      expect(isSystemVariable('DATETIME')).toBe(true);
      expect(isSystemVariable('CURSOR')).toBe(true);
      expect(isSystemVariable('date')).toBe(true);
      expect(isSystemVariable('selection')).toBe(true);
    });

    it('returns false for custom user parameters', () => {
      expect(isSystemVariable('USER_NAME')).toBe(false);
      expect(isSystemVariable('ROLE')).toBe(false);
      expect(isSystemVariable('TOPIC')).toBe(false);
    });
  });

  describe('processTemplateVariables', () => {
    it('replaces {{SELECTION}} with provided selected text', () => {
      const template = '```json\n{{SELECTION}}\n```';
      const result = processTemplateVariables(template, '{"status": "ok"}');
      expect(result.content).toBe('```json\n{"status": "ok"}\n```');
      expect(result.cursorOffset).toBeNull();
    });

    it('replaces {{DATE}} with current date in YYYY-MM-DD format', () => {
      const template = 'Date: {{DATE}}';
      const result = processTemplateVariables(template);
      const now = new Date();
      const expectedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      expect(result.content).toBe(`Date: ${expectedDate}`);
    });

    it('replaces {{TIME}} with current time in HH:MM:SS format', () => {
      const template = 'Time: {{TIME}}';
      const result = processTemplateVariables(template);
      expect(result.content).toMatch(/Time: \d{2}:\d{2}:\d{2}/);
    });

    it('replaces {{DATETIME}} with full timestamp', () => {
      const template = 'Generated: {{DATETIME}}';
      const result = processTemplateVariables(template);
      expect(result.content).toMatch(/Generated: \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);
    });

    it('calculates cursorOffset from {{CURSOR}} and strips placeholder', () => {
      const template = 'Start: {{CURSOR}} End';
      const result = processTemplateVariables(template);
      expect(result.content).toBe('Start:  End');
      expect(result.cursorOffset).toBe('Start: '.length);
    });

    it('handles combined system macros correctly', () => {
      const template = '# Draft - {{DATE}}\nAuthor: {{SELECTION}}\nBody:\n{{CURSOR}}';
      const result = processTemplateVariables(template, 'Architect');
      expect(result.content).toContain('Author: Architect');
      expect(result.content).not.toContain('{{CURSOR}}');
      expect(result.cursorOffset).toBeGreaterThan(0);
    });
  });
});

describe('templateStore integration', () => {
  beforeEach(() => {
    useTemplateStore.setState({
      templates: [],
      collapsedCategories: [],
      categoryOrder: [],
      pinnedTemplateIds: [],
      selectedTemplateIds: [],
      bulkMode: false,
      showHidden: true
    });
  });

  it('creates and normalizes category name', () => {
    const tmpl = useTemplateStore.getState().createTemplate({
      name: 'Test Template',
      description: 'Test Description',
      category: 'prompts',
      content: 'Hello {{SELECTION}}'
    });

    expect(tmpl.category).toBe('PROMPTS');
    expect(tmpl.variables).toEqual(['SELECTION']);
    expect(useTemplateStore.getState().templates.length).toBe(1);
  });

  it('toggles pin status and syncs pinnedTemplateIds', () => {
    const tmpl = useTemplateStore.getState().createTemplate({
      name: 'Pinned Test',
      description: 'Pin Description',
      category: 'GENERAL',
      content: 'Content'
    });

    useTemplateStore.getState().togglePinTemplate(tmpl.id);
    const updated = useTemplateStore.getState().templates.find(t => t.id === tmpl.id);
    expect(updated?.isPinned).toBe(true);
    expect(useTemplateStore.getState().isTemplatePinned(tmpl.id)).toBe(true);
  });

  it('toggles category collapse and moves category ordering', () => {
    useTemplateStore.getState().createTemplate({ name: 'A', description: '', category: 'ALPHA', content: '1' });
    useTemplateStore.getState().createTemplate({ name: 'B', description: '', category: 'BETA', content: '2' });

    useTemplateStore.getState().toggleCategoryCollapse('ALPHA');
    expect(useTemplateStore.getState().collapsedCategories).toContain('ALPHA');

    useTemplateStore.getState().moveCategory('BETA', 'up');
    expect(useTemplateStore.getState().categoryOrder[0]).toBe('BETA');
  });

  it('detects duplicate names during template import preview', () => {
    useTemplateStore.getState().createTemplate({
      name: 'Existing Template',
      description: '',
      category: 'GENERAL',
      content: 'Original'
    });

    const preview = useTemplateStore.getState().previewImportTemplates([
      { name: 'Existing Template', content: 'Duplicate content', category: 'GENERAL' },
      { name: 'Brand New Template', content: 'New content', category: 'GENERAL' }
    ]);

    expect(preview.duplicates).toEqual(['Existing Template']);
    expect(preview.addedCount).toBe(2);
  });
});
