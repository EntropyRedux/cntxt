/**
 * Boundary Schemas
 * 
 * Strict runtime validation using Zod for IPC boundaries, persistent storage,
 * and serialized import/export formats.
 */

import { z } from 'zod';
import { 
  SupportedLanguage, 
  Tab, 
  LibraryField, 
  ItemSource, 
  UserLibraryItem, 
  CommunityLibraryItem, 
  LibraryCollection,
  PanelAppManifest,
  PanelAppRecord,
  CntxtRpcRequest,
  EditorInsertPayload,
  TabCreatePayload,
  WorkspaceReadFilePayload,
  WorkspaceWriteFilePayload,
  TemplateApplyPayload,
  ActionExecutePayload,
  NotifyPayload,
  TerminalSpawnPayload,
  TerminalSendInputPayload,
  TerminalKillPayload,
  TerminalResizePayload,
  ChunkSectionRange,
  ChunkSessionMetadata,
  ChunkSpliceResult,
  EditorSelectionRange,
  EditorSetSelectionsPayload,
  EditorFoldPayload,
  EditorReplaceRangePayload,
  EditorDiagnosticItem,
  EditorSetDiagnosticsPayload,
  RestGatewayConfig, CntxtBlockParams, BlocksListPayload, BlocksGetPayload, BlocksUpsertPayload, BlocksUpdateParamsPayload, BlocksRemovePayload,
  DirectivesGetPayload,
  CntxtBlockArchetype,
  CntxtBlockPreset,
  ActiveBlockCursorState,
  CntxtParsedBlock,
  RibbonItem,
  RibbonItemType,
  MarkdownFormatType,
  ViewSettings,
  ThemeName,
  Action,
  ActionOp,
  ActionSelectionBehavior,
  Template,
  TemplateVariable,
  AutocompleteConfig,
  SpellCheckConfig,
  CodeLintConfig
} from '../../contracts/data_shapes';

export const SupportedLanguageSchema: z.ZodType<SupportedLanguage> = z.enum([
  'markdown',
  'javascript',
  'typescript',
  'python',
  'json',
  'yaml',
  'html',
  'css',
  'text'
]);

export const TabTypeSchema = z.enum(['document', 'template', 'scratchpad', 'terminal']);

export const TabSchema: z.ZodType<Tab> = z.object({
  id: z.string().min(1),
  title: z.string(),
  content: z.string(),
  filePath: z.string().nullable().optional().transform(v => v ?? null),
  folderPath: z.string().nullable().optional().transform(v => v ?? null),
  isDirty: z.boolean(),
  language: SupportedLanguageSchema,
  tabType: TabTypeSchema.optional(),
  lastModifiedTime: z.number().optional(),
  pinnedTabId: z.string().optional(),
  cursorLine: z.number().optional(),
  cursorCol: z.number().optional(),
  cursorOffset: z.number().optional(),
  selectionFrom: z.number().optional(),
  selectionTo: z.number().optional(),
  selectionStartLine: z.number().nullable().optional(),
  selectionEndLine: z.number().nullable().optional(),
  isPinned: z.boolean().optional(),
  isActiveThread: z.boolean().optional()
}) as unknown as z.ZodType<Tab>;

export const TabCacheEntrySchema = z.object({
  version: z.number().optional().default(1),
  tabs: z.array(TabSchema),
  activeTabId: z.string().min(1),
  checksum: z.string().min(1),
  ts: z.number()
});

export const ActionCategorySchema = z.enum(['TEXT', 'FORMAT', 'CODE', 'TEMPLATES', 'EXTERNAL', 'CUSTOM']);

export const ActionOpSchema: z.ZodType<ActionOp> = z.discriminatedUnion('type', [
  z.object({ type: z.literal('setText'), text: z.string() }),
  z.object({ type: z.literal('insertAtCursor'), text: z.string() }),
  z.object({ type: z.literal('wrapSelection'), before: z.string(), after: z.string() }),
  z.object({ type: z.literal('replaceSelection'), text: z.string() }),
  z.object({
    type: z.literal('transform'),
    transform: z.string(),
    args: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional() }),
  z.object({ type: z.literal('formula'), expression: z.string() }),
  z.object({
    type: z.literal('toast'),
    message: z.string(),
    toastType: z.enum(['info', 'success', 'warning', 'error']).optional()
  }),
  z.object({
    type: z.literal('openTab'),
    title: z.string(),
    content: z.string(),
    language: z.string().optional()
  }),
  z.object({ type: z.literal('openVariableModal') }),
  z.object({ type: z.literal('copyToClipboard'), text: z.string().optional() })
]);

