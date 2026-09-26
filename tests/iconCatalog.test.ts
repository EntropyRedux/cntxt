import { describe, it, expect } from 'vitest';
import { 
  ALL_APP_ICONS, 
  APP_ICON_MAP, 
  DEFAULT_APP_ICON, 
  DEFAULT_WORKFLOW_ICON, 
  DEFAULT_BOOKMARK_ICON 
} from '../src/constants/iconCatalog';
import { AVAILABLE_ICONS, ICON_MAP } from '../src/components/Ribbon/RibbonIcon';

describe('Unified Icon Catalog & Provider', () => {
  it('contains expanded icon catalog with more than 100 icons', () => {
    expect(ALL_APP_ICONS.length).toBeGreaterThanOrEqual(100);
  });

  it('contains strictly unique icon keys with zero duplicates', () => {
    const uniqueKeys = new Set(ALL_APP_ICONS);
    expect(uniqueKeys.size).toBe(ALL_APP_ICONS.length);
  });

  it('provides a valid Lucide component for every registered icon', () => {
    for (const iconName of ALL_APP_ICONS) {
      const comp = APP_ICON_MAP[iconName];
      expect(comp).toBeDefined();
      expect(typeof comp).toBe('object'); // forwardRef component in React
    }
  });

  it('contains valid default icons in the catalog', () => {
    expect(APP_ICON_MAP[DEFAULT_APP_ICON]).toBeDefined();
    expect(APP_ICON_MAP[DEFAULT_WORKFLOW_ICON]).toBeDefined();
    expect(APP_ICON_MAP[DEFAULT_BOOKMARK_ICON]).toBeDefined();
  });

  it('guarantees 100% backward compatibility with ribbon icons', () => {
    expect(AVAILABLE_ICONS.length).toBe(ALL_APP_ICONS.length);
    expect(ICON_MAP).toBe(APP_ICON_MAP);
  });
});
