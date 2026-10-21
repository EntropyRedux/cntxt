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

export type TabType = 'document' | 'template' | 'scratchpad' | 'terminal';

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
  channelId?: string;
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
  isActiveThread?: boolean;
  isTruncatedView?: boolean;
  rawFullContent?: string;
  chunkSession?: ChunkSessionMetadata;
  isLargeDoc?: boolean;
  totalOriginalBytes?: number;
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
  syntaxHighlighting?: 'auto' | 'automatic' | 'markdown' | 'markdown-formatted' | 'headers' | 'headers-only' | 'none' | 'off';
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
  activeSidebarTab: 'explorer' | 'outline' | 'templates' | 'actions' | 'tokens' | 'settings' | 'app-builder' | 'panel-app';
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
  enableTerminalBus?: boolean;
  autosaveIntervalMs?: number;
  enableRestGateway?: boolean;
  restGatewayPort?: number;
  deliverableSaveLocation?: 'workspace' | 'custom-folder';
  deliverableWorkspaceSubfolder?: string;
  deliverableCustomFolderPath?: string;

  autocompleteConfig: AutocompleteConfig;
  spellCheckConfig: SpellCheckConfig;
  codeLintConfig: CodeLintConfig;
  autoAdaptFontToTheme?: boolean;
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

// ==========================================
// 10. User Profile & Cloud Auth Domain Shapes
// ==========================================

export interface PersonalGitHubLibraryConfig {
  connected: boolean;
  repoOwner: string;
  repoName: string;
  branch: string;
  isPrivate: boolean;
  lastSyncCommitSha?: string;
  lastSyncTimestamp?: number;
  customToken?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  provider: 'google' | 'github' | 'offline';
  lastSynced: string;
  libraryItemsCount: number;
  syncedDevicesCount: number;
  role?: string;
  githubLibrary?: PersonalGitHubLibraryConfig;
}

export type PrototypeAuthState = 'guest' | 'popover' | 'signedIn';

// ==========================================
// 11. Community & User Skill Library Domain Shapes
// ==========================================

export interface LibraryField {
  id: string;
  label: string;
  placeholder: string;
  defaultValue?: string;
  multiline?: boolean;
}

export type ItemSource = 'user-authored' | 'community-fork' | 'local-template' | 'local-action';

export interface UserLibraryItem {
  id: string;
  name: string;
  type: 'prompt' | 'skill';
  category: 'Architecture' | 'Prompt Engineering' | 'Code Review' | 'Technical Specs' | 'Testing' | 'Custom' | (string & {});
  description: string;
  author: string;
  originalAuthor?: string;
  authorBadge?: string;
  source: ItemSource;
  sourceTitle?: string;
  targetAIs: string[];
  fields: LibraryField[];
  template: string;
  isFavorite?: boolean;
  isForked?: boolean;
  forkedFrom?: string;
  isPublishedToCommunity?: boolean;
  communityId?: string;
  collectionId?: string;
  collectionName?: string;
  createdAt: number;
  updatedAt: number;
}

export interface CommunityLibraryItem {
  id: string;
  name: string;
  type: 'prompt' | 'skill';
  category: 'Architecture' | 'Prompt Engineering' | 'Code Review' | 'Technical Specs' | 'Testing' | 'Reasoning' | (string & {});
  description: string;
  author: string;
  authorBadge: 'Staff Pick' | 'Verified Architect' | 'Top Promptsmith' | 'Community Contributor' | (string & {});
  downloads: number;
  rating: number;
  targetAIs: string[];
  fields: LibraryField[];
  template: string;
  tags: string[];
  isUserContributed?: boolean;
  collectionId?: string;
  collectionName?: string;
}

export interface LibraryCollection {
  id: string;
  name: string;
  description: string;
  category: 'Architecture' | 'Prompt Engineering' | 'Code Review' | 'Technical Specs' | 'Testing' | 'Reasoning' | 'Custom' | (string & {});
  author: string;
  originalAuthor?: string;
  authorBadge?: string;
  source: ItemSource;
  sourceTitle?: string;
  tags: string[];
  itemIds: string[];
  downloads?: number;
  rating?: number;
  isFavorite?: boolean;
  isPublishedToCommunity?: boolean;
  communityId?: string;
  createdAt: number;
  updatedAt: number;
}

export type LibraryViewTab = 'my-library' | 'community';
export type MyLibraryFilter = 'all' | 'mine' | 'community' | 'imported';