export const ActionSelectionBehaviorSchema: z.ZodType<ActionSelectionBehavior> = z.enum(['auto', 'replace', 'insert']);

export const ActionSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(['button', 'command']).optional(),
  codeType: z.enum(['formula', 'javascript', 'declarative']).optional(),
  code: z.string(),
  pipeline: z.array(ActionOpSchema).optional(),
  category: z.string().optional(),
  selectionBehavior: ActionSelectionBehaviorSchema.optional(),
  enabled: z.boolean().optional(),
  isPinned: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  shortcut: z.string().optional(),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
  buttonText: z.string().optional(),
  buttonIcon: z.string().optional(),
  buttonColor: z.string().optional(),
  buttonPosition: z.string().optional()
}).passthrough();

export const TemplateVariableSchema: z.ZodType<TemplateVariable> = z.object({
  name: z.string().min(1),
  defaultValue: z.string().optional(),
  description: z.string().optional(),
  required: z.boolean().optional(),
  type: z.enum(['string', 'number', 'boolean', 'choice']).optional(),
  choices: z.array(z.string()).optional()
}).passthrough();

export const TemplateSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  content: z.string(),
  category: z.string().optional(),
  variables: z.array(z.string()).optional(),
  variableDefs: z.array(TemplateVariableSchema).optional(),
  isHidden: z.boolean().optional(),
  isPinned: z.boolean().optional(),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional()
}).passthrough();

export interface VirtualFileInput {
  id?: string;
  name: string;
  type: 'file' | 'folder';
  content?: string;
  path?: string | null;
  language?: string;
  children?: VirtualFileInput[];
}

export const VirtualFileSchema: z.ZodType<VirtualFileInput> = z.lazy(() =>
  z.object({
    id: z.string().optional(),
    name: z.string().min(1),
    type: z.enum(['file', 'folder']),
    content: z.string().optional(),
    path: z.string().nullable().optional(),
    language: z.string().optional(),
    children: z.array(VirtualFileSchema).optional()
  })
);

export const WorkspaceBackupSchema = z.object({
  version: z.string().optional(),
  exportedAt: z.string().optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  settings: z.unknown().optional()
}).refine(val => (val.data !== undefined && Object.keys(val.data).length > 0) || val.settings !== undefined, {
  message: 'Workspace backup must contain data or settings dictionary'
});

export function validateTab(data: unknown) {
  return TabSchema.safeParse(data);
}

export function validateTabCache(data: unknown) {
  return TabCacheEntrySchema.safeParse(data);
}

export function validateAction(data: unknown) {
  return ActionSchema.safeParse(data);
}

export function validateTemplate(data: unknown) {
  return TemplateSchema.safeParse(data);
}

export function validateWorkspaceBackup(data: unknown) {
  return WorkspaceBackupSchema.safeParse(data);
}

export function validateVirtualFile(data: unknown) {
  return VirtualFileSchema.safeParse(data);
}

// ==========================================
// Community & User Skill Library Boundary Schemas
// ==========================================

export const LibraryFieldSchema: z.ZodType<LibraryField> = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  placeholder: z.string().default(''),
  defaultValue: z.string().optional(),
  multiline: z.boolean().optional()
});

export const ItemSourceSchema: z.ZodType<ItemSource> = z.enum([
  'user-authored',
  'community-fork',
  'local-template',
  'local-action'
]);

export const UserLibraryItemSchema: z.ZodType<UserLibraryItem> = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['prompt', 'skill']),
  category: z.enum(['Architecture', 'Prompt Engineering', 'Code Review', 'Technical Specs', 'Testing', 'Custom']).or(z.string()),
  description: z.string().default(''),
  author: z.string().default('You (Personal)'),
  originalAuthor: z.string().optional(),
  authorBadge: z.string().optional(),
  source: ItemSourceSchema,
  sourceTitle: z.string().optional(),
  targetAIs: z.array(z.string()).default([]),
  fields: z.array(LibraryFieldSchema).default([]),
  template: z.string().default(''),
  isFavorite: z.boolean().optional(),
  isForked: z.boolean().optional(),
  forkedFrom: z.string().optional(),
  isPublishedToCommunity: z.boolean().optional(),
  communityId: z.string().optional(),
  collectionId: z.string().optional(),
  collectionName: z.string().optional(),
  createdAt: z.number().default(() => Date.now()),
  updatedAt: z.number().default(() => Date.now())
}) as unknown as z.ZodType<UserLibraryItem>;

