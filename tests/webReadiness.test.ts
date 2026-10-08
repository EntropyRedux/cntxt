import { describe, it, expect } from 'vitest';
import { 
  validateTab, 
  validateAction, 
  validateUserLibraryItems, 
  validateLibraryCollections,
  validateGitHubCatalog 
} from '../src/contracts/boundarySchemas';
import { ActionEngine } from '../src/services/actionEngine';
import { ActionSnapshot } from '../src/services/sandboxApiFactory';

describe('REM-08: Zod Boundary Schemas', () => {
  it('validates a valid Tab data structure', () => {
    const validTab = {
      id: 'tab-1',
      title: 'main.ts',
      content: 'function main() {}',
      language: 'typescript',
      isDirty: false,
      pinned: true
    };
    const result = validateTab(validTab);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe('main.ts');
    }
  });

  it('rejects a corrupt Tab with missing required fields', () => {
    const corruptTab = {
      id: 'tab-1',
      language: 'typescript'
    };
    const result = validateTab(corruptTab);
    expect(result.success).toBe(false);
  });

  it('validates a valid Action schema', () => {
    const validAction = {
      id: 'act-1',
      name: 'Format JSON',
      code: 'editor.replaceSelection(JSON.stringify(JSON.parse(editor.getSelection()), null, 2));',
      category: 'Formatting'
    };
    const result = validateAction(validAction);
    expect(result.success).toBe(true);
  });

  it('validates GitHub Community Catalog index.json payload', () => {
    const mockCatalogPayload = [
      {
        id: 'code-reviewer-prompt',
        name: 'Senior Code Reviewer',
        path: 'prompts/coding/code-reviewer.md',
        type: 'prompt',
        description: 'Comprehensive code review prompt with security scrutiny',
        tags: ['Code Review', 'Security', 'TypeScript'],
        author: 'EntropyRedux',
        verified: true
      }
    ];

    const result = validateGitHubCatalog(mockCatalogPayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('code-reviewer-prompt');
    }
  });

  it('validates user library items array', () => {
    const validItems = [
      {
        id: 'item-1',
        name: 'Refactor Helper',
        type: 'prompt',
        category: 'Code Review',
        description: 'Refactoring prompt',
        author: 'User',
        source: 'user-authored',
        targetAIs: ['Claude 3.7 Sonnet'],
        fields: [],
        template: 'Please refactor {{code}}',
        createdAt: 1720000000000,
        updatedAt: 1720000000000
      }
    ];

    const result = validateUserLibraryItems(validItems);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
    }
  });
});

describe('REM-03: Action Engine Sandbox', () => {
  it('executes a safe sandboxed script modifying editor text', async () => {
    const snapshot: ActionSnapshot = {
      text: 'hello world',
      selection: 'world',
      lineCount: 1,
      wordCount: 2,
      characterCount: 11
    };

    const script = 'const sel = editor.getSelection(); editor.replaceSelection(sel.toUpperCase());';
    const result = await ActionEngine.executeCode(script, snapshot);

    expect(result.journal).toBeDefined();
    expect(result.journal.length).toBeGreaterThan(0);
    expect(result.journal[0]).toEqual({
      type: 'replaceSelection',
      text: 'WORLD'
    });
  });

  it('blocks prototype pollution and eval access', async () => {
    const snapshot: ActionSnapshot = {
      text: 'test',
      selection: '',
      lineCount: 1,
      wordCount: 1,
      characterCount: 4
    };

    const maliciousScript = 'eval("console.log(123)");';
    await expect(ActionEngine.executeCode(maliciousScript, snapshot)).rejects.toThrow();
  });
});
