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
  OmniAgentRole,
  OmniShellSpawnMode,
  OmniSessionStatus,
  OmniAgentProfile,
  OmniChatMessage,
  OmniSession
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
  isPinned: z.boolean().optional()
}) as unknown as z.ZodType<Tab>;

export const TabCacheEntrySchema = z.object({
  tabs: z.array(TabSchema),
  activeTabId: z.string().min(1),
  checksum: z.string().min(1),
  ts: z.number()
});

export const ActionCategorySchema = z.enum(['TEXT', 'FORMAT', 'CODE', 'TEMPLATES', 'EXTERNAL', 'CUSTOM']);

export const ActionSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  code: z.string(),
  category: z.string().optional(),
  enabled: z.boolean().optional(),
  isPinned: z.boolean().optional(),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
  buttonText: z.string().optional(),
  buttonIcon: z.string().optional(),
  buttonColor: z.string().optional(),
  buttonPosition: z.string().optional()
});

export const TemplateSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  content: z.string(),
  category: z.string().optional(),
  variables: z.array(z.string()).optional(),
  isHidden: z.boolean().optional(),
  isPinned: z.boolean().optional(),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional()
});

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

export const PanelAppRecordSchema: z.ZodType<PanelAppRecord> = z.object({
  id: z.string().regex(/^[a-z][a-z0-9]{11,31}$/),
  path: z.string().min(1),
  name: z.string().min(1),
  icon: z.string().min(1),
  network: z.enum(['offline', 'cdn']).optional(),
  panelWidth: z.number().optional(),
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
  'terminal',
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
// Omni Terminal Boundary Schemas (FG-18)
// ==========================================

export const OmniAgentRoleSchema: z.ZodType<OmniAgentRole> = z.enum([
  'Auditor Agent',
  'Prod Agent',
  'Tester Agent',
  'Custom'
]);

export const OmniShellSpawnModeSchema: z.ZodType<OmniShellSpawnMode> = z.enum([
  'headless',
  'external-window'
]);

export const OmniSessionStatusSchema: z.ZodType<OmniSessionStatus> = z.enum([
  'idle',
  'running',
  'paused',
  'completed'
]);

export const OmniAgentProfileSchema: z.ZodType<OmniAgentProfile> = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  handle: z.string().trim().min(1).regex(/^[a-zA-Z0-9_-]+$/),
  role: OmniAgentRoleSchema,
  command: z.string().trim().min(1),
  spawnMode: OmniShellSpawnModeSchema,
  systemDirectives: z.string().optional(),
  templateId: z.string().optional(),
  channelId: z.string().optional(),
  status: z.enum(['idle', 'starting', 'busy', 'waiting_permission', 'stopped', 'error']),
  color: z.string().optional(),
});

export const OmniChatMessageSchema: z.ZodType<OmniChatMessage> = z.object({
  id: z.string().min(1),
  sessionId: z.string().min(1),
  senderId: z.string().min(1),
  senderName: z.string().min(1),
  targetHandle: z.string().optional(),
  content: z.string(),
  rawTerminalOutput: z.string().optional(),
  thought: z.string().optional(),
  annotatedOutput: z.string().optional(),
  timestamp: z.string().min(1),
  isPinnedToOutput: z.boolean(),
  exitCode: z.number().int().optional(),
  color: z.string().optional(),
});

export const OmniSessionSchema: z.ZodType<OmniSession> = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1),
  targetFolder: z.string().min(1),
  workspacePath: z.string().optional(),
  rawFilePath: z.string().min(1),
  outputFilePath: z.string().min(1),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  pinnedAgents: z.array(OmniAgentProfileSchema),
  status: OmniSessionStatusSchema,
  activeTurnId: z.string().optional(),
});

export function validateOmniAgentProfile(data: unknown) {
  return OmniAgentProfileSchema.safeParse(data);
}

export function validateOmniChatMessage(data: unknown) {
  return OmniChatMessageSchema.safeParse(data);
}

export function validateOmniSession(data: unknown) {
  return OmniSessionSchema.safeParse(data);
}
