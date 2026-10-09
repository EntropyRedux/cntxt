import { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import { oneDark } from '@codemirror/theme-one-dark';
import { ThemeName } from '../types';
import { createMarkdownHighlighting, createHeadersOnlyHighlighting } from './markdownHighlighting';

// ==========================================
// 1. Google Material 3 Light Theme & Highlight
// ==========================================
export const material3LightHighlightStyle = HighlightStyle.define([
  // Markdown Headings & Formatting (M3 Color Palette)
  { tag: t.heading1, color: '#0B57D0', fontWeight: 'bold', fontSize: '1.28em' },
  { tag: t.heading2, color: '#006874', fontWeight: 'bold', fontSize: '1.18em' },
  { tag: t.heading3, color: '#6750A4', fontWeight: 'bold', fontSize: '1.08em' },
  { tag: [t.heading4, t.heading5, t.heading6], color: '#9C4146', fontWeight: 'bold' },
  { tag: t.strong, color: '#1F1F1F', fontWeight: 'bold' },
  { tag: t.emphasis, color: '#00639B', fontStyle: 'italic' },
  { tag: t.strikethrough, textDecoration: 'line-through', color: '#747775' },
  { tag: t.monospace, color: '#0B57D0', backgroundColor: '#D3E3FD', borderRadius: '4px', padding: '1px 4px' },
  { tag: t.link, color: '#0B57D0', textDecoration: 'underline' },
  { tag: t.url, color: '#00639B' },
  { tag: t.quote, color: '#00639B', fontStyle: 'italic' },
  { tag: t.list, color: '#0B57D0', fontWeight: 'bold' },
  { tag: t.meta, color: '#747775' },
  { tag: t.processingInstruction, color: '#0B57D0' },

  // Programming & Code Block Tokens (HTML, Python, SQL, JS, etc.)
  { tag: [t.keyword, t.controlKeyword, t.moduleKeyword, t.operatorKeyword], color: '#BA1A1A', fontWeight: '600' },
  { tag: [t.name, t.deleted, t.character, t.macroName], color: '#1F1F1F' },
  { tag: [t.variableName, t.labelName], color: '#00639B' },
  { tag: [t.function(t.variableName), t.function(t.propertyName), t.function(t.name)], color: '#0B57D0', fontWeight: '600' },
  { tag: [t.definition(t.name), t.definition(t.variableName)], color: '#0B57D0', fontWeight: '600' },
  { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: '#006874', fontWeight: '600' },
  { tag: [t.separator], color: '#1F1F1F' },
  { tag: [t.typeName, t.className, t.annotation, t.modifier, t.namespace], color: '#6750A4', fontWeight: '500' },
  { tag: [t.number, t.bool, t.null], color: '#984061', fontWeight: '500' },
  { tag: [t.string, t.special(t.string)], color: '#146C2E' },
  { tag: [t.regexp, t.escape], color: '#BA1A1A' },
  { tag: [t.atom, t.unit], color: '#984061' },
  { tag: [t.operator], color: '#00639B' },
  { tag: [t.bracket, t.angleBracket], color: '#444746' },
  { tag: [t.propertyName, t.attributeName], color: '#006874', fontWeight: '500' },
  { tag: [t.attributeValue], color: '#146C2E' },
  { tag: [t.tagName], color: '#0B57D0', fontWeight: '700' },
  { tag: [t.self], color: '#6750A4', fontStyle: 'italic' },
  { tag: [t.comment, t.lineComment, t.blockComment, t.docComment], color: '#747775', fontStyle: 'italic' },
  { tag: t.invalid, color: '#BA1A1A', textDecoration: 'underline wavy #BA1A1A' }
]);

export const material3LightTheme = EditorView.theme({
  '&': {
    color: '#1F1F1F',
    backgroundColor: '#F8F9FA',
    fontFamily: "'JetBrains Mono Variable', 'JetBrains Mono', 'Fira Code Variable', 'Fira Code', 'Cascadia Code', Menlo, Consolas, monospace",
    outline: 'none !important',
    border: 'none !important',
  },
  '&.cm-focused': {
    outline: 'none !important',
    border: 'none !important',
  },
  '.cm-content': {
    caretColor: '#0B57D0',
    padding: '0',
    outline: 'none !important',
    border: 'none !important',
  },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: '#0B57D0', borderLeftWidth: '2px' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
    backgroundColor: '#C2E7FF !important',
  },
  '.cm-panels': { backgroundColor: '#F0F4F9', color: '#1F1F1F' },
  '.cm-panels.cm-panels-top': { borderBottom: '1px solid #D3D7DC' },
  '.cm-panels.cm-panels-bottom': { borderTop: '1px solid #D3D7DC' },
  '.cm-searchMatch': {
    backgroundColor: '#FFDDB8',
    outline: '1px solid #8C4E00'
  },
  '.cm-searchMatch.cm-searchMatch-selected': {
    backgroundColor: '#FFB951'
  },
  '.cm-activeLine': { backgroundColor: 'rgba(11, 87, 208, 0.05)' },
  '.cm-selectionMatch': { backgroundColor: 'rgba(11, 87, 208, 0.18)' },
  '&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket': {
    backgroundColor: '#D3E3FD',
    outline: '1px solid #0B57D0'
  },
  '.cm-gutters': {
    backgroundColor: '#F0F4F9',
    color: '#5E6266',
    borderRight: '1px solid #D3D7DC',
    paddingRight: '8px'
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#E2E7EE',
    color: '#0B57D0',
    fontWeight: 'bold'
  },
  '.cm-foldPlaceholder': {
    backgroundColor: '#E8EEF5',
    border: '1px solid #D3D7DC',
    color: '#0B57D0',
    padding: '0 4px',
    borderRadius: '4px'
  },
  '.cm-tooltip': {
    border: '1px solid #C4C7C5',
    backgroundColor: '#FFFFFF',
    color: '#1F1F1F',
    borderRadius: '8px',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)'
  },
  '.cm-tooltip .cm-tooltip-arrow:before': {
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent'
  },
  '.cm-tooltip .cm-tooltip-arrow:after': {
    borderTopColor: '#FFFFFF',
    borderBottomColor: '#FFFFFF'
  },
  '.cm-tooltip-autocomplete': {
    '& > ul > li[aria-selected]': {
      backgroundColor: '#D3E3FD',
      color: '#041E49'
    }
  }
}, { dark: false });