// ==========================================
// 10. Panel Apps Domain Shapes
// ==========================================

export type PanelAppRuntime = 'html';
export type PanelAppNetworkMode = 'offline' | 'cdn';
export type PanelAppCreatedFrom = 'file' | 'tab' | 'prompt';
export type BlueprintArchetype = 'build' | 'brainstorm' | 'adapt';

export interface PanelAppManifest {
  schemaVersion: 1;
  id: string; // origin-safe: lowercase alnum (12 to 32 chars)
  name: string; // 1 to 40 chars
  icon: string; // Lucide icon key from iconCatalog
  description: string;
  runtime: PanelAppRuntime;
  network: PanelAppNetworkMode;
  panelWidth: number; // 280 to 1200 px
  createdFrom: PanelAppCreatedFrom;
}

export type PanelAppPresentationMode = 'docked' | 'floating';

export interface PanelAppFloatingPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PanelAppRecord {
  id: string;
  path: string; // location of the .cntxt file
  name: string;
  icon: string;
  network?: PanelAppNetworkMode;
  panelWidth?: number;
  keepAlive?: boolean;
  presentation?: PanelAppPresentationMode;
  floatingPosition?: PanelAppFloatingPosition;
}

// ==========================================
// 11. Host Command Bus & RPC Domain Shapes (FG-16)
// ==========================================

export type CntxtRpcDomain = 'editor' | 'tabs' | 'workspace' | 'templates' | 'actions' | 'notify' | 'terminal' | 'blocks';

export type CntxtRpcErrorCode =
  | 'NOT_FOUND'
  | 'PERMISSION_DENIED'
  | 'VALIDATION_ERROR'
  | 'EXECUTION_ERROR'
  | 'TIMEOUT'
  | 'PATH_TRAVERSAL';

export interface CntxtRpcError {
  code: CntxtRpcErrorCode;
  message: string;
}

export interface CntxtRpcRequest<T = unknown> {
  id: string;
  domain: CntxtRpcDomain;
  action: string;
  appId: string;
  payload?: T;
}

export interface CntxtRpcResponse<T = unknown> {
  id: string;
  success: boolean;
  data?: T;
  error?: CntxtRpcError;
}

// Editor Domain Payloads & Results
export interface EditorInsertPayload {
  text: string;
  mode?: 'cursor' | 'replace' | 'append';
}

export interface EditorActiveDocumentResult {
  title: string;
  content: string;
  language: string;
  filePath?: string;
  isDirty: boolean;
}

// Tab Domain Payloads & Results
export interface TabCreatePayload {
  title: string;
  content: string;
  language?: string;
  filePath?: string;
}

export interface TabSummaryResult {
  id: string;
  title: string;
  filePath?: string;
  isDirty: boolean;
  language: string;
}

// Workspace Domain Payloads & Results
export interface WorkspaceInfoResult {
  rootPath: string;
  projectName: string;
  fileCount: number;
}

export interface WorkspaceListFilesPayload {
  pattern?: string;
}

export interface WorkspaceReadFilePayload {
  relativePath: string;
}

export interface WorkspaceWriteFilePayload {
  relativePath: string;
  content: string;
}

// Template Domain Payloads
export interface TemplateApplyPayload {
  templateId: string;
  variables: Record<string, string>;
}

// Action Domain Payloads
export interface ActionExecutePayload {
  actionId: string;
  input?: string;
}

// Notification Domain Payloads
export interface NotifyPayload {
  type: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  message: string;
  duration?: number;
}

// ==========================================
// 12. Terminal Bus & Multi-Agent Domain Shapes (FG-17)
// ==========================================

export type TerminalChannelStatus = 'idle' | 'running' | 'exited' | 'error';
export type TerminalStreamType = 'stdout' | 'stderr' | 'system';

export interface TerminalChannelConfig {
  id: string;
  name: string;
  command?: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
}

export interface TerminalChunkEntry {
  t: number;
  stream: TerminalStreamType;
  data: string;
}

export interface TerminalSessionManifest {
  name: string;
  type: 'terminal-bus';
  version: string;
  channels: TerminalChannelConfig[];
}

export interface TerminalSpawnPayload {
  id: string;
  name: string;
  command: string;
  args?: string[];
  cwd?: string;
}

export interface TerminalSendInputPayload {
  channelId: string;
  data: string;
}

