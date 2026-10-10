/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { pickFence } from '../src/features/panelApps/format/fence';
import { buildCntxtApp, parseCntxtApp } from '../src/features/panelApps/format/cntxtApp';
import { scanHtml } from '../src/features/panelApps/preflight/scan';
import { resolveHtml } from '../src/features/panelApps/source/resolveHtml';
import { usePanelAppsStore } from '../src/features/panelApps/state/panelAppsStore';
import { AppFrameHost } from '../src/components/panelApps/AppFrameHost';
import { PanelAppManifest } from '../contracts/data_shapes';

describe('Panel Apps: Dynamic Code Fence Selection', () => {
  it('defaults to 3 backticks when html contains no backticks', () => {
    expect(pickFence('<div>Hello World</div>')).toBe('```');
  });

  it('selects 4 backticks when html contains triple backtick strings', () => {
    const html = '<script>const code = "```";</script>';
    expect(pickFence(html)).toBe('````');
  });

  it('selects 5 backticks when html contains a run of 4 backticks', () => {
    const html = '<script>const code = "````";</script>';
    expect(pickFence(html)).toBe('`````');
  });
});

describe('Panel Apps: .cntxt Format Serialization & Parsing', () => {
  const sampleManifest: PanelAppManifest = {
    schemaVersion: 1,
    id: 'a123456789012',
    name: 'Unit Converter',
    icon: 'Layers',
    description: 'Converts metric to imperial',
    runtime: 'html',
    network: 'offline',
    panelWidth: 480,
    createdFrom: 'tab',
  };

  it('serializes and parses cleanly in a perfect round trip', () => {
    const html = '<!doctype html><html><body><h1>Hello</h1></body></html>';
    const cntxt = buildCntxtApp(sampleManifest, html);
    const parsed = parseCntxtApp(cntxt);

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.manifest.name).toBe('Unit Converter');
      expect(parsed.manifest.id).toBe('a123456789012');
      expect(parsed.manifest.network).toBe('offline');
      expect(parsed.html.trim()).toBe(html.trim());
    }
  });

  it('round-trips HTML containing inline backtick runs without collision', () => {
    const html = '<script>const template = "```markdown\\n# Title\\n```";</script>';
    const cntxt = buildCntxtApp(sampleManifest, html);
    const parsed = parseCntxtApp(cntxt);

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.html.trim()).toBe(html.trim());
    }
  });

  it('rejects document with missing frontmatter', () => {
    const parsed = parseCntxtApp('# Just a document\n```html\n<div>Test</div>\n```');
    expect(parsed.ok).toBe(false);
  });

  it('rejects document with invalid manifest schema', () => {
    const raw = `---
schemaVersion: 1
id: "invalid-ID-UPPERCASE"
name: "Test"
icon: "Layers"
runtime: "html"
network: "offline"
panelWidth: 480
createdFrom: "tab"
---

\`\`\`html
<div>Test</div>
\`\`\`
`;
    const parsed = parseCntxtApp(raw);
    expect(parsed.ok).toBe(false);
  });
});

describe('Panel Apps: Preflight Scanner', () => {
  it('marks self-contained HTML as offline-ready', () => {
    const html = '<!doctype html><html><head><style>body { color: red; }</style></head><body>Hello</body></html>';
    const result = scanHtml(html);
    expect(result.offlineReady).toBe(true);
    expect(result.externalRefs).toHaveLength(0);
    expect(result.blocked).toBe(false);
  });

  it('detects external script tags and flags needs network', () => {
    const html = '<!doctype html><html><body><script src="https://cdn.jsdelivr.net/npm/chart.js"></script></body></html>';
    const result = scanHtml(html);
    expect(result.offlineReady).toBe(false);
    expect(result.externalRefs).toContain('https://cdn.jsdelivr.net/npm/chart.js');
  });

  it('ignores standard internal and relative links', () => {
    const html = '<!doctype html><html><body><a href="https://google.com">External Link</a></body></html>';
    const result = scanHtml(html);
    expect(result.offlineReady).toBe(true);
  });

  it('detects remote @import in css', () => {
    const html = '<style>@import url("https://fonts.googleapis.com/css?family=Inter");</style>';
    const result = scanHtml(html);
    expect(result.offlineReady).toBe(false);
    expect(result.externalRefs).toContain('https://fonts.googleapis.com/css?family=Inter');
  });

  it('warns when window.parent or top are accessed', () => {
    const html = '<script>window.parent.postMessage("hi", "*");</script>';
    const result = scanHtml(html);
    expect(result.findings.some((f) => f.id === 'parent')).toBe(true);
  });

  it('blocks creation when HTML exceeds hard 2MB limit', () => {
    const largeBlob = 'a'.repeat(2 * 1024 * 1024 + 100);
    const html = `<div>${largeBlob}</div>`;
    const result = scanHtml(html);
    expect(result.blocked).toBe(true);
    expect(result.findings.some((f) => f.id === 'size-hard')).toBe(true);
  });
});