export const CommunityLibraryItemSchema: z.ZodType<CommunityLibraryItem> = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['prompt', 'skill']),
  category: z.enum(['Architecture', 'Prompt Engineering', 'Code Review', 'Technical Specs', 'Testing', 'Reasoning']).or(z.string()),
  description: z.string().default(''),
  author: z.string().default('@community'),
  authorBadge: z.enum(['Staff Pick', 'Verified Architect', 'Top Promptsmith', 'Community Contributor']).or(z.string()).default('Community Contributor'),
  downloads: z.number().default(0),
  rating: z.number().default(5.0),
  targetAIs: z.array(z.string()).default([]),
  fields: z.array(LibraryFieldSchema).default([]),
  template: z.string().default(''),
  tags: z.array(z.string()).default([]),
  isUserContributed: z.boolean().optional(),
  collectionId: z.string().optional(),
  collectionName: z.string().optional()
}) as unknown as z.ZodType<CommunityLibraryItem>;

export const LibraryCollectionSchema: z.ZodType<LibraryCollection> = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().default(''),
  category: z.enum(['Architecture', 'Prompt Engineering', 'Code Review', 'Technical Specs', 'Testing', 'Reasoning', 'Custom']).or(z.string()),
  author: z.string().default('You (Personal)'),
  originalAuthor: z.string().optional(),
  authorBadge: z.string().optional(),
  source: ItemSourceSchema,
  sourceTitle: z.string().optional(),
  tags: z.array(z.string()).default([]),
  itemIds: z.array(z.string()).default([]),
  downloads: z.number().optional(),
  rating: z.number().optional(),
  isFavorite: z.boolean().optional(),
  isPublishedToCommunity: z.boolean().optional(),
  communityId: z.string().optional(),
  createdAt: z.number().default(() => Date.now()),
  updatedAt: z.number().default(() => Date.now())
}) as unknown as z.ZodType<LibraryCollection>;

/**
 * GitHub index.json schema for EntropyRedux/cntxt-library
 */
export const GitHubCatalogItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().default(''),
  type: z.enum(['prompt', 'skill', 'template', 'app']).or(z.string()),
  tags: z.array(z.string()).default([]),
  format: z.string().default('md'),
  path: z.string().min(1),
  author: z.string().default('community'),
  version: z.string().optional(),
  verified: z.boolean().optional(),
  targetAIs: z.array(z.string()).optional()
});

export const GitHubCatalogSchema = z.array(GitHubCatalogItemSchema);
export type GitHubCatalogItem = z.infer<typeof GitHubCatalogItemSchema>;

export function validateUserLibraryItems(data: unknown) {
  return z.array(UserLibraryItemSchema).safeParse(data);
}

export function validateCommunityLibraryItems(data: unknown) {
  return z.array(CommunityLibraryItemSchema).safeParse(data);
}

export function validateLibraryCollections(data: unknown) {
  return z.array(LibraryCollectionSchema).safeParse(data);
}

export function validateGitHubCatalog(data: unknown) {
  return GitHubCatalogSchema.safeParse(data);
}

// ==========================================
// Panel Apps Boundary Schemas
// ==========================================

export const PanelAppManifestSchema: z.ZodType<PanelAppManifest> = z.object({
  schemaVersion: z.literal(1),
  id: z.string().regex(/^[a-z][a-z0-9]{11,31}$/),
  name: z.string().trim().min(1).max(40),
  icon: z.string().min(1).max(64),
  description: z.string().max(200).default(''),
  runtime: z.literal('html'),
  network: z.enum(['offline', 'cdn']).default('offline'),
  panelWidth: z.number().int().min(280).max(1200).default(480),
  createdFrom: z.enum(['file', 'tab', 'prompt']),
});

/**
 * Deterministic migration helper for PanelAppManifest schema evolution (Pillar 1).
 * Migrates legacy/evolving manifest objects to current canonical schema.
 */
