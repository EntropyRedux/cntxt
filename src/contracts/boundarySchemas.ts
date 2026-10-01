/**
 * Boundary Schemas
 * 
 * Strict runtime validation using Zod for IPC boundaries, persistent storage,
 * and serialized import/export formats.
 */

import { z } from 'zod';
import { SupportedLanguage, Tab } from '../../contracts/data_shapes';

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
  data: z.record(z.string(), z.unknown())
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