// ==========================================
// 2. ContextPad Dark (VS Code Dark+ Pro)
// ==========================================
export const contextpadDarkHighlightStyle = HighlightStyle.define([
  { tag: t.heading1, color: '#569CD6', fontWeight: 'bold', fontSize: '1.25em' },
  { tag: t.heading2, color: '#4EC9B0', fontWeight: 'bold', fontSize: '1.15em' },
  { tag: t.heading3, color: '#9CDCFE', fontWeight: 'bold', fontSize: '1.05em' },
  { tag: [t.heading4, t.heading5, t.heading6], color: '#C586C0', fontWeight: 'bold' },
  { tag: t.strong, color: '#DCDCAA', fontWeight: 'bold' },
  { tag: t.emphasis, color: '#CE9178', fontStyle: 'italic' },
  { tag: t.strikethrough, textDecoration: 'line-through', color: '#858585' },
  { tag: t.monospace, color: '#CE9178', backgroundColor: 'rgba(206, 145, 120, 0.1)', borderRadius: '3px', padding: '1px 3px' },
  { tag: t.link, color: '#3794FF', textDecoration: 'underline' },
  { tag: t.url, color: '#9CDCFE' },
  { tag: t.quote, color: '#6A9955', fontStyle: 'italic' },
  { tag: t.list, color: '#569CD6', fontWeight: 'bold' },
  { tag: t.meta, color: '#808080' },
  { tag: t.processingInstruction, color: '#569CD6' },

  { tag: [t.keyword, t.controlKeyword, t.moduleKeyword, t.operatorKeyword], color: '#C586C0', fontWeight: '600' },
  { tag: [t.name, t.deleted, t.character, t.macroName], color: '#9CDCFE' },
  { tag: [t.variableName, t.labelName], color: '#9CDCFE' },
  { tag: [t.function(t.variableName), t.function(t.propertyName), t.function(t.name)], color: '#DCDCAA' },
  { tag: [t.definition(t.name), t.definition(t.variableName)], color: '#DCDCAA', fontWeight: '600' },
  { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: '#4FC1FF' },
  { tag: [t.separator], color: '#D4D4D4' },
  { tag: [t.typeName, t.className, t.changed, t.annotation, t.modifier, t.self, t.namespace], color: '#4EC9B0' },
  { tag: [t.number, t.bool, t.null], color: '#B5CEA8' },
  { tag: [t.string, t.special(t.string)], color: '#CE9178' },
  { tag: [t.regexp, t.escape], color: '#D16969' },
  { tag: [t.atom, t.unit], color: '#B5CEA8' },
  { tag: [t.operator], color: '#D4D4D4' },
  { tag: [t.bracket, t.angleBracket], color: '#808080' },
  { tag: [t.propertyName, t.attributeName], color: '#9CDCFE' },
  { tag: [t.attributeValue], color: '#CE9178' },
  { tag: [t.tagName], color: '#569CD6', fontWeight: '600' },
  { tag: [t.comment, t.lineComment, t.blockComment, t.docComment], color: '#6A9955', fontStyle: 'italic' },
  { tag: t.invalid, color: '#F48771', textDecoration: 'underline wavy #F48771' }
]);

export const contextpadDarkTheme = EditorView.theme({
  '&': {
    color: '#D4D4D4',
    backgroundColor: '#1E1E1E',
    fontFamily: "'JetBrains Mono Variable', 'JetBrains Mono', 'Fira Code Variable', 'Fira Code', 'Cascadia Code', Menlo, Consolas, monospace",
    outline: 'none !important',
    border: 'none !important',
  },
  '&.cm-focused': {
    outline: 'none !important',
    border: 'none !important',
  },
  '.cm-content': {
    caretColor: '#007ACC',
    padding: '0',
    outline: 'none !important',
    border: 'none !important',
  },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: '#007ACC', borderLeftWidth: '2px' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
    backgroundColor: 'rgba(38, 79, 120, 0.6) !important',
  },
  '.cm-gutters': {
    backgroundColor: '#1E1E1E',
    color: '#858585',
    borderRight: '1px solid #2B2B2B',
    paddingRight: '8px'
  },
  '.cm-activeLine': { backgroundColor: 'rgba(255, 255, 255, 0.04)' },
  '.cm-activeLineGutter': { backgroundColor: 'rgba(255, 255, 255, 0.05)', color: '#D4D4D4' }
}, { dark: true });


