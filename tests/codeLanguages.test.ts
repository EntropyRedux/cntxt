import { describe, it, expect } from 'vitest';
import { Text } from '@codemirror/state';
import { resolveCodeLanguage } from '../src/services/codeLanguages';
import { getLanguageMeta } from '../src/extensions/liveMarkdown/languageMeta';
import { findCntxtContainers, findCodeBlocks } from '../src/extensions/liveMarkdown/scanners';

describe('codeLanguages service (GAP-03)', () => {
  describe('Synchronous Parsers', () => {
    it('resolves standard web languages synchronously', () => {
      const htmlLang = resolveCodeLanguage('html');
      expect(htmlLang).toBeDefined();

      const jsLang = resolveCodeLanguage('javascript');
      expect(jsLang).toBeDefined();

      const tsLang = resolveCodeLanguage('typescript');
      expect(tsLang).toBeDefined();

      const tsxLang = resolveCodeLanguage('tsx');
      expect(tsxLang).toBeDefined();

      const cssLang = resolveCodeLanguage('css');
      expect(cssLang).toBeDefined();

      const jsonLang = resolveCodeLanguage('json');
      expect(jsonLang).toBeDefined();
    });

    it('resolves python and sql language variants', () => {
      expect(resolveCodeLanguage('python')).toBeDefined();
      expect(resolveCodeLanguage('py')).toBeDefined();
      expect(resolveCodeLanguage('sql')).toBeDefined();
      expect(resolveCodeLanguage('sqlite')).toBeDefined();
      expect(resolveCodeLanguage('postgres')).toBeDefined();
    });
  });

  describe('Alias Mapping & CodeMirror Registry', () => {
    it('resolves common developer aliases', () => {
      expect(resolveCodeLanguage('rs')).toBeDefined();
      expect(resolveCodeLanguage('golang')).toBeDefined();
      expect(resolveCodeLanguage('yml')).toBeDefined();
      expect(resolveCodeLanguage('md')).toBeDefined();
      expect(resolveCodeLanguage('sh')).toBeDefined();
      expect(resolveCodeLanguage('bash')).toBeDefined();
      expect(resolveCodeLanguage('zsh')).toBeDefined();
      expect(resolveCodeLanguage('c++')).toBeDefined();
      expect(resolveCodeLanguage('c#')).toBeDefined();
      expect(resolveCodeLanguage('cs')).toBeDefined();
      expect(resolveCodeLanguage('kt')).toBeDefined();
      expect(resolveCodeLanguage('rb')).toBeDefined();
      expect(resolveCodeLanguage('docker')).toBeDefined();
    });

    it('handles uppercase and leading/trailing whitespace', () => {
      expect(resolveCodeLanguage('  PYTHON  ')).toBeDefined();
      expect(resolveCodeLanguage('TypeScript')).toBeDefined();
      expect(resolveCodeLanguage('SQL')).toBeDefined();
    });

    it('strips code fence meta attributes and takes first token', () => {
      expect(resolveCodeLanguage('python {1,3-5}')).toBeDefined();
      expect(resolveCodeLanguage('javascript title="App.js"')).toBeDefined();
    });
  });

  describe('Edge Cases & Unknown Languages', () => {
    it('returns null for empty or nullish inputs', () => {
      expect(resolveCodeLanguage('')).toBeNull();
      expect(resolveCodeLanguage('   ')).toBeNull();
      expect(resolveCodeLanguage(null as any)).toBeNull();
      expect(resolveCodeLanguage(undefined as any)).toBeNull();
    });

    it('returns null for completely unrecognized language identifiers', () => {
      expect(resolveCodeLanguage('nonexistent_lang_xyz')).toBeNull();
      expect(resolveCodeLanguage('foo_bar_lang')).toBeNull();
    });
  });

  describe('AI Deliverable Code Block Encapsulation & Nested Fences (FG-21)', () => {
    it('resolves getLanguageMeta for deliverable|@agent headers cleanly', () => {
      const meta = getLanguageMeta('deliverable|@agy · FG-21 Plan (04:15)');
      expect(meta.name).toBe('Deliverable');
      expect(meta.color).toBe('var(--accent-primary, #007ACC)');

      const mdMeta = getLanguageMeta('markdown|@auditor · Pass 1 Report');
      expect(mdMeta.name).toBe('Markdown');
    });

    it('preserves outer deliverable code block when inner 3-backtick blocks exist', () => {
      const docText = [
        '~~~markdown|@agy · FG-21 Plan',
        '# Plan Header',
        '```powershell',
        'Write-Output "Hello"',
        '```',
        'Final line of deliverable',
        '~~~',
      ].join('\n');

      const doc = Text.of(docText.split('\n'));
      const containers = findCntxtContainers(doc);
      const blocks = findCodeBlocks(doc, containers);

      expect(containers.get(1)?.role).toBe('start');
      expect(containers.get(1)?.container.startLine).toBe(1);
      expect(containers.get(1)?.container.endLine).toBe(7);
      expect(containers.get(1)?.container.isClosed).toBe(true);
      expect(containers.get(7)?.role).toBe('end');

      // And inner 3-backtick code block is preserved as an inner code block!
      expect(blocks.get(3)?.role).toBe('start');
      expect(blocks.get(3)?.block.language).toBe('powershell');
      expect(blocks.get(5)?.role).toBe('end');
    });
  });
});
