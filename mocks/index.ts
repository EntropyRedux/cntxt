/**
 * PHYSICAL MOCK QUARANTINE (mocks/index.ts)
 * 
 * Synthetic sample data isolated from production code.
 * In a native production runtime, collections initialize as clean empty states ([] or null).
 * Mocks are injected ONLY when running in prototype demo mode.
 */

import { Template, Action, PinnedTab, VirtualFile, PinnedItem, OpenedFileRecord } from '../contracts/data_shapes';

declare global {
  interface Window {
    __CONTEXTPAD_DEMO__?: boolean;
    __E2E_ACTION_TIMEOUT__?: number;
  }
}

// Mode flag: defaults to FALSE in production desktop. Set true only if explicitly requested.
export const IS_PROTOTYPE_DEMO_MODE = typeof window !== 'undefined'
  ? Boolean(window.__CONTEXTPAD_DEMO__)
  : false;

// CLEARED (TR-013): Migrated to src/constants/welcomeDoc.ts
export { WELCOME_DOCUMENT } from '../src/constants/welcomeDoc';


export { DEFAULT_TEMPLATES, DEFAULT_ACTIONS } from '../src/constants/defaultPresets';


// MOCK: replace with [native workflow runner / user bookmarks registry]
export const DEFAULT_PINNED_TABS: PinnedTab[] = [
  {
    id: 'workflow-prompt-eval',
    name: 'Prompt Eval & Benchmarking',
    icon: 'Bookmark',
    type: 'bookmark',
    category: 'Bookmarks',
    createdAt: 1700000000000,
    content: `# 🧪 Prompt Evaluation & Benchmark Matrix

| Test Case ID | Input Prompt Variation | Model Tested | Latency (ms) | Output Quality (1-5) | Pass/Fail |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-01 | Base Zero-Shot | GPT-4o | 420 | 4.2 | PASS |
| TC-02 | Few-Shot with 3 Examples | Claude 3.7 Sonnet | 610 | 4.9 | PASS |
| TC-03 | Structured XML Tags | Gemini 2.0 Flash | 280 | 4.7 | PASS |
| TC-04 | Chain of Thought (CoT) | DeepSeek V3 | 510 | 4.5 | PASS |

### Evaluation Metrics
- Accuracy against ground truth
- Hallucination rate (< 1%)
- Format conformance (Strict JSON validation)
- Cost efficiency: \`{=ROUND(AVG(0.002, 0.004, 0.001, 0.0015), 4)}\` USD per 1k runs
`
  },
  {
    id: 'workflow-api-spec',
    name: 'OpenAPI / REST Endpoint Spec',
    icon: 'FileCode',
    type: 'bookmark',
    category: 'Bookmarks',
    createdAt: 1700000000000,
    content: `# 🌐 API Endpoint Specification
\`\`\`yaml
openapi: 3.1.0
info:
  title: ContextPad Workspace Engine API
  version: 1.10.0
paths:
  /api/v1/prompts/evaluate:
    post:
      summary: Evaluate prompt tokens and dynamic formula expressions
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                content:
                  type: string
                modelId:
                  type: string
                  default: "gpt-4o"
      responses:
        '200':
          description: Token analysis and formula computation result
\`\`\`
`
  },
  {
    id: 'bookmark-system-rules',
    name: 'Core System Guidelines',
    icon: 'Bookmark',
    type: 'bookmark',
    category: 'Bookmarks',
    createdAt: 1700000000000,
    content: `# 🛡️ Enterprise AI System Prompt Standards
1. **Separation of Concerns**: Keep system instructions, tool definitions, and user data strictly separated via XML tags or delimiters.
2. **Negative Constraint Avoidance**: State what the model SHOULD do positively rather than listing endless "do not" rules.
3. **Structured Formats**: Prefer JSON schema with typed fields for data outputs.
4. **Token Economics**: Trim verbose prompts; use variables and dynamic formulas for auto-injected timestamps and IDs.
`
  }
];

// MOCK: replace with [native file system / real user workspace directory]
export const INITIAL_PROJECT_FILES: VirtualFile[] = [
  {
    id: 'f-draft',
    name: 'draft_system_prompt.md',
    path: '/draft_system_prompt.md',
    type: 'file',
    content: `# System Prompt: Creative Assistant\n\nYou are a highly capable agent named {{agent_name:ContextBot}}.\nYour primary objective is to facilitate workflow automation.\n\n{=DATE_ISO()} Initial Draft\n\n## Guidelines\n- Maintain professional tone.\n- Format output as markdown.\n- Use !important markers for constraints.`,
    language: 'markdown'
  },
  {
    id: 'f-user',
    name: 'user_persona.json',
    path: '/user_persona.json',
    type: 'file',
    content: `{\n  "persona": "Prompt Engineer",\n  "experience": "Senior",\n  "models": ["GPT-4o", "Claude 3.7", "Gemini 2.0 Flash"],\n  "created": "{=TODAY()}"\n}`,
    language: 'json'
  },
  {
    id: 'f-readme',
    name: 'README.md',
    path: '/README.md',
    type: 'file',
    content: `# ContextPad Workspace\n\nStructured writing, prompt engineering, technical drafting, and workflow automation.`,
    language: 'markdown'
  },
  {
    id: 'folder-specs',
    name: 'specifications',
    path: '/specifications',
    type: 'folder',
    content: '',
    children: [
      { id: 'f-api', name: 'openapi_schema.yaml', path: '/specifications/openapi_schema.yaml', type: 'file', content: 'openapi: 3.0.0\ninfo:\n  title: ContextPad Workspace API\n  version: 1.10.0', language: 'yaml' },
      { id: 'f-arch', name: 'architecture_rfc.md', path: '/specifications/architecture_rfc.md', type: 'file', content: '# RFC 101: Workspace Sync\n\nDate: {=TODAY()}', language: 'markdown' }
    ]
  }
];

// MOCK-006: replace with [native file system / real user pinned files]
export const DEFAULT_PINNED_ITEMS: PinnedItem[] = [
  {
    id: 'folder-specs',
    name: 'specifications',
    type: 'folder'
  },
  {
    id: 'f-draft',
    name: 'draft_system_prompt.md',
    type: 'file',
    language: 'markdown'
  },
  {
    id: 'f-user',
    name: 'user_persona.json',
    type: 'file',
    language: 'json'
  }
];

// MOCK-007: replace with [native persistent store / real user opened file history]
export const DEFAULT_OPENED_HISTORY: OpenedFileRecord[] = [
  {
    id: 'folder-specs',
    name: 'specifications',
    type: 'folder',
    openedAt: 1700000000000 - 1000 * 60 * 2
  },
  {
    id: 'f-welcome',
    name: 'Welcome.md',
    type: 'file',
    language: 'markdown',
    openedAt: 1700000000000 - 1000 * 60 * 4
  },
  {
    id: 'f-draft',
    name: 'draft_system_prompt.md',
    type: 'file',
    language: 'markdown',
    openedAt: 1700000000000 - 1000 * 60 * 18
  },
  {
    id: 'f-user',
    name: 'user_persona.json',
    type: 'file',
    language: 'json',
    openedAt: 1700000000000 - 1000 * 60 * 42
  }
];