// ==========================================
// 3. Dracula Theme & Highlight Style
// ==========================================
export const draculaHighlightStyle = HighlightStyle.define([
  { tag: t.heading1, color: '#BD93F9', fontWeight: 'bold', fontSize: '1.25em' },
  { tag: t.heading2, color: '#FF79C6', fontWeight: 'bold', fontSize: '1.15em' },
  { tag: t.heading3, color: '#8BE9FD', fontWeight: 'bold', fontSize: '1.05em' },
  { tag: [t.heading4, t.heading5, t.heading6], color: '#50FA7B', fontWeight: 'bold' },
  { tag: t.strong, color: '#FFB86C', fontWeight: 'bold' },
  { tag: t.emphasis, color: '#F1FA8C', fontStyle: 'italic' },
  { tag: t.monospace, color: '#F1FA8C', backgroundColor: 'rgba(241, 250, 140, 0.1)', borderRadius: '3px' },
  { tag: t.link, color: '#8BE9FD', textDecoration: 'underline' },
  { tag: t.url, color: '#8BE9FD' },
  { tag: t.quote, color: '#6272A4', fontStyle: 'italic' },
  { tag: t.list, color: '#FF79C6' },

  { tag: [t.keyword, t.controlKeyword, t.moduleKeyword, t.operatorKeyword], color: '#FF79C6', fontWeight: '600' },
  { tag: [t.variableName, t.name], color: '#F8F8F2' },
  { tag: [t.function(t.variableName), t.function(t.propertyName), t.function(t.name)], color: '#50FA7B' },
  { tag: [t.definition(t.name), t.definition(t.variableName)], color: '#50FA7B', fontWeight: '600' },
  { tag: [t.typeName, t.className, t.namespace], color: '#8BE9FD', fontStyle: 'italic' },
  { tag: [t.standard(t.name), t.constant(t.name)], color: '#BD93F9' },
  { tag: [t.number, t.bool, t.null], color: '#BD93F9' },
  { tag: [t.string, t.special(t.string), t.attributeValue], color: '#F1FA8C' },
  { tag: [t.tagName], color: '#FF79C6', fontWeight: '600' },
  { tag: [t.attributeName, t.propertyName], color: '#50FA7B' },
  { tag: [t.angleBracket, t.bracket], color: '#6272A4' },
  { tag: [t.operator], color: '#FF79C6' },
  { tag: [t.comment, t.lineComment, t.blockComment, t.docComment], color: '#6272A4', fontStyle: 'italic' }
]);

export const draculaTheme = EditorView.theme({
  '&': {
    color: '#F8F8F2',
    backgroundColor: '#282A36',
    fontFamily: "'JetBrains Mono Variable', 'JetBrains Mono', 'Fira Code Variable', 'Fira Code', Menlo, Consolas, monospace",
  },
  '.cm-content': { caretColor: '#F8F8F2', padding: '12px 0' },
  '.cm-cursor': { borderLeftColor: '#F8F8F2', borderLeftWidth: '2px' },
  '.cm-gutters': { backgroundColor: '#282A36', color: '#6272A4', borderRight: '1px solid #44475A' },
  '.cm-activeLine': { backgroundColor: '#44475A40' },
  '.cm-selectionBackground, .cm-content ::selection': { backgroundColor: '#44475A !important' },
}, { dark: true });


// ==========================================
// 4. One Dark Extended Style
// ==========================================
export const oneDarkEnhancedHighlightStyle = HighlightStyle.define([
  { tag: t.heading1, color: '#61AFEF', fontWeight: 'bold', fontSize: '1.25em' },
  { tag: t.heading2, color: '#98C379', fontWeight: 'bold', fontSize: '1.15em' },
  { tag: t.heading3, color: '#E5C07B', fontWeight: 'bold', fontSize: '1.05em' },
  { tag: [t.heading4, t.heading5, t.heading6], color: '#C678DD', fontWeight: 'bold' },
  { tag: t.strong, color: '#ABB2BF', fontWeight: 'bold' },
  { tag: t.emphasis, color: '#E5C07B', fontStyle: 'italic' },
  { tag: t.monospace, color: '#98C379', backgroundColor: 'rgba(152, 195, 121, 0.1)', borderRadius: '3px' },
  { tag: t.link, color: '#61AFEF', textDecoration: 'underline' },
  { tag: t.quote, color: '#5C6370', fontStyle: 'italic' },
  { tag: t.list, color: '#61AFEF' },

  { tag: [t.keyword, t.controlKeyword, t.moduleKeyword, t.operatorKeyword], color: '#C678DD', fontWeight: '600' },
  { tag: [t.variableName, t.name], color: '#ABB2BF' },
  { tag: [t.function(t.variableName), t.function(t.propertyName), t.function(t.name)], color: '#61AFEF' },
  { tag: [t.definition(t.name), t.definition(t.variableName)], color: '#61AFEF', fontWeight: '600' },
  { tag: [t.typeName, t.className, t.namespace], color: '#E5C07B' },
  { tag: [t.standard(t.name), t.constant(t.name)], color: '#E5C07B' },
  { tag: [t.tagName], color: '#E06C75', fontWeight: '600' },
  { tag: [t.attributeName, t.propertyName], color: '#D19A66' },
  { tag: [t.attributeValue], color: '#98C379' },
  { tag: [t.angleBracket, t.bracket], color: '#5C6370' },
  { tag: [t.operator], color: '#56B6C2' },
  { tag: [t.self], color: '#E06C75' },
  { tag: [t.number, t.bool, t.null], color: '#D19A66' },
  { tag: [t.string, t.special(t.string)], color: '#98C379' },
  { tag: [t.comment, t.lineComment, t.blockComment, t.docComment], color: '#5C6370', fontStyle: 'italic' }
]);


