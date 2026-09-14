import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkflowStore } from '../src/store/workflowStore';
import { useRibbonStore } from '../src/store/ribbonStore';
import { useTabStore } from '../src/store/tabStore';
import { 
  WORKFLOW_ICON_GROUPS, 
  ALL_WORKFLOW_ICONS, 
  DEFAULT_WORKFLOW_ICON, 
  DEFAULT_BOOKMARK_ICON 
} from '../src/constants/workflowIcons';
import { PinnedTab } from '../contracts/data_shapes';

describe('Workflow & Bookmark Icon Catalog', () => {
  it('contains expected icon groups', () => {
    const groupNames = WORKFLOW_ICON_GROUPS.map(g => g.name);
    expect(groupNames).toContain('Common');
    expect(groupNames).toContain('Productivity & Tasks');
    expect(groupNames).toContain('Development & Data');
    expect(groupNames).toContain('Content & Communication');
    expect(groupNames).toContain('Media & Utilities');
  });

  it('contains unique icons across catalog with proper defaults', () => {
    expect(ALL_WORKFLOW_ICONS.length).toBeGreaterThanOrEqual(40);
    const uniqueIcons = new Set(ALL_WORKFLOW_ICONS);
    expect(uniqueIcons.size).toBe(ALL_WORKFLOW_ICONS.length);
    expect(DEFAULT_WORKFLOW_ICON).toBe('Workflow');
    expect(DEFAULT_BOOKMARK_ICON).toBe('Bookmark');
  });
});

