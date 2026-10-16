import { BlueprintAnswers } from './answers';
import { SIZE_SOFT_BYTES } from '../preflight/limits';

export const CNTXT_THEME_TOKENS = [
  '--bg-primary',
  '--bg-secondary',
  '--bg-tertiary',
  '--text-primary',
  '--text-secondary',
  '--text-muted',
  '--accent-primary',
  '--accent-hover',
  '--border-primary',
  '--border-subtle',
  '--card-bg',
  '--card-hover-bg',
  '--sidebar-bg',
  '--sidebar-header-bg',
] as const;

export type CntxtThemeToken = typeof CNTXT_THEME_TOKENS[number];

export function buildPanelAppPrompt(answers: BlueprintAnswers): string {
  const {
    appName,
    purpose,
    inputsOutputs,
    persistence,
    persistNotes,
    layout,
    themeMode,
    extra,
  } = answers;

  const softSizeKb = Math.round(SIZE_SOFT_BYTES / 1024);

  const themeSection =
    themeMode === 'cntxt'
      ? `## Theme Integration (CNTXT Unified Theme Engine)
This app runs inside CNTXT's side panel and MUST match the active host theme (Dark, Light, Cyberpunk, Forest, Nordic, etc.).
1. In your root \`<style>\`, specify:
   \`\`\`css
   :root {
     color-scheme: dark light;
     /* Fallback variables */
     --bg-primary: #18181B;
     --bg-secondary: #1F1F24;
     --bg-tertiary: #25252A;
     --text-primary: #EDEDED;
     --text-secondary: #A1A1AA;
     --text-muted: #71717A;
     --accent-primary: #007ACC;
     --accent-hover: #0066A6;
     --border-primary: #2B2B33;
     --border-subtle: #222228;
     --card-bg: #25252A;
     --card-hover-bg: #2E2E36;
     --sidebar-bg: #1F1F24;
     --sidebar-header-bg: #18181B;
   }
   @media (prefers-color-scheme: light) {
     :root {
       --bg-primary: #EDF2FA;
       --bg-secondary: #F0F4F9;
       --bg-tertiary: #E8EEF5;
       --text-primary: #1F1F1F;
       --text-secondary: #444746;
       --text-muted: #5E6266;
       --accent-primary: #0B57D0;
       --accent-hover: #0842A0;
       --border-primary: #D3D7DC;
       --border-subtle: #E8EEF5;
       --card-bg: #FFFFFF;
       --card-hover-bg: #EDF2FA;
       --sidebar-bg: #F0F4F9;
       --sidebar-header-bg: #E8EEF5;
     }
   }
   \`\`\`
2. ZERO HARDCODED COLORS: Do NOT use hardcoded colors (like #000, #1e1e1e, #ffffff, black, white) for containers, keypads, text, or borders.
3. Rely strictly on these 14 CSS variables:
   ${CNTXT_THEME_TOKENS.map((t) => `- \`var(${t})\``).join('\n   ')}
   - Main page background: \`background-color: var(--bg-primary);\`
   - Cards, panels, inputs, keypads: \`background-color: var(--bg-secondary);\` or \`var(--card-bg);\`
   - Main typography: \`color: var(--text-primary);\`
   - Borders and dividers: \`border-color: var(--border-primary);\` or \`var(--border-subtle);\`
   - Buttons and accents: \`background-color: var(--card-bg);\` with \`var(--accent-primary);\` for primary actions.`
      : `## Visual Design (Custom Dedicated Theme)
Design a polished, modern, and self-contained aesthetic with cohesive color palette, modern typography, crisp borders, and subtle hover interactions. Ensure all colors and contrasts are fully accessible.`;

  const persistenceSection =
    persistence === 'file'
      ? `## State Persistence & Seamless CNTXT SDK
State is saved directly in the user's \`.cntxt\` document by the host. A unified \`window.CNTXT\` SDK is pre-injected into your runtime:
1. Announce readiness on startup:
   \`\`\`javascript
   if (window.CNTXT && window.CNTXT.ready) {
     window.CNTXT.ready();
   } else {
     window.parent.postMessage({ type: 'CNTXT_APP_READY' }, '*');
   }
   \`\`\`
2. Listen for restored state from host:
   \`\`\`javascript
   // Seamless SDK listener
   if (window.CNTXT && window.CNTXT.state) {
     window.CNTXT.state.onInit((savedState) => {
       if (savedState) applyState(savedState);
     });
   }
   // Fallback message listener
   window.addEventListener('message', (event) => {
     if (event.data && event.data.type === 'CNTXT_STATE_INIT') {
       const savedState = event.data.state;
       if (savedState) applyState(savedState);
     }
   });
   \`\`\`
3. Whenever user modifies state (inputs, checklist items, counters, tape history), debounce (e.g. 300ms) and dispatch:
   \`\`\`javascript
   if (window.CNTXT && window.CNTXT.state) {
     window.CNTXT.state.save(serializeState());
   } else {
     window.parent.postMessage({ type: 'CNTXT_STATE_SAVE', state: serializeState() }, '*');
   }
   \`\`\`
${persistNotes ? `Additional persistence notes: ${persistNotes}` : ''}`
      : persistence === 'native'
      ? `## State Persistence (Local Storage)
Persist user state using standard browser local storage (window['local' + 'Storage']).
Prefix your storage key with \`cntxt_${appName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_\` to avoid key collisions.
${persistNotes ? `Additional persistence notes: ${persistNotes}` : ''}`
      : `## State Persistence
This app is stateless across sessions (resets cleanly on re-open).`;

  const layoutGuideline =
    layout === 'two-column'
      ? 'Responsive 2-column or split-pane layout (stacked on narrow screens < 320px width).'
      : layout === 'compact-card'
      ? 'Compact card layout optimized for narrow sidebars (300px to 450px wide) with high density.'
      : layout === 'freeform'
      ? 'Fluid layout suited to dynamic canvas or dashboard widgets.'
      : 'Clean single-column vertical flow with comfortable padding (10px to 14px).';

  const viewportLayoutRules = `## Viewport Layout, Responsive Small Size Mode & Anti-Clipping Rules (CRITICAL)
This app runs inside CNTXT both as a docked side-panel (320px–480px width, 100vh) and as a **freely resizable floating pop-up window** (which users can scale down to a compact utility widget, e.g. 260px × 180px, or expand up to full workspace sizes).
To ensure elements are NEVER clipped and the app looks stunning at ANY size:
1. Root container MUST fit the viewport:
   \`\`\`css
   * { box-sizing: border-box; }
   html, body {
     height: 100vh;
     max-height: 100vh;
     margin: 0;
     padding: 8px;
     display: flex;
     flex-direction: column;
     overflow: hidden;
     background: var(--bg-primary);
     color: var(--text-primary);
   }
   \`\`\`
2. Any middle content (tape records, lists, notes, output log, cards) MUST be scrollable:
   \`\`\`css
   .scrollable-body {
     flex: 1;
     min-height: 0; /* REQUIRED: allows flex child to shrink so bottom is never pushed offscreen */
     overflow-y: auto;
   }
   \`\`\`
3. Bottom controls (keypads, action buttons, input rows, footers) MUST NOT shrink:
   \`\`\`css
   .bottom-controls {
     flex-shrink: 0; /* REQUIRED: prevents keypad or toolbar from being clipped at the bottom */
   }
   \`\`\`
4. **Small Size Mode (Compact Pop-Up Scaling)**:
   Users frequently pop this app out into a small floating widget on their screen. You MUST provide responsive styling so it degrades gracefully into a compact mini-mode when resized small:
   \`\`\`css
   /* Compact / Mini-Widget Mode for small pop-up windows */
   @media (max-width: 320px), (max-height: 360px) {
     html, body {
       padding: 6px;
       font-size: 12px;
     }
     h1, h2, .app-title {
       font-size: 13px !important;
     }
     .timer-display, .metric-value, .hero-display {
       font-size: 1.8rem !important; /* Scale down large hero text */
     }
     .button-group, .keypad, .toolbar {
       gap: 4px !important;
     }
     button, input, select {
       padding: 4px 6px !important;
       font-size: 11px !important;
     }
   }
   \`\`\`
   Ensure the core action (e.g. start/pause timer, quick add, calculate, copy) remains front-and-center even in the smallest pop-up dimensions.`;

  return `# PROMPT: Create Monolithic Panel App "${appName}"

You are an expert web application architect. Build a self-contained, single-file monolithic HTML application named "${appName}".

## Core Purpose & Specifications
- **App Name**: ${appName}
- **Purpose**: ${purpose}
${inputsOutputs ? `- **User Interactions & I/O**: ${inputsOutputs}` : ''}
- **Layout Guideline**: ${layoutGuideline}

${themeSection}

${viewportLayoutRules}

${persistenceSection}

## Host Command Bus & Workspace Integration (window.CNTXT)
If your application interacts with the user's active document, tabs, or workspace, leverage the pre-injected asynchronous \`window.CNTXT\` Host SDK:
1. **Editor Domain**:
   - \`const selection = await window.CNTXT.editor.getSelection();\`
   - \`await window.CNTXT.editor.insert({ text: '# Result\\n', mode: 'cursor' });\` (mode: 'cursor' | 'replace' | 'append')
   - \`await window.CNTXT.editor.insertText('text to insert');\` (convenience helper)
   - \`await window.CNTXT.editor.insertAtCursor('text to insert');\` (convenience helper)
   - \`const doc = await window.CNTXT.editor.getActiveDocument();\` (returns { title, content, language, filePath, isDirty })
2. **Tab Domain**:
   - \`const tabs = await window.CNTXT.tabs.list();\`
   - \`await window.CNTXT.tabs.create({ title: 'Analysis.md', content: '# Analysis\\n...', language: 'markdown' });\`
   - \`await window.CNTXT.tabs.openFile('path/to/file.md');\` (convenience helper: opens tab, reading file content if on disk)
   - \`await window.CNTXT.tabs.focus(tabId);\`
3. **Workspace Domain (Sandboxed to Project Root)**:
   - \`const info = await window.CNTXT.workspace.getInfo();\`
   - \`const files = await window.CNTXT.workspace.listFiles();\` (or with subfolder: \`await window.CNTXT.workspace.listFiles('notes/cards');\`)
   - \`const content = await window.CNTXT.workspace.readFile('notes/scratchpad.md');\` (returns string; also supports destructuring: \`const { content } = ...\`)
   - \`await window.CNTXT.workspace.writeFile('notes/scratchpad.md', newContent);\`
   - \`await window.CNTXT.workspace.appendToFile('notes/scratchpad.md', entryBlock);\` (appends text with newline separator, creates file if missing)
   - \`const tabId = await window.CNTXT.workspace.createVirtualTab('Document Title', markdownContent);\`
4. **User Feedback & Notifications**:
   - \`await window.CNTXT.notify({ type: 'success', title: 'Task Done', message: 'Report generated successfully' });\`
   - \`await window.CNTXT.notify.success('Saved successfully');\`
   - \`await window.CNTXT.ui.showToast('Card saved', 'success');\` (convenience helper)

5. **Universal Standalone Preview Adapter (Recommended Pattern)**:
   If you want the app to be testable in a plain browser tab outside CNTXT, define this universal Host adapter at the top of your script:
   \`\`\`javascript
   const Host = window.CNTXT || {
     workspace: {
       readFile: async (p) => window['local' + 'Storage'].getItem('cntxt_' + p) || '',
       writeFile: async (p, c) => { window['local' + 'Storage'].setItem('cntxt_' + p, c); return true; },
       appendToFile: async (p, t) => {
         const cur = window['local' + 'Storage'].getItem('cntxt_' + p) || '';
         const sep = (cur && !cur.endsWith('\\n')) ? '\\n' : '';
         window['local' + 'Storage'].setItem('cntxt_' + p, cur + sep + t);
         return true;
       },
       listFiles: async (f) => Object.keys(window['local' + 'Storage']).filter(k => k.startsWith('cntxt_' + (f || ''))).map(k => k.replace('cntxt_', ''))
     },
     editor: {
       getSelection: async () => 'Mock selected editor text',
       insert: async (o) => console.log('Insert:', o),
       insertText: async (t) => console.log('Insert:', t),
       insertAtCursor: async (t) => console.log('Insert at cursor:', t)
     },
     tabs: {
       create: async (o) => console.log('Tab create:', o),
       openFile: async (p) => console.log('Open file:', p)
     },
     ui: { showToast: (m, t) => console.log('[' + (t || 'info') + ']', m) },
     notify: (opts) => console.log('[Notify]', opts)
   };
   \`\`\`

## Technical Invariants (CRITICAL)
1. **Single File Only**: Output a single complete HTML file containing all HTML, CSS in \`<style>\`, and JavaScript in \`<script>\`.
2. **Zero External Dependencies**: Do NOT import external CDNs (no unpkg, cdnjs, tailwind cdn, react cdn, font cdn). Write vanilla CSS and vanilla JavaScript.
3. **Viewport & Meta**: Must include:
   \`<meta name="viewport" content="width=device-width, initial-scale=1.0">\`
4. **Sandboxed Environment**: The iframe runs with \`sandbox="allow-scripts allow-same-origin allow-forms allow-modals"\`. Do not attempt top-level navigation.
5. **Size Limit**: Keep payload lightweight (under ~${softSizeKb} KB).
6. **Action Feedback & Visual Observability**: Every button click and async operation MUST produce visible visual feedback in the UI (e.g. updating a list, clearing form inputs, or displaying a status toast). Never swallow errors silently in empty catch blocks; if an operation fails, display an error message to the user.
7. **Markdown Checklist Regex Syntax (CRITICAL)**:
   When writing regular expressions to toggle or match markdown checklist items (e.g. \`- [ ] task\`), you MUST escape the square brackets:
   \`const regex = /^(\\s*-\\s*\\[)[ xX](\\])/;\`
   NEVER write inverted brackets like \`-[)[ xX](]\`, which throws a fatal \`SyntaxError: Unterminated group\` that halts the entire script.
## Output Format
Return ONLY the raw HTML document wrapped in a single \`\`\`html ... \`\`\` code block. Do NOT include markdown commentary before or after the code block.`;
}

