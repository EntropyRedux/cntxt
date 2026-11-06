import { Language, LanguageDescription } from '@codemirror/language';
import { languages } from '@codemirror/language-data';
import { markdown } from '@codemirror/lang-markdown';
import { html } from '@codemirror/lang-html';
import { python } from '@codemirror/lang-python';
import { sql } from '@codemirror/lang-sql';
import { javascript } from '@codemirror/lang-javascript';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';

const nestedMarkdownLang: Language = markdown({
  codeLanguages: (info: string) => resolveCodeLanguage(info),
}).language;

// Pre-instantiated synchronous parsers for instant, zero-latency highlighting
const syncLanguages: Record<string, Language> = {
  markdown: nestedMarkdownLang,
  md: nestedMarkdownLang,
  cntxt: nestedMarkdownLang,
  deliverable: nestedMarkdownLang,
  conversation: nestedMarkdownLang,
  thread: nestedMarkdownLang,
  audit: nestedMarkdownLang,
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
  const trimmed = info.toLowerCase().trim();
  if (trimmed.startsWith('|')) {
    return nestedMarkdownLang;
  }
  const clean = trimmed.split('|')[0].trim().split(/\s+/)[0];
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

// Preload and snippet highlighters removed (on-demand parser resolution used by resolveCodeLanguage)

