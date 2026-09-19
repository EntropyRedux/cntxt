/**
 * Canonical Markdown Formatting Guide for CNTXT
 * Interactive showcase document covering all supported syntax, callouts, math, tables, and shortcuts.
 */
export const MARKDOWN_GUIDE_DOCUMENT = `# CNTXT Markdown Formatting Guide

Welcome to the **CNTXT Markdown Reference Guide**! This interactive reference demonstrates all supported syntax features in both **RAW** and **Rendered** live preview modes.

---

## 1. Typography & Inline Styles

CNTXT supports standard and extended markdown styling:

- **Bold text**: \`**bold**\` or \`__bold__\` → **Bold emphasis**
- *Italic text*: \`*italic*\` or \`_italic_\` → *Italic nuance*
- ***Bold + Italic***: \`***bold and italic***\` → ***Maximum emphasis***
- ~~Strikethrough~~: \`~~deleted text~~\` → ~~Crossed out~~
- ==Highlighted text==: \`==highlighted phrase==\` → ==Glowing mark text==
- \`Inline code\`: \`const model = "gemini-2.5-pro";\` → formatted code snippet
- Subscript and Superscript: \`H~2~O\` → H~2~O, \`E = mc^2^\` → E = mc^2^
- [External Web Link](https://github.com/EntropyRedux/cntxt): \`[Label](https://...)\`

---

## 2. Headings & Document Structure

Headings from level 1 through 6 are styled with proportional typography and automatically indexed in the **Document Outline** sidebar (\`Ctrl+Shift+O\`):

# Heading 1 (Document Title)
## Heading 2 (Major Section)
### Heading 3 (Subsection)
#### Heading 4 (Detailed Component)
##### Heading 5 (Minor Topic)
###### Heading 6 (Fine Detail)

---

## 3. Lists & Task Checklists

### Bullet Lists
- Primary bullet item
  - Nested secondary point
  - Another nested point
- Back to primary bullet

### Numbered Sequences
1. First preparatory step
2. Second execution step
3. Final verification step

### Interactive Task Checklists
- [x] Review proposed architectural changes
- [x] Verify production gates with \`npm run lint\` and \`npm test\`
- [ ] Deploy updated portable build for user validation

---

## 4. GitHub-Style Alert Callout Blocks

CNTXT renders distinctive visual alert callouts for notices, tips, and warnings:

> [!NOTE]
> Helpful background context or relevant design considerations.

> [!TIP]
> Pro-tip: Press \`Alt+Z\` to instantly toggle between Word Wrap and Continuous Text scrolling.

> [!IMPORTANT]
> Non-negotiable architectural invariant or vital requirement.

> [!WARNING]
> Critical cautionary notice regarding data or breaking operational changes.

> [!CAUTION]
> High-risk operation warning that may cause data loss or system errors.

---

## 5. Markdown Tables

Tables support flexible alignment syntax (\`:---\`, \`:---:\`, \`---:\`) and live calculation:

| Metric Name | Type | Target | Status |
| :--- | :---: | :---: | ---: |
| Launch Time (TTFB) | Latency | < 150ms | **112ms** |
| Memory Footprint | Heap | < 90 MB | **58 MB** |
| Test Coverage | Suite | 100% Gates | **151/151 Passed** |
| Contract Sync | Schema | Byte-Identical | **100% In Sync** |

---

## 6. Mathematical Formulas (KaTeX LaTeX)

CNTXT natively renders mathematical formulas in both inline and display block modes:

### Inline Math
The equation of a Gaussian distribution is $f(x) = \\frac{1}{\\sigma \\sqrt{2\\pi}} e^{-\\frac{1}{2}\\left(\\frac{x-\\mu}{\\sigma}\\right)^2}$.

### Display Block Math
$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
$$

$$
\\nabla \\times \\mathbf{B} = \\mu_0 \\left( \\mathbf{J} + \\varepsilon_0 \\frac{\\partial \\mathbf{E}}{\\partial t} \\right)
$$

---

## 7. Fenced Code Blocks & Syntax Highlighting

Code blocks feature syntax highlighting across JavaScript, TypeScript, Python, JSON, SQL, Rust, and more:

\`\`\`typescript
export interface EditorBridge {
  readonly tabId: string;
  insertText(text: string): void;
  getSelection(): string;
  undo(): void;
  redo(): void;
}
\`\`\`

---

## 8. Essential Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| **Ctrl+S** | Save Active Document |
| **Ctrl+Shift+S** | Save As New File |
| **Ctrl+M** | Toggle Mode (RAW ↔ Rendered) |
| **Alt+Z** | Toggle Word Wrap / Continuous Text |
| **Ctrl+F** | Open Find & Replace Banner |
| **Ctrl+K** / **Ctrl+P** | Command Palette |
| **Ctrl+/** | Keyboard Shortcuts Guide |
| **Ctrl+Shift+O** | Document Outline Sidebar |
| **Ctrl+Z** / **Ctrl+Y** | Granular Undo / Redo (250 steps) |
`;
