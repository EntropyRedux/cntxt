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

  const viewportLayoutRules = `## Viewport Layout & Anti-Clipping Rules (CRITICAL)
This app runs inside a fixed-height sidebar panel. To ensure elements (especially bottom keypads, action buttons, or status bars) are NEVER clipped:
1. Root container MUST fit the viewport:
   \`\`\`css
   * { box-sizing: border-box; }
   html, body {
     height: 100vh;
     max-height: 100vh;
     margin: 0;
     padding: 10px;
     display: flex;
     flex-direction: column;
     overflow: hidden;
     background: var(--bg-primary);
     color: var(--text-primary);
   }
   \`\`\`
2. Any middle content (tape records, lists, notes, output log) MUST be scrollable:
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
   \`\`\``;

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

## Technical Invariants (CRITICAL)
1. **Single File Only**: Output a single complete HTML file containing all HTML, CSS in \`<style>\`, and JavaScript in \`<script>\`.
2. **Zero External Dependencies**: Do NOT import external CDNs (no unpkg, cdnjs, tailwind cdn, react cdn, font cdn). Write vanilla CSS and vanilla JavaScript.
3. **Viewport & Meta**: Must include:
   \`<meta name="viewport" content="width=device-width, initial-scale=1.0">\`
4. **Sandboxed Environment**: The iframe runs with \`sandbox="allow-scripts allow-same-origin allow-forms allow-modals"\`. Do not attempt top-level navigation.
5. **Size Limit**: Keep payload lightweight (under ~${softSizeKb} KB).
6. **Robust Error Handling**: Handle empty states, invalid inputs, and boundary conditions gracefully with user-friendly notices.
${extra ? `\n## Extra Instructions\n${extra}\n` : ''}
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

## Task
Propose 3 distinct, high-utility sidebar panel app concepts addressing the problem space above.
For each concept, provide:
1. **App Name & 1-line Value Proposition**
2. **Key Inputs, Outputs & Core Interactions**
3. **Layout & Density Recommendation** (Single-column, compact card, or split-pane)
4. **What State Should Be Persisted** (Inputs, checklist items, history log, etc.)
5. **Why it shines in a 360px sidebar** while writing or editing documents.

End your response by asking which concept I want to generate, or offer to combine elements into a custom specification.`;
}

export function buildAdaptPrompt(answers: BlueprintAnswers): string {
  const { appName, existingHtml, targetStateDescription, extra } = answers;
  const htmlPayload = existingHtml?.trim() || '<!-- PASTE YOUR EXISTING HTML APPLICATION CODE HERE -->';
  const nameLabel = appName ? ` for "${appName}"` : '';

  return `# PROMPT: Adapt Existing Web App to CNTXT Panel Architecture${nameLabel}

You are an expert web application architect. Refactor the existing HTML application below so that it adheres strictly to the CNTXT panel architecture, 14-token theme engine, and state synchronization protocol.

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
3. **Viewport & Anti-Clipping Layout**:
   - Root \`html, body\` must have \`height: 100vh; overflow: hidden; margin: 0; padding: 10px;\`.
   - Scrollable body content must have \`flex: 1; min-height: 0; overflow-y: auto;\`.
   - Bottom controls, toolbars, and inputs must have \`flex-shrink: 0;\` to prevent clipping in a 100vh sidebar.
4. **CNTXT State Persistence**:
   - Replace any browser storage (or in-memory-only state) with the CNTXT postMessage protocol:
     - On init: post \`{ type: 'CNTXT_APP_READY' }\` to \`window.parent\`.
     - On message \`CNTXT_STATE_INIT\`: restore application inputs and state variables.
     - On state change: debounce (300ms) and post \`{ type: 'CNTXT_STATE_SAVE', state: serializedState }\` to \`window.parent\`.
   ${targetStateDescription ? `- **State to persist**: ${targetStateDescription}` : '- **State to persist**: Persist all essential user inputs, items, history, and selections.'}
5. **Clean Sandbox Hygiene**:
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