describe('Panel Apps: Source Resolver', () => {
  it('resolves raw HTML content', () => {
    const res = resolveHtml('<!doctype html><html><body>Test</body></html>', 'index.html');
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.via).toBe('raw');
  });

  it('extracts first html code block from markdown document', () => {
    const md = `# Document Title\n\nSome notes here...\n\n\`\`\`html\n<div class="app">Mini App</div>\n\`\`\`\n\nMore notes.`;
    const res = resolveHtml(md, 'notes.md');
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.via).toBe('fence');
      expect(res.html).toBe('<div class="app">Mini App</div>');
    }
  });

  it('rejects text without HTML', () => {
    const res = resolveHtml('Just some markdown prose with no HTML tags or code blocks', 'doc.md');
    expect(res.ok).toBe(false);
  });
});

describe('Panel Apps: Store Registry', () => {
  beforeEach(() => {
    usePanelAppsStore.getState().hydrate([]);
    usePanelAppsStore.getState().open(null);
  });

  it('adds, opens, and removes panel apps from registry', () => {
    const store = usePanelAppsStore.getState();
    const app = {
      id: 'a112233445566',
      path: 'Panel Apps/Timer.cntxt',
      name: 'Timer',
      icon: 'Clock',
    };

    store.add(app);
    expect(usePanelAppsStore.getState().apps).toHaveLength(1);

    store.open(app.id);
    expect(usePanelAppsStore.getState().activeId).toBe(app.id);

    store.remove(app.id);
    expect(usePanelAppsStore.getState().apps).toHaveLength(0);
    expect(usePanelAppsStore.getState().activeId).toBeNull();
  });
});

describe('Panel Apps: Keep-Alive Host & LRU Lifecycle (Reset Fix)', () => {
  beforeEach(() => {
    usePanelAppsStore.getState().hydrate([]);
    usePanelAppsStore.getState().open(null);
    usePanelAppsStore.setState({ mounted: [], reloadNonce: {} });
  });

  it('keeps the same iframe DOM node when visible toggles between true and false', () => {
    const props = {
      mountedIds: ['app-1'],
      activeId: 'app-1',
      reloadNonce: {},
      getUrl: () => 'about:blank',
      titleOf: () => 'Test App',
    };
    const { container, rerender } = render(React.createElement(AppFrameHost, { ...props, visible: true }));
    const frame = container.querySelector('iframe');
    expect(frame).not.toBeNull();

    rerender(React.createElement(AppFrameHost, { ...props, visible: false }));
    expect(container.querySelector('iframe')).toBe(frame);

    rerender(React.createElement(AppFrameHost, { ...props, visible: true }));
    expect(container.querySelector('iframe')).toBe(frame);
  });

  it('replaces the iframe only when reloadNonce changes', () => {
    const base = {
      mountedIds: ['app-1'],
      activeId: 'app-1',
      visible: true,
      getUrl: () => 'about:blank',
      titleOf: () => 'Test App',
    };
    const { container, rerender } = render(React.createElement(AppFrameHost, { ...base, reloadNonce: { 'app-1': 0 } }));
    const frame = container.querySelector('iframe');

    rerender(React.createElement(AppFrameHost, { ...base, reloadNonce: { 'app-1': 1 } }));
    expect(container.querySelector('iframe')).not.toBe(frame);
  });

  it('caps live mounted apps to MAX_LIVE_APPS (5) and evicts the oldest non-active app', () => {
    ['app-1', 'app-2', 'app-3', 'app-4', 'app-5', 'app-6'].forEach((id) => {
      usePanelAppsStore.getState().open(id);
    });

    const state = usePanelAppsStore.getState();
    expect(state.mounted).toHaveLength(5);
    expect(state.mounted).not.toContain('app-1');
    expect(state.mounted).toEqual(['app-2', 'app-3', 'app-4', 'app-5', 'app-6']);
    expect(state.activeId).toBe('app-6');
  });

  it('close(id) unmounts the app and clears activeId if active', () => {
    usePanelAppsStore.getState().open('app-1');
    usePanelAppsStore.getState().open('app-2');

    expect(usePanelAppsStore.getState().mounted).toEqual(['app-1', 'app-2']);
    expect(usePanelAppsStore.getState().activeId).toBe('app-2');

    usePanelAppsStore.getState().close('app-2');
    expect(usePanelAppsStore.getState().mounted).toEqual(['app-1']);
    expect(usePanelAppsStore.getState().activeId).toBeNull();
  });
});
