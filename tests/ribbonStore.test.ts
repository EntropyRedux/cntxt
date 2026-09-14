import { describe, it, expect, beforeEach } from 'vitest';
import { useRibbonStore, DEFAULT_RIBBON_ITEMS } from '../src/store/ribbonStore';
import { useSettingsStore } from '../src/store/settingsStore';

describe('RibbonStore Operations', () => {
  beforeEach(() => {
    useRibbonStore.setState({
      items: DEFAULT_RIBBON_ITEMS,
      isCustomizerOpen: false
    });
  });

  it('initializes with default ribbon items including separators', () => {
    const items = useRibbonStore.getState().items;
    expect(items.length).toBeGreaterThan(5);

    // Verify presence of tools, actions, and separators
    expect(items.some(i => i.type === 'tool')).toBe(true);
    expect(items.some(i => i.type === 'action')).toBe(true);
    expect(items.some(i => i.type === 'separator')).toBe(true);
  });

  it('adds a visual separator', () => {
    const store = useRibbonStore.getState();
    const initialCount = store.items.length;
    const sep = store.addSeparator();

    expect(sep.id).toBeDefined();
    expect(sep.type).toBe('separator');
    expect(sep.icon).toBe('Minus');
    expect(sep.enabled).toBe(true);

    const items = useRibbonStore.getState().items;
    expect(items.length).toBe(initialCount + 1);
    expect(items[items.length - 1].id).toBe(sep.id);
  });

  it('toggles item label visibility', () => {
    const store = useRibbonStore.getState();
    const item = store.items[0];
    const initialShowLabel = !!item.showLabel;

    store.toggleItemLabel(item.id);
    let updated = useRibbonStore.getState().items.find(i => i.id === item.id);
    expect(updated?.showLabel).toBe(!initialShowLabel);

    store.toggleItemLabel(item.id);
    updated = useRibbonStore.getState().items.find(i => i.id === item.id);
    expect(updated?.showLabel).toBe(initialShowLabel);
  });

  it('toggles item enabled state', () => {
    const store = useRibbonStore.getState();
    const item = store.items[0];
    const initialEnabled = item.enabled;

    store.toggleItem(item.id);
    let updated = useRibbonStore.getState().items.find(i => i.id === item.id);
    expect(updated?.enabled).toBe(!initialEnabled);

    store.toggleItem(item.id);
    updated = useRibbonStore.getState().items.find(i => i.id === item.id);
    expect(updated?.enabled).toBe(initialEnabled);
  });

  it('reorders items and preserves sequential order property', () => {
    const store = useRibbonStore.getState();
    const firstId = store.items[0].id;
    const secondId = store.items[1].id;

    // Move second item up to first position
    store.moveItemUp(secondId);
    let items = useRibbonStore.getState().items;
    expect(items[0].id).toBe(secondId);
    expect(items[1].id).toBe(firstId);

    // Verify order numbers are 0, 1, 2...
    items.forEach((item, idx) => {
      expect(item.order).toBe(idx);
    });

    // Move first item down
    store.moveItemDown(secondId);
    items = useRibbonStore.getState().items;
    expect(items[0].id).toBe(firstId);
    expect(items[1].id).toBe(secondId);
  });

  it('removes item and recalculates sequential order indexes', () => {
    const store = useRibbonStore.getState();
    const targetItem = store.items[2];
    const countBefore = store.items.length;

    store.removeItem(targetItem.id);
    const items = useRibbonStore.getState().items;
    expect(items.length).toBe(countBefore - 1);
    expect(items.some(i => i.id === targetItem.id)).toBe(false);

    // Verify strictly sequential order
    items.forEach((item, idx) => {
      expect(item.order).toBe(idx);
    });
  });

  it('removes items by targetId and type', () => {
    const store = useRibbonStore.getState();
    const customItem = store.addItem({
      label: 'Temporary Tool',
      icon: 'Zap',
      type: 'tool',
      targetId: 'custom_temp_tool',
      enabled: true
    });

    expect(useRibbonStore.getState().items.some(i => i.id === customItem.id)).toBe(true);

    store.removeItemByTarget('custom_temp_tool', 'tool');
    expect(useRibbonStore.getState().items.some(i => i.id === customItem.id)).toBe(false);
  });

  it('opens and closes customizer modal state', () => {
    const store = useRibbonStore.getState();
    expect(store.isCustomizerOpen).toBe(false);

    store.openCustomizer();
    expect(useRibbonStore.getState().isCustomizerOpen).toBe(true);

    store.closeCustomizer();
    expect(useRibbonStore.getState().isCustomizerOpen).toBe(false);
  });

  it('supports toggling modular ribbon visibility via settingsStore', () => {
    const settings = useSettingsStore.getState();
    const initialVisibility = settings.settings.showRibbon;

    settings.toggleRibbon();
    expect(useSettingsStore.getState().settings.showRibbon).toBe(!initialVisibility);

    settings.toggleRibbon();
    expect(useSettingsStore.getState().settings.showRibbon).toBe(initialVisibility);

    settings.setRibbonVisible(false);
    expect(useSettingsStore.getState().settings.showRibbon).toBe(false);

    settings.setRibbonVisible(true);
    expect(useSettingsStore.getState().settings.showRibbon).toBe(true);
  });
});
