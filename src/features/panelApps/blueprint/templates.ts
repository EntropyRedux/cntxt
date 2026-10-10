import { BlueprintAnswers } from './answers';
import { BlueprintArchetype } from '../../../contracts/data_shapes';

export interface BlueprintTemplate {
  id: string;
  name: string;
  description: string;
  archetype: BlueprintArchetype;
  category: 'developer' | 'productivity' | 'tools';
  answers: BlueprintAnswers;
}

export const BUILTIN_TEMPLATES: BlueprintTemplate[] = [
  {
    id: 'build',
    name: 'Build New App',
    description: 'Scaffold a new self-contained panel app adhering to the 14 CNTXT theme tokens and state persistence protocol.',
    archetype: 'build',
    category: 'developer',
    answers: {
      archetype: 'build',
      appName: 'My Panel App',
      purpose: 'Custom utility or workspace productivity tool',
      inputsOutputs: '',
      persistence: 'file',
      layout: 'single-column',
      themeMode: 'cntxt',
    },
  },
  {
    id: 'brainstorm',
    name: 'Brainstorm & Ideate',
    description: 'Interactive AI ideation prompt to explore 3 sidebar panel app concepts for your workflow or problem space.',
    archetype: 'brainstorm',
    category: 'productivity',
    answers: {
      archetype: 'brainstorm',
      appName: 'Idea Workshop',
      purpose: 'Brainstorm panel app concepts for CNTXT side-panel',
      inputsOutputs: '',
      brainstormTopic: 'Writing productivity, quick notes, and document transformation',
      persistence: 'file',
      layout: 'single-column',
      themeMode: 'cntxt',
    },
  },
  {
    id: 'adapt',
    name: 'Adapt Existing App',
    description: 'Refactor an existing HTML, JS, or CodePen widget into the CNTXT panel architecture, theme engine, and state protocol.',
    archetype: 'adapt',
    category: 'tools',
    answers: {
      archetype: 'adapt',
      appName: 'Adapted Web App',
      purpose: 'Port existing HTML application to CNTXT architecture',
      inputsOutputs: '',
      existingHtml: '',
      targetStateDescription: 'All user inputs and active application state',
      persistence: 'file',
      layout: 'single-column',
      themeMode: 'cntxt',
    },
  },
];

export function getBuiltinTemplates(): BlueprintTemplate[] {
  return [...BUILTIN_TEMPLATES];
}

export function getTemplateById(id: string): BlueprintTemplate | undefined {
  return BUILTIN_TEMPLATES.find((t) => t.id === id);
}
