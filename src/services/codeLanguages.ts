import { Language, LanguageDescription, defaultHighlightStyle } from '@codemirror/language';
import { languages } from '@codemirror/language-data';
import { html } from '@codemirror/lang-html';
import { python } from '@codemirror/lang-python';
import { sql } from '@codemirror/lang-sql';
import { javascript } from '@codemirror/lang-javascript';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';
import { highlightTree } from '@lezer/highlight';

// Pre-instantiated synchronous parsers for instant, zero-latency highlighting
const syncLanguages: Record<string, Language> = {
  html: html().language,
  htm: html().language,
  xhtml: html().language,
  xml: html().language,
  python: python().language,
  py: python().language,
  py3: python().language,
  sql: sql().language,
  mysql: sql().language,
  pgsql: sql().language,
  postgres: sql().language,
  postgresql: sql().language,
  sqlite: sql().language,
  javascript: javascript().language,
  js: javascript().language,
  mjs: javascript().language,
  cjs: javascript().language,
  node: javascript().language,
  jsx: javascript({ jsx: true }).language,
  typescript: javascript({ typescript: true }).language,
  ts: javascript({ typescript: true }).language,
  tsx: javascript({ typescript: true, jsx: true }).language,
  css: css().language,
  json: json().language,
  jsonc: json().language
};

// Aliases mapping common short names to names registered in @codemirror/language-data
const aliasMap: Record<string, string> = {
  rs: 'rust',
  golang: 'go',
  yml: 'yaml',
  md: 'markdown',
  docker: 'dockerfile',
  sh: 'shell',
  bash: 'shell',
  zsh: 'shell',
  'c++': 'cpp',
  'c#': 'csharp',
  cs: 'csharp',
  kt: 'kotlin',
  rb: 'ruby'
};

/**
 * Resolves a language identifier from fenced code blocks (e.g., ```html, ```python, ```sql, ```py, etc.)
 * into a CodeMirror Language or LanguageDescription.
 */
export function resolveCodeLanguage(info: string): Language | LanguageDescription | null {
  if (!info) return null;
  const clean = info.toLowerCase().trim().split(/\s+/)[0];
  if (!clean) return null;

  // 1. Instant synchronous match
  if (syncLanguages[clean]) {
    return syncLanguages[clean];
  }

  // 2. Normalization & dynamic lookup from @codemirror/language-data
  const target = aliasMap[clean] || clean;
  const desc = LanguageDescription.matchLanguageName(languages, target, true);
  if (desc) {
    return desc.support ? desc.support.language : desc;
  }

  return null;
}

/**
 * Background preloading for common languages to minimize async parsing delay.
 */
let preloaded = false;
export function preloadCommonLanguages(): void {
  if (preloaded) return;
  preloaded = true;

  const names = ['rust', 'go', 'cpp', 'c', 'java', 'php', 'yaml', 'shell', 'ruby'];
  for (const name of names) {
    const desc = LanguageDescription.matchLanguageName(languages, name, true);
    if (desc && !desc.support) {
      desc.load().catch((err) => {
        console.warn(`[Language Loader] Background preload for language '${name}' failed:`, err);
      });
    }
  }
}

/**
 * Utility to escape HTML strings safely
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Highlights a standalone code snippet using CodeMirror's Lezer parser and syntax highlighting.
 * Useful for Live Preview and rendering views.
 */
export function highlightCodeSnippet(code: string, language: string): string {
  if (!code) return '';

  const clean = (language || '').toLowerCase().trim();
  const langOrDesc = resolveCodeLanguage(clean);

  let langParser: any = null;
  if (langOrDesc instanceof Language) {
    langParser = langOrDesc.parser;
  } else if (langOrDesc && 'support' in langOrDesc && langOrDesc.support) {
    langParser = langOrDesc.support.language.parser;
  }

  if (!langParser) {
    return escapeHtml(code);
  }

  try {
    const tree = langParser.parse(code);
    let pos = 0;
    let result = '';

    highlightTree(tree, defaultHighlightStyle, (from, to, classes) => {
      if (from > pos) {
        result += escapeHtml(code.slice(pos, from));
      }
      result += `<span class="${classes}">${escapeHtml(code.slice(from, to))}</span>`;
      pos = to;
    });

    if (pos < code.length) {
      result += escapeHtml(code.slice(pos));
    }

    return result;
  } catch {
    return escapeHtml(code);
  }
}
