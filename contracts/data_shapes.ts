/**
 * CANONICAL DATA SHAPES (contracts/data_shapes.ts)
 * 
 * Single source of truth for ALL domain types in ContextPad (CNTXT).
 * All components, stores, adapters, and services must import from this contract.
 * Zero ad-hoc, inline duplicate interfaces allowed in components.
 */

// ==========================================
// 1. Core Document & Tab Domain Shapes
// ==========================================

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

export type TabType = 'document' | 'template' | 'scratchpad';

export interface DocumentContent {
  raw: string;
  rendered?: string;
  version: number;
  checksum?: string;
  lastSavedTimestamp?: number;
}

export interface Tab {
  id: string;
  title: string;
  content: string;
  filePath: string | null;
  folderPath: string | null;
  isDirty: boolean;
  language: SupportedLanguage;
  tabType?: TabType;
  lastModifiedTime?: number;
  pinnedTabId?: string;
  cursorLine?: number;
  cursorCol?: number;
  cursorOffset?: number;
  selectionFrom?: number;
  selectionTo?: number;
  selectionStartLine?: number | null;
  selectionEndLine?: number | null;
  isPinned?: boolean;
}

export interface PinnedTab {
  id: string;
  name: string;
  icon: string; // Lucide icon name
  type: 'bookmark';
  content: string; // Blueprint content for workflow, cached content for bookmark
  filePath?: string;
  category: string;
  isHidden?: boolean;
  createdAt: number;
}

// ==========================================
// 2. Settings & View Domain Shapes
// ==========================================

export type ThemeName = 
  | 'google-material-3'
  | 'parchment'
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

export interface EditorSettings {
  fontSize: number;
  fontFamily: string;
  wordWrap: boolean;
  editorMaxWidth: 'narrow' | 'standard' | 'wide' | 'full';
  editorPadding: 'compact' | 'normal' | 'spacious';
  theme: ThemeName;
  enableBracketMatching: boolean;
  enableFoldGutter: boolean;
  enableAutoIndent: boolean;
  largeFileThreshold: number;
  parserMode: 'auto' | 'ast' | 'stream' | 'plain';
  enableAutocomplete: boolean;
  enableSpellCheck: boolean;
  spellCheckMode: 'built-in' | 'browser';
  enableCodeLinting: boolean;
  showLineNumbers: boolean;
  showCodeBlockMarkers: boolean;
  typingDirection?: 'top-to-bottom' | 'bottom-to-up';
  enableLargeDocDetection?: boolean;
  largeDocThresholdKb?: number;
  largeDocThresholdLines?: number;
}

export interface FormattingSettings {
  previewMaxWidth: 'narrow' | 'standard' | 'wide' | 'full';
  previewFontScale: number;
  previewContentMargin: 'compact' | 'normal' | 'spacious';
  previewShowTOC: boolean;
  previewCustomCSS: string;
  previewSplitOrientation: 'horizontal' | 'vertical';
  previewEngine: 'integrated';
  previewTheme: 'match' | 'light' | 'dark';
}

export interface ViewSettings extends EditorSettings, FormattingSettings {
  showStatusBar: boolean;
  showBreadcrumb: boolean;
  showActivityBar: boolean;
  showSidebar: boolean;
  showRibbon?: boolean;
  showMenuBar?: boolean;
  activeSidebarTab: 'explorer' | 'outline' | 'templates' | 'actions' | 'tokens' | 'settings';
  showLivePreview: boolean;
  editorMode: 'raw' | 'rendered';
  enableMarkdownRendering: boolean;
  showTokenStats: boolean;
  indexingScope: 'performance' | 'thorough';
  selectedModelId: string;
  budgetThreshold: number; // e.g. 50000 tokens
  uiDensity: 'desktop' | 'touch';
  touchOptimized: boolean;
  sidebarOverlay: boolean;
  showMobileAccessoryBar: boolean;
  
  // USER-FACING TOGGLES FOR BACKGROUND PROCESSES (EXPERIMENTAL GATING)
  enableExperimentalSettings: boolean;
  enableLiveTokenEstimator: boolean;
  enableAutosave: boolean;
  enableLiveDomSync: boolean;
  enableLiveMarkdownSync?: boolean;
  autosaveIntervalMs?: number;