export function buildBrainstormPrompt(answers: BlueprintAnswers): string {
  const topic = answers.brainstormTopic || answers.purpose || 'Writing and productivity workspace tool';
  return `# PROMPT: Brainstorm Panel App Concepts for CNTXT

You are an expert product designer and web application architect for CNTXT, a high-performance markdown and document editor.
CNTXT supports persistent side-panel applications (320px–480px width) running in sandboxed iframes alongside documents.

## Problem Space / Focus Area
${topic}

## Architectural Constraints of CNTXT Panel Apps
1. **Sidebar Form Factor**: Width is constrained (320px default, resizable up to 600px). Height is 100vh. Bottom controls must not clip.
2. **Single-File Monolithic Runtime**: Apps run as single-file HTML/CSS/JS without external CDNs.
3. **State Persistence**: Supports file-backed persistent JSON state synchronized with the host active document workspace.
4. **Theme Engine**: Adapts dynamically to CNTXT's 14 CSS theme tokens (--bg-primary, --text-primary, --accent-primary, etc.).
5. **Host Integration (window.CNTXT)**: Apps can be active co-processors communicating via \`window.CNTXT\` (inspect/insert editor text, create editor tabs, query workspace files, pop toast notifications).

## Task
Propose 3 distinct, high-utility sidebar panel app concepts addressing the problem space above.
For each concept, provide:
1. **App Name & 1-line Value Proposition**
2. **Key Inputs, Outputs & Core Interactions**
3. **Layout & Density Recommendation** (Single-column, compact card, or split-pane)
4. **What State Should Be Persisted** (Inputs, checklist items, history log, etc.)
5. **Host SDK Touchpoints** (Does it read selection? Insert notes? Create tabs? Dispatch toasts?)
6. **Why it shines in a 360px sidebar** while writing or editing documents.

End your response by asking which concept I want to generate, or offer to combine elements into a custom specification.`;
}