export function migratePanelAppManifest(raw: unknown): PanelAppManifest {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Invalid manifest: expected an object');
  }
  const obj = { ...(raw as Record<string, unknown>) };
  if (!obj.schemaVersion) {
    obj.schemaVersion = 1;
  }
  if (!obj.network) {
    obj.network = 'offline';
  }
  if (!obj.runtime) {
    obj.runtime = 'html';
  }
  if (typeof obj.panelWidth !== 'number') {
    obj.panelWidth = 480;
  }
  if (typeof obj.description !== 'string') {
    obj.description = '';
  }
  return PanelAppManifestSchema.parse(obj);
}

export const PanelAppPresentationModeSchema = z.enum(['docked', 'floating']);

export const PanelAppFloatingPositionSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
});

export const PanelAppRecordSchema: z.ZodType<PanelAppRecord> = z.object({
  id: z.string().regex(/^[a-z][a-z0-9]{11,31}$/),
  path: z.string().min(1),
  name: z.string().min(1),
  icon: z.string().min(1),
  network: z.enum(['offline', 'cdn']).optional(),
  panelWidth: z.number().optional(),
  keepAlive: z.boolean().optional(),
  presentation: z.preprocess((val) => (val === 'fab' ? 'docked' : val), PanelAppPresentationModeSchema).optional(),
  floatingPosition: PanelAppFloatingPositionSchema.optional(),
});

export function validatePanelAppManifest(data: unknown) {
  return PanelAppManifestSchema.safeParse(data);
}

export function validatePanelAppRecords(data: unknown) {
  return z.array(PanelAppRecordSchema).safeParse(data);
}

// ==========================================
// Host Command Bus & RPC Boundary Schemas (FG-16)
// ==========================================

export const CntxtRpcDomainSchema = z.enum([
  'editor',
  'tabs',
  'workspace',
  'templates',
  'actions',
  'notify',
  'terminal', 'blocks', 'directives',
]);

export const CntxtRpcRequestSchema: z.ZodType<CntxtRpcRequest> = z.object({
  id: z.string().min(1),
  domain: CntxtRpcDomainSchema,
  action: z.string().min(1),
  appId: z.string().min(1),
  payload: z.unknown().optional(),
});

export const EditorInsertPayloadSchema: z.ZodType<EditorInsertPayload> = z.object({
  text: z.string(),
  mode: z.enum(['cursor', 'replace', 'append']).optional(),
});

export const TabCreatePayloadSchema: z.ZodType<TabCreatePayload> = z.object({
  title: z.string().trim().min(1).max(100),
  content: z.string(),
  language: z.string().optional(),
  filePath: z.string().optional(),
});

export const WorkspaceListFilesPayloadSchema = z.object({
  pattern: z.string().optional(),
});

export function pathIsAbsoluteOrSensitive(p: string): boolean {
  const normalized = p.replace(/\\/g, '/');
  // Check absolute Windows drive (e.g. C:) or Unix root (/)
  if (/^[a-zA-Z]:/.test(normalized) || normalized.startsWith('/')) return true;
  // Check directory traversal or sensitive paths
  const segments = normalized.split('/');
  for (const seg of segments) {
    if (seg === '..' || seg === '.git' || seg === '.ssh' || seg === '.env' || seg.startsWith('.env.')) {
      return true;
    }
  }
  return false;
}

// Reject directory traversal (..) and absolute/sensitive paths
export const SafeRelativePathSchema = z
  .string()
  .trim()
  .min(1)
  .refine(
    (p) => !p.includes('..') && !pathIsAbsoluteOrSensitive(p),
    { message: 'Path traversal or sensitive path access rejected' }
  );

export const WorkspaceReadFilePayloadSchema: z.ZodType<WorkspaceReadFilePayload> = z.object({
  relativePath: SafeRelativePathSchema,
});

export const WorkspaceWriteFilePayloadSchema: z.ZodType<WorkspaceWriteFilePayload> = z.object({
  relativePath: SafeRelativePathSchema,
  content: z.string().max(2 * 1024 * 1024, 'Payload exceeds 2MB maximum limit'),
});

export const TemplateApplyPayloadSchema: z.ZodType<TemplateApplyPayload> = z.object({
  templateId: z.string().min(1),
  variables: z.record(z.string(), z.string()),
});

export const ActionExecutePayloadSchema: z.ZodType<ActionExecutePayload> = z.object({
  actionId: z.string().min(1),
  input: z.string().optional(),
});

export const NotifyPayloadSchema: z.ZodType<NotifyPayload> = z.object({
  type: z.enum(['info', 'success', 'warning', 'error']),
  title: z.string().max(100).optional(),
  message: z.string().min(1).max(500),
  duration: z.number().int().positive().optional(),
});