  autocompleteConfig: AutocompleteConfig;
  spellCheckConfig: SpellCheckConfig;
  codeLintConfig: CodeLintConfig;
  isFontCustomizedByUser?: boolean;
}

export type AppSettings = ViewSettings;

// ==========================================
// 3. Action & Sandbox Domain Shapes
// ==========================================

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

export type ActionSelectionBehavior = 'auto' | 'replace' | 'insert';

export type ActionTransformName =
  | 'summarize'
  | 'formatTable'
  | 'slugify'
  | 'extractTasks'
  | 'formatJSON'
  | 'deduplicateLines'
  | 'sortLinesAsc'
  | 'sortLinesDesc'
  | 'trimLines'
  | 'uppercase'
  | 'lowercase'
  | 'titlecase'
  | 'boldSelection'
  | 'italicSelection'
  | 'codeSelection'
  | 'bulletlistSelection'
  | 'checklistSelection'
  | 'insertToday'
  | 'insertUuid'
  | 'extractVariables'
  | 'extractRowsWithVars'
  | 'extractRowsWithoutVars'
  | 'selectionExtractVars'
  | 'tableToCsv'
  | 'wrapPromptContext'
  | 'bakeFormulas'
  | 'extractAndFillVariables'
  | string;

export type ActionOp =
  | { type: 'setText'; text: string }
  | { type: 'insertAtCursor'; text: string }
  | { type: 'wrapSelection'; before: string; after: string }
  | { type: 'replaceSelection'; text: string }
  | { type: 'transform'; transform: ActionTransformName; args?: Record<string, string | number | boolean> }
  | { type: 'formula'; expression: string }
  | { type: 'toast'; message: string; toastType?: 'info' | 'success' | 'warning' | 'error' }
  | { type: 'openTab'; title: string; content: string; language?: string }
  | { type: 'openVariableModal' }
  | { type: 'copyToClipboard'; text?: string };

