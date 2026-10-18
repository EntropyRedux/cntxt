import { describe, it, expect } from 'vitest';
import { resolveCodeLanguage } from '../src/services/codeLanguages';

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
});