export function validateRpcRequest(data: unknown) {
  return CntxtRpcRequestSchema.safeParse(data);
}

export function validateEditorInsert(data: unknown) {
  return EditorInsertPayloadSchema.safeParse(data);
}

export function validateTabCreate(data: unknown) {
  return TabCreatePayloadSchema.safeParse(data);
}

export function validateWorkspaceReadFile(data: unknown) {
  return WorkspaceReadFilePayloadSchema.safeParse(data);
}

export function validateWorkspaceWriteFile(data: unknown) {
  return WorkspaceWriteFilePayloadSchema.safeParse(data);
}

export function validateTemplateApply(data: unknown) {
  return TemplateApplyPayloadSchema.safeParse(data);
}

export function validateActionExecute(data: unknown) {
  return ActionExecutePayloadSchema.safeParse(data);
}

export function validateNotify(data: unknown) {
  return NotifyPayloadSchema.safeParse(data);
}

// ==========================================
// Terminal Bus Validation (FG-17)
// ==========================================

export const TerminalSpawnPayloadSchema: z.ZodType<TerminalSpawnPayload> = z.object({
  id: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(64),
  command: z.string().trim().min(1),
  args: z.array(z.string()).optional(),
  cwd: SafeRelativePathSchema.optional(),
});

export const TerminalSendInputPayloadSchema: z.ZodType<TerminalSendInputPayload> = z.object({
  channelId: z.string().trim().min(1),
  data: z.string(),
});

export const TerminalKillPayloadSchema: z.ZodType<TerminalKillPayload> = z.object({
  channelId: z.string().trim().min(1),
});

export const TerminalResizePayloadSchema: z.ZodType<TerminalResizePayload> = z.object({
  channelId: z.string().trim().min(1),
  cols: z.number().int().min(10).max(500),
  rows: z.number().int().min(2).max(200),
});

export function validateTerminalSpawn(data: unknown) {
  return TerminalSpawnPayloadSchema.safeParse(data);
}

export function validateTerminalSendInput(data: unknown) {
  return TerminalSendInputPayloadSchema.safeParse(data);
}

export function validateTerminalKill(data: unknown) {
  return TerminalKillPayloadSchema.safeParse(data);
}

export function validateTerminalResize(data: unknown) {
  return TerminalResizePayloadSchema.safeParse(data);
}

// ==========================================
// 14. Large Document Virtualization & Chunk Coordinator (FG-19)
// ==========================================

export const ChunkSectionRangeSchema: z.ZodType<ChunkSectionRange> = z.object({
  id: z.string().min(1),
  headingText: z.string(),
  level: z.number().int().min(1).max(6),
  originalStartLine: z.number().int().nonnegative(),
  originalEndLine: z.number().int().nonnegative(),
  originalContent: z.string(),
  contentHash: z.string(),
});

export const ChunkSessionMetadataSchema: z.ZodType<ChunkSessionMetadata> = z.object({
  isChunked: z.boolean(),
  originalFullContent: z.string(),
  originalChecksum: z.string(),
  sections: z.array(ChunkSectionRangeSchema),
  headerNoticeLines: z.number().int().nonnegative(),
});

export const ChunkSplicePayloadSchema = z.object({
  originalFullContent: z.string(),
  editedChunkContent: z.string(),
  session: ChunkSessionMetadataSchema,
});

export function validateChunkSectionRange(data: unknown) {
  return ChunkSectionRangeSchema.safeParse(data);
}

export function validateChunkSessionMetadata(data: unknown) {
  return ChunkSessionMetadataSchema.safeParse(data);
}

export function validateChunkSplicePayload(data: unknown) {
  return ChunkSplicePayloadSchema.safeParse(data);
}

// ==========================================
// 15. Host Command Bus Extended & REST Gateway (FG-20)
// ==========================================

export const EditorSelectionRangeSchema: z.ZodType<EditorSelectionRange> = z.object({
  anchor: z.number().int().nonnegative(),
  head: z.number().int().nonnegative(),
});

export const EditorSetSelectionsPayloadSchema: z.ZodType<EditorSetSelectionsPayload> = z.object({
  selections: z.array(EditorSelectionRangeSchema).min(1),
  mainIndex: z.number().int().nonnegative().optional(),
});

export const EditorFoldPayloadSchema: z.ZodType<EditorFoldPayload> = z.object({
  line: z.number().int().nonnegative().optional(),
  all: z.boolean().optional(),
  unfold: z.boolean().optional(),
});