export interface TerminalKillPayload {
  channelId: string;
}

export interface TerminalResizePayload {
  channelId: string;
  cols: number;
  rows: number;
}

export interface TerminalChannelSummaryResult {
  id: string;
  name: string;
  status: TerminalChannelStatus;
  exitCode?: number | null;
  cwd?: string;
}

// ==========================================
// 14. Large Document Virtualization & Chunk Coordinator (FG-19)
// ==========================================

export interface ChunkSectionRange {
  id: string;
  headingText: string;
  level: number;
  originalStartLine: number; // 0-indexed line in original full file
  originalEndLine: number;   // 0-indexed line where next section starts
  originalContent: string;   // exact raw text of this section when loaded
  contentHash: string;       // 32-bit FNV-1a hash of initial content for collision recovery
}

export interface ChunkSessionMetadata {
  isChunked: boolean;
  originalFullContent: string;
  originalChecksum: string;   // 32-bit FNV-1a checksum of original full file
  sections: ChunkSectionRange[];
  headerNoticeLines: number;
  totalDocumentHeadings?: number;
}

export interface ChunkSpliceResult {
  success: boolean;
  updatedFullContent: string;
  updatedSession?: ChunkSessionMetadata;
  fallbackFilePath?: string;
  error?: string;
}

// ==========================================
// 15. Host Command Bus Extended & REST Gateway (FG-20)
// ==========================================

export interface EditorSelectionRange {
  anchor: number;
  head: number;
}

export interface EditorSetSelectionsPayload {
  selections: EditorSelectionRange[];
  mainIndex?: number;
}

export interface EditorFoldPayload {
  line?: number;
  all?: boolean;
  unfold?: boolean;
}

export interface EditorReplaceRangePayload {
  from: number;
  to: number;
  text: string;
}

export interface EditorDiagnosticItem {
  from: number;
  to: number;
  severity: 'error' | 'warning' | 'info' | 'hint';
  message: string;
  source?: string;
}

export interface EditorSetDiagnosticsPayload {
  diagnostics: EditorDiagnosticItem[];
}

export interface RestGatewayConfig {
  enabled: boolean;
  port: number;
  authToken: string;
}


// ==========================================
// 16. CNTXT Block Parser, Rich Containers & Block Orchestration RPC (FG-22)
// ==========================================

export type CntxtLockValue = 'agent' | 'user';

export interface CntxtBlockParams {
  id?: string;
  tags?: string[];
  locked?: CntxtLockValue;
  status?: string;
  link?: string[];
  source?: string;
  ts?: string;
  label?: string;
  rendererParams?: Record<string, string>;
}

export interface CntxtParsedBlock {
  type: string;
  fence: string;
  params: CntxtBlockParams;
  content: string;
  position: {
    start: number;
    end: number;
    startLine: number;
    endLine: number;
  };
  isCNTXT: boolean;
  isRichContainer: boolean;
}

export interface CntxtRawSegment {
  type: 'markdown';
  content: string;
  position: {
    start: number;
    end: number;
  };
}

export type CntxtDocumentNode = CntxtParsedBlock | CntxtRawSegment;

export interface CntxtRelationshipGraph {
  byId: Record<string, CntxtParsedBlock>;
  byTag: Record<string, CntxtParsedBlock[]>;
  links: Record<string, string[]>;
  linkedFrom: Record<string, string[]>;
}

export interface CntxtParsedDocument {
  nodes: CntxtDocumentNode[];
  blocks: CntxtParsedBlock[];
  relationshipGraph: CntxtRelationshipGraph;
  raw: string;
  warnings: string[];
}

export interface BlocksListPayload {
  tabId?: string;
  tag?: string;
  status?: string;
  onlyCntxt?: boolean;
}

export interface BlocksGetPayload {
  id: string;
  tabId?: string;
}

export interface BlocksUpsertPayload {
  id: string;
  type?: string;
  content: string;
  params?: Partial<CntxtBlockParams>;
  afterBlockId?: string;
  tabId?: string;
  actor?: 'agent' | 'user';
}

export interface BlocksUpdateParamsPayload {
  id: string;
  params: Partial<CntxtBlockParams>;
  tabId?: string;
  actor?: 'agent' | 'user';
}

export interface BlocksRemovePayload {
  id: string;
  tabId?: string;
  actor?: 'agent' | 'user';
}
