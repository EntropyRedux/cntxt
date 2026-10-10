/**
 * Generates an LLM prompt that instructs an AI to refactor an existing monolithic HTML app
 * to add CNTXT file-backed state persistence without altering its visual layout or behavior.
 */

export interface AddPersistenceOptions {
  appName?: string;
  targetStateDescription?: string;
}

export function buildAddPersistencePrompt(
  existingHtml: string,
  options: AddPersistenceOptions = {}
): string {
  const { appName, targetStateDescription } = options;
  const nameLabel = appName ? ` for "${appName}"` : '';

  return `# PROMPT: Add CNTXT State Persistence${nameLabel}

You are an expert web application architect. Refactor the following self-contained HTML application so that its user state is automatically persisted into the CNTXT document host.

## Existing Application Code
\`\`\`html
${existingHtml.trim()}
\`\`\`

## Requirements
1. **Preserve Functionality & Design**: Do NOT break or redesign existing visual appearance, layouts, or interactive behavior. All existing features must continue to work seamlessly.
2. **Implement CNTXT State Protocol**:
   - On initialization (after DOMContentLoaded / script load), post readiness message:
     \`\`\`javascript
     window.parent.postMessage({ type: 'CNTXT_APP_READY' }, '*');
     \`\`\`
   - Listen for host restoration message:
     \`\`\`javascript
     window.addEventListener('message', (event) => {
       if (event.data && event.data.type === 'CNTXT_STATE_INIT') {
         const savedState = event.data.state;
         if (savedState) {
           // Restore application state/inputs/items
           applyLoadedState(savedState);
         }
       }
     });
     \`\`\`
   - When user state changes (e.g. form inputs, lists, settings, canvas items), debounce save (e.g. 300ms) and dispatch:
     \`\`\`javascript
     window.parent.postMessage({ type: 'CNTXT_STATE_SAVE', state: serializeState() }, '*');
     \`\`\`
${targetStateDescription ? `3. **State to Persist**: ${targetStateDescription}` : '3. **State to Persist**: Capture all essential user inputs, active selections, and state variables.'}
4. **Self-Contained**: Keep everything in a single HTML file with inline \`<style>\` and \`<script>\`. Zero external CDN dependencies.
5. **Output**: Return ONLY the full updated HTML document wrapped in a single \`\`\`html ... \`\`\` code block.`;
}
