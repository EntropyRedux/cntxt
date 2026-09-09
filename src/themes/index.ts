import { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import { oneDark } from '@codemirror/theme-one-dark';
import { ThemeName } from '../types';

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

  // Programming & Code Block Tokens
  { tag: [t.keyword, t.controlKeyword, t.moduleKeyword], color: '#BA1A1A', fontWeight: '600' },
  { tag: [t.name, t.deleted, t.character, t.macroName], color: '#1F1F1F' },
  { tag: [t.variableName, t.labelName], color: '#00639B' },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: '#0B57D0', fontWeight: '600' },
  { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: '#006874' },
  { tag: [t.definition(t.name), t.separator], color: '#1F1F1F' },
  { tag: [t.typeName, t.className, t.annotation, t.modifier, t.namespace], color: '#6750A4' },
  { tag: [t.number, t.bool, t.null], color: '#984061' },
  { tag: [t.string, t.special(t.string)], color: '#146C2E' },
  { tag: [t.regexp, t.escape], color: '#BA1A1A' },
  { tag: [t.atom, t.unit], color: '#984061' },
  { tag: [t.operator, t.operatorKeyword], color: '#00639B' },
  { tag: [t.bracket, t.angleBracket], color: '#444746' },
  { tag: [t.propertyName, t.attributeName], color: '#006874' },
  { tag: [t.tagName], color: '#0B57D0', fontWeight: '600' },
  { tag: [t.comment, t.lineComment, t.blockComment, t.docComment], color: '#747775', fontStyle: 'italic' },
  { tag: t.invalid, color: '#BA1A1A', textDecoration: 'underline wavy #BA1A1A' }
]);

export const material3LightTheme = EditorView.theme({
  '&': {
    color: '#1F1F1F',
    backgroundColor: '#FFFFFF',
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, Consolas, monospace",
  },
  '.cm-content': {
    caretColor: '#0B57D0',
    padding: '12px 0',
  },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: '#0B57D0', borderLeftWidth: '2px' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
    backgroundColor: '#D3E3FD !important',
  },
  '.cm-panels': { backgroundColor: '#F0F4F9', color: '#444746' },
  '.cm-panels.cm-panels-top': { borderBottom: '1px solid #E1E3E1' },
  '.cm-panels.cm-panels-bottom': { borderTop: '1px solid #E1E3E1' },
  '.cm-searchMatch': {
    backgroundColor: '#FFDDB8',
    outline: '1px solid #B06000'
  },
  '.cm-searchMatch.cm-searchMatch-selected': {
    backgroundColor: '#FFB951'
  },
  '.cm-activeLine': { backgroundColor: 'rgba(11, 87, 208, 0.04)' },
  '.cm-selectionMatch': { backgroundColor: 'rgba(11, 87, 208, 0.15)' },
  '&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket': {
    backgroundColor: '#D3E3FD',
    outline: '1px solid #0B57D0'
  },
  '.cm-gutters': {
    backgroundColor: '#F7F9FC',
    color: '#747775',
    borderRight: '1px solid #E1E3E1',
    paddingRight: '8px'
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#E9EEF6',
    color: '#0B57D0',
    fontWeight: 'bold'
  },
  '.cm-foldPlaceholder': {
    backgroundColor: '#E9EEF6',
    border: '1px solid #C4C7C5',
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

  { tag: [t.keyword, t.controlKeyword, t.moduleKeyword], color: '#C586C0' },
  { tag: [t.name, t.deleted, t.character, t.macroName], color: '#9CDCFE' },
  { tag: [t.variableName, t.labelName], color: '#9CDCFE' },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: '#DCDCAA' },
  { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: '#4FC1FF' },
  { tag: [t.definition(t.name), t.separator], color: '#D4D4D4' },
  { tag: [t.typeName, t.className, t.changed, t.annotation, t.modifier, t.self, t.namespace], color: '#4EC9B0' },
  { tag: [t.number, t.bool, t.null], color: '#B5CEA8' },
  { tag: [t.string, t.special(t.string)], color: '#CE9178' },
  { tag: [t.regexp, t.escape], color: '#D16969' },
  { tag: [t.atom, t.unit], color: '#B5CEA8' },
  { tag: [t.operator, t.operatorKeyword], color: '#D4D4D4' },
  { tag: [t.bracket, t.angleBracket], color: '#FFD700' },
  { tag: [t.propertyName, t.attributeName], color: '#9CDCFE' },
  { tag: [t.tagName], color: '#569CD6' },
  { tag: [t.comment, t.lineComment, t.blockComment, t.docComment], color: '#6A9955', fontStyle: 'italic' },
  { tag: t.invalid, color: '#F48771', textDecoration: 'underline wavy #F48771' }
]);

