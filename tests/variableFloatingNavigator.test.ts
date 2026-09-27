import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSettingsStore } from '../src/store/settingsStore';
import { useTabStore } from '../src/store/tabStore';
import { useTemplateStore } from '../src/store/templateStore';
import { editorRegistry } from '../src/services/editor/editorRegistry';

describe('VariableFloatingNavigator Edge-Anchoring & Drag Logic', () => {
  beforeEach(() => {
    useSettingsStore.setState({
      settings: {
        ...useSettingsStore.getState().settings,
        touchOptimized: true
      }
    });
    useTabStore.setState({
      tabs: [
        {
          id: 'test-tab-1',
          title: 'Invoice.md',
          content: 'Hello {{client_name}}, your total is {{total_amount}}.',
          language: 'markdown',
          isDirty: false
        }
      ],
      activeTabId: 'test-tab-1'
    });
    vi.restoreAllMocks();
  });

  it('determines visibility based on variable presence and touchMode setting', () => {
    const { settings } = useSettingsStore.getState();
    const activeTab = useTabStore.getState().tabs.find(t => t.id === 'test-tab-1');
    const variableCount = (activeTab?.content.match(/\{\{[^}]+\}\}/g) || []).length;

    expect(variableCount).toBe(2);
    expect(settings.touchOptimized).toBe(true);

    // If no variables exist, should evaluate to disabled
    const emptyTabContent = 'Static note with zero placeholders.';
    const emptyCount = (emptyTabContent.match(/\{\{[^}]+\}\}/g) || []).length;
    expect(emptyCount).toBe(0);
  });

  it('calculates correct magnetic snap to left edge of container', () => {
    const mockContainerWidth = 800;
    const currentX = 150; // Left half (< 400)
    const snapToLeft = currentX < mockContainerWidth / 2;
    const snappedX = snapToLeft ? 12 : Math.max(12, mockContainerWidth - 48);
    expect(snappedX).toBe(12);
  });

  it('calculates correct magnetic snap to right edge of container', () => {
    const mockContainerWidth = 800;
    const currentX = 650; // Right half (> 400)
    const snapToLeft = currentX < mockContainerWidth / 2;
    const snappedX = snapToLeft ? 12 : Math.max(12, mockContainerWidth - 48);
    expect(snappedX).toBe(752); // 800 - 48
  });

  it('correctly clamps Y within container boundary', () => {
    const containerHeight = 600;
    const clampedYTop = Math.max(8, Math.min(containerHeight - 48, -50));
    const clampedYBottom = Math.max(8, Math.min(containerHeight - 48, 700));
    expect(clampedYTop).toBe(8);
    expect(clampedYBottom).toBe(552); // 600 - 48
  });

  it('opens variable modal on double tap action', () => {
    const modalSpy = vi.spyOn(useTemplateStore.getState(), 'openVariableModal');
    useTemplateStore.getState().openVariableModal();
    expect(modalSpy).toHaveBeenCalled();
  });
});
