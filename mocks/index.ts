/**
 * PHYSICAL MOCK QUARANTINE (mocks/index.ts)
 * 
 * Synthetic sample data isolated from production code.
 * In a native production runtime, collections initialize as clean empty states ([] or null).
 * Mocks are injected ONLY when running in prototype demo mode.
 */

import { Template, Action, PinnedTab, VirtualFile, PinnedItem, OpenedFileRecord } from '../contracts/data_shapes';

// Mode flag: defaults to FALSE in production desktop. Set true only if explicitly requested.
export const IS_PROTOTYPE_DEMO_MODE = typeof window !== 'undefined' 
  ? Boolean((window as any).__CONTEXTPAD_DEMO__) 
  : false;

// MOCK: replace with [native file system / real user workspace document]
export const WELCOME_DOCUMENT = `# 🚀 Welcome to ContextPad v1.10.0
> **A desktop-first workspace designed for structured writing, prompt engineering, technical drafting, and workflow automation.**

---

### ⚡ Quick Start Shortcuts
* \`Ctrl / Cmd + K\` : Open **Command Palette** (Access any tool, template, or action)
* \`Ctrl / Cmd + S\` : Save current document
* \`Ctrl / Cmd + B\` : Toggle Sidebar navigation
* \`Ctrl / Cmd + P\` : Toggle Live Split Markdown Preview
* Type \`/\` in an empty line to trigger **Slash Commands**
* Type \`{=FORMULA()}\` for real-time dynamic Excel-like formulas

---

## 🧩 1. Dynamic Formula Engine
ContextPad has a built-in recursive descent formula engine! Formulas evaluate inline or dynamically.

* **Current Timestamp**: \`{=NOW()}\`
* **Today's Date**: \`{=TODAY()}\`
* **Random UUID v4**: \`{=UUID()}\`
* **Text Transformations**: \`{=UPPER("contextpad automation engine")}\`
* **Kebab Case**: \`{=KEBAB("Prompt Engineering Architecture v2")}\`
* **Markdown Formatting**: \`{=BOLD("Notice:")}\` \`{=CODE("api.generateContext()")}\`
* **Mathematical calculations**: \`{=SUM(120, 350, 430)}\` tokens | Average: \`{=ROUND(AVG(12, 45, 89, 99), 2)}\`
* **Document Diagnostics**: Line Count = \`{=LINECOUNT()}\`, Word Count = \`{=WORDCOUNT()}\`, Char Count = \`{=CHARCOUNT()}\`

---

## 🎯 2. Prompt Engineering System Template Example
Below is an example of structured variable placeholders (use **Templates** panel on left or \`{{variable}}\` syntax):

\`\`\`markdown
<system_instruction>
You are an expert {{role:AI Principal Architect}} specializing in {{domain:Cloud Native Systems}}.
Your objective is to {{goal:design an event-driven workflow engine}}.

Follow these strict constraints:
1. {{constraint_1:Always return strict JSON schema without markdown wrap}}
2. {{constraint_2:Include latency SLAs and retry backoff policies}}
3. Tone: {{tone:Technical, precise, and concise}}
</system_instruction>

<user_prompt>
Project Name: {{project_name:HydraMesh}}
Target Scale: {{target_scale:50,000 req/sec}}
Deliverable: Provide architecture blueprint and data flow diagram.
</user_prompt>
\`\`\`

---

## 🤖 3. Live Token & Cost Estimation
Look down at the **Status Bar** at the bottom of the screen! 
ContextPad continuously calculates:
* Exact Token Count across GPT-4o, Claude 3.7, Gemini 2.0 Flash, DeepSeek, etc.
* Estimated query cost in USD ($/1M tokens)
* Percentage utilization of context window
* Character, Word, and Line counts

---

## 🛠️ 4. Sandboxed JavaScript Actions
Execute custom scripts in a secure sandbox with the \`api\` helper:
* Click **Actions** in the activity bar on the left.
* Try running **"Format JSON & Clean Keys"**, **"Extract Template Variables"**, **"Markdown Table to CSV"**, or **"Generate Prompt Breakdown"**.
* You can write your own custom JavaScript actions anytime!

---

## 📊 5. Render Mode: Tables, Mermaid & LaTeX Formulas
Toggle **Rendered** view in the top menu bar (\`Ctrl + M\`) or open split preview (\`Ctrl + P\`) to see rich live rendering:

### Data Tables
| Model | Context Window | Input Cost / 1M | Output Cost / 1M | Latency |
| :--- | :---: | :---: | :---: | :---: |
| Gemini 2.0 Flash | 1,048,576 | $0.10 | $0.40 | ~350ms |
| Claude 3.7 Sonnet | 200,000 | $3.00 | $15.00 | ~780ms |
| GPT-4o | 128,000 | $2.50 | $10.00 | ~620ms |
| DeepSeek V3 | 64,000 | $0.14 | $0.28 | ~420ms |

### Mermaid Architecture Diagrams
\`\`\`mermaid
graph LR
    A[Structured Input] --> B[Live Parser Engine]
    B --> C{Render Mode}
    C -->|Tables| D[Formatted Tables]
    C -->|Diagrams| E[Mermaid SVGs]
    C -->|Formulas| F[KaTeX LaTeX Math]
    D & E & F --> G[Interactive WYSIWYG Workspace]
\`\`\`

### LaTeX Mathematical Notation
Inline math formulas like $f(x) = \\frac{1}{\\sigma \\sqrt{2\\pi}} e^{-\\frac{1}{2}\\left(\\frac{x-\\mu}{\\sigma}\\right)^2}$ or $E = mc^2$ render seamlessly.

Display equations render centered with full typography:

$$
\\mathcal{L}_{\\text{attention}}(Q, K, V) = \\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V
$$

\`\`\`latex
\\int_{-\\infty}^{+\\infty} e^{-x^2} dx = \\sqrt{\\pi}
\`\`\`

### 🖼️ Visual Media & Direct Image Pasting
ContextPad renders images directly inline in Render Mode:
* **Clipboard Paste**: Press \`Ctrl + V\` / \`Cmd + V\` anywhere in the editor to paste screenshots and copied images directly (like in modern AI chat apps). Images are auto-compressed into optimized data URLs so documents remain fast.
* **Drag & Drop**: Drag image files directly onto the editor canvas.
* **Quick Tools**: Use the **Insert Image** button in the Modular Ribbon, the accessory bar, or the \`/image\` slash command.
* **Interactive Hover Controls**: Hover over any rendered image to zoom in with the **Lightbox modal**, copy the image source, or delete it from the current document!

---
*ContextPad is completely local-first and privacy preserving. Enjoy writing and drafting!*
`;

