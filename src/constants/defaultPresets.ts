/**
 * PRODUCTION DEFAULT PRESETS (src/constants/defaultPresets.ts)
 * 
 * Factory default action and template definitions for CNTXT.
 * These are static product configuration assets, decoupled from test mocks.
 */

import { Template, Action } from '../../contracts/data_shapes';

export const DEFAULT_TEMPLATES: Template[] = [
  {
    id: 'api-spec-contract',
    name: 'Production API Contract & Endpoint Spec',
    description: 'API design contract demonstrating fast * prefix ({{*endpoint}}) and pipe syntax ({{payload|required}}) with default parameters.',
    category: 'Engineering',
    variables: [
      '*endpoint_name:Create User Session',
      '*http_method:POST',
      'endpoint_path|required',
      'base_url:https://api.domain.internal/v1',
      'auth_type:Bearer JWT Token|required',
      'request_payload|required',
      'expected_status:200 OK',
      '*api_scope:users:write',
      'rate_limit:120 req/min'
    ],
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
    isPinned: true,
    content: `# API Specification: {{*endpoint_name:Create User Session}}

## 1. Routing & Protocol
- **Method**: {{*http_method:POST}}
- **Path**: \`{{endpoint_path|required}}\`
- **Base URL**: {{base_url:https://api.domain.internal/v1}}
- **Authentication**: {{auth_type:Bearer JWT Token|required}}
- **Rate Limit**: {{rate_limit:120 req/min}}

---

## 2. Request Schema
\`\`\`json
{{request_payload|required}}
\`\`\`

## 3. Response Contract
- **Expected Status**: {{expected_status:200 OK}}
- **Error Standard**: {{error_strategy:RFC 7807 Problem Details}}

---

## 4. Security & Compliance
- **Required RBAC Scope**: \`{{*api_scope:users:write}}\`
- **Audit Logging**: {{audit_logging:Enabled with trace ID propagation}}
`
  },
  {
    id: 'system-prompt-builder',
    name: 'System Prompt Architect (XML)',
    description: 'Structured prompt with role definition, guardrails, input schemas, and XML tagging.',
    category: 'Prompt Engineering',
    variables: ['role', 'domain', 'objective', 'constraints', 'output_format', 'example_input', 'example_output'],
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
    isPinned: true,
    content: `<system_instruction>
# Role & Purpose
You are an expert {{role:Senior Systems Architect}} with deep mastery in {{domain:Distributed Systems and AI Orchestration}}.
Your core mission is to {{objective:deliver high-quality, production-ready architectures and technical specifications}}.

# Operational Guardrails & Constraints
- Always adhere to industry best practices and clean code principles.
- Constraints: {{constraints:Do not output speculative assumptions; cite trade-offs clearly}}.
- Response Format: {{output_format:Structured Markdown with bullet points, code blocks, and diagrams}}.

# Few-Shot Guidance
<example>
<input>{{example_input:How to handle idempotency in message queues?}}</input>
<output>{{example_output:Use unique idempotency keys with distributed Redis locks and transactional outbox pattern.}}</output>
</example>
</system_instruction>

<user_query>
{{user_request:Please design a fault-tolerant prompt processing pipeline.}}
</user_query>`
  },
  {
    id: 'chain-of-thought-prompt',
    name: 'Chain of Thought (CoT) Reasoner',
    description: 'Step-by-step reasoning prompt template with self-reflection and verification.',
    category: 'Prompt Engineering',
    variables: ['task_description', 'complexity_level', 'evaluation_criteria', 'input_data'],
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
    isPinned: true,
    content: `# Task: {{task_description:Analyze system bottlenecks and optimize throughput}}
**Complexity**: {{complexity_level:High}}
**Verification Criteria**: {{evaluation_criteria:Quantitative benchmark improvement and zero regression}}

## Execution Protocol:
1. **Deconstruction**: Break down the problem into atomic sub-components.
2. **Analysis**: Evaluate potential solutions, edge cases, and failure modes.
3. **Hypothesis & Calculation**: Show intermediate reasoning step-by-step.
4. **Self-Correction**: Check for logical gaps or missed assumptions.
5. **Final Recommendation**: Summarize the optimal solution with actionable steps.

## Input Context:
\`\`\`
{{input_data:CPU utilization spikes to 98% under 10k concurrent WebSocket connections.}}
\`\`\`

*Begin step-by-step reasoning:*`
  },
  {
    id: 'technical-rfc-spec',
    name: 'Technical RFC / Design Document',
    description: 'Standard software engineering RFC with problem statement, architecture, trade-offs, and rollout.',
    category: 'Technical Drafting',
    variables: ['rfc_title', 'author', 'status', 'summary', 'background', 'proposed_solution', 'security_considerations'],
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
    content: `# RFC-{{rfc_number:042}}: {{rfc_title:Next-Gen Workspace State Syncing}}
- **Author**: {{author:Core Platform Team}}
- **Status**: {{status:Draft / In Review}}
- **Date**: {=TODAY()}
- **Estimated Effort**: {{effort:2 Sprints}}

---

## 1. Executive Summary
{{summary:Implement dual-layer IndexedDB and in-memory synchronization for offline-first workspace editing.}}

## 2. Background & Motivation
{{background:Users need fast, resilient local editing without data loss during intermittent network drops.}}

## 3. Proposed Architecture
\`\`\`mermaid
graph LR
    Editor --> MemoryStore[Zustand Store]
    MemoryStore --> StorageWorker[IndexedDB Worker]
    MemoryStore --> SyncService[Cloud Sync Engine]
\`\`\`

{{proposed_solution:We introduce a debounced write pipeline with dirty state tracking and cryptographic change hashes.}}

## 4. Security & Privacy Considerations
{{security_considerations:All data remains local on the client machine; encryption at rest for sensitive API tokens.}}

## 5. Alternatives Considered & Trade-offs
| Solution | Pros | Cons |
| :--- | :--- | :--- |
| LocalStorage | Simple API | 5MB limit, synchronous blocking |
| IndexedDB | High capacity, async | Asynchronous complexity |
| SQLite (WASM) | SQL querying | Heavy bundle size |

## 6. Rollout & Migration Plan
1. Phase 1: Alpha testing with automated schema migration.
2. Phase 2: Canary rollout to 10% users with telemetry fallback.
`
  },
  {
    id: 'bug-report-triage',
    name: 'Defect / Bug Triage Report',
    description: 'Clean bug report template with repro steps, expected vs actual behavior, and environment logs.',
    category: 'Engineering',
    variables: ['issue_title', 'severity', 'environment', 'repro_steps', 'expected_behavior', 'actual_behavior'],
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
    content: `## [BUG] {{issue_title:Token counter desyncs on large multi-line pastes}}
- **Severity**: {{severity:P2 - Medium}}
- **Environment**: {{environment:Chrome 128 / macOS 15.0 / ContextPad 1.10.0}}
- **Reported Date**: {=NOW()}

### 🔍 Steps to Reproduce
1. {{step_1:Open ContextPad editor}}
2. {{step_2:Paste 5,000 lines of JSON content}}
3. {{step_3:Observe bottom status bar token count}}

### 🎯 Expected Behavior
{{expected_behavior:Token count updates within 500ms using debounced calculation with live status indicator.}}

### ❌ Actual Behavior
{{actual_behavior:Token count indicator shows stale cached value until another keypress occurs.}}

### 📋 Environment & Diagnostic Logs
\`\`\`json
{
  "lineCount": {=LINECOUNT()},
  "charCount": {=CHARCOUNT()},
  "timestamp": "{=NOW()}",
  "sessionId": "{=UUID()}"
}
\`\`\`
`
  },
  {
    id: 'meeting-notes-action-items',
    name: 'Executive Meeting & Action Items',
    description: 'Structured meeting template with agenda, discussion notes, decision log, and assigned action items.',
    category: 'Productivity',
    variables: ['meeting_title', 'attendees', 'goal', 'agenda_items', 'decisions', 'action_items'],
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
    content: `# 📝 {{meeting_title:AI Sprint Planning & Roadmap Sync}}
- **Date**: {=TODAY()}
- **Attendees**: {{attendees:Engineering, Product, Design}}
- **Meeting Objective**: {{goal:Finalize Q3 milestone commitments and resource allocation}}

---

### 📌 Agenda
{{agenda_items:
1. Review Q2 retrospectives
2. Token estimator optimization
3. Formula engine extension functions
4. Release candidate validation}}

### 💡 Key Discussions & Notes
- ContextPad v1.10.0 desktop release preparation
- Sandboxed action scripts security verification
- Markdown live preview rendering performance

### ⚖️ Decision Log
- [x] Adopt IndexedDB for document persistence
- [x] Standardize on CodeMirror 6 with custom AST parser
- [ ] {{pending_decision:Decide on default model pricing refresh schedule}}

### ✅ Action Items
- [ ] **@frontend**: Complete slash commands menu integration (Due: {=TODAY()})
- [ ] **@qa**: Execute end-to-end regression test suite
- [ ] **@lead**: Publish release notes and docs
`
  }
];

