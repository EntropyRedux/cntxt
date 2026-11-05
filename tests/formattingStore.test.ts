import { describe, it, expect, beforeEach } from 'vitest';
import { useFormattingStore, PRESET_FORMATTING_BUTTONS, DEFAULT_FORMATTING_CATEGORIES } from '../src/store/formattingStore';

describe('FormattingStore', () => {
  beforeEach(() => {
    // Create fresh copy of preset buttons for each test
    const freshButtons = PRESET_FORMATTING_BUTTONS.map(btn => ({
      ...btn,
      enabled: btn.id === 'fmt_h1' || btn.id === 'fmt_h2' || btn.id === 'fmt_bold' || btn.id === 'fmt_italic' || btn.id === 'fmt_code'
    }));
    
    useFormattingStore.setState({
      buttons: freshButtons,
      buttonSize: 'medium',
      isMultiRowExpanded: false,
      categoryOrder: [...DEFAULT_FORMATTING_CATEGORIES]
    });
  });

  it('has preset formatting buttons', () => {
    const buttons = useFormattingStore.getState().buttons;
    expect(buttons.length).toBeGreaterThan(5);
    expect(buttons.some(b => b.id === 'fmt_h1')).toBe(true);
    expect(buttons.some(b => b.id === 'fmt_bold')).toBe(true);
    expect(buttons.some(b => b.id === 'fmt_italic')).toBe(true);
  });

  it('has heading category buttons', () => {
    const headings = useFormattingStore.getState().buttons.filter(b => b.category === 'heading');
    expect(headings.length).toBeGreaterThan(0);
    expect(headings.some(b => b.id === 'fmt_h1')).toBe(true);
  });

  it('has format category buttons', () => {
    const formats = useFormattingStore.getState().buttons.filter(b => b.category === 'format');
    expect(formats.length).toBeGreaterThan(0);
    expect(formats.some(b => b.id === 'fmt_bold')).toBe(true);
  });

  it('toggles button enabled state', () => {
    const store = useFormattingStore.getState();
    const boldBtn = store.buttons.find(b => b.id === 'fmt_bold');
    expect(boldBtn?.enabled).toBe(true);
    
    const newState = useFormattingStore.getState();
    newState.toggleButton('fmt_bold');
    
    const updatedBold = useFormattingStore.getState().buttons.find(b => b.id === 'fmt_bold');
    expect(updatedBold?.enabled).toBe(false);
  });

  it('adds custom button', () => {
    const store = useFormattingStore.getState();
    const initialCount = store.buttons.length;
    
    const newBtn = store.addButton({
      label: 'My Custom',
      icon: 'Star',
      type: 'wrap',
      prefix: '[[',
      suffix: ']]'
    });
    
    const buttons = useFormattingStore.getState().buttons;
    expect(buttons.length).toBe(initialCount + 1);
    const added = buttons.find(b => b.id === newBtn.id);
    expect(added).toBeDefined();
    expect(added?.label).toBe('My Custom');
    expect(added?.isBuiltIn).toBe(false);
  });

  it('removes custom button', () => {
    const store = useFormattingStore.getState();
    const newBtn = store.addButton({
      label: 'Temp',
      icon: 'X',
      type: 'wrap',
      prefix: '[',
      suffix: ']'
    });
    
    store.removeButton(newBtn.id);
    const buttons = useFormattingStore.getState().buttons;
    expect(buttons.find(b => b.id === newBtn.id)).toBeUndefined();
  });

  it('removes built-in button from active buttons and allows re-adding from preset library', () => {
    const store = useFormattingStore.getState();
    expect(store.buttons.find(b => b.id === 'fmt_h1')?.enabled).toBe(true);
    
    store.removeButton('fmt_h1');
    const h1 = useFormattingStore.getState().buttons.find(b => b.id === 'fmt_h1');
    expect(h1).toBeUndefined();

    store.addPresetButton('fmt_h1');
    const readded = useFormattingStore.getState().buttons.find(b => b.id === 'fmt_h1');
    expect(readded).toBeDefined();
    expect(readded?.enabled).toBe(true);
  });

  it('resets to defaults', () => {
    const store = useFormattingStore.getState();
    store.removeButton('fmt_h1');
    store.addButton({ label: 'Custom', icon: 'X', type: 'wrap', prefix: '[', suffix: ']' });
    
    store.resetToDefaults();
    const buttons = useFormattingStore.getState().buttons;
    expect(buttons.length).toBe(PRESET_FORMATTING_BUTTONS.length);
    expect(buttons.find(b => b.id === 'fmt_h1')?.enabled).toBe(true);
  });

  it('has buttons with correct structure', () => {
    const buttons = useFormattingStore.getState().buttons;
    const h1 = buttons.find(b => b.id === 'fmt_h1');
    expect(h1?.type).toBe('line-prefix');
    expect(h1?.prefix).toBe('# ');
    
    const bold = buttons.find(b => b.id === 'fmt_bold');
    expect(bold?.type).toBe('wrap');
    expect(bold?.prefix).toBe('**');
    expect(bold?.suffix).toBe('**');
  });

  it('manages formatting categories properly (add, rename, delete, move)', () => {
    // Add category
    const added = useFormattingStore.getState().addCategory('Science');
    expect(added).toBe(true);
    expect(useFormattingStore.getState().categoryOrder.includes('SCIENCE')).toBe(true);

    // Custom button with new category
    const btn = useFormattingStore.getState().addButton({
      label: 'Formula',
      icon: 'Atom',
      type: 'wrap',
      prefix: '$',
      suffix: '$',
      category: 'SCIENCE'
    });
    expect(btn.category).toBe('SCIENCE');

    const categoriesWithScience = useFormattingStore.getState().getAllCategories();
    const scienceCat = categoriesWithScience.find(c => c.name === 'SCIENCE');
    expect(scienceCat).toBeDefined();
    expect(scienceCat?.count).toBe(1);

    // Rename category
    const renamed = useFormattingStore.getState().renameCategory('SCIENCE', 'STEM');
    expect(renamed).toBe(true);
    expect(useFormattingStore.getState().categoryOrder.includes('STEM')).toBe(true);
    expect(useFormattingStore.getState().categoryOrder.includes('SCIENCE')).toBe(false);

    const updatedBtn = useFormattingStore.getState().buttons.find(b => b.id === btn.id);
    expect(updatedBtn?.category).toBe('STEM');

    // Move category
    useFormattingStore.getState().moveCategory('STEM', 'up');
    const stemIndex = useFormattingStore.getState().categoryOrder.indexOf('STEM');
    expect(stemIndex).toBeLessThan(useFormattingStore.getState().categoryOrder.length - 1);

    // Delete category
    const deleted = useFormattingStore.getState().deleteCategory('STEM', 'CUSTOM');
    expect(deleted).toBe(true);
    expect(useFormattingStore.getState().categoryOrder.includes('STEM')).toBe(false);
    const reallocatedBtn = useFormattingStore.getState().buttons.find(b => b.id === btn.id);
    expect(reallocatedBtn?.category).toBe('CUSTOM');
  });
  it('updates toolbarHeight for size-adjustable formatting toolbar', () => {
    const store = useFormattingStore.getState();
    expect(store.toolbarHeight).toBeDefined();

    store.setToolbarHeight(120);
    expect(useFormattingStore.getState().toolbarHeight).toBe(120);

    store.setToolbarHeight(44);
    expect(useFormattingStore.getState().toolbarHeight).toBe(44);
  });
});
