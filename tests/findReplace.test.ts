import { describe, it, expect, vi, beforeEach } from 'vitest';
import { editorRegistry } from '../src/services/editor/editorRegistry';
import { createUiEventDispatcher } from '../src/adapters/eventDispatcher';
import { IRuntimeBridge } from '../src/ui-contract/bridgeContract';
import { SearchQuery, search, setSearchQuery } from '@codemirror/search';
import { EditorState, Text } from '@codemirror/state';
import { searchHighlighterExtension } from '../src/components/Editor/searchHighlighter';

class MockWindow {
  private listeners: Record<string, Function[]> = {};

  addEventListener(type: string, callback: Function) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(callback);
  }

  removeEventListener(type: string, callback: Function) {
    if (!this.listeners[type]) return;
    this.listeners[type] = this.listeners[type].filter(cb => cb !== callback);
  }

  dispatchEvent(event: any) {
    if (this.listeners[event.type]) {
      this.listeners[event.type].forEach(cb => cb(event));
    }
    return true;
  }
}

class MockCustomEvent {
  type: string;
  detail: any;
  constructor(type: string, init?: { detail?: any }) {
    this.type = type;
    this.detail = init?.detail;
  }
}

describe('Find & Replace (FloatingSearch Port)', () => {
  let mockBridge: IRuntimeBridge;
  let mockWin: MockWindow;

  beforeEach(() => {
    mockWin = new MockWindow();
    (globalThis as any).window = mockWin;
    (globalThis as any).CustomEvent = MockCustomEvent;

    mockBridge = {
      fs: {
        openFile: vi.fn(async () => null),
        saveFile: vi.fn(async () => true),
        saveFileAs: vi.fn(async () => null),
        exportWorkspace: vi.fn(async () => '{}'),
        importWorkspace: vi.fn(async () => true),
      },
      window: {
        newWindow: vi.fn(async () => true),
        isNative: false,
        getPlatform: () => 'windows',
      },
      clipboard: {
        readText: vi.fn(async () => ''),
        writeText: vi.fn(async () => true),
      },
      storage: {
        getItem: vi.fn(async () => null),
        setItem: vi.fn(async () => true),
        removeItem: vi.fn(async () => true),
        clear: vi.fn(async () => true),
      },
      system: {
        getAppInfo: vi.fn(async () => ({ name: 'CNTXT', version: '0.1.0', platform: 'windows' })),
        getSystemInfo: vi.fn(async () => ({ os: 'windows', arch: 'x64' })),
        openExternal: vi.fn(async () => {}),
      },
      platform: {
        isMac: false,
        isWindows: true,
        isLinux: false,
        isMobile: false,
      },
      theme: {
        getTheme: () => 'dark',
        setTheme: vi.fn(),
      }
    };
  });

  it('editorRegistry.openSearch dispatches open-search event with correct mode', () => {
    const listener = vi.fn();
    mockWin.addEventListener('open-search', listener);

    editorRegistry.openSearch('test-tab', 'find');
    expect(listener).toHaveBeenCalled();
    const event1 = listener.mock.calls[0][0] as any;
    expect(event1.detail.mode).toBe('find');

    editorRegistry.openSearch('test-tab', 'replace');
    const event2 = listener.mock.calls[1][0] as any;
    expect(event2.detail.mode).toBe('replace');

    mockWin.removeEventListener('open-search', listener);
  });

  it('eventDispatcher onFind and onReplace trigger open-search events', () => {
    const listener = vi.fn();
    mockWin.addEventListener('open-search', listener);

    const dispatcher = createUiEventDispatcher(mockBridge);
    dispatcher.onFind?.();
    expect(listener).toHaveBeenCalledTimes(1);
    expect((listener.mock.calls[0][0] as any).detail.mode).toBe('find');

    dispatcher.onReplace?.();
    expect(listener).toHaveBeenCalledTimes(2);
    expect((listener.mock.calls[1][0] as any).detail.mode).toBe('replace');

    mockWin.removeEventListener('open-search', listener);
  });

  it('SearchQuery correctly configures search options', () => {
    const query = new SearchQuery({
      search: 'Sample',
      replace: 'Replacement',
      caseSensitive: true,
      wholeWord: true,
      regexp: false
    });

    expect(query.search).toBe('Sample');
    expect(query.replace).toBe('Replacement');
    expect(query.caseSensitive).toBe(true);
    expect(query.wholeWord).toBe(true);
    expect(query.regexp).toBe(false);
  });

  it('SearchQuery regex configuration validates properly', () => {
    const query = new SearchQuery({
      search: '\\b[A-Za-z0-9_]+\\b',
      replace: 'TOKEN',
      regexp: true
    });

    expect(query.search).toBe('\\b[A-Za-z0-9_]+\\b');
    expect(query.regexp).toBe(true);
  });

  it('SearchQuery getCursor accurately finds all matches and exact offsets', () => {
    const doc = Text.of(['const alpha = 10;', 'const beta = 20;', 'const alpha = 30;']);
    const query = new SearchQuery({
      search: 'alpha',
      caseSensitive: true
    });

    const cursor = query.getCursor(doc);
    const matches: { from: number; to: number }[] = [];
    let item = cursor.next();
    while (!item.done) {
      matches.push({ from: item.value.from, to: item.value.to });
      item = cursor.next();
    }

    expect(matches).toHaveLength(2);
    expect(matches[0]).toEqual({ from: 6, to: 11 });
    // Line 1: 'const alpha = 10;\n' (18 chars) -> line 2: 'const beta = 20;\n' (17 chars) -> line 3: offset 35 + 6 = 41
    expect(matches[1]).toEqual({ from: 41, to: 46 });
  });

  it('searchHighlighterExtension registers cleanly in EditorState', () => {
    const state = EditorState.create({
      doc: 'Hello world, hello CodeMirror',
      extensions: [
        search({ top: true }),
        searchHighlighterExtension()
      ]
    });

    expect(state.doc.toString()).toBe('Hello world, hello CodeMirror');
  });
});