export const DEFAULT_ACTIONS: Action[] = [
  {
    id: 'act_summarize',
    name: 'Summarize Document',
    description: 'Generates an executive summary of the current note content',
    category: 'Text Analysis',
    shortcut: 'Ctrl+Shift+S',
    enabled: true,
    color: 'emerald',
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
    codeType: 'declarative',
    code: 'TRANSFORM:summarize',
    pipeline: [
      { type: 'transform', transform: 'summarize' }
    ]
  },
  {
    id: 'act_format_table',
    name: 'Clean Markdown Table',
    description: 'Normalizes column widths and whitespace in markdown tables',
    category: 'Formatting',
    shortcut: 'Ctrl+Shift+T',
    enabled: true,
    color: 'sky',
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
    codeType: 'declarative',
    code: 'TRANSFORM:formatTable',
    pipeline: [
      { type: 'transform', transform: 'formatTable' }
    ]
  },
  {
    id: 'act_slugify',
    name: 'Generate URL Slug',
    description: 'Converts selected text or heading to kebab-case slug',
    category: 'Utility',
    enabled: true,
    color: 'indigo',
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
    codeType: 'declarative',
    code: 'TRANSFORM:slugify',
    pipeline: [
      { type: 'transform', transform: 'slugify' }
    ]
  },
  {
    id: 'act_extract_todos',
    name: 'Extract All Tasks',
    description: 'Gathers all checkbox tasks (- [ ]) and copies to end of document',
    category: 'Text Analysis',
    enabled: true,
    color: 'amber',
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
    codeType: 'declarative',
    code: 'TRANSFORM:extractTasks',
    pipeline: [
      { type: 'transform', transform: 'extractTasks' }
    ]
  },
  {
    id: 'format-json-and-sort',
    name: 'Format JSON & Sort Keys',
    description: 'Parses active JSON or selected text, formats with 2 spaces indentation, and sorts keys alphabetically.',
    type: 'command',
    category: 'Formatting',
    enabled: true,
    isDefault: true,
    icon: 'Braces',
    shortcut: 'Ctrl+Shift+F',
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
    codeType: 'declarative',
    code: 'TRANSFORM:formatJSON',
    pipeline: [
      { type: 'transform', transform: 'formatJSON' }
    ]
  },
  {
    id: 'extract-and-fill-variables',
    name: 'Extract & Fill Template Variables',
    description: 'Finds all {{variable}} placeholders in document and prompts to fill them in batch.',
    type: 'button',
    category: 'Templates',
    enabled: true,
    isDefault: true,
    icon: 'Variable',
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
    codeType: 'declarative',
    code: 'TRANSFORM:extractAndFillVariables',
    pipeline: [
      { type: 'transform', transform: 'extractAndFillVariables' }
    ]
  },
  {
    id: 'table-to-csv-converter',
    name: 'Markdown Table to CSV / JSON',
    description: 'Converts markdown table into clean CSV format or JSON array.',
    type: 'command',
    category: 'Conversion',
    enabled: true,
    isDefault: true,
    icon: 'Table',
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
    codeType: 'declarative',
    code: 'TRANSFORM:tableToCsv',
    pipeline: [
      { type: 'transform', transform: 'tableToCsv' }
    ]
  },
  {
    id: 'deduplicate-and-sort-lines',
    name: 'Deduplicate & Alphabetize Lines',
    description: 'Removes duplicate lines from selection or file and sorts alphabetically.',
    type: 'command',
    category: 'Text Utility',
    enabled: true,
    isDefault: true,
    icon: 'ListFilter',
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
    codeType: 'declarative',
    code: 'TRANSFORM:deduplicateLines',
    pipeline: [
      { type: 'transform', transform: 'deduplicateLines' }
    ]
  },
  {
    id: 'eval-all-formulas',
    name: 'Bake / Evaluate All Formulas',
    description: 'Permanently replaces all {=FORMULA()} tags with their computed real-world values.',
    type: 'button',
    category: 'Formulas',
    enabled: true,
    isDefault: true,
    icon: 'Calculator',
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
    codeType: 'declarative',
    code: 'TRANSFORM:bakeFormulas',
    pipeline: [
      { type: 'transform', transform: 'bakeFormulas' }
    ]
  },
  {
    id: 'generate-prompt-chain',
    name: 'Wrap with LLM System / User Structure',
    description: 'Wraps current document in modern LLM tag container with metadata tags.',
    type: 'command',
    category: 'Prompt Engineering',
    enabled: true,
    isDefault: true,
    icon: 'Sparkles',
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
    codeType: 'declarative',
    code: 'TRANSFORM:wrapPromptContext',
    pipeline: [
      { type: 'transform', transform: 'wrapPromptContext' }
    ]
  },
  {
    id: 'act_uppercase',
    name: 'UPPERCASE Selection',
    description: 'Transforms selected text to uppercase without removing text',
    type: 'command',
    category: 'Formatting',
    enabled: true,
    isDefault: true,
    icon: 'Type',
    codeType: 'formula',
    code: 'FORMULA:UPPER(selection)',
    pipeline: [{ type: 'formula', expression: 'UPPER(selection)' }],
    createdAt: 1700000000000,
    updatedAt: 1700000000000
  },
  {
    id: 'act_lowercase',
    name: 'lowercase Selection',
    description: 'Transforms selected text to lowercase without removing text',
    type: 'command',
    category: 'Formatting',
    enabled: true,
    isDefault: true,
    icon: 'CaseLower',
    codeType: 'formula',
    code: 'FORMULA:LOWER(selection)',
    pipeline: [{ type: 'formula', expression: 'LOWER(selection)' }],
    createdAt: 1700000000000,
    updatedAt: 1700000000000
  },
  {
    id: 'act_titlecase',
    name: 'Title Case Selection',
    description: 'Capitalizes the first letter of each word in the selection',
    type: 'command',
    category: 'Formatting',
    enabled: true,
    isDefault: true,
    icon: 'Heading',
    codeType: 'formula',
    code: 'FORMULA:TITLE(selection)',
    pipeline: [{ type: 'formula', expression: 'TITLE(selection)' }],
    createdAt: 1700000000000,
    updatedAt: 1700000000000
  },
  {
    id: 'act_bold_selection',
    name: 'Bold Selection',
    description: 'Wraps selected text in **bold** formatting',
    type: 'button',
    category: 'Formatting',
    enabled: true,
    isDefault: true,
    icon: 'Bold',
    codeType: 'formula',
    code: 'FORMULA:BOLD(selection)',
    pipeline: [{ type: 'formula', expression: 'BOLD(selection)' }],
    createdAt: 1700000000000,
    updatedAt: 1700000000000
  },
  {
    id: 'act_italic_selection',
    name: 'Italic Selection',
    description: 'Wraps selected text in *italic* formatting',
    type: 'button',
    category: 'Formatting',
    enabled: true,
    isDefault: true,
    icon: 'Italic',
    codeType: 'formula',
    code: 'FORMULA:ITALIC(selection)',
    pipeline: [{ type: 'formula', expression: 'ITALIC(selection)' }],
    createdAt: 1700000000000,
    updatedAt: 1700000000000
  },
  {
    id: 'act_code_selection',
    name: 'Inline Code Selection',
    description: 'Wraps selected text in `inline code` backticks',
    type: 'button',
    category: 'Formatting',
    enabled: true,
    isDefault: true,
    icon: 'Code',
    codeType: 'formula',
    code: 'FORMULA:CODE(selection)',
    pipeline: [{ type: 'formula', expression: 'CODE(selection)' }],
    createdAt: 1700000000000,
    updatedAt: 1700000000000
  },
  {
    id: 'act_bulletlist_selection',
    name: 'Convert to Bullet List',
    description: 'Converts selected lines into bulleted list items (* item)',
    type: 'command',
    category: 'Formatting',
    enabled: true,
    isDefault: true,
    icon: 'List',
    codeType: 'formula',
    code: 'FORMULA:BULLETLIST(selection)',
    pipeline: [{ type: 'formula', expression: 'BULLETLIST(selection)' }],
    createdAt: 1700000000000,
    updatedAt: 1700000000000
  },
  {
    id: 'act_checklist_selection',
    name: 'Convert to Task Checklist',
    description: 'Converts selected lines into task checklist checkboxes (- [ ] item)',
    type: 'command',
    category: 'Formatting',
    enabled: true,
    isDefault: true,
    icon: 'CheckSquare',
    codeType: 'formula',
    code: 'FORMULA:CHECKLIST(selection)',
    pipeline: [{ type: 'formula', expression: 'CHECKLIST(selection)' }],
    createdAt: 1700000000000,
    updatedAt: 1700000000000
  },
  {
    id: 'act_insert_today',
    name: 'Insert Today Date',
    description: 'Inserts current date YYYY-MM-DD without removing selected text',
    type: 'button',
    category: 'Utility',
    enabled: true,
    isDefault: true,
    icon: 'Calendar',
    codeType: 'formula',
    code: 'FORMULA:TODAY()',
    pipeline: [{ type: 'formula', expression: 'TODAY()' }],
    createdAt: 1700000000000,
    updatedAt: 1700000000000
  },
  {
    id: 'act_insert_uuid',
    name: 'Insert UUID v4',
    description: 'Generates and inserts unique identifier without removing selected text',
    type: 'command',
    category: 'Utility',
    enabled: true,
    isDefault: true,
    icon: 'Fingerprint',
    codeType: 'formula',
    code: 'FORMULA:UUID()',
    pipeline: [{ type: 'formula', expression: 'UUID()' }],
    createdAt: 1700000000000,
    updatedAt: 1700000000000
  },
  {
    id: 'action-extract-answered',
    name: 'Extract Answered Variables',
    description: 'Scans active document for filled variables or key-value pairs and copies a markdown table summary.',
    type: 'command',
    category: 'EXTRACTION',
    enabled: true,
    isDefault: true,
    icon: 'Table',
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
    codeType: 'declarative',
    code: 'TRANSFORM:extractAnsweredVariables',
    pipeline: [
      { type: 'transform', transform: 'extractAnsweredVariables' }
    ]
  },
  {
    id: 'action-extract-rows-with-vars',
    name: 'Extract Rows With Variables',
    description: 'Filters lines containing {{variable}} placeholders and copies them to the clipboard.',
    type: 'command',
    category: 'EXTRACTION',
    enabled: true,
    isDefault: true,
    icon: 'ListFilter',
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
    codeType: 'declarative',
    code: 'TRANSFORM:extractRowsWithVars',
    pipeline: [
      { type: 'transform', transform: 'extractRowsWithVars' }
    ]
  },
  {
    id: 'action-extract-rows-without-vars',
    name: 'Extract Rows Without Variables',
    description: 'Filters out lines containing {{variable}} placeholders, isolating boilerplate static text to clipboard.',
    type: 'command',
    category: 'EXTRACTION',
    enabled: true,
    isDefault: true,
    icon: 'FileText',
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
    codeType: 'declarative',
    code: 'TRANSFORM:extractRowsWithoutVars',
    pipeline: [
      { type: 'transform', transform: 'extractRowsWithoutVars' }
    ]
  },
  {
    id: 'action-selection-extract-vars',
    name: 'Selection: Extract Variables',
    description: 'Extracts all unique {{...}} tokens from the selected text or document into a formatted checklist.',
    type: 'command',
    category: 'EXTRACTION',
    enabled: true,
    isDefault: true,
    icon: 'CheckSquare',
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
    codeType: 'declarative',
    code: 'TRANSFORM:selectionExtractVars',
    pipeline: [
      { type: 'transform', transform: 'selectionExtractVars' }
    ]
  }
];
