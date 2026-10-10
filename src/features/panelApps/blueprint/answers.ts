import { z } from 'zod';

export const BlueprintAnswersSchema = z.object({
  archetype: z.enum(['build', 'brainstorm', 'adapt']).default('build'),
  appName: z
    .string()
    .trim()
    .min(2, 'App name must be at least 2 characters')
    .max(64, 'App name cannot exceed 64 characters')
    .default('My Panel App'),
  purpose: z
    .string()
    .trim()
    .min(5, 'Purpose must be at least 5 characters')
    .default('Utility panel app for CNTXT'),
  inputsOutputs: z.string().trim().default('').optional(),
  persistence: z.enum(['none', 'file', 'native']).default('file'),
  persistNotes: z.string().trim().optional(),
  layout: z.enum(['single-column', 'two-column', 'compact-card', 'freeform']).default('single-column'),
  themeMode: z.enum(['cntxt', 'custom']).default('cntxt'),
  templateId: z.string().optional(),
  extra: z.string().trim().optional(),
  brainstormTopic: z.string().trim().optional(),
  existingHtml: z.string().trim().optional(),
  targetStateDescription: z.string().trim().optional(),
});

export type BlueprintAnswers = z.infer<typeof BlueprintAnswersSchema>;
