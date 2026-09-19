import { describe, it, expect } from 'vitest';
import { 
  validateFilename, 
  computeRelativePath, 
  findFileInTree, 
  findFolderInTree 
} from '../src/components/Sidebar/FileExplorer';
import { VirtualFile } from '../contracts/data_shapes';

describe('FileExplorer Utilities', () => {
  describe('validateFilename', () => {
    it('approves standard valid filenames', () => {
      expect(validateFilename('document.md').valid).toBe(true);
      expect(validateFilename('notes.txt').valid).toBe(true);
      expect(validateFilename('project_plan_2026.markdown').valid).toBe(true);
      expect(validateFilename('my-file-123.js').valid).toBe(true);
    });

    it('rejects empty or whitespace-only filenames', () => {
      const resEmpty = validateFilename('');
      expect(resEmpty.valid).toBe(false);
      expect(resEmpty.error).toContain('cannot be empty');

      const resWhitespace = validateFilename('   ');
      expect(resWhitespace.valid).toBe(false);
      expect(resWhitespace.error).toContain('cannot be empty');
    });

    it('rejects directory traversal patterns', () => {
      const resTraversal = validateFilename('..');
      expect(resTraversal.valid).toBe(false);
      expect(resTraversal.error).toContain('traversal sequence');

      const resSub = validateFilename('../secret.txt');
      expect(resSub.valid).toBe(false);
      expect(resSub.error).toContain('traversal sequence');
    });

    it('rejects filenames exceeding 255 characters', () => {
      const longName = 'a'.repeat(256) + '.md';
      const res = validateFilename(longName);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('exceeds maximum length');
    });

    it('rejects illegal characters in filenames', () => {
      const illegalNames = ['file<name>.md', 'file>name.md', 'file:name.md', 'file"name.md', 'file/name.md', 'file\\name.md', 'file|name.md', 'file?name.md', 'file*name.md'];
      for (const name of illegalNames) {
        const res = validateFilename(name);
        expect(res.valid).toBe(false);
        expect(res.error).toContain('illegal characters');
      }
    });

    it('rejects filenames ending with a period or space', () => {
      const resPeriod = validateFilename('test.');
      expect(resPeriod.valid).toBe(false);
      expect(resPeriod.error).toContain('cannot end with a period or space');

      const resSpace = validateFilename('test ');
      expect(resSpace.valid).toBe(false);
      expect(resSpace.error).toContain('cannot end with a period or space');
    });

    it('rejects reserved system device names on Windows', () => {
      const reserved = ['CON.txt', 'prn.md', 'AUX', 'nul.log', 'com1.md', 'LPT9.doc'];
      for (const name of reserved) {
        const res = validateFilename(name);
        expect(res.valid).toBe(false);
        expect(res.error).toContain('reserved system device name');
      }
    });
  });

  describe('computeRelativePath', () => {
    it('returns empty string if targetPath is missing', () => {
      expect(computeRelativePath(null, '/workspace')).toBe('');
      expect(computeRelativePath(undefined, '/workspace')).toBe('');
    });

    it('returns targetPath unchanged if workspacePath is missing', () => {
      expect(computeRelativePath('C:/docs/file.md', null)).toBe('C:/docs/file.md');
      expect(computeRelativePath('C:/docs/file.md', undefined)).toBe('C:/docs/file.md');
    });

    it('returns "." when target matches workspace exactly', () => {
      expect(computeRelativePath('C:/projects/CNTXT', 'C:/projects/CNTXT')).toBe('.');
      expect(computeRelativePath('C:\\projects\\CNTXT', 'C:/projects/CNTXT')).toBe('.');
    });

    it('computes relative path correctly within workspace', () => {
      expect(computeRelativePath('C:/projects/CNTXT/docs/intro.md', 'C:/projects/CNTXT')).toBe('docs/intro.md');
      expect(computeRelativePath('C:\\projects\\CNTXT\\src\\index.ts', 'C:\\projects\\CNTXT')).toBe('src/index.ts');
    });

    it('returns full targetPath if target is outside workspace', () => {
      expect(computeRelativePath('D:/other/file.md', 'C:/projects/CNTXT')).toBe('D:/other/file.md');
    });
  });

  describe('findFileInTree & findFolderInTree', () => {
    const mockTree: VirtualFile[] = [
      {
        id: 'file_1',
        name: 'root.md',
        type: 'file',
        path: '/workspace/root.md'
      },
      {
        id: 'folder_1',
        name: 'docs',
        type: 'folder',
        path: '/workspace/docs',
        children: [
          {
            id: 'file_2',
            name: 'guide.md',
            type: 'file',
            path: '/workspace/docs/guide.md'
          },
          {
            id: 'folder_sub',
            name: 'sub',
            type: 'folder',
            path: '/workspace/docs/sub',
            children: [
              {
                id: 'file_3',
                name: 'deep.md',
                type: 'file',
                path: '/workspace/docs/sub/deep.md'
              }
            ]
          }
        ]
      }
    ];

    it('finds file at root level', () => {
      const file = findFileInTree(mockTree, 'root.md');
      expect(file).toBeDefined();
      expect(file?.id).toBe('file_1');
    });

    it('finds nested files recursively', () => {
      const guide = findFileInTree(mockTree, 'guide.md');
      expect(guide).toBeDefined();
      expect(guide?.id).toBe('file_2');

      const deep = findFileInTree(mockTree, 'deep.md');
      expect(deep).toBeDefined();
      expect(deep?.id).toBe('file_3');
    });

    it('returns null if file does not exist', () => {
      expect(findFileInTree(mockTree, 'nonexistent.md')).toBeNull();
    });

    it('finds folder by id, name, or path', () => {
      const byId = findFolderInTree(mockTree, 'folder_1');
      expect(byId?.name).toBe('docs');

      const byName = findFolderInTree(mockTree, 'sub');
      expect(byName?.id).toBe('folder_sub');

      const byPath = findFolderInTree(mockTree, '/workspace/docs/sub');
      expect(byPath?.name).toBe('sub');
    });

    it('returns null if folder does not exist', () => {
      expect(findFolderInTree(mockTree, 'missing_folder')).toBeNull();
    });
  });
});