// ==========================================
// 5. Nord Theme & Highlight Style
// ==========================================
export const nordHighlightStyle = HighlightStyle.define([
  { tag: t.heading1, color: '#88C0D0', fontWeight: 'bold', fontSize: '1.25em' },
  { tag: t.heading2, color: '#81A1C1', fontWeight: 'bold', fontSize: '1.15em' },
  { tag: t.heading3, color: '#8FBCBB', fontWeight: 'bold', fontSize: '1.05em' },
  { tag: [t.heading4, t.heading5, t.heading6], color: '#B48EAD', fontWeight: 'bold' },
  { tag: t.strong, color: '#ECEFF4', fontWeight: 'bold' },
  { tag: t.emphasis, color: '#EBCB8B', fontStyle: 'italic' },
  { tag: t.monospace, color: '#88C0D0', backgroundColor: 'rgba(136, 192, 208, 0.1)', borderRadius: '3px' },
  { tag: t.link, color: '#88C0D0', textDecoration: 'underline' },
  { tag: t.quote, color: '#4C566A', fontStyle: 'italic' },

  { tag: [t.keyword, t.controlKeyword, t.moduleKeyword, t.operatorKeyword], color: '#81A1C1', fontWeight: '600' },
  { tag: [t.variableName, t.name], color: '#D8DEE9' },
  { tag: [t.function(t.variableName), t.function(t.propertyName), t.function(t.name)], color: '#88C0D0' },
  { tag: [t.definition(t.name), t.definition(t.variableName)], color: '#88C0D0', fontWeight: '600' },
  { tag: [t.typeName, t.className, t.namespace], color: '#8FBCBB' },
  { tag: [t.standard(t.name), t.constant(t.name)], color: '#81A1C1' },
  { tag: [t.tagName], color: '#81A1C1', fontWeight: '600' },
  { tag: [t.attributeName, t.propertyName], color: '#8FBCBB' },
  { tag: [t.attributeValue], color: '#A3BE8C' },
  { tag: [t.angleBracket, t.bracket], color: '#4C566A' },
  { tag: [t.operator], color: '#81A1C1' },
  { tag: [t.number, t.bool, t.null], color: '#B48EAD' },
  { tag: [t.string, t.special(t.string)], color: '#A3BE8C' },
  { tag: [t.comment, t.lineComment, t.blockComment, t.docComment], color: '#4C566A', fontStyle: 'italic' }
]);

export const nordTheme = EditorView.theme({
  '&': { color: '#D8DEE9', backgroundColor: '#2E3440', fontFamily: "'JetBrains Mono Variable', 'JetBrains Mono', monospace", outline: 'none !important', border: 'none !important' },
  '&.cm-focused': { outline: 'none !important', border: 'none !important' },
  '.cm-content': { caretColor: '#88C0D0', padding: '0', outline: 'none !important', border: 'none !important' },
  '.cm-cursor': { borderLeftColor: '#88C0D0', borderLeftWidth: '2px' },
  '.cm-gutters': { backgroundColor: '#2E3440', color: '#4C566A', borderRight: '1px solid #3B4252' },
  '.cm-activeLine': { backgroundColor: 'rgba(59, 66, 82, 0.5)' },
  '.cm-selectionBackground, .cm-content ::selection': { backgroundColor: '#434C5E !important' }
}, { dark: true });


// ==========================================
// 6. Monokai Pro Theme & Highlight Style
// ==========================================
export const monokaiHighlightStyle = HighlightStyle.define([
  { tag: t.heading1, color: '#FF6188', fontWeight: 'bold', fontSize: '1.25em' },
  { tag: t.heading2, color: '#FC9867', fontWeight: 'bold', fontSize: '1.15em' },
  { tag: t.heading3, color: '#FFD866', fontWeight: 'bold', fontSize: '1.05em' },
  { tag: [t.heading4, t.heading5, t.heading6], color: '#AB9DF2', fontWeight: 'bold' },
  { tag: t.strong, color: '#FCFCFA', fontWeight: 'bold' },
  { tag: t.emphasis, color: '#78DCE8', fontStyle: 'italic' },
  { tag: t.quote, color: '#727072', fontStyle: 'italic' },

  { tag: [t.keyword, t.controlKeyword, t.moduleKeyword, t.operatorKeyword], color: '#FF6188', fontWeight: '600' },
  { tag: [t.variableName, t.name], color: '#FCFCFA' },
  { tag: [t.function(t.variableName), t.function(t.propertyName), t.function(t.name)], color: '#A9DC76' },
  { tag: [t.definition(t.name), t.definition(t.variableName)], color: '#A9DC76', fontWeight: '600' },
  { tag: [t.typeName, t.className, t.namespace], color: '#78DCE8' },
  { tag: [t.standard(t.name), t.constant(t.name)], color: '#78DCE8' },
  { tag: [t.tagName], color: '#FF6188', fontWeight: '600' },
  { tag: [t.attributeName, t.propertyName], color: '#78DCE8' },
  { tag: [t.attributeValue], color: '#FFD866' },
  { tag: [t.angleBracket, t.bracket], color: '#727072' },
  { tag: [t.operator], color: '#FF6188' },
  { tag: [t.number, t.bool, t.null], color: '#AB9DF2' },
  { tag: [t.string, t.special(t.string)], color: '#FFD866' },
  { tag: [t.comment, t.lineComment, t.blockComment, t.docComment], color: '#727072', fontStyle: 'italic' }
]);

export const monokaiTheme = EditorView.theme({
  '&': { color: '#FCFCFA', backgroundColor: '#2D2A2E', fontFamily: "'JetBrains Mono Variable', 'JetBrains Mono', monospace", outline: 'none !important', border: 'none !important' },
  '&.cm-focused': { outline: 'none !important', border: 'none !important' },
  '.cm-content': { caretColor: '#FFD866', padding: '0', outline: 'none !important', border: 'none !important' },
  '.cm-cursor': { borderLeftColor: '#FFD866', borderLeftWidth: '2px' },
  '.cm-gutters': { backgroundColor: '#2D2A2E', color: '#727072', borderRight: '1px solid #403E41' },
  '.cm-activeLine': { backgroundColor: 'rgba(64, 62, 65, 0.5)' },
  '.cm-selectionBackground, .cm-content ::selection': { backgroundColor: '#403E41 !important' }
}, { dark: true });


