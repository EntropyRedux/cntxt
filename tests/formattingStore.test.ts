import { describe, it, expect, beforeEach } from 'vitest';
import { useFormattingStore, PRESET_FORMATTING_BUTTONS } from '../src/store/formattingStore';

describe('FormattingStore', () => {
  beforeEach(() => {
    // Create fresh copy of preset buttons for each test
    const freshButtons = PRESET_FORMATTING_BUTTONS.map(btn => ({
      ...btn,
      enabled: btn.id === 'fmt_h1' || btn.id === 'fmt_h2' || btn.id === 'fmt_bold' || btn.id === 'fmt_italic' || btn.id === 'fmt_code'
    }));
    
    useFormattingStore.setState({
      buttons: freshButtons,
      buttonSize: 'default' as const,
      multiRow: false
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

  it('disables built-in button instead of removing', () => {
    const store = useFormattingStore.getState();
    expect(store.buttons.find(b => b.id === 'fmt_h1')?.enabled).toBe(true);
    
    store.removeButton('fmt_h1');
    const h1 = useFormattingStore.getState().buttons.find(b => b.id === 'fmt_h1');
    expect(h1).toBeDefined();
    expect(h1?.enabled).toBe(false);
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
});
