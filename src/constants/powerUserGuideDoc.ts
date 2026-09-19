/**
 * Canonical Power User Guide for CNTXT
 * Interactive showcase document covering in-document action widgets, embedded formulas,
 * prompt template variables, custom JavaScript script authoring, ribbon customization, and keyboard mastery.
 */
export const POWER_USER_GUIDE_DOCUMENT = `# ⚡ CNTXT Power User Guide

Welcome to the **CNTXT Power User Guide**!

CNTXT is not merely a markdown editor—it is a **programmable prompt engineering studio**, **workflow orchestrator**, and **reactive writing environment**. This guide demonstrates how to leverage its advanced capabilities to 10x your productivity.

---

## 1. ⚡ In-Document Interactive Action Buttons

You can embed clickable, native action buttons directly inside your notes, specifications, or prompts using double-bracket syntax:

\`\`\`markdown
[[action:action-id]]
[[action:action-id|Custom Display Label]]
\`\`\`

When viewed in **Rendered Mode** (\`Ctrl+M\`), CNTXT transforms these tags into interactive, styled widget badges. Clicking an action button executes the underlying JavaScript script or transform on your active document or highlighted text.

### Try It Live!
Highlight some text or place your cursor below, then click any of these live buttons:

- [[action:uppercase|UPPERCASE Selected Text]]
- [[action:clean-table|Format & Align Markdown Table]]
- [[action:markdown-table-csv|Convert Markdown Table to CSV / JSON]]
- [[action:format-json|Format JSON & Sort Keys]]
- [[action:extract-vars|Extract Template Variables]]

> [!TIP]
> You can embed in-document action buttons anywhere: inside checklists, test plans, prompt templates, or meeting notes to give your documents one-click executable superpowers!

---

## 2. 🧮 Embedded Dynamic Formulas & The "Bake" Workflow

CNTXT features a built-in **Formula Engine** with over 50 functions. Formulas evaluate dynamically inside your text using the \`{=FORMULA()}\` syntax:

\`\`\`markdown
Today's Date: {=TODAY()}
Document Character Count: {=LEN(selection)}
Calculated Budget: \${=SUM(1200, 450, 850)}
\`\`\`

### Live Formula Examples
- Current Date: \`{=TODAY()}\`
- Formatted Text: \`{=UPPER("cntxt power user")}\`
- Arithmetic Sum: \`{=SUM(15, 25, 60)}\` → 100
- Rounded Average: \`{=ROUND(AVERAGE(88, 92, 97, 79), 1)}\` → 89.0

### The "Bake" Concept
While you are drafting or iterating, keep your formulas live. When you are ready to export, commit, or copy your prompt into an LLM or clipboard:

1. Click **[[action:bake-formulas|Bake / Evaluate All Formulas]]** or press the ribbon button.
2. CNTXT replaces every \`{=...}\` tag with its computed string permanently!

---

## 3. 📑 Advanced Prompt Templates & Variable Engine

CNTXT's **Prompt Template Engine** lets you define reusable blueprints with intelligent variable extraction:

### Variable Syntax
| Syntax | Behavior | Example |
|:---|:---|:---|
| \`{{name}}\` | Interactive text field | \`{{target_audience}}\` |
| \`{{name\|default}}\` | Pre-filled fallback value | \`{{model\|Claude 3.7 Sonnet}}\` |
| \`{{name\|required}}\` | Mandatory field (cannot submit empty) | \`{{api_key\|required}}\` |
| \`{{*fast}}\` | **Fast Expansion Mode**: Bypasses the modal and stamps out all defaults instantly! | Place \`{{*fast}}\` anywhere in the template |

### Extracting Variables on the Fly
Whenever you write or paste a prompt containing \`{{variables}}\`, you don't need to manually replace them:
- Click **[[action:extract-vars|Fill Template Variables]]** or press \`Ctrl+Shift+T\`.
- CNTXT scans the document, presents an interactive modal with all detected variables, and populates your document with your responses.

---

## 4. 🛠️ Authoring Custom JavaScript Automation Scripts

Every action in CNTXT is powered by a sandboxed JavaScript runtime. You can create your own custom actions anytime!

### How to Create an Action:
1. Press \`Ctrl+Shift+A\` to open the **Action Scripts** sidebar.
2. Click **+ New Action**.
3. Give it a name, choose an icon and color, and select its **Selection Behavior**:
   - **Auto**: Replaces selection if highlighted, otherwise inserts at cursor.
   - **Replace**: Strictly overwrites the highlighted text with the return value.
   - **Insert**: Inserts the result adjacent to the cursor without deleting your highlighted text.

### The Sandbox \`api\` Toolbox
Your script receives \`(text, api)\` where \`api\` provides safe workspace helpers:

\`\`\`javascript
/**
 * @param {string} text The currently highlighted text (or entire line if empty)
 * @param {SandboxAPI} api Sandboxed utility library
 */
(text, api) => {
  if (!text) {
    api.toast("Empty Selection", "Please highlight text to wrap", "warning");
    return;
  }

  // Wrap highlighted text in an XML system tag
  const wrapped = \`<context_snippet timestamp="\${new Date().toISOString()}">\\n\${text}\\n</context_snippet>\`;
  api.replaceSelection(wrapped);
  api.toast("Formatted", "Wrapped selection in XML tags", "success");
}
\`\`\`

Available \`api\` methods:
- \`api.replaceSelection(text)\`: Replaces current selection in active editor.
- \`api.wrapSelection(before, after)\`: Wraps selected text with prefix/suffix.
- \`api.insertAtCursor(text)\`: Inserts string at current cursor position.
- \`api.evaluateFormula(formulaExpr)\`: Evaluates any CNTXT formula programmatically.
- \`api.toast(title, message, type)\`: Dispatches a notification banner ('info' | 'success' | 'warning' | 'error').
- \`api.copyToClipboard(text)\`: Writes text directly to the system clipboard.

---

## 5. 🎛️ Customizing Your Workspace

### Modular Ribbon Customization
The top **Modular Ribbon** can be tailored to match your personal workflow:
- **Right-Click** any ribbon item to:
  - Toggle between **Icon Only** and **Icon + Label**.
  - Move Left / Move Right to reorder.
  - Insert visual **Separators**.
  - Remove items you don't use.
- Click the **Sliders Icon** (\`⚙️\`) at the far right of the ribbon to open the **Ribbon Customizer** and add any tool, action, or template.
- Click the **Chevron Down** (\`⌵\`) on the far left to expand the ribbon into **Multi-Row Mode** if you have many pinned items.
- Press \`Ctrl+Shift+R\` to collapse or reveal the ribbon instantly.

### Quick Markdown Formatting Bar
The bottom toolbar provides instant one-touch formatting buttons (bold, italics, code, tables, callouts):
- Click the **Sliders Icon** to change button sizes (\`Small\`, \`Medium\`, \`Large\`) or add buttons from the **Preset Library**.
- Responsive and touch-optimized: Drag horizontally to scroll smoothly across buttons.

---

## 6. ⌨️ Keyboard Shortcuts Mastery

| Shortcut | Action | Description |
|:---|:---|:---|
| \`Ctrl + K\` | **Command Palette** | Search and trigger any command, tool, or template |
| \`Ctrl + M\` | **Toggle Rendered Mode** | Switch between RAW markdown and rich interactive view |
| \`Ctrl + P\` | **Split Live Preview** | Open or close side-by-side split preview |
| \`Ctrl + /\` | **Shortcuts Guide** | Open the full interactive keyboard shortcuts reference |
| \`Ctrl + Shift + R\` | **Toggle Ribbon** | Show or hide the top Modular Ribbon |
| \`Ctrl + Shift + E\` | **Workspace Explorer** | Open file tree and workspace explorer sidebar |
| \`Ctrl + Shift + O\` | **Document Outline** | View live table of contents generated from headings |
| \`Ctrl + Shift + A\` | **Action Scripts** | Open custom JavaScript actions library |
| \`Ctrl + Shift + T\` | **Prompt Templates** | Open prompt engineering templates panel |
| \`Ctrl + Shift + M\` | **Token Estimator** | View live LLM token counts and estimated costs |
| \`Ctrl + N\` | **New Document** | Create a fresh markdown document tab |
| \`Ctrl + W\` | **Close Tab** | Close active tab (undo history safely retained in memory) |
| \`Ctrl + 1..9\` | **Switch Tab** | Jump directly to tabs 1 through 9 |
| \`/\` | **Slash Commands** | Type \`/\` on an empty line for instant element insertion |

---

## 7. 🔍 Interactive Render Mode & Search Unveil

In **Render Mode** (\`Ctrl+M\`), CNTXT gives you the readability of a styled document with the editability of a code editor:

- **Tables**: Styled cleanly with borders and headers.
- **Mermaid Diagrams**: Interactive SVGs rendered live with theme matching (dark/light mode). Click to edit the code.
- **LaTeX Math**: Rendered via KaTeX for crisp mathematical formulas.
- **Base64 Image Folding**: Large inline \`![image](data:image/...)\` strings are automatically collapsed to a single row in RAW mode so your editor stays fast and readable.
- **Search-Unveil**: When searching with \`Ctrl+F\`, matches inside rendered tables, diagrams, or math blocks automatically **temporarily unveil** the raw source text so you can jump to and edit the matched characters immediately!

---

> [!NOTE]
> Have questions, feedback, or custom action ideas? Check out the [CNTXT GitHub Repository](https://github.com/EntropyRedux/cntxt) or join our community discussions!
`;