describe('WorkflowStore Operations', () => {
  beforeEach(() => {
    useWorkflowStore.setState({
      workflows: [],
      searchQuery: '',
      selectedCategory: 'All',
      collapsedCategories: []
    });
    useRibbonStore.setState({
      items: []
    });
    useTabStore.setState({
      tabs: [],
      activeTabId: ''
    });
  });

  it('creates a workflow blueprint item', () => {
    const store = useWorkflowStore.getState();
    const created = store.createWorkflow({
      name: 'Test Workflow',
      icon: 'Workflow',
      content: '# Step 1\n# Step 2',
      type: 'workflow',
      category: 'Engineering',
      order: 0,
      isHidden: false
    });

    expect(created.id).toBeDefined();
    expect(created.createdAt).toBeDefined();
    expect(created.name).toBe('Test Workflow');

    const state = useWorkflowStore.getState();
    expect(state.workflows.length).toBe(1);
    expect(state.workflows[0].id).toBe(created.id);
  });

  it('creates a disk bookmark item', () => {
    const store = useWorkflowStore.getState();
    const created = store.createWorkflow({
      name: 'Project Specs',
      icon: 'Bookmark',
      filePath: 'C:/docs/specs.md',
      type: 'bookmark',
      category: 'Documentation',
      order: 0,
      isHidden: false
    });

    expect(created.type).toBe('bookmark');
    expect(created.filePath).toBe('C:/docs/specs.md');
    expect(useWorkflowStore.getState().workflows[0].filePath).toBe('C:/docs/specs.md');
  });

  it('updates an existing workflow', () => {
    const store = useWorkflowStore.getState();
    const item = store.createWorkflow({
      name: 'Original Title',
      icon: 'FileText',
      content: 'Original Content',
      type: 'workflow',
      category: 'General',
      order: 0
    });

    store.updateWorkflow(item.id, {
      name: 'Updated Title',
      category: 'Custom Cat'
    });

    const updated = useWorkflowStore.getState().workflows.find(w => w.id === item.id);
    expect(updated?.name).toBe('Updated Title');
    expect(updated?.category).toBe('Custom Cat');
    expect(updated?.content).toBe('Original Content');
  });

  it('duplicates a workflow with copy suffix', () => {
    const store = useWorkflowStore.getState();
    const item = store.createWorkflow({
      name: 'Standup Notes',
      icon: 'Calendar',
      content: 'Today: ...',
      type: 'workflow',
      category: 'Daily',
      order: 0
    });

    store.duplicateWorkflow(item.id);

    const workflows = useWorkflowStore.getState().workflows;
    expect(workflows.length).toBe(2);
    const copy = workflows.find(w => w.name.includes('(Copy)'));
    expect(copy).toBeDefined();
    expect(copy?.name).toBe('Standup Notes (Copy)');
    expect(copy?.content).toBe('Today: ...');
    expect(copy?.id).not.toBe(item.id);
  });

  it('toggles workflow hide/show status', () => {
    const store = useWorkflowStore.getState();
    const item = store.createWorkflow({
      name: 'Secret Flow',
      icon: 'Lock',
      type: 'workflow',
      order: 0,
      isHidden: false
    });

    store.toggleHideWorkflow(item.id);
    expect(useWorkflowStore.getState().workflows[0].isHidden).toBe(true);

    store.toggleHideWorkflow(item.id);
    expect(useWorkflowStore.getState().workflows[0].isHidden).toBe(false);
  });

  it('deletes workflow and cleans up ribbon pin', () => {
    const store = useWorkflowStore.getState();
    const item = store.createWorkflow({
      name: 'Ephemeral Flow',
      icon: 'Sparkles',
      type: 'workflow',
      order: 0
    });

    // Pin to ribbon first
    store.togglePinToRibbon(item.id);
    expect(store.isPinnedToRibbon(item.id)).toBe(true);
    expect(useRibbonStore.getState().items.some(i => i.targetId === item.id)).toBe(true);

    // Delete workflow
    store.deleteWorkflow(item.id);
    expect(useWorkflowStore.getState().workflows.length).toBe(0);
    // Ribbon item should also be cleaned up
    expect(useRibbonStore.getState().items.some(i => i.targetId === item.id)).toBe(false);
  });

  it('performs bulk delete and bulk hide operations', () => {
    const store = useWorkflowStore.getState();
    const wf1 = store.createWorkflow({ name: 'W1', icon: 'Workflow', type: 'workflow', order: 0 });
    const wf2 = store.createWorkflow({ name: 'W2', icon: 'Workflow', type: 'workflow', order: 1 });
    const wf3 = store.createWorkflow({ name: 'W3', icon: 'Workflow', type: 'workflow', order: 2 });

    // Bulk toggle hide
    store.bulkToggleHideWorkflows([wf1.id, wf2.id], true);
    const afterHide = useWorkflowStore.getState().workflows;
    expect(afterHide.find(w => w.id === wf1.id)?.isHidden).toBe(true);
    expect(afterHide.find(w => w.id === wf2.id)?.isHidden).toBe(true);
    expect(afterHide.find(w => w.id === wf3.id)?.isHidden).toBe(false);

    // Bulk delete
    store.bulkDeleteWorkflows([wf1.id, wf3.id]);
    const afterDelete = useWorkflowStore.getState().workflows;
    expect(afterDelete.length).toBe(1);
    expect(afterDelete[0].id).toBe(wf2.id);
  });

  it('toggles category collapse state', () => {
    const store = useWorkflowStore.getState();
    expect(store.isCategoryCollapsed('Engineering')).toBe(false);

    store.toggleCategoryCollapse('Engineering');
    expect(store.isCategoryCollapsed('Engineering')).toBe(true);

    store.toggleCategoryCollapse('Engineering');
    expect(store.isCategoryCollapsed('Engineering')).toBe(false);
  });

  it('synchronizes ribbon pinning two-way', () => {
    const store = useWorkflowStore.getState();
    const item = store.createWorkflow({
      name: 'CI Pipeline',
      icon: 'GitBranch',
      type: 'workflow',
      order: 0
    });

    expect(store.isPinnedToRibbon(item.id)).toBe(false);

    // Pin to ribbon
    store.togglePinToRibbon(item.id);
    expect(store.isPinnedToRibbon(item.id)).toBe(true);
    const ribbonItem = useRibbonStore.getState().items.find(i => i.targetId === item.id);
    expect(ribbonItem).toBeDefined();
    expect(ribbonItem?.label).toBe('CI Pipeline');
    expect(ribbonItem?.icon).toBe('GitBranch');
    expect(ribbonItem?.type).toBe('workflow');

    // Unpin from ribbon
    store.togglePinToRibbon(item.id);
    expect(store.isPinnedToRibbon(item.id)).toBe(false);
    expect(useRibbonStore.getState().items.find(i => i.targetId === item.id)).toBeUndefined();
  });
});

describe('TabStore Workflow Integration', () => {
  beforeEach(() => {
    useTabStore.setState({
      tabs: [],
      activeTabId: '',
      isSaving: false
    });
  });

  it('stores and tracks pinnedTabId when launched from a workflow', () => {
    const workflowId = 'wf_ai_review_123';
    const tabId = useTabStore.getState().createTab(
      'AI Review.md',
      '# Review Prompt',
      'markdown',
      null,
      workflowId
    );

    const tab = useTabStore.getState().tabs.find(t => t.id === tabId);
    expect(tab).toBeDefined();
    expect(tab?.pinnedTabId).toBe(workflowId);

    // Verify searching for tab by pinnedTabId (used for smart single-click focus)
    const matchedTab = useTabStore.getState().tabs.find(t => t.pinnedTabId === workflowId);
    expect(matchedTab?.id).toBe(tabId);
  });
});