export function buildAdaptPrompt(answers: BlueprintAnswers): string {
  const { appName, existingHtml, targetStateDescription, extra } = answers;
  const htmlPayload = existingHtml?.trim() || '<!-- PASTE YOUR EXISTING HTML APPLICATION CODE HERE -->';
  const nameLabel = appName ? ` for "${appName}"` : '';

  return `# PROMPT: Adapt Existing Web App to CNTXT Panel Architecture${nameLabel}

You are an expert web application architect. Refactor the existing HTML application below so that it adheres strictly to the CNTXT panel architecture, 14-token theme engine, state synchronization protocol, and Host Command Bus.

## Existing Application Code
\`\`\`html
${htmlPayload}
\`\`\`

## Refactoring Requirements
1. **Preserve Core Logic & Visual Intent**: Keep all existing working features, calculations, and interactions intact while upgrading the container.
2. **Inject CNTXT Unified Theme Tokens (CRITICAL)**:
   - Replace all hardcoded colors (#000, #fff, #1e1e1e, etc.) with the 14 CNTXT CSS theme variables:
     - Backgrounds: \`var(--bg-primary)\`, \`var(--bg-secondary)\`, \`var(--card-bg)\`
     - Typography: \`var(--text-primary)\`, \`var(--text-secondary)\`, \`var(--text-muted)\`
     - Accents & Buttons: \`var(--accent-primary)\`, \`var(--accent-hover)\`
     - Borders: \`var(--border-primary)\`, \`var(--border-subtle)\`
   - Add \`color-scheme: dark light;\` to \`:root\`.
3. **Viewport, Small Size Mode & Anti-Clipping Layout**:
   - Root \`html, body\` must have \`height: 100vh; overflow: hidden; margin: 0; padding: 8px;\`.
   - Scrollable body content must have \`flex: 1; min-height: 0; overflow-y: auto;\`.
   - Bottom controls, toolbars, and inputs must have \`flex-shrink: 0;\` to prevent clipping in a 100vh sidebar.
   - **Small Size Mode**: Provide media queries (\`@media (max-width: 320px), (max-height: 360px)\`) so the app can be used as a compact floating pop-up window without breaking layout.
4. **CNTXT State Persistence & window.CNTXT SDK**:
   - Replace any browser storage (or in-memory-only state) with the pre-injected \`window.CNTXT\` SDK:
     - On init: \`window.CNTXT.ready()\` (or postMessage \`{ type: 'CNTXT_APP_READY' }\`) and listen for restored state via \`window.CNTXT.state.onInit((state) => applyState(state))\` (or fallback \`message\` event with \`CNTXT_STATE_INIT\`).
     - On state change: debounce (300ms) and dispatch \`window.CNTXT.state.save(serializedState)\` (or postMessage \`{ type: 'CNTXT_STATE_SAVE', state: serializedState }\`).
   ${targetStateDescription ? `- **State to persist**: ${targetStateDescription}` : '- **State to persist**: Persist all essential user inputs, items, history, and selections.'}
5. **Host Command Bus Capabilities (Optional Co-Processing)**:
   - If the app benefits from host integration, use the pre-injected \`window.CNTXT\` APIs:
     - Notifications: \`await window.CNTXT.notify({ type: 'success', title: 'Done', message: '...' })\`
     - Editor: \`await window.CNTXT.editor.insert({ text: '...', mode: 'cursor' })\` or \`await window.CNTXT.editor.getSelection()\`
     - Tabs: \`await window.CNTXT.tabs.create({ title: 'Note.md', content: '...', language: 'markdown' })\`
     - Workspace: \`await window.CNTXT.workspace.getInfo()\` or \`await window.CNTXT.workspace.readFile(path)\`
6. **Clean Sandbox Hygiene**:
   - Remove any top-level \`window.top\` or \`window.parent\` location redirects.
   - Remove any external CDN script/style links (bootstrap, tailwind cdn, react cdn, unpkg, cdnjs). Everything must be self-contained vanilla HTML/CSS/JS.
   - Include \`<meta name="viewport" content="width=device-width, initial-scale=1.0">\`.
${extra ? `\n## Extra Instructions\n${extra}\n` : ''}
## Output Format
Return ONLY the refactored, complete HTML document wrapped in a single \`\`\`html ... \`\`\` code block. Do NOT include extraneous markdown commentary.`;
}

export function buildArchetypePrompt(answers: BlueprintAnswers): string {
  switch (answers.archetype) {
    case 'brainstorm':
      return buildBrainstormPrompt(answers);
    case 'adapt':
      return buildAdaptPrompt(answers);
    case 'build':
    default:
      return buildPanelAppPrompt(answers);
  }
}
