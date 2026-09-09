import { IRuntimeBridge, BridgeFileResult } from '../ui-contract/bridgeContract';

/**
 * MockRuntimeAdapter
 * Pure in-memory mock bridge for unit testing, Storybook, and zero-dependency parallel frontend development.
 */
export class MockRuntimeAdapter implements IRuntimeBridge {
  private files: Map<string, string> = new Map([
    ['sample.md', '# Sample Markdown\n\nWelcome to ContextPad parallel frontend scaffold.']
  ]);

  fs = {
    openFile: async (): Promise<BridgeFileResult | null> => {
      const firstEntry = Array.from(this.files.entries())[0];
      if (!firstEntry) return null;
      return {
        name: firstEntry[0],
        path: `/virtual/${firstEntry[0]}`,
        content: firstEntry[1],
        language: 'markdown'
      };
    },
    saveFile: async (path: string, content: string): Promise<boolean> => {
      this.files.set(path, content);
      return true;
    },
    saveFileAs: async (suggestedName: string, content: string): Promise<string | null> => {
      this.files.set(suggestedName, content);
      return suggestedName;
    },
    exportWorkspace: async (): Promise<string> => {
      return JSON.stringify(Object.fromEntries(this.files));
    },
    importWorkspace: async (jsonData: string): Promise<boolean> => {
      try {
        const parsed = JSON.parse(jsonData);
        this.files = new Map(Object.entries(parsed));
        return true;
      } catch {
        return false;
      }
    }
  };

  window = {
    newWindow: async (): Promise<boolean> => {
      console.log('[MockRuntimeAdapter] newWindow triggered');
      return true;
    },
    isNative: false,
    getPlatform: (): 'web' => 'web'
  };

  clipboard = {
    readText: async (): Promise<string> => 'Mock Clipboard Content',
    writeText: async (text: string): Promise<boolean> => {
      console.log('[MockRuntimeAdapter] writeText:', text);
      return true;
    }
  };
}