// ==========================================
// 7. GitHub Dark Theme
// ==========================================
export const githubDarkHighlightStyle = HighlightStyle.define([
  { tag: t.heading1, color: '#58A6FF', fontWeight: 'bold', fontSize: '1.25em' },
  { tag: t.heading2, color: '#79C0FF', fontWeight: 'bold', fontSize: '1.15em' },
  { tag: t.heading3, color: '#7EE787', fontWeight: 'bold', fontSize: '1.05em' },
  { tag: [t.heading4, t.heading5, t.heading6], color: '#D2A8FF', fontWeight: 'bold' },
  { tag: t.strong, color: '#E6EDF3', fontWeight: 'bold' },
  { tag: t.quote, color: '#8B949E', fontStyle: 'italic' },

  { tag: [t.keyword, t.controlKeyword, t.moduleKeyword, t.operatorKeyword], color: '#FF7B72', fontWeight: '600' },
  { tag: [t.variableName, t.name], color: '#E6EDF3' },
  { tag: [t.function(t.variableName), t.function(t.propertyName), t.function(t.name)], color: '#D2A8FF' },
  { tag: [t.definition(t.name), t.definition(t.variableName)], color: '#D2A8FF', fontWeight: '600' },
  { tag: [t.typeName, t.className, t.namespace], color: '#FFA657' },
  { tag: [t.standard(t.name), t.constant(t.name)], color: '#79C0FF' },
  { tag: [t.tagName], color: '#7EE787', fontWeight: '600' },
  { tag: [t.attributeName, t.propertyName], color: '#79C0FF' },
  { tag: [t.attributeValue], color: '#A5D6FF' },
  { tag: [t.angleBracket, t.bracket], color: '#8B949E' },
  { tag: [t.operator], color: '#FF7B72' },
  { tag: [t.number, t.bool, t.null], color: '#79C0FF' },
  { tag: [t.string, t.special(t.string)], color: '#A5D6FF' },
  { tag: [t.comment, t.lineComment, t.blockComment, t.docComment], color: '#8B949E', fontStyle: 'italic' }
]);

export const githubDarkTheme = EditorView.theme({
  '&': { color: '#E6EDF3', backgroundColor: '#0D1117', fontFamily: "'JetBrains Mono Variable', 'JetBrains Mono', monospace", outline: 'none !important', border: 'none !important' },
  '&.cm-focused': { outline: 'none !important', border: 'none !important' },
  '.cm-content': { caretColor: '#58A6FF', padding: '0', outline: 'none !important', border: 'none !important' },
  '.cm-cursor': { borderLeftColor: '#58A6FF', borderLeftWidth: '2px' },
  '.cm-gutters': { backgroundColor: '#0D1117', color: '#6E7681', borderRight: '1px solid #30363D' },
  '.cm-activeLine': { backgroundColor: 'rgba(110, 118, 129, 0.1)' },
  '.cm-selectionBackground, .cm-content ::selection': { backgroundColor: '#1F6FEB44 !important' }
}, { dark: true });


// ==========================================
// 8. Solarized Dark Theme
// ==========================================
export const solarizedDarkHighlightStyle = HighlightStyle.define([
  { tag: t.heading1, color: '#268BD2', fontWeight: 'bold', fontSize: '1.25em' },
  { tag: t.heading2, color: '#2AA198', fontWeight: 'bold', fontSize: '1.15em' },
  { tag: t.heading3, color: '#859900', fontWeight: 'bold', fontSize: '1.05em' },
  { tag: [t.heading4, t.heading5, t.heading6], color: '#6C71C4', fontWeight: 'bold' },
  { tag: t.quote, color: '#586E75', fontStyle: 'italic' },

  { tag: [t.keyword, t.controlKeyword, t.moduleKeyword, t.operatorKeyword], color: '#859900', fontWeight: '600' },
  { tag: [t.variableName, t.name], color: '#839496' },
  { tag: [t.function(t.variableName), t.function(t.propertyName), t.function(t.name)], color: '#268BD2' },
  { tag: [t.definition(t.name), t.definition(t.variableName)], color: '#268BD2', fontWeight: '600' },
  { tag: [t.typeName, t.className, t.namespace], color: '#CB4B16' },
  { tag: [t.standard(t.name), t.constant(t.name)], color: '#B58900' },
  { tag: [t.tagName], color: '#268BD2', fontWeight: '600' },
  { tag: [t.attributeName, t.propertyName], color: '#B58900' },
  { tag: [t.attributeValue], color: '#2AA198' },
  { tag: [t.angleBracket, t.bracket], color: '#586E75' },
  { tag: [t.operator], color: '#859900' },
  { tag: [t.number, t.bool, t.null], color: '#D33682' },
  { tag: [t.string, t.special(t.string)], color: '#2AA198' },
  { tag: [t.comment, t.lineComment, t.blockComment, t.docComment], color: '#586E75', fontStyle: 'italic' }
]);

export const solarizedDarkTheme = EditorView.theme({
  '&': { color: '#839496', backgroundColor: '#002B36', fontFamily: "'JetBrains Mono Variable', 'JetBrains Mono', monospace", outline: 'none !important', border: 'none !important' },
  '&.cm-focused': { outline: 'none !important', border: 'none !important' },
  '.cm-content': { caretColor: '#268BD2', padding: '0', outline: 'none !important', border: 'none !important' },
  '.cm-cursor': { borderLeftColor: '#268BD2', borderLeftWidth: '2px' },
  '.cm-gutters': { backgroundColor: '#002B36', color: '#586E75', borderRight: '1px solid #073642' },
  '.cm-activeLine': { backgroundColor: 'rgba(7, 54, 66, 0.6)' },
  '.cm-selectionBackground, .cm-content ::selection': { backgroundColor: '#073642 !important' }
}, { dark: true });

