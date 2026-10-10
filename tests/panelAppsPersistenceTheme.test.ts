import { describe, it, expect } from 'vitest';
import {
  buildCntxtApp,
  parseCntxtApp,
  updateCntxtAppState,
  STATE_MAX_BYTES,
} from '../src/features/panelApps/format/cntxtApp';
import {
  getActiveThemeTokens,
  buildThemeInjection,
  isDarkTheme,
} from '../src/features/panelApps/theme/themeSync';
import { CNTXT_THEME_TOKENS } from '../src/features/panelApps/blueprint/promptBuilder';
import { PanelAppManifest } from '../contracts/data_shapes';

describe('Panel Apps State Persistence & Reload-Loop Prevention', () => {
  const sampleManifest: PanelAppManifest = {
    schemaVersion: 1,
    id: 'b123456789012',
    name: 'Stateful App',
    icon: 'Sparkles',
    description: 'App with persistent state',
    runtime: 'html',
    network: 'offline',
    panelWidth: 380,
    createdFrom: 'prompt',
  };

  const initialHtml = `<!doctype html>
<html>
<head><title>App</title></head>
<body><textarea id="note"></textarea></body>
</html>`;

  it('serializes and parses state block in .cntxt documents', () => {
    const initialState = { text: 'Hello persistent world', count: 42 };
    const doc = buildCntxtApp(sampleManifest, initialHtml, initialState);

    expect(doc).toContain('```state');
    expect(doc).toContain('"Hello persistent world"');

    const parsed = parseCntxtApp(doc);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.manifest.id).toBe('b123456789012');
      expect(parsed.html.trim()).toBe(initialHtml.trim());
      expect(parsed.state).toBeDefined();

      const restoredState = JSON.parse(parsed.state!);
      expect(restoredState.text).toBe('Hello persistent world');
      expect(restoredState.count).toBe(42);
    }
  });

  it('updates state in place without altering the HTML block (breaks reload loop)', () => {
    const originalDoc = buildCntxtApp(sampleManifest, initialHtml, { step: 1 });
    const parsedOriginal = parseCntxtApp(originalDoc);
    expect(parsedOriginal.ok).toBe(true);

    const updatedDoc = updateCntxtAppState(originalDoc, { step: 2, completed: true });
    const parsedUpdated = parseCntxtApp(updatedDoc);
    expect(parsedUpdated.ok).toBe(true);

    if (parsedOriginal.ok && parsedUpdated.ok) {
      // Critical invariant: HTML MUST remain identical so iframe does NOT reload!
      expect(parsedUpdated.html).toBe(parsedOriginal.html);

      // Manifest remains intact
      expect(parsedUpdated.manifest.id).toBe(parsedOriginal.manifest.id);

      // State is updated
      const stateObj = JSON.parse(parsedUpdated.state!);
      expect(stateObj.step).toBe(2);
      expect(stateObj.completed).toBe(true);
    }
  });

  it('appends state block if .cntxt file did not previously contain one', () => {
    const docWithoutState = buildCntxtApp(sampleManifest, initialHtml);
    expect(docWithoutState).not.toContain('```state');

    const docWithAddedState = updateCntxtAppState(docWithoutState, { initialized: true });
    expect(docWithAddedState).toContain('```state');

    const parsed = parseCntxtApp(docWithAddedState);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.html.trim()).toBe(initialHtml.trim());
      const stateObj = JSON.parse(parsed.state!);
      expect(stateObj.initialized).toBe(true);
    }
  });

  it('enforces 512 KB state size limit and throws if exceeded', () => {
    const doc = buildCntxtApp(sampleManifest, initialHtml);
    // Create oversized payload (> 512 KB)
    const giantString = 'x'.repeat(STATE_MAX_BYTES + 1024);
    const oversizedState = { data: giantString };

    expect(() => updateCntxtAppState(doc, oversizedState)).toThrow(
      /State size exceeds 512 KB limit/
    );
  });
});

describe('Panel Apps Theme Engine & CSS Token Injection', () => {
  it('supplies all 14 CNTXT theme tokens with valid CSS values', () => {
    const tokens = getActiveThemeTokens();
    for (const token of CNTXT_THEME_TOKENS) {
      expect(tokens[token]).toBeDefined();
      expect(tokens[token].length).toBeGreaterThan(0);
    }
  });

  it('constructs theme injection style tag with color-scheme and variables', () => {
    const injectionDark = buildThemeInjection(undefined, true);
    expect(injectionDark).toContain('<style id="cntxt-theme-injection">');
    expect(injectionDark).toContain('color-scheme: dark;');
    expect(injectionDark).toContain('--bg-primary:');
    expect(injectionDark).toContain('--accent-primary:');

    const injectionLight = buildThemeInjection(undefined, false);
    expect(injectionLight).toContain('color-scheme: light;');
  });

  it('evaluates isDarkTheme predicate safely in test environment', () => {
    expect(typeof isDarkTheme()).toBe('boolean');
  });
});