// MOCK: replace with [native template repository / user database]
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

// MOCK: replace with [native action registry / user-defined rust commands]
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
    code: `// Executive Summary Generator
const text = api.getContent();
if (!text.trim()) {
  api.notify("Document is empty", "warning");
  return;
}
api.notify("Analyzing text content...", "info");
const lines = text.split('\\n').filter(l => l.trim().length > 0);
const wordCount = text.split(/\\s+/).filter(Boolean).length;
const charCount = text.length;

const summary = \`## Executive Summary\\n\\n**Key Metrics:**\\n- Total Words: \${wordCount}\\n- Total Characters: \${charCount}\\n- Paragraphs: \${lines.length}\\n\\n**Core Takeaways:**\\n\` + lines.slice(0, 3).map(l => \`- \${l.replace(/^[#*\\-\\s]+/, '')}\`).join('\\n');

api.insertAtCursor('\\n\\n' + summary);
api.notify("Summary appended successfully!", "success");`
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
    code: `const text = api.getContent();
const lines = text.split('\\n');
let modified = false;

const newLines = lines.map(line => {
  if (line.includes('|')) {
    const cells = line.split('|').map(c => c.trim());
    modified = true;
    return cells.join(' | ');
  }
  return line;
});

if (modified) {
  api.setContent(newLines.join('\\n'));
  api.notify("Normalized markdown tables", "success");
} else {
  api.notify("No markdown table found in current document", "info");
}`
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
    code: `const sel = api.getSelection();
const target = sel || api.getContent().split('\\n')[0];
if (!target) {
  api.notify("Nothing to slugify", "warning");
  return;
}
const slug = target
  .toLowerCase()
  .trim()
  .replace(/[^\\w\\s-]/g, '')
  .replace(/[\\s_-]+/g, '-')
  .replace(/^-+|-+$/g, '');

if (sel) {
  api.replaceSelection(slug);
} else {
  api.insertAtCursor(slug);
}
api.notify(\`Generated slug: \${slug}\`, "success");`
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
    code: `const text = api.getContent();
const matches = text.match(/^[ \\t]*- \\[([ xX])\\]\\s+(.+)$/gm);
if (!matches || matches.length === 0) {
  api.notify("No checklist tasks found (- [ ] ...)", "info");
  return;
}
const header = "\\n\\n### Consolidated Task Checklist\\n";
const tasks = matches.join('\\n');
api.insertAtCursor(header + tasks + '\\n');
api.notify(\`Extracted \${matches.length} tasks\`, "success");`
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
    code: `// Format JSON and Sort Keys Action
const text = api.getSelection() || api.getText();
try {
  const parsed = JSON.parse(text);
  
  function sortObjectKeys(obj) {
    if (Array.isArray(obj)) {
      return obj.map(sortObjectKeys);
    } else if (obj !== null && typeof obj === 'object') {
      return Object.keys(obj)
        .sort()
        .reduce((result, key) => {
          result[key] = sortObjectKeys(obj[key]);
          return result;
        }, {});
    }
    return obj;
  }
  
  const sorted = sortObjectKeys(parsed);
  const formatted = JSON.stringify(sorted, null, 2);
  
  if (api.getSelection()) {
    api.replaceSelection(formatted);
  } else {
    api.setText(formatted);
  }
  api.toast('JSON formatted and keys sorted successfully!', 'success');
} catch (e) {
  api.toast('Failed to parse JSON: ' + e.message, 'error');
}`
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
    code: `// Extract and Fill Template Variables Action
const text = api.getText();
const regex = /\\{\\{([^}]+)\\}\\}/g;
const matches = [...text.matchAll(regex)];

if (matches.length === 0) {
  api.toast('No {{variable}} placeholders found in document', 'info');
} else {
  const uniqueVars = Array.from(new Set(matches.map(m => m[1].trim())));
  api.toast(\`Found \${uniqueVars.length} template variable(s). Opening variable filler...\`, 'info');
  api.openVariableModal();
}`
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
    code: `// Markdown Table to CSV Converter
const text = api.getSelection() || api.getText();
const lines = text.split('\\n').filter(l => l.trim().startsWith('|') && l.trim().endsWith('|'));

if (lines.length < 2) {
  api.toast('Please select a valid markdown table (with | header and row lines)', 'warning');
} else {
  const cleanRows = lines
    .filter(line => !line.match(/^\\|?\\s*[-:]+[-| :]*\\|?$/))
    .map(line => {
      return line
        .split('|')
        .slice(1, -1)
        .map(cell => cell.trim().replace(/"/g, '""'));
    });

  const csvContent = cleanRows.map(row => row.map(cell => \`"\${cell}"\`).join(',')).join('\\n');
  api.openTab('Table Export.csv', csvContent, 'text');
  api.toast('Converted markdown table to CSV in new tab!', 'success');
}`
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
    code: `// Deduplicate and Sort Lines
const isSelection = !!api.getSelection();
const text = isSelection ? api.getSelection() : api.getText();
const lines = text.split('\\n');
const uniqueLines = Array.from(new Set(lines.map(l => l.trim()))).filter(l => l.length > 0);
uniqueLines.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

const result = uniqueLines.join('\\n');
if (isSelection) {
  api.replaceSelection(result);
} else {
  api.setText(result);
}
api.toast(\`Deduplicated \${lines.length} lines down to \${uniqueLines.length} sorted unique lines\`, 'success');`
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
    code: `// Evaluate and Bake All Formulas
const text = api.getText();
const formulaRegex = /\\{=([^}]+)\\}/g;

let count = 0;
const evaluated = text.replace(formulaRegex, (match, expression) => {
  try {
    count++;
    const res = api.evaluateFormula(expression.trim());
    return res !== undefined ? String(res) : match;
  } catch (e) {
    return match;
  }
});

if (count > 0) {
  api.setText(evaluated);
  api.toast(\`Successfully evaluated and baked \${count} formula(s) into text\`, 'success');
} else {
  api.toast('No {=FORMULA()} tags found in current document', 'info');
}`
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
    code: `// Wrap with LLM Prompt Tags
const text = api.getSelection() || api.getText();
const wrapped = \`<prompt_context version="1.0" created="{=NOW()}">
<instructions>
\${text}
</instructions>
<output_guardrails>
- Enforce strict JSON output when requesting data structures.
- Do not provide conversational preamble or post-amble.
- Think through edge cases before returning final answer.
</output_guardrails>
</prompt_context>\`;

if (api.getSelection()) {
  api.replaceSelection(wrapped);
} else {
  api.setText(wrapped);
}
api.toast('Wrapped in prompt context tags', 'success');`
  }
];

// MOCK: replace with [native workflow runner / user bookmarks registry]
export const DEFAULT_PINNED_TABS: PinnedTab[] = [
  {
    id: 'workflow-prompt-eval',
    name: 'Prompt Eval & Benchmarking',
    icon: 'Workflow',
    type: 'workflow',
    category: 'Workflows',
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
    type: 'workflow',
    category: 'Workflows',
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