// ==========================================
// 9. Parchment Editorial Light Theme
// ==========================================
export const parchmentHighlightStyle = HighlightStyle.define([
  // Markdown Headings & Formatting (Editorial Terracotta & Bronze Palette)
  { tag: t.heading1, color: '#9C522B', fontWeight: 'bold', fontSize: '1.28em' },
  { tag: t.heading2, color: '#783A16', fontWeight: 'bold', fontSize: '1.18em' },
  { tag: t.heading3, color: '#B45309', fontWeight: 'bold', fontSize: '1.08em' },
  { tag: [t.heading4, t.heading5, t.heading6], color: '#A0522D', fontWeight: 'bold' },
  { tag: t.strong, color: '#1C1917', fontWeight: 'bold' },
  { tag: t.emphasis, color: '#9C522B', fontStyle: 'italic' },
  { tag: t.strikethrough, textDecoration: 'line-through', color: '#9E9484' },
  { tag: t.monospace, color: '#9C522B', backgroundColor: '#F4E7DB', borderRadius: '4px', padding: '1px 4px' },
  { tag: t.link, color: '#9C522B', textDecoration: 'underline' },
  { tag: t.url, color: '#B45309' },
  { tag: t.quote, color: '#6E6659', fontStyle: 'italic' },
  { tag: t.list, color: '#9C522B', fontWeight: 'bold' },
  { tag: t.meta, color: '#9E9484' },
  { tag: t.processingInstruction, color: '#9C522B' },

  // Programming & Code Block Tokens
  { tag: [t.keyword, t.controlKeyword, t.moduleKeyword, t.operatorKeyword], color: '#B45309', fontWeight: '600' },
  { tag: [t.name, t.deleted, t.character, t.macroName], color: '#1C1917' },
  { tag: [t.variableName, t.labelName], color: '#9C522B' },
  { tag: [t.function(t.variableName), t.function(t.propertyName), t.function(t.name)], color: '#783A16', fontWeight: '600' },
  { tag: [t.definition(t.name), t.definition(t.variableName)], color: '#9C522B', fontWeight: '600' },
  { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: '#B45309', fontWeight: '600' },
  { tag: [t.separator], color: '#1C1917' },
  { tag: [t.typeName, t.className, t.annotation, t.modifier, t.namespace], color: '#854D0E', fontWeight: '500' },
  { tag: [t.number, t.bool, t.null], color: '#C2410C', fontWeight: '500' },
  { tag: [t.string, t.special(t.string)], color: '#2D6A4F' },
  { tag: [t.regexp, t.escape], color: '#C2410C' },
  { tag: [t.atom, t.unit], color: '#B45309' },
  { tag: [t.operator], color: '#9C522B' },
  { tag: [t.bracket, t.angleBracket], color: '#6E6659' },
  { tag: [t.propertyName, t.attributeName], color: '#783A16', fontWeight: '500' },
  { tag: [t.attributeValue], color: '#2D6A4F' },
  { tag: [t.tagName], color: '#9C522B', fontWeight: '700' },
  { tag: [t.self], color: '#854D0E', fontStyle: 'italic' },
  { tag: [t.comment, t.lineComment, t.blockComment, t.docComment], color: '#9E9484', fontStyle: 'italic' },
  { tag: t.invalid, color: '#B91C1C', textDecoration: 'underline wavy #B91C1C' }
]);

export const parchmentTheme = EditorView.theme({
  '&': {
    color: '#1C1917',
    backgroundColor: '#FAF6EE',
    fontFamily: "'Literata', Georgia, serif",
    outline: 'none !important',
    border: 'none !important',
  },
  '&.cm-focused': {
    outline: 'none !important',
    border: 'none !important',
  },
  '.cm-content': {
    caretColor: '#9C522B',
    padding: '0',
    outline: 'none !important',
    border: 'none !important',
  },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: '#9C522B', borderLeftWidth: '2px' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
    backgroundColor: '#F2DEC6 !important',
  },
  '.cm-panels': { backgroundColor: '#F3EDE1', color: '#1C1917' },
  '.cm-panels.cm-panels-top': { borderBottom: '1px solid #E2D7C4' },
  '.cm-panels.cm-panels-bottom': { borderTop: '1px solid #E2D7C4' },
  '.cm-searchMatch': {
    backgroundColor: '#FDE68A',
    outline: '1px solid #D97706'
  },
  '.cm-searchMatch.cm-searchMatch-selected': {
    backgroundColor: '#F59E0B',
    color: '#FFFFFF'
  },
  '.cm-activeLine': { backgroundColor: 'rgba(236, 228, 212, 0.45)' },
  '.cm-selectionMatch': { backgroundColor: '#F5E6D3' },
  '&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket': {
    backgroundColor: '#E8D5C4',
    outline: '1px solid #9C522B'
  },
  '.cm-gutters': {
    backgroundColor: '#FAF6EE',
    color: '#9E9484',
    borderRight: '1px solid #E2D7C4'
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#F3EDE1',
    color: '#9C522B',
    fontWeight: 'bold'
  },
  '.cm-foldPlaceholder': {
    backgroundColor: '#F4E7DB',
    border: '1px solid #E2D7C4',
    color: '#9C522B'
  }
}, { dark: false });


export interface MarkdownPalette {
  h1: string;
  h2: string;
  h3: string;
  h4: string;
  strong?: string;
  emphasis?: string;
  strikethrough?: string;
  monospace?: string;
  monospaceBg?: string;
  link?: string;
  url?: string;
  quote?: string;
  list?: string;
}

export function isDarkTheme(themeName: ThemeName): boolean {
  return themeName !== 'google-material-3' && themeName !== 'github-light' && themeName !== 'parchment';
}