export interface Action {
  id: string;
  name: string;
  description: string;
  type?: 'button' | 'command';
  codeType?: 'formula' | 'javascript' | 'declarative';
  code: string; // JavaScript or FORMULA: executed in sandbox / formula engine
  pipeline?: ActionOp[]; // Declarative operation pipeline — zero dynamic code generation
  category: ActionCategory;
  selectionBehavior?: ActionSelectionBehavior;
  enabled?: boolean;
  isPinned?: boolean;
  isDefault?: boolean;
  icon?: string;
  color?: string;
  shortcut?: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface PersistedActionUIState {
  collapsedCategories: string[];
  categoryOrder: string[];
  pinnedActionIds: string[];
}

export interface ActionExecutionContext {
  tabId: string;
  tabTitle: string;
  content: string;
  selectedText?: string;
  selectionRange?: { from: number; to: number };
  timestamp: number;
}

export interface SandboxAPI {
  getText: () => string;
  setText: (newText: string) => void;
  getContent: () => string;
  setContent: (newContent: string) => void;
  getSelection: () => string;
  replaceSelection: (replacement: string) => void;
  wrapSelection?: (prefix: string, suffix?: string) => void;
  insertText: (text: string) => void;
  insertAtCursor: (text: string) => void;
  getCursor?: () => { line: number; col: number };
  setCursor?: (line: number, col: number) => void;
  getTabTitle: () => string;
  setTabTitle: (title: string) => void;
  toast: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  notify: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  openTab: (title: string, content: string, language?: string) => void;
  createTab: (title: string, content: string, language?: string) => void;
  openVariableModal?: () => void;
  evaluateFormula?: (formula: string) => any;
  copyToClipboard: (text: string) => Promise<void>;
  copy?: (text: string) => Promise<void>;
  getClipboard?: () => Promise<string>;
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

// ==========================================
// 4. Template Domain Shapes
// ==========================================

export interface TemplateVariable {
  name: string;
  defaultValue?: string;
  description?: string;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'choice';
  choices?: string[];
}

export interface Template {
  id: string;
  name: string;
  description: string;
  content: string;
  category: string;
  variables: string[]; // extracted {{variable}}
  variableDefs?: TemplateVariable[];
  isHidden?: boolean;
  isPinned?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface PersistedTemplateUIState {
  collapsedCategories: string[];
  categoryOrder: string[];
  pinnedTemplateIds: string[];
  showHidden?: boolean;
}

// ==========================================
// 5. Token Estimator Domain Shapes
// ==========================================

export type TokenizerType = 'cl100k_base' | 'o200k_base' | 'claude' | 'gemini' | 'approx';

export interface AIModel {
  id: string;
  name: string;
  provider: 'OpenAI' | 'Anthropic' | 'Google' | 'DeepSeek' | 'Meta' | 'Custom';
  contextWindow: number;
  inputCostPerMillion: number; // in USD
  outputCostPerMillion: number; // in USD
  tokenizerType: TokenizerType;
  recommendedFor: string;
}

export interface TokenEstimate {
  tokenCount: number;
  cost: number;
  charCount: number;
  wordCount: number;
  lineCount: number;
  model: AIModel;
  status: 'live' | 'cached' | 'estimated' | 'error' | 'disabled';
  percentOfContext: number;
  breakdown?: {
    systemPromptTokens: number;
    userContentTokens: number;
    codeTokens: number;
    templateVariableTokens: number;
  };
}

export interface TokenEstimatorConfig {
  enabled: boolean;
  modelId: string;
  budgetThreshold: number;
  debounceMs: number;
  indexingScope: 'performance' | 'thorough';
}

// ==========================================
// 6. Notification & User Feedback Shapes
// ==========================================

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface NotificationItem {
  id: string;
  title: string;
  message?: string;
  type: NotificationType;
  timestamp: number;
  durationMs?: number;
  actionLabel?: string;
  onAction?: () => void;
  retryAction?: () => Promise<void> | void;
}

// ==========================================
// 7. Virtual File & Project Tree Shapes
// ==========================================

export interface FileItem {
  id: string;
  name: string;
  path?: string;
  content?: string;
  type: 'file' | 'directory' | 'folder';
  language?: SupportedLanguage;
  children?: FileItem[];
  size?: number;
  lastModified?: number;
  isPinned?: boolean;
}

export type VirtualFile = FileItem;

export interface VirtualFileTree {
  rootPath: string;
  files: FileItem[];
  expandedFolderIds: string[];
}

// ==========================================
// 8. Ribbon, Formatting & Formula Shapes
// ==========================================

export type RibbonItemType = 'tool' | 'action' | 'workflow' | 'template' | 'command' | 'formatting' | 'separator';

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
  category?: 'format' | 'heading' | 'block' | 'list' | 'insert' | 'tool' | 'custom' | (string & {});
  isBuiltIn?: boolean;
  shortcut?: string;
}

export interface RibbonItem {
  id: string;
  label: string;
  icon: string;
  type: RibbonItemType;
  targetId?: string; // action id, template id, workflow id, tool name, or formatting button id
  color?: string;
  shortcut?: string;
  tooltip?: string;
  enabled: boolean;
  order: number;
  showLabel?: boolean;
  prefix?: string;
  suffix?: string;
  formatType?: MarkdownFormatType;
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

export interface PinnedItem {
  id: string;
  name: string;
  type: 'file' | 'folder' | 'document' | 'template' | 'action';
  path?: string | null;
  language?: SupportedLanguage | string;
  content?: string;
}

export interface OpenedFileRecord {
  id: string;
  name: string;
  type?: 'file' | 'folder' | 'document' | 'template' | 'action';
  path?: string | null;
  language?: SupportedLanguage | string;
  content?: string;
  openedAt: number;
}

// ==========================================
// 9. Platform & Device Domain Shapes
// ==========================================

export type SupportedPlatformOS = 'windows' | 'macos' | 'linux' | 'android' | 'ios' | 'web';

export interface DeviceProfile {
  os: SupportedPlatformOS;
  isMobile: boolean;
  isTouch: boolean;
  hasHardwareKeyboard: boolean;
  showMobileAccessoryBar: boolean;
}

