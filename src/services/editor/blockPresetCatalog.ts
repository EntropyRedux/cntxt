/**
 * CNTXT Block Preset Catalog & Generator (FG-26)
 *
 * Defines the 6 canonical CNTXT block archetypes, default presets, and
 * safe fence generation logic for the Code Block Builder rail panel.
 */

import {
  CntxtBlockArchetype,
  CntxtBlockPreset,
  CntxtBlockParams,
} from '../../../contracts/data_shapes';
import {
  computeSafeFence,
  serializeBlockInfoString,
} from './cntxtBlockParser';

export interface ArchetypeMeta {
  id: CntxtBlockArchetype;
  label: string;
  description: string;
  icon: string;
  defaultLang: string;
}

export const ARCHETYPES: ArchetypeMeta[] = [
  {
    id: 'deliverable',
    label: 'Deliverable',
    description: 'AI plan, report, or specification in a rich markdown container',
    icon: 'FileText',
    defaultLang: 'markdown',
  },
  {
    id: 'conversation',
    label: 'Conversation',
    description: 'Multi-turn discussion thread with speaker cards & timestamps',
    icon: 'MessageSquare',
    defaultLang: 'conversation',
  },
  {
    id: 'table',
    label: 'Data Table',
    description: 'Spreadsheet-style matrix with sorting, filters, and formulas',
    icon: 'Table',
    defaultLang: 'table',
  },
  {
    id: 'audit',
    label: 'Audit Scorecard',
    description: 'Structured QA checklist and severity verification matrix',
    icon: 'CheckSquare',
    defaultLang: 'audit',
  },
  {
    id: 'diagram',
    label: 'Diagram',
    description: 'Mermaid flowchart, sequence, or architecture visualizer',
    icon: 'GitFork',
    defaultLang: 'mermaid',
  },
  {
    id: 'code',
    label: 'Code Snippet',
    description: 'Syntax-highlighted executable code with line numbers',
    icon: 'Code',
    defaultLang: 'typescript',
  },
];

