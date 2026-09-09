import { CompletionContext, CompletionResult, autocompletion } from '@codemirror/autocomplete';
import { Extension } from '@codemirror/state';
import { useImageModalStore } from '../store/imageModalStore';

export interface SlashCommandItem {
  label: string;
  detail?: string;
  info?: string;
  type: string;
  apply: string | ((view: any, completion: any, from: number, to: number) => void);
}

export const SLASH_COMMANDS: SlashCommandItem[] = [
  {
    label: '/image',
    detail: 'Media',
    info: 'Insert image from device or URL',
    type: 'media',
    apply: (view: any, _completion: any, from: number, to: number) => {
      view.dispatch({
        changes: { from, to, insert: '' }
      });
      useImageModalStore.getState().openImageModal();
    }
  },
  {
    label: '/system-prompt',
    detail: 'Prompt Engineering',
    info: 'Insert structured XML system prompt container',
    type: 'template',
    apply: `<system_instruction>
# Role & Purpose
You are an expert {{role:AI Assistant}} specializing in {{domain:General Knowledge}}.
Objective: {{objective:Provide comprehensive, structured analysis}}.

# Rules & Constraints
1. Output format: {{output_format:Structured Markdown with bullet points}}
2. Tone: {{tone:Professional, concise, and clear}}
</system_instruction>\n\n<user_query>\n{{user_request:Enter your prompt here}}\n</user_query>`
  },
  {
    label: '/cot-reasoning',
    detail: 'Chain of Thought',
    info: 'Insert step-by-step reasoning template',
    type: 'template',
    apply: `### Step-by-Step Reasoning Protocol
1. **Understand & Clarify**: Identify core requirements and constraints.
2. **Deconstruct**: Break problem into distinct atomic tasks.
3. **Formulate Solution**: Show intermediate steps and calculations.
4. **Self-Review**: Verify edge cases and failure modes.
5. **Final Output**: Summarize crisp resolution.\n\n`
  },
  {
    label: '/formula-now',
    detail: 'Formula',
    info: 'Insert dynamic timestamp formula',
    type: 'function',
    apply: '{=NOW()}'
  },
  {
    label: '/formula-today',
    detail: 'Formula',
    info: 'Insert dynamic date formula',
    type: 'function',
    apply: '{=TODAY()}'
  },
  {
    label: '/formula-uuid',
    detail: 'Formula',
    info: 'Insert dynamic UUID v4 generator',
    type: 'function',
    apply: '{=UUID()}'
  },
  {
    label: '/mermaid-graph',
    detail: 'Diagram',
    info: 'Insert interactive Mermaid flow diagram',
    type: 'diagram',
    apply: `\`\`\`mermaid
graph TD
    A[Start Step] --> B{Decision Gate}
    B -->|Option 1| C[Action Pipeline]
    B -->|Option 2| D[Fallback Route]
    C --> E[Final Result]
    D --> E
\`\`\`\n`
  },
  {
    label: '/table-template',
    detail: 'Markdown Table',
    info: 'Insert 3x4 Markdown data table',
    type: 'table',
    apply: `| ID | Feature Name | Status | Priority | Notes |
| :--- | :--- | :--- | :--- | :--- |
| 01 | Token Estimator | Completed | High | Exact BPE model heuristics |
| 02 | Formula Engine | Completed | High | 40+ Excel-like functions |
| 03 | Sandbox Actions | Completed | Medium | Safe isolated runtime |\n`
  },
  {
    label: '/code-block',
    detail: 'Code Block',
    info: 'Insert syntax highlighted code block',
    type: 'code',
    apply: `\`\`\`typescript
interface RequestPayload {
  prompt: string;
  model: string;
  temperature: number;
}
\`\`\`\n`
  },
  {
    label: '/task-list',
    detail: 'Checklist',
    info: 'Insert interactive task checklist',
    type: 'list',
    apply: `- [ ] Define objective and key metrics\n- [ ] Run benchmark validation\n- [ ] Review token budget\n- [x] Initial design drafted\n`
  },
  {
    label: '/variable-placeholder',
    detail: 'Template Var',
    info: 'Insert {{variable:default_val}} placeholder',
    type: 'variable',
    apply: '{{variable_name:default_value}}'
  }
];

export function slashCommandExtension(): Extension {
  return autocompletion({
    override: [
      (context: CompletionContext): CompletionResult | null => {
        const word = context.matchBefore(/\/[a-zA-Z0-9_-]*/);
        if (!word) return null;
        if (word.from === word.to && !context.explicit) return null;

        return {
          from: word.from,
          options: SLASH_COMMANDS.map(cmd => ({
            label: cmd.label,
            detail: cmd.detail,
            info: cmd.info,
            type: cmd.type,
            apply: (view, completion, from, to) => {
              const insertText = typeof cmd.apply === 'string' ? cmd.apply : '';
              view.dispatch({
                changes: { from, to, insert: insertText },
                selection: { anchor: from + insertText.length }
              });
            }
          }))
        };
      }
    ]
  });
}