export const EditorDiagnosticItemSchema: z.ZodType<EditorDiagnosticItem> = z.object({
  from: z.number().int().nonnegative(),
  to: z.number().int().nonnegative(),
  severity: z.enum(['error', 'warning', 'info', 'hint']),
  message: z.string().min(1),
  source: z.string().optional(),
}).refine((d) => d.to >= d.from, {
  message: 'Diagnostic `to` must be greater than or equal to `from`',
}) as unknown as z.ZodType<EditorDiagnosticItem>;

export const EditorSetDiagnosticsPayloadSchema: z.ZodType<EditorSetDiagnosticsPayload> = z.object({
  diagnostics: z.array(EditorDiagnosticItemSchema),
});

export const EditorReplaceRangePayloadSchema: z.ZodType<EditorReplaceRangePayload> = z.object({
  from: z.number().int().nonnegative(),
  to: z.number().int().nonnegative(),
  text: z.string(),
}).refine((d) => d.to >= d.from, {
  message: 'replaceRange `to` position must be >= `from`',
}) as unknown as z.ZodType<EditorReplaceRangePayload>;

export function validateEditorReplaceRange(data: unknown) {
  return EditorReplaceRangePayloadSchema.safeParse(data);
}

export const RestGatewayConfigSchema: z.ZodType<RestGatewayConfig> = z.object({
  enabled: z.boolean(),
  port: z.number().int().min(1024).max(65535),
  authToken: z.string().min(1),
  allowLan: z.boolean().optional(),
  lanIp: z.string().nullable().optional(),
});

export function validateEditorSetSelections(data: unknown) {
  return EditorSetSelectionsPayloadSchema.safeParse(data);
}

export function validateEditorFold(data: unknown) {
  return EditorFoldPayloadSchema.safeParse(data);
}

export function validateEditorSetDiagnostics(data: unknown) {
  return EditorSetDiagnosticsPayloadSchema.safeParse(data);
}

export function validateRestGatewayConfig(data: unknown) {
  return RestGatewayConfigSchema.safeParse(data);
}


// ==========================================
// 16. CNTXT Block Parser & Block Orchestration RPC Schemas (FG-22)
// ==========================================

export const CntxtBlockParamsPartialSchema: z.ZodType<Partial<CntxtBlockParams>> = z.object({
  id: z.string().trim().min(1).optional(),
  tags: z.array(z.string()).optional(),
  locked: z.enum(['agent', 'user']).optional(),
  status: z.string().optional(),
  link: z.array(z.string()).optional(),
  source: z.string().optional(),
  ts: z.string().optional(),
  label: z.string().optional(),
  rendererParams: z.record(z.string(), z.string()).optional(),
});

export const BlocksListPayloadSchema: z.ZodType<BlocksListPayload> = z.object({
  tabId: z.string().optional(),
  tag: z.string().optional(),
  status: z.string().optional(),
  onlyCntxt: z.boolean().optional(),
});

export const BlocksGetPayloadSchema: z.ZodType<BlocksGetPayload> = z.object({
  id: z.string().trim().min(1),
  tabId: z.string().optional(),
});

export const BlocksUpsertPayloadSchema: z.ZodType<BlocksUpsertPayload> = z.object({
  id: z.string().trim().min(1),
  type: z.string().optional(),
  content: z.string(),
  params: CntxtBlockParamsPartialSchema.optional(),
  afterBlockId: z.string().optional(),
  tabId: z.string().optional(),
  actor: z.enum(['agent', 'user']).optional(),
});

export const BlocksUpdateParamsPayloadSchema: z.ZodType<BlocksUpdateParamsPayload> = z.object({
  id: z.string().trim().min(1),
  params: CntxtBlockParamsPartialSchema,
  tabId: z.string().optional(),
  actor: z.enum(['agent', 'user']).optional(),
});

export const BlocksRemovePayloadSchema: z.ZodType<BlocksRemovePayload> = z.object({
  id: z.string().trim().min(1),
  tabId: z.string().optional(),
  actor: z.enum(['agent', 'user']).optional(),
});

export function validateBlocksList(data: unknown) {
  return BlocksListPayloadSchema.safeParse(data);
}

export function validateBlocksGet(data: unknown) {
  return BlocksGetPayloadSchema.safeParse(data);
}