export const BLOCK_PRESET_DEFINITIONS: CntxtBlockPreset[] = [
  {
    id: 'deliverable-plan',
    name: 'Implementation Plan',
    archetype: 'deliverable',
    language: 'markdown',
    description: 'Structured proposal with goals, contracts, and verification gates',
    icon: 'FileText',
    defaultParams: {
      tags: ['plan', 'deliverable'],
      status: 'draft',
      locked: 'agent',
      source: '@agent',
    },
    defaultContent: `# Plan Title\n\n## 1. Overview\nDescribe the objectives and user value.\n\n## 2. Architecture\nDetail the structural changes.\n\n## 3. Verification Gates\n- [ ] Unit tests pass\n- [ ] Linter clean`,
    preferredFence: '~~~',
  },
  {
    id: 'deliverable-report',
    name: 'Audit / Verification Report',
    archetype: 'deliverable',
    language: 'markdown',
    description: 'Formal deliverable review dossier with findings and sign-off',
    icon: 'ClipboardCheck',
    defaultParams: {
      tags: ['audit', 'deliverable'],
      status: 'review',
      locked: 'agent',
      source: '@agent',
    },
    defaultContent: `# Audit Report\n\n| Item | Severity | Status |\n| :--- | :--- | :--- |\n| Core Security | CRITICAL | PASS |\n| Boundary Validation | HIGH | PASS |\n\n## Summary\nAll verification gates passed successfully.`,
    preferredFence: '~~~',
  },
  {
    id: 'conversation-thread',
    name: 'Thread Conversation',
    archetype: 'conversation',
    language: 'conversation',
    description: 'Interactive conversation turns between human and agent',
    icon: 'MessageSquare',
    defaultParams: {
      tags: ['conversation'],
      status: 'ready',
      source: '@user',
    },
    defaultContent: `### Turn 1: @user (Initial Request)\nPlease review the proposed data shapes.\n\n---\n\n### Turn 2: @agent (Analysis)\nThe proposed shapes satisfy all canonical contract invariants.`,
    preferredFence: '~~~',
  },
  {
    id: 'table-matrix',
    name: 'Interactive Data Matrix',
    archetype: 'table',
    language: 'table',
    description: 'Live table with sort, filter, and spreadsheet formulas',
    icon: 'Table',
    defaultParams: {
      status: 'ready',
      rendererParams: { formulas: 'true' },
    },
    defaultContent: `| Column 1 | Column 2 | Column 3 |\n| :--- | :--- | :--- |\n| Alpha | 100 | Active |\n| Beta | 250 | Pending |\n| Total | =SUM(B2:B3) | Summary |`,
    preferredFence: '~~~',
  },
  {
    id: 'audit-scorecard',
    name: 'Severity Scorecard',
    archetype: 'audit',
    language: 'audit',
    description: 'Pre-formatted severity assessment table',
    icon: 'CheckSquare',
    defaultParams: {
      tags: ['audit', 'checklist'],
      status: 'review',
      source: '@auditor',
    },
    defaultContent: `| ID | Severity | Item | Status |\n| :--- | :--- | :--- | :--- |\n| AUD-01 | CRITICAL | IPC Authorization Check | [ ] |\n| AUD-02 | HIGH | Input Boundary Schema | [ ] |\n| AUD-03 | MEDIUM | Error Boundary Coverage | [ ] |\n| AUD-04 | LOW | Logging Telemetry | [ ] |`,
    preferredFence: '~~~',
  },
  {
    id: 'diagram-flowchart',
    name: 'Flowchart Diagram',
    archetype: 'diagram',
    language: 'mermaid',
    description: 'Directional flow diagram showing architecture or steps',
    icon: 'GitFork',
    defaultParams: {
      status: 'ready',
    },
    defaultContent: `flowchart TD\n    A[Start] --> B{Valid Request?}\n    B -->|Yes| C[Process Request]\n    B -->|No| D[Reject with Error]\n    C --> E[Done]`,
    preferredFence: '```',
  },
  {
    id: 'diagram-sequence',
    name: 'Sequence Diagram',
    archetype: 'diagram',
    language: 'mermaid',
    description: 'Lifeline and message passing sequence between components',
    icon: 'ArrowRightLeft',
    defaultParams: {
      status: 'ready',
    },
    defaultContent: `sequenceDiagram\n    actor User\n    participant UI as CNTXT Editor\n    participant Bus as Host Command Bus\n    User->>UI: Action Trigger\n    UI->>Bus: Dispatch RPC Request\n    Bus-->>UI: Return Typed Result`,
    preferredFence: '```',
  },
  {
    id: 'code-typescript',
    name: 'TypeScript Snippet',
    archetype: 'code',
    language: 'typescript',
    description: 'Clean typed code block with syntax highlighting',
    icon: 'Code',
    defaultParams: {
      status: 'draft',
    },
    defaultContent: `export function example(): void {\n  console.log('CNTXT Code Block');\n}`,
    preferredFence: '```',
  },
  {
    id: 'code-python',
    name: 'Python Snippet',
    archetype: 'code',
    language: 'python',
    description: 'Python script snippet',
    icon: 'Code',
    defaultParams: {
      status: 'draft',
    },
    defaultContent: `def main():\n    print("CNTXT Code Block")\n\nif __name__ == "__main__":\n    main()`,
    preferredFence: '```',
  },
  {
    id: 'code-rust',
    name: 'Rust Snippet',
    archetype: 'code',
    language: 'rust',
    description: 'Rust system code snippet',
    icon: 'Code',
    defaultParams: {
      status: 'draft',
    },
    defaultContent: `pub fn run() {\n    println!("CNTXT Code Block");\n}`,
    preferredFence: '```',
  },
];

/**
 * Generates a kebab-cased slug from a title string.
 */
export function generateBlockSlug(title: string, prefix = 'block'): string {
  const clean = (title || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const timestamp = Date.now().toString(36).slice(-4);
  return clean ? `${clean}-${timestamp}` : `${prefix}-${timestamp}`;
}

/**
 * Assembles a complete, collision-safe fenced code block string.
 */
export function assembleBlockString(options: {
  language: string;
  params: CntxtBlockParams;
  content: string;
  preferredFence?: '~~~' | '```';
  isCNTXT?: boolean;
}): string {
  const { language, params, content, preferredFence = '~~~', isCNTXT = true } = options;
  const safeFence = computeSafeFence(content, preferredFence);
  const infoString = serializeBlockInfoString(language, params, isCNTXT);
  const trimmedContent = content ? content.trimEnd() : '';

  return `${safeFence}${infoString}\n${trimmedContent}\n${safeFence}\n`;
}