export const contextpadDarkTheme = EditorView.theme({
  '&': {
    color: '#D4D4D4',
    backgroundColor: '#1E1E1E',
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, Consolas, monospace",
  },
  '.cm-content': {
    caretColor: '#007ACC',
    padding: '12px 0',
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
  { tag: t.heading1, color: '#FF79C6', fontWeight: 'bold', fontSize: '1.25em' },
  { tag: t.heading2, color: '#BD93F9', fontWeight: 'bold', fontSize: '1.15em' },
  { tag: t.heading3, color: '#8BE9FD', fontWeight: 'bold', fontSize: '1.05em' },
  { tag: [t.heading4, t.heading5, t.heading6], color: '#50FA7B', fontWeight: 'bold' },
  { tag: t.strong, color: '#FFB86C', fontWeight: 'bold' },
  { tag: t.emphasis, color: '#F1FA8C', fontStyle: 'italic' },
  { tag: t.monospace, color: '#F1FA8C', backgroundColor: 'rgba(241, 250, 140, 0.1)', borderRadius: '3px' },
  { tag: t.link, color: '#8BE9FD', textDecoration: 'underline' },
  { tag: t.url, color: '#8BE9FD' },
  { tag: t.quote, color: '#6272A4', fontStyle: 'italic' },
  { tag: t.list, color: '#FF79C6' },
  { tag: [t.keyword, t.controlKeyword], color: '#FF79C6' },
  { tag: [t.variableName, t.name], color: '#F8F8F2' },
  { tag: [t.function(t.variableName)], color: '#50FA7B' },
  { tag: [t.typeName, t.className], color: '#8BE9FD', fontStyle: 'italic' },
  { tag: [t.number, t.bool, t.null], color: '#BD93F9' },
  { tag: [t.string, t.special(t.string)], color: '#F1FA8C' },
  { tag: [t.propertyName, t.attributeName], color: '#66D9EF' },
  { tag: [t.comment], color: '#6272A4', fontStyle: 'italic' },
  { tag: [t.operator], color: '#FF79C6' },
  { tag: [t.bracket], color: '#F8F8F2' }
]);

export const draculaTheme = EditorView.theme({
  '&': {
    color: '#F8F8F2',
    backgroundColor: '#282A36',
    fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, Consolas, monospace",
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
  { tag: [t.keyword], color: '#C678DD' },
  { tag: [t.variableName], color: '#ABB2BF' },
  { tag: [t.function(t.variableName)], color: '#61AFEF' },
  { tag: [t.typeName], color: '#E5C07B' },
  { tag: [t.number, t.bool], color: '#D19A66' },
  { tag: [t.string], color: '#98C379' },
  { tag: [t.comment], color: '#5C6370', fontStyle: 'italic' }
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
  { tag: [t.keyword], color: '#81A1C1' },
  { tag: [t.variableName], color: '#D8DEE9' },
  { tag: [t.function(t.variableName)], color: '#88C0D0' },
  { tag: [t.number, t.bool], color: '#B48EAD' },
  { tag: [t.string], color: '#A3BE8C' },
  { tag: [t.comment], color: '#4C566A', fontStyle: 'italic' }
]);

export const nordTheme = EditorView.theme({
  '&': { color: '#D8DEE9', backgroundColor: '#2E3440', fontFamily: "'JetBrains Mono', monospace" },
  '.cm-content': { caretColor: '#88C0D0', padding: '12px 0' },
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
  { tag: [t.keyword], color: '#FF6188' },
  { tag: [t.variableName], color: '#FCFCFA' },
  { tag: [t.function(t.variableName)], color: '#A9DC76' },
  { tag: [t.number, t.bool], color: '#AB9DF2' },
  { tag: [t.string], color: '#FFD866' },
  { tag: [t.comment], color: '#727072', fontStyle: 'italic' }
]);

export const monokaiTheme = EditorView.theme({
  '&': { color: '#FCFCFA', backgroundColor: '#2D2A2E', fontFamily: "'JetBrains Mono', monospace" },
  '.cm-content': { caretColor: '#FFD866', padding: '12px 0' },
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
  { tag: [t.keyword], color: '#FF7B72' },
  { tag: [t.variableName], color: '#E6EDF3' },
  { tag: [t.function(t.variableName)], color: '#D2A8FF' },
  { tag: [t.number, t.bool], color: '#79C0FF' },
  { tag: [t.string], color: '#A5D6FF' },
  { tag: [t.comment], color: '#8B949E', fontStyle: 'italic' }
]);

export const githubDarkTheme = EditorView.theme({
  '&': { color: '#E6EDF3', backgroundColor: '#0D1117', fontFamily: "'JetBrains Mono', monospace" },
  '.cm-content': { caretColor: '#58A6FF', padding: '12px 0' },
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
  { tag: [t.keyword], color: '#859900' },
  { tag: [t.variableName], color: '#839496' },
  { tag: [t.function(t.variableName)], color: '#268BD2' },
  { tag: [t.number, t.bool], color: '#D33682' },
  { tag: [t.string], color: '#2AA198' },
  { tag: [t.comment], color: '#586E75', fontStyle: 'italic' }
]);

export const solarizedDarkTheme = EditorView.theme({
  '&': { color: '#839496', backgroundColor: '#002B36', fontFamily: "'JetBrains Mono', monospace" },
  '.cm-content': { caretColor: '#268BD2', padding: '12px 0' },
  '.cm-cursor': { borderLeftColor: '#268BD2', borderLeftWidth: '2px' },
  '.cm-gutters': { backgroundColor: '#002B36', color: '#586E75', borderRight: '1px solid #073642' },
  '.cm-activeLine': { backgroundColor: 'rgba(7, 54, 66, 0.6)' },
  '.cm-selectionBackground, .cm-content ::selection': { backgroundColor: '#073642 !important' }
}, { dark: true });


export function getEditorThemeExtension(themeName: ThemeName): Extension {
  switch (themeName) {
    case 'google-material-3':
    case 'github-light':
      return [material3LightTheme, syntaxHighlighting(material3LightHighlightStyle)];
    case 'one-dark':
      return [oneDark, syntaxHighlighting(oneDarkEnhancedHighlightStyle)];
    case 'dracula':
      return [draculaTheme, syntaxHighlighting(draculaHighlightStyle)];
    case 'nord':
      return [nordTheme, syntaxHighlighting(nordHighlightStyle)];
    case 'monokai':
      return [monokaiTheme, syntaxHighlighting(monokaiHighlightStyle)];
    case 'github-dark':
      return [githubDarkTheme, syntaxHighlighting(githubDarkHighlightStyle)];
    case 'solarized-dark':
      return [solarizedDarkTheme, syntaxHighlighting(solarizedDarkHighlightStyle)];
    case 'contextpad-dark':
    default:
      return [contextpadDarkTheme, syntaxHighlighting(contextpadDarkHighlightStyle)];
  }
}