export function validateBlocksUpsert(data: unknown) {
  return BlocksUpsertPayloadSchema.safeParse(data);
}

export function validateBlocksUpdateParams(data: unknown) {
  return BlocksUpdateParamsPayloadSchema.safeParse(data);
}

export function validateBlocksRemove(data: unknown) {
  return BlocksRemovePayloadSchema.safeParse(data);
}

// 18. Directives & Capabilities Domain (Improvements 2, 4, 5)
export const DirectivesGetPayloadSchema: z.ZodType<DirectivesGetPayload> = z.object({
  format: z.enum(['json', 'markdown']).optional(),
});

export function validateDirectivesGet(data: unknown) {
  return DirectivesGetPayloadSchema.safeParse(data || {});
}

// 19. Ribbon & ViewSettings Boundary Schemas (VER-02 / VER-07)
export const RibbonItemTypeSchema: z.ZodType<RibbonItemType> = z.enum([
  'tool', 'action', 'workflow', 'template', 'command', 'formatting', 'separator', 'tab', 'file'
]);

export const MarkdownFormatTypeSchema: z.ZodType<MarkdownFormatType> = z.enum([
  'wrap', 'line-prefix', 'block', 'insert', 'command'
]);

export const RibbonItemSchema: z.ZodType<RibbonItem> = z.object({
  id: z.string().min(1),
  label: z.string(),
  icon: z.string(),
  type: RibbonItemTypeSchema,
  targetId: z.string().optional(),
  color: z.string().optional(),
  shortcut: z.string().optional(),
  tooltip: z.string().optional(),
  enabled: z.boolean(),
  order: z.number(),
  showLabel: z.boolean().optional(),
  prefix: z.string().optional(),
  suffix: z.string().optional(),
  formatType: MarkdownFormatTypeSchema.optional()
});

export function validateRibbonItem(data: unknown) {
  return RibbonItemSchema.safeParse(data);
}

export const AutocompleteConfigSchema: z.ZodType<AutocompleteConfig> = z.object({
  enableKeywords: z.boolean(),
  enableTemplates: z.boolean(),
  enableFormulas: z.boolean(),
  enableSlashCommands: z.boolean(),
  minWordLength: z.number()
}).passthrough();

export const SpellCheckConfigSchema: z.ZodType<SpellCheckConfig> = z.object({
  enabled: z.boolean(),
  mode: z.enum(['built-in', 'browser']),
  language: z.string()
}).passthrough();

export const CodeLintConfigSchema: z.ZodType<CodeLintConfig> = z.object({
  enabled: z.boolean(),
  jsonLint: z.boolean(),
  markdownLint: z.boolean()
}).passthrough();

