import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    mockAddNotification: vi.fn(),
    mockExecuteInSandbox: vi.fn(() => Promise.resolve()),
    mockCopyText: vi.fn(() => Promise.resolve()),
    mockGetView: vi.fn(() => undefined),
    mockGetSelectedText: vi.fn(() => ''),
    mockActionStoreState: { actions: [] as any[] },
    mockTabStoreState: {
      activeTabId: null as string | null,
      tabs: [] as any[],
      insertTextAtCursor: vi.fn(),
      updateTabContent: vi.fn(),
    },
  };
});

vi.mock('../src/store/actionStore', () => ({
  useActionStore: {
    getState: vi.fn(() => mocks.mockActionStoreState),
  },
}));
vi.mock('../src/store/tabStore', () => ({
  useTabStore: {
    getState: vi.fn(() => mocks.mockTabStoreState),
  },
}));
vi.mock('../src/store/notificationStore', () => ({
  useNotificationStore: {
    getState: vi.fn(() => ({ addNotification: mocks.mockAddNotification })),
  },
}));
vi.mock('../src/adapters', () => ({ copyText: mocks.mockCopyText }));
vi.mock('../src/services/actionSandbox', () => ({
  executeInSandbox: mocks.mockExecuteInSandbox,
}));
vi.mock('../src/services/editor/editorRegistry', () => ({
  editorRegistry: {
    getView: mocks.mockGetView,
    getSelectedText: mocks.mockGetSelectedText,
  },
}));

import { executeActionById } from '../src/services/actionExecutor';

const mockAddNotification = mocks.mockAddNotification;
const mockExecuteInSandbox = mocks.mockExecuteInSandbox;
const mockActionStoreState = mocks.mockActionStoreState;
const mockTabStoreState = mocks.mockTabStoreState;

function setAction(action: {
  id: string;
  name: string;
  code: string;
  enabled?: boolean;
  selectionBehavior?: 'auto' | 'replace' | 'insert';
}) {
  mockActionStoreState.actions = [action];
}

function setTab(activeTabId: string | null, tabs: any[] = []) {
  mockTabStoreState.activeTabId = activeTabId;
  mockTabStoreState.tabs = tabs;
}

describe('Action Executor Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setTab(null);
    setAction({ id: 'act-1', name: 'Test Action', code: 'FORMULA:TODAY()', enabled: true });
  });

  it('notifies and returns false when action is not found', async () => {
    mockActionStoreState.actions = [];
    const result = await executeActionById('non-existent');
    expect(result).toBe(false);
    expect(mockAddNotification).toHaveBeenCalledWith(
      'Action Not Found',
      expect.stringContaining('non-existent'),
      'warning'
    );
  });

  it('notifies and returns false when action is disabled', async () => {
    setAction({ id: 'act-1', name: 'Disabled Action', code: 'FORMULA:TODAY()', enabled: false });
    const result = await executeActionById('act-1');
    expect(result).toBe(false);
    expect(mockAddNotification).toHaveBeenCalledWith(
      'Action Disabled',
      expect.stringContaining('is currently disabled'),
      'warning'
    );
  });

  it('executes formula action and notifies on success with tab fallback', async () => {
    setTab('tab-1', [{ id: 'tab-1', title: 'doc.md', content: 'hello world' }]);
    setAction({ id: 'act-1', name: 'Date Action', code: 'FORMULA:TODAY()', enabled: true });

    const result = await executeActionById('act-1');
    expect(result).toBe(true);
    expect(mockTabStoreState.insertTextAtCursor).toHaveBeenCalled();
    expect(mockAddNotification).toHaveBeenCalledWith(
      'Action Executed',
      expect.stringContaining('Ran formula for "Date Action"'),
      'success'
    );
  });

  it('executes sandbox code action and passes rawApi to executeInSandbox', async () => {
    setTab('tab-1', [{ id: 'tab-1', title: 'doc.md', content: 'hello world' }]);
    setAction({ id: 'act-1', name: 'Custom JS', code: 'api.insertText("ok");', enabled: true });

    const result = await executeActionById('act-1');
    expect(result).toBe(true);
    expect(mockExecuteInSandbox).toHaveBeenCalledWith('api.insertText("ok");', expect.any(Object));
    expect(mockAddNotification).toHaveBeenCalledWith(
      'Action Executed',
      expect.stringContaining('Ran action "Custom JS"'),
      'success'
    );
  });

  it('handles sandbox execution rejection gracefully and notifies failure', async () => {
    setTab('tab-1', [{ id: 'tab-1', title: 'doc.md', content: 'hello world' }]);
    setAction({ id: 'act-1', name: 'Failing JS', code: 'throw new Error("Sandbox crash");', enabled: true });
    mockExecuteInSandbox.mockRejectedValueOnce(new Error('Sandbox crash'));

    const result = await executeActionById('act-1');
    expect(result).toBe(false);
    expect(mockAddNotification).toHaveBeenCalledWith(
      'Action Failed',
      'Sandbox crash',
      'error'
    );
  });
});
