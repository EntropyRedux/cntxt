export type SupportedLanguage = 
  | 'markdown' 
  | 'javascript' 
  | 'typescript' 
  | 'python' 
  | 'json' 
  | 'yaml' 
  | 'html' 
  | 'css' 
  | 'text';

export interface Tab {
  id: string;
  title: string;
  content: string;
  filePath: string | null;
  folderPath: string | null;
  isDirty: boolean;
  language: SupportedLanguage;
  lastModifiedTime?: number;
  pinnedTabId?: string;
  cursorLine?: number;
  cursorCol?: number;
  cursorOffset?: number;
  selectionFrom?: number;
  selectionTo?: number;
  isPinned?: boolean;
}

export type ThemeName = 
  | 'google-material-3'
  | 'contextpad-dark' 
  | 'one-dark' 
  | 'dracula' 
  | 'nord' 
  | 'monokai' 
  | 'github-dark' 
  | 'github-light' 
  | 'solarized-dark';

export interface AutocompleteConfig {
  enableKeywords: boolean;
  enableTemplates: boolean;
  enableFormulas: boolean;
  enableSlashCommands: boolean;
  minWordLength: number;
}

export interface SpellCheckConfig {
  enabled: boolean;
  mode: 'built-in' | 'browser';
  language: string;
}

export interface CodeLintConfig {
  enabled: boolean;
  jsonLint: boolean;
  markdownLint: boolean;
}

export interface ViewSettings {
  showStatusBar: boolean;
  showLineNumbers: boolean;
  showBreadcrumb: boolean;
  showActivityBar: boolean;
  showSidebar: boolean;
  showRibbon?: boolean;
  activeSidebarTab: 'explorer' | 'outline' | 'templates' | 'actions' | 'workflows' | 'tokens' | 'formulas' | 'settings';
  showCodeBlockMarkers: boolean;
  showLivePreview: boolean;
  editorMode: 'raw' | 'rendered';
  previewEngine: 'integrated';
  previewTheme: 'match' | 'light' | 'dark';
  previewMaxWidth: 'narrow' | 'standard' | 'wide' | 'full';
  previewFontScale: number;
  previewContentMargin: 'compact' | 'normal' | 'spacious';
  previewShowTOC: boolean;
  previewCustomCSS: string;
  previewSplitOrientation: 'horizontal' | 'vertical';
  fontSize: number;
  fontFamily: string;
  wordWrap: boolean;
  theme: ThemeName;
  enableBracketMatching: boolean;
  enableFoldGutter: boolean;
  enableAutoIndent: boolean;
  enableMarkdownRendering: boolean;
  showTokenStats: boolean;
  largeFileThreshold: number;
  parserMode: 'auto' | 'ast' | 'stream' | 'plain';
  enableAutocomplete: boolean;
  enableSpellCheck: boolean;
  spellCheckMode: 'built-in' | 'browser';
  enableCodeLinting: boolean;
  indexingScope: 'performance' | 'thorough';
  selectedModelId: string;
  budgetThreshold: number; // e.g. 50000 tokens
  uiDensity: 'compact' | 'comfortable' | 'touch';
  touchOptimized: boolean;
  showMobileAccessoryBar: boolean;
  autocompleteConfig: AutocompleteConfig;
  spellCheckConfig: SpellCheckConfig;
  codeLintConfig: CodeLintConfig;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  content: string;
  category: string;
  variables: string[]; // extracted {{variable}}
  isHidden?: boolean;
  isPinned?: boolean;
  createdAt: number;
  updatedAt: number;
}

export type ActionCategory = 
  | 'All' 
  | 'Text Analysis' 
  | 'Formatting' 
  | 'Utility' 
  | 'Text Processing' 
  | 'Format & Clean' 
  | 'Export & Copy' 
  | 'AI & Prompt' 
  | 'Utilities' 
  | 'Custom' 
  | string;