export const ViewSettingsSchema = z.object({
  theme: z.enum(['google-material-3', 'parchment', 'contextpad-dark', 'one-dark', 'dracula', 'nord', 'monokai', 'github-dark', 'github-light', 'solarized-dark']).optional(),
  fontSize: z.number().optional(),
  fontFamily: z.string().optional(),
  autoAdaptFontToTheme: z.boolean().optional(),
  isFontCustomizedByUser: z.boolean().optional(),
  lineHeight: z.number().optional(),
  wordWrap: z.boolean().optional(),
  tabSize: z.number().optional(),
  enableCodeLinting: z.boolean().optional(),
  showLineNumbers: z.boolean().optional(),
  showCodeBlockMarkers: z.boolean().optional(),
  typingDirection: z.enum(['top-to-bottom', 'bottom-to-up']).optional(),
  syntaxHighlighting: z.enum(['auto', 'automatic', 'markdown', 'markdown-formatted', 'headers', 'headers-only', 'none', 'off']).optional(),
  enableLargeDocDetection: z.boolean().optional(),
  largeDocThresholdKb: z.number().optional(),
  largeDocThresholdLines: z.number().optional(),
  previewMaxWidth: z.enum(['narrow', 'standard', 'wide', 'full']).optional(),
  previewFontScale: z.number().optional(),
  previewContentMargin: z.enum(['compact', 'normal', 'spacious']).optional(),
  previewShowTOC: z.boolean().optional(),
  previewCustomCSS: z.string().optional(),
  previewSplitOrientation: z.enum(['horizontal', 'vertical']).optional(),
  previewEngine: z.literal('integrated').optional(),
  previewTheme: z.enum(['match', 'light', 'dark']).optional(),
  showStatusBar: z.boolean().optional(),
  showBreadcrumb: z.boolean().optional(),
  showActivityBar: z.boolean().optional(),
  showSidebar: z.boolean().optional(),
  showRibbon: z.boolean().optional(),
  showMenuBar: z.boolean().optional(),
  activeSidebarTab: z.enum(['explorer', 'outline', 'templates', 'actions', 'tokens', 'settings', 'app-builder', 'panel-app', 'code-blocks']).optional(),
  showLivePreview: z.boolean().optional(),
  editorMode: z.enum(['raw', 'rendered']).optional(),
  enableMarkdownRendering: z.boolean().optional(),
  showTokenStats: z.boolean().optional(),
  indexingScope: z.enum(['performance', 'thorough']).optional(),
  selectedModelId: z.string().optional(),
  budgetThreshold: z.number().optional(),
  uiDensity: z.enum(['desktop', 'touch']).optional(),
  touchOptimized: z.boolean().optional(),
  sidebarOverlay: z.boolean().optional(),
  showMobileAccessoryBar: z.boolean().optional(),
  templateViewMode: z.enum(['list', 'grid']).optional(),
  actionViewMode: z.enum(['list', 'grid']).optional(),
  enableExperimentalSettings: z.boolean().optional(),
  enableLiveTokenEstimator: z.boolean().optional(),
  enableAutosave: z.boolean().optional(),
  enableLiveDomSync: z.boolean().optional(),
  enableLiveMarkdownSync: z.boolean().optional(),
  enableTerminalBus: z.boolean().optional(),
  autosaveIntervalMs: z.number().optional(),
  enableRestGateway: z.boolean().optional(),
  restGatewayPort: z.number().optional(),
  allowRestGatewayLan: z.boolean().optional(),
  keepScreenAwake: z.boolean().optional(),
  deliverableSaveLocation: z.enum(['workspace', 'custom-folder']).optional(),
  deliverableWorkspaceSubfolder: z.string().optional(),
  deliverableCustomFolderPath: z.string().optional(),
  enableBracketMatching: z.boolean().optional(),
  enableFoldGutter: z.boolean().optional(),
  enableAutoIndent: z.boolean().optional(),
  largeFileThreshold: z.number().optional(),
  parserMode: z.enum(['auto', 'ast', 'stream', 'plain']).optional(),
  enableAutocomplete: z.boolean().optional(),
  enableSpellCheck: z.boolean().optional(),
  spellCheckMode: z.enum(['built-in', 'browser']).optional(),
  editorMaxWidth: z.enum(['narrow', 'standard', 'wide', 'full']).optional(),
  editorPadding: z.enum(['compact', 'normal', 'spacious']).optional(),
  autocompleteConfig: AutocompleteConfigSchema.optional(),
  spellCheckConfig: SpellCheckConfigSchema.optional(),
  codeLintConfig: CodeLintConfigSchema.optional()
}).passthrough();

export function validateViewSettings(data: unknown) {
  return ViewSettingsSchema.safeParse(data);
}

// ==========================================
// 18. Code Block Builder Schemas (FG-26)
// ==========================================

export const CntxtParsedBlockSchema: z.ZodType<CntxtParsedBlock> = z.object({
  type: z.string(),
  fence: z.string(),
  params: CntxtBlockParamsPartialSchema as z.ZodType<CntxtBlockParams>,
  content: z.string(),
  position: z.object({
    start: z.number(),
    end: z.number(),
    startLine: z.number(),
    endLine: z.number(),
  }),
  isCNTXT: z.boolean(),
  isRichContainer: z.boolean(),
});

export const CntxtBlockArchetypeSchema = z.enum([
  'deliverable',
  'conversation',
  'table',
  'audit',
  'diagram',
  'code',
]);

export const CntxtBlockPresetSchema: z.ZodType<CntxtBlockPreset> = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  archetype: CntxtBlockArchetypeSchema,
  language: z.string(),
  description: z.string(),
  icon: z.string(),
  defaultParams: CntxtBlockParamsPartialSchema,
  defaultContent: z.string(),
  preferredFence: z.enum(['~~~', '```']).optional(),
});

export const ActiveBlockCursorStateSchema = z.object({
  isInsideBlock: z.boolean(),
  block: CntxtParsedBlockSchema.nullable(),
  tabId: z.string().nullable(),
  cursorLine: z.number(),
});

export function validateBlockPreset(data: unknown) {
  return CntxtBlockPresetSchema.safeParse(data);
}
