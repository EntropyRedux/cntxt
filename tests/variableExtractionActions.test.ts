import { describe, it, expect, beforeEach } from 'vitest';
import { executeInSandbox } from '../src/services/actionSandbox';
import { DEFAULT_ACTIONS } from '../mocks/index';
import { useTabStore } from '../src/store/tabStore';

describe('Variable Extraction Actions (FG-09 Phase 2)', () => {
  beforeEach(() => {
    useTabStore.setState({ tabs: [], activeTabId: '', isHydrating: false });
  });

  it('contains all 4 extraction presets in DEFAULT_ACTIONS under category EXTRACTION', () => {
    const extractionActions = DEFAULT_ACTIONS.filter(a => a.category === 'EXTRACTION');
    expect(extractionActions).toHaveLength(4);

    const ids = extractionActions.map(a => a.id);
    expect(ids).toContain('action-extract-answered');
    expect(ids).toContain('action-extract-rows-with-vars');
    expect(ids).toContain('action-extract-rows-without-vars');
    expect(ids).toContain('action-selection-extract-vars');
  });

  it('action-extract-answered extracts variables and formats a markdown table', async () => {
    const action = DEFAULT_ACTIONS.find(a => a.id === 'action-extract-answered')!;
    expect(action).toBeDefined();

    const sampleDoc = `# Contract\nClient: {{client_name=Acme Corp}}\nDue: {{due_date=2026-10-15}}\nStatus: {{status}}\n`;
    useTabStore.getState().createTab('Sample.md', sampleDoc);

    let copiedText = '';
    let toastMessage = '';

    await executeInSandbox(action.code, {
      getContent: () => sampleDoc,
      getText: () => sampleDoc,
      copyToClipboard: async (text: string) => { copiedText = text; },
      toast: (msg: string) => { toastMessage = msg; }
    });

    expect(copiedText).toContain('### Extracted Document Variables');
    expect(copiedText).toContain('| client_name | Acme Corp |');
    expect(copiedText).toContain('| due_date | 2026-10-15 |');
    expect(copiedText).toContain('| status | (unassigned) |');
    expect(toastMessage).toContain('Copied 3 extracted variable(s)');
  });

  it('action-extract-rows-with-vars extracts only lines matching variable syntax', async () => {
    const action = DEFAULT_ACTIONS.find(a => a.id === 'action-extract-rows-with-vars')!;
    expect(action).toBeDefined();

    const sampleDoc = `Line 1: Plain text\nLine 2 with {{variable_a}}\nLine 3: Another static line\nLine 4: {{variable_b}} is here`;

    let copiedText = '';
    await executeInSandbox(action.code, {
      getContent: () => sampleDoc,
      copyToClipboard: async (text: string) => { copiedText = text; },
      toast: () => {}
    });

    const lines = copiedText.split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe('Line 2 with {{variable_a}}');
    expect(lines[1]).toBe('Line 4: {{variable_b}} is here');
  });

  it('action-extract-rows-without-vars isolates lines without variables', async () => {
    const action = DEFAULT_ACTIONS.find(a => a.id === 'action-extract-rows-without-vars')!;
    expect(action).toBeDefined();

    const sampleDoc = `Line 1: Plain text\nLine 2 with {{variable_a}}\nLine 3: Another static line\nLine 4: {{variable_b}} is here`;

    let copiedText = '';
    await executeInSandbox(action.code, {
      getContent: () => sampleDoc,
      copyToClipboard: async (text: string) => { copiedText = text; },
      toast: () => {}
    });

    const lines = copiedText.split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe('Line 1: Plain text');
    expect(lines[1]).toBe('Line 3: Another static line');
  });

  it('action-selection-extract-vars extracts unique variables into a checklist', async () => {
    const action = DEFAULT_ACTIONS.find(a => a.id === 'action-selection-extract-vars')!;
    expect(action).toBeDefined();

    const selectionText = `User {{first_name}} and {{last_name}}, also {{first_name}} again with {{role}}.`;

    let copiedText = '';
    await executeInSandbox(action.code, {
      getSelection: () => selectionText,
      getContent: () => 'Full document text',
      copyToClipboard: async (text: string) => { copiedText = text; },
      toast: () => {}
    });

    expect(copiedText).toContain('### Variable Checklist');
    expect(copiedText).toContain('- [ ] `{{first_name}}`');
    expect(copiedText).toContain('- [ ] `{{last_name}}`');
    expect(copiedText).toContain('- [ ] `{{role}}`');
    // Ensure duplicates are eliminated
    expect(copiedText.match(/first_name/g)?.length).toBe(1);
  });
});