export const THEME_MARKDOWN_PALETTES: Record<ThemeName, MarkdownPalette> = {
  'google-material-3': {
    h1: '#0B57D0',
    h2: '#006874',
    h3: '#6750A4',
    h4: '#9C4146',
    strong: '#1F1F1F',
    emphasis: '#00639B',
    strikethrough: '#747775',
    monospace: '#0B57D0',
    monospaceBg: '#D3E3FD',
    link: '#0B57D0',
    url: '#00639B',
    quote: '#00639B',
    list: '#0B57D0'
  },
  'github-light': {
    h1: '#0B57D0',
    h2: '#006874',
    h3: '#6750A4',
    h4: '#9C4146',
    strong: '#1F1F1F',
    emphasis: '#00639B',
    strikethrough: '#747775',
    monospace: '#0B57D0',
    monospaceBg: '#D3E3FD',
    link: '#0B57D0',
    url: '#00639B',
    quote: '#00639B',
    list: '#0B57D0'
  },
  'parchment': {
    h1: '#9C522B',
    h2: '#783A16',
    h3: '#B45309',
    h4: '#A0522D',
    strong: '#1C1917',
    emphasis: '#9C522B',
    strikethrough: '#9E9484',
    monospace: '#9C522B',
    monospaceBg: '#F4E7DB',
    link: '#9C522B',
    url: '#B45309',
    quote: '#6E6659',
    list: '#9C522B'
  },
  'contextpad-dark': {
    h1: '#569CD6',
    h2: '#4EC9B0',
    h3: '#9CDCFE',
    h4: '#C586C0',
    strong: '#DCDCAA',
    emphasis: '#CE9178',
    strikethrough: '#858585',
    monospace: '#CE9178',
    monospaceBg: 'rgba(206, 145, 120, 0.1)',
    link: '#3794FF',
    url: '#9CDCFE',
    quote: '#6A9955',
    list: '#569CD6'
  },
  'one-dark': {
    h1: '#61AFEF',
    h2: '#98C379',
    h3: '#E5C07B',
    h4: '#C678DD',
    strong: '#ABB2BF',
    emphasis: '#E5C07B',
    strikethrough: '#5C6370',
    monospace: '#98C379',
    monospaceBg: 'rgba(152, 195, 121, 0.1)',
    link: '#61AFEF',
    url: '#61AFEF',
    quote: '#5C6370',
    list: '#61AFEF'
  },
  'dracula': {
    h1: '#BD93F9',
    h2: '#FF79C6',
    h3: '#8BE9FD',
    h4: '#50FA7B',
    strong: '#FFB86C',
    emphasis: '#F1FA8C',
    strikethrough: '#6272A4',
    monospace: '#F1FA8C',
    monospaceBg: 'rgba(241, 250, 140, 0.1)',
    link: '#8BE9FD',
    url: '#8BE9FD',
    quote: '#6272A4',
    list: '#FF79C6'
  },
  'nord': {
    h1: '#88C0D0',
    h2: '#81A1C1',
    h3: '#8FBCBB',
    h4: '#B48EAD',
    strong: '#ECEFF4',
    emphasis: '#EBCB8B',
    strikethrough: '#4C566A',
    monospace: '#88C0D0',
    monospaceBg: 'rgba(136, 192, 208, 0.1)',
    link: '#88C0D0',
    url: '#88C0D0',
    quote: '#4C566A',
    list: '#88C0D0'
  },
  'monokai': {
    h1: '#FF6188',
    h2: '#FC9867',
    h3: '#FFD866',
    h4: '#AB9DF2',
    strong: '#FCFCFA',
    emphasis: '#78DCE8',
    strikethrough: '#727072',
    monospace: '#FFD866',
    monospaceBg: 'rgba(255, 216, 102, 0.1)',
    link: '#78DCE8',
    url: '#78DCE8',
    quote: '#727072',
    list: '#FF6188'
  },
  'github-dark': {
    h1: '#58A6FF',
    h2: '#79C0FF',
    h3: '#7EE787',
    h4: '#D2A8FF',
    strong: '#E6EDF3',
    emphasis: '#79C0FF',
    strikethrough: '#8B949E',
    monospace: '#A5D6FF',
    monospaceBg: 'rgba(165, 214, 255, 0.1)',
    link: '#58A6FF',
    url: '#58A6FF',
    quote: '#8B949E',
    list: '#58A6FF'
  },
  'solarized-dark': {
    h1: '#268BD2',
    h2: '#2AA198',
    h3: '#859900',
    h4: '#6C71C4',
    strong: '#93A1A1',
    emphasis: '#2AA198',
    strikethrough: '#586E75',
    monospace: '#2AA198',
    monospaceBg: 'rgba(42, 161, 152, 0.1)',
    link: '#268BD2',
    url: '#268BD2',
    quote: '#586E75',
    list: '#268BD2'
  }
};

export function createHeadersOnlyStyle(palette: MarkdownPalette): HighlightStyle {
  return HighlightStyle.define([
    { tag: t.heading1, color: palette.h1, fontWeight: 'bold', fontSize: '1.25em' },
    { tag: t.heading2, color: palette.h2, fontWeight: 'bold', fontSize: '1.15em' },
    { tag: t.heading3, color: palette.h3, fontWeight: 'bold', fontSize: '1.05em' },
    { tag: [t.heading4, t.heading5, t.heading6], color: palette.h4, fontWeight: 'bold' },
    { tag: t.strong, fontWeight: 'bold' },
    { tag: t.emphasis, fontStyle: 'italic' },
    { tag: t.strikethrough, textDecoration: 'line-through' }
  ]);
}

