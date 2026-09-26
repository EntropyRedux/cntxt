/**
 * Static Product Onboarding Welcome Document
 * Migrated from mocks/index.ts in FG-08 to satisfy strict physical mock quarantine (TR-013).
 * This is static tutorial and documentation content presented to users on virgin workspace initialization.
 */

export const WELCOME_DOCUMENT = `# 🚀 Welcome to ContextPad
> **A cross-platform workspace designed for structured writing, prompt engineering, technical drafting, and workflow automation.**

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