export interface Action {
  id: string;
  name: string;
  description: string;
  type?: 'button' | 'command';
  code: string; // JavaScript code executed in sandbox
  category: ActionCategory;
  enabled?: boolean;
  isDefault?: boolean;
  icon?: string;
  color?: string;
  shortcut?: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface SandboxAPI {
  getContent: () => string;
  setContent: (newContent: string) => void;
  getSelection: () => string;
  replaceSelection: (replacement: string) => void;
  insertAtCursor: (text: string) => void;
  getTabTitle: () => string;
  setTabTitle: (title: string) => void;
  notify: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  copyToClipboard: (text: string) => Promise<void>;
  dialog?: {
    prompt: (message: string, defaultValue?: string) => Promise<string | null>;
    confirm: (message: string) => Promise<boolean>;
  };
  utils: {
    formatJSON: (jsonStr: string) => string;
    slugify: (str: string) => string;
    countWords: (str: string) => number;
    countChars: (str: string) => number;
    base64Encode: (str: string) => string;
    base64Decode: (str: string) => string;
    now: () => string;
  };
}

export interface PinnedTab {
  id: string;
  name: string;
  icon: string; // Lucide icon name
  type: 'workflow' | 'bookmark';
  content: string; // Blueprint content for workflow, cached content for bookmark
  filePath?: string;
  category: string;
  isHidden?: boolean;
  createdAt: number;
}

export interface AIModel {
  id: string;
  name: string;
  provider: 'OpenAI' | 'Anthropic' | 'Google' | 'DeepSeek' | 'Meta' | 'Custom';
  contextWindow: number;
  inputCostPerMillion: number; // in USD
  outputCostPerMillion: number; // in USD
  tokenizerType: 'cl100k_base' | 'o200k_base' | 'claude' | 'gemini' | 'approx';
  recommendedFor: string;
}

export interface TokenEstimate {
  tokenCount: number;
  cost: number;
  charCount: number;
  wordCount: number;
  lineCount: number;
  model: AIModel;
  status: 'live' | 'cached' | 'estimated' | 'error';
  percentOfContext: number;
  breakdown?: {
    systemPromptTokens: number;
    userContentTokens: number;
    codeTokens: number;
    templateVariableTokens: number;
  };
}

export interface FormulaResult {
  success: boolean;
  value?: string | number;
  error?: string;
}

export interface EditorContext {
  line: number;
  column: number;
  lineCount: number;
  charCount: number;
  wordCount: number;
  selectedText?: string;
  getLine: (n: number) => string;
  getRange: (fromLine: number, toLine: number) => string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message?: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: number;
}

export interface FileItem {
  id: string;
  name: string;
  path: string;
  content: string;
  type: 'file' | 'directory';
  language: SupportedLanguage;
  children?: FileItem[];
  size?: number;
  lastModified?: number;
}

export type RibbonItemType = 'tool' | 'action' | 'workflow' | 'template' | 'command' | 'formatting';

export type MarkdownFormatType = 'wrap' | 'line-prefix' | 'block' | 'insert' | 'command';

export type FormattingButtonSize = 'small' | 'medium' | 'large';

export interface MarkdownFormatButton {
  id: string;
  label: string;
  icon: string;
  title: string;
  prefix: string;
  suffix?: string;
  type: MarkdownFormatType;
  commandId?: 'undo' | 'redo' | 'indent' | 'outdent' | 'variable-modal' | 'slash-command' | 'formula';
  enabled: boolean;
  isAccent?: boolean;
  order: number;
  category?: 'format' | 'heading' | 'block' | 'list' | 'insert' | 'tool' | 'custom';
  isBuiltIn?: boolean;
  shortcut?: string;
}

export interface RibbonItem {
  id: string;
  label: string;
  icon: string;
  type: RibbonItemType;
  targetId?: string; // action id, template id, workflow id, tool name, or formatting button id
  color?: string; // e.g. 'accent' | 'amber' | 'emerald' | 'purple' | 'rose' | 'cyan' | 'blue'
  shortcut?: string;
  tooltip?: string;
  enabled: boolean;
  order: number;
  showLabel?: boolean; // if false or omitted on custom items, only icon is rendered
}