export function createMarkdownFormattedStyle(palette: MarkdownPalette): HighlightStyle {
  return HighlightStyle.define([
    { tag: t.heading1, color: palette.h1, fontWeight: 'bold', fontSize: '1.25em' },
    { tag: t.heading2, color: palette.h2, fontWeight: 'bold', fontSize: '1.15em' },
    { tag: t.heading3, color: palette.h3, fontWeight: 'bold', fontSize: '1.05em' },
    { tag: [t.heading4, t.heading5, t.heading6], color: palette.h4, fontWeight: 'bold' },
    { tag: t.strong, color: palette.strong, fontWeight: 'bold' },
    { tag: t.emphasis, color: palette.emphasis, fontStyle: 'italic' },
    { tag: t.strikethrough, color: palette.strikethrough, textDecoration: 'line-through' },
    { 
      tag: t.monospace, 
      color: palette.monospace, 
      backgroundColor: palette.monospaceBg, 
      borderRadius: '3px', 
      padding: '1px 3px' 
    },
    { tag: t.link, color: palette.link, textDecoration: 'underline' },
    { tag: t.url, color: palette.url || palette.link },
    { tag: t.quote, color: palette.quote, fontStyle: 'italic' },
    { tag: t.list, color: palette.list, fontWeight: 'bold' },
    { tag: t.meta, color: palette.strikethrough }
  ]);
}

export function getEditorThemeExtension(
  themeName: ThemeName,
  syntaxMode: 'auto' | 'automatic' | 'markdown' | 'markdown-formatted' | 'headers' | 'headers-only' | 'none' | 'off' = 'auto'
): Extension {
  let theme: Extension;
  let highlightStyle: HighlightStyle;

  switch (themeName) {
    case 'google-material-3':
    case 'github-light':
      theme = material3LightTheme;
      highlightStyle = material3LightHighlightStyle;
      break;
    case 'parchment':
      theme = parchmentTheme;
      highlightStyle = parchmentHighlightStyle;
      break;
    case 'one-dark':
      theme = oneDark;
      highlightStyle = oneDarkEnhancedHighlightStyle;
      break;
    case 'dracula':
      theme = draculaTheme;
      highlightStyle = draculaHighlightStyle;
      break;
    case 'nord':
      theme = nordTheme;
      highlightStyle = nordHighlightStyle;
      break;
    case 'monokai':
      theme = monokaiTheme;
      highlightStyle = monokaiHighlightStyle;
      break;
    case 'github-dark':
      theme = githubDarkTheme;
      highlightStyle = githubDarkHighlightStyle;
      break;
    case 'solarized-dark':
      theme = solarizedDarkTheme;
      highlightStyle = solarizedDarkHighlightStyle;
      break;
    case 'contextpad-dark':
    default:
      theme = contextpadDarkTheme;
      highlightStyle = contextpadDarkHighlightStyle;
      break;
  }

  // 1. OFF / None Mode: Display all text in editor as white (for dark themes) and black (for light themes)
  if (syntaxMode === 'off' || syntaxMode === 'none') {
    const isDark = isDarkTheme(themeName);
    const solidColor = isDark ? '#FFFFFF' : '#000000';
    const monochromeTheme = EditorView.theme({
      '&': {
        color: `${solidColor} !important`,
      },
      '.cm-content': {
        color: `${solidColor} !important`,
        caretColor: `${solidColor} !important`,
      },
      '.cm-line, .cm-line *': {
        color: `${solidColor} !important`,
        '-webkit-text-fill-color': `${solidColor} !important`,
      },
      '.cm-cursor, .cm-dropCursor': {
        borderLeftColor: `${solidColor} !important`,
      },
      '.cm-live-h1, .cm-live-h2, .cm-live-h3, .cm-live-h4, .cm-live-h5, .cm-live-h6': {
        color: `${solidColor} !important`,
        '-webkit-text-fill-color': `${solidColor} !important`,
      },
      '.cm-live-bold, .cm-live-italic, .cm-live-strikethrough, .cm-live-code-pill, .cm-live-tag, .cm-live-link, .cm-live-quote-marker, .cm-live-task-done, .cm-live-task-item': {
        color: `${solidColor} !important`,
        '-webkit-text-fill-color': `${solidColor} !important`,
      },
      '.cm-live-codeblock-header, .cm-live-codeblock-header *': {
        color: `${solidColor} !important`,
        '-webkit-text-fill-color': `${solidColor} !important`,
      }
    });

    return [
      theme,
      monochromeTheme
    ];
  }

  // 2. Headers Only: Only headings get rich hierarchical palette colors; all other marks/code monochrome
  if (syntaxMode === 'headers-only' || syntaxMode === 'headers') {
    const palette = THEME_MARKDOWN_PALETTES[themeName] || THEME_MARKDOWN_PALETTES['contextpad-dark'];
    const headersOnlyStyle = createHeadersOnlyStyle(palette);
    const isDark = isDarkTheme(themeName);
    const baseColor = isDark ? '#FFFFFF' : '#000000';
    const headersOnlyTheme = EditorView.theme({
      '.cm-live-code-pill, .cm-live-tag, .cm-live-link': {
        color: `${baseColor} !important`,
        '-webkit-text-fill-color': `${baseColor} !important`,
        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08) !important' : 'rgba(0, 0, 0, 0.06) !important',
      }
    });

    return [
      theme,
      headersOnlyTheme,
      syntaxHighlighting(headersOnlyStyle)
    ];
  }

  // 3. Markdown Formatted Only: Headers, bold, italicized, or any text formatted with markdown get colors; code syntax monochrome
  if (syntaxMode === 'markdown-formatted' || syntaxMode === 'markdown') {
    const palette = THEME_MARKDOWN_PALETTES[themeName] || THEME_MARKDOWN_PALETTES['contextpad-dark'];
    const mdFormattedStyle = createMarkdownFormattedStyle(palette);
    return [
      theme,
      syntaxHighlighting(mdFormattedStyle)
    ];
  }

  // 4. Automatic / Auto: Default full multi-color syntax highlighting
  return [
    theme,
    syntaxHighlighting(highlightStyle),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true })
  ];
}
