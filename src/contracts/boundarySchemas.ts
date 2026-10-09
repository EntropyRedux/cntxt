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
  PanelAppRecord 
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

export const TabTypeSchema = z.enum(['document', 'template', 'scratchpad']);

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

