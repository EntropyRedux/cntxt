import {
  CompletionContext,
  CompletionResult,
  Completion,
  autocompletion,
  startCompletion
} from '@codemirror/autocomplete';
import { EditorView, keymap } from '@codemirror/view';
import { Extension, Prec } from '@codemirror/state';
import { useImageModalStore } from '../store/imageModalStore';
import { useActionStore } from '../store/actionStore';
import { useTemplateStore } from '../store/templateStore';
import { useNotificationStore } from '../store/notificationStore';
import { processTemplateVariables } from '../services/editor/templateVariableService';
import { copyText } from '../adapters/domHelper';

export interface SlashCommandItem {
  id?: string;
  label: string;
  detail?: string;
  info?: string;
  type: string;
  category?: string;
  apply: string | ((view: EditorView, completion: Completion, from: number, to: number) => void);
}

export const STATIC_SLASH_COMMANDS: SlashCommandItem[] = [
  {
    label: '/image',
    detail: 'Media',
    info: 'Insert image from device or URL',
    type: 'keyword',
    apply: (view: EditorView, _completion: Completion, from: number, to: number) => {
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
    type: 'text',
    apply: `<system_instruction>\n# Role & Purpose\nYou are an expert {{role:AI Assistant}} specializing in {{domain:General Knowledge}}.\nObjective: {{objective:Provide comprehensive, structured analysis}}.\n\n# Rules & Constraints\n1. Output format: {{output_format:Structured Markdown with bullet points}}\n2. Tone: {{tone:Professional, concise, and clear}}\n</system_instruction>\n\n<user_query>\n{{user_request:Enter your prompt here}}\n</user_query>`
  },
  {
    label: '/cot-reasoning',
    detail: 'Chain of Thought',
    info: 'Insert step-by-step reasoning template',
    type: 'text',
    apply: `### Step-by-Step Reasoning Protocol\n1. **Understand & Clarify**: Identify core requirements and constraints.\n2. **Deconstruct**: Break problem into distinct atomic tasks.\n3. **Formulate Solution**: Show intermediate steps and calculations.\n4. **Self-Review**: Verify edge cases and failure modes.\n5. **Final Output**: Summarize crisp resolution.\n\n`
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
    type: 'text',
    apply: `\`\`\`mermaid\ngraph TD\n    A[Start Step] --> B{Decision Gate}\n    B -->|Option 1| C[Action Pipeline]\n    B -->|Option 2| D[Fallback Route]\n    C --> E[Final Result]\n    D --> E\n\`\`\`\n`
  },
  {
    label: '/table-template',
    detail: 'Markdown Table',
    info: 'Insert 3x4 Markdown data table',
    type: 'text',
    apply: `| ID | Feature Name | Status | Priority | Notes |\n| :--- | :--- | :--- | :--- | :--- |\n| 01 | Token Estimator | Completed | High | Exact BPE heuristics |\n| 02 | Formula Engine | Completed | High | 40+ Excel functions |\n| 03 | Sandbox Actions | Completed | Medium | Safe isolated runtime |\n`
  },
  {
    label: '/code-block',
    detail: 'Code Block',
    info: 'Insert syntax highlighted code block',
    type: 'text',
    apply: `\`\`\`typescript\ninterface RequestPayload {\n  prompt: string;\n  model: string;\n  temperature: number;\n}\n\`\`\`\n`
  },
  {
    label: '/task-list',
    detail: 'Checklist',
    info: 'Insert interactive task checklist',
    type: 'text',
    apply: `- [ ] Define objective and key metrics\n- [ ] Run benchmark validation\n- [ ] Review token budget\n- [x] Initial design drafted\n`
  },
  {
    label: '/variable-placeholder',
    detail: 'Template Var',
    info: 'Insert {{variable:default_val}} placeholder',
    type: 'variable',
    apply: '{{variable_name:default_value}}'
  },
  {
    label: '/variable-input',
    detail: 'Interactive Input',
    info: 'Insert [[{{field_name:default_val}}]] live input field',
    type: 'variable',
    apply: '[[{{field_name:default_value}}]]'
  }
];

export class SlashCommandRegistry {
  private commands = new Map<string, SlashCommandItem>();

  constructor() {
    this.resetCommands();
  }

  resetCommands(): void {
    this.commands.clear();
    for (const cmd of STATIC_SLASH_COMMANDS) {
      const id = cmd.id || cmd.label;
      this.commands.set(id, { ...cmd, id });
    }
  }

  registerCommand(cmd: SlashCommandItem): void {
    const id = cmd.id || cmd.label;
    this.commands.set(id, { ...cmd, id });
  }

  unregisterCommand(idOrLabel: string): boolean {
    if (this.commands.has(idOrLabel)) {
      return this.commands.delete(idOrLabel);
    }
    for (const [id, cmd] of this.commands.entries()) {
      if (cmd.label === idOrLabel) {
        return this.commands.delete(id);
      }
    }
    return false;
  }

  getCommands(): SlashCommandItem[] {
    return Array.from(this.commands.values());
  }

  getCommandById(idOrLabel: string): SlashCommandItem | undefined {
    const direct = this.commands.get(idOrLabel);
    if (direct) return direct;
    for (const cmd of this.commands.values()) {
      if (cmd.label === idOrLabel) return cmd;
    }
    return undefined;
  }

  getCatalog(): Array<{ id: string; label: string; detail?: string; info?: string; type: string; category?: string }> {
    return this.getCommands().map(c => ({
      id: c.id || c.label,
      label: c.label,
      detail: c.detail,
      info: c.info,
      type: c.type,
      category: c.category || c.detail || 'General'
    }));
  }
}

export const slashCommandEngine = new SlashCommandRegistry();

/**
 * Autocompletion source that generates unified options for Actions, Templates, and Slash Commands.
 * Responds to both explicit triggers (Ctrl+Space, Mod-Space) and inline slash command typing (/...).
 */
export function completionSource(context: CompletionContext): CompletionResult | null {
  const slashWord = context.matchBefore(/\/[a-zA-Z0-9_-]*/);
  const word = context.matchBefore(/\w*/);

  // If not an explicit trigger (Ctrl+Space) and no leading slash was typed, do not activate
  if (!context.explicit && !slashWord) {
    return null;
  }

  const options: Completion[] = [];
  const isSlashActive = Boolean(slashWord);

  // 1. Actions from ActionStore
  const actions = useActionStore.getState().getEnabledActions();
  actions.forEach(action => {
    const isButton = action.type === 'button';
    const typeLabel = isButton ? '[BTN]' : '[CMD]';

    const actionApply = async (view: EditorView, _completion: Completion, applyFrom: number, applyTo: number) => {
      try {
        if (isButton) {
          const insertWidget = `[[action:${action.id}]]`;
          view.dispatch({
            changes: { from: applyFrom, to: applyTo, insert: insertWidget },
            selection: { anchor: applyFrom + insertWidget.length }
          });
          useNotificationStore.getState().addNotification(
            'Button Inserted',
            `Inserted widget for "${action.name}"`,
            'success'
          );
        } else {
          // Remove the typed trigger query from editor
          view.dispatch({
            changes: { from: applyFrom, to: applyTo, insert: '' },
            selection: { anchor: applyFrom }
          });

          const { executeActionById } = await import('../services/actionExecutor');
          await executeActionById(action.id, view);
        }
      } catch (err: any) {
        useNotificationStore.getState().addNotification('Action Failed', err?.message || 'Error executing action', 'error');
      }
    };

    options.push({
      label: action.name,
      detail: `${typeLabel} ${action.category || 'Action'}`,
      info: action.description || (isButton ? 'Insert interactive button widget' : 'Run custom action script'),
      type: isButton ? 'method' : 'function',
      boost: 3,
      section: 'Actions',
      apply: actionApply
    });

    if (isSlashActive) {
      const slug = action.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      if (slug) {
        options.push({
          label: `/${slug}`,
          detail: `${typeLabel} ${action.category || 'Action'}`,
          info: action.description || (isButton ? 'Insert interactive button widget' : 'Run custom action script'),
          type: isButton ? 'method' : 'function',
          boost: 3,
          section: 'Actions',
          apply: actionApply
        });
      }
    }
  });

  // 2. Templates from TemplateStore
  const templates = useTemplateStore.getState().getVisibleTemplates();
  templates.forEach(template => {
    const varCount = template.variables ? template.variables.length : 0;
    const templateApply = (view: EditorView, _completion: Completion, applyFrom: number, applyTo: number) => {
      try {
        const selection = view.state.selection.main;
        const selectedText = view.state.doc.sliceString(selection.from, selection.to);
        const processed = processTemplateVariables(template.content, selectedText);

        view.dispatch({
          changes: { from: applyFrom, to: applyTo, insert: processed.content },
          selection: {
            anchor: processed.cursorOffset !== null
              ? applyFrom + processed.cursorOffset
              : applyFrom + processed.content.length
          }
        });

        useNotificationStore.getState().addNotification(
          'Template Inserted',
          `Inserted "${template.name}"`,
          'success'
        );
      } catch (err: unknown) {
        console.error('Error applying template:', err);
        useNotificationStore.getState().addNotification(
          'Template Error',
          err instanceof Error ? err.message : `Failed to apply template "${template.name}"`,
          'error'
        );
      }
    };

    options.push({
      label: template.name,
      detail: `[TMPL] ${template.category || 'Template'}`,
      info: varCount > 0 ? `Variables: ${template.variables.join(', ')}` : (template.description || 'Insert template'),
      type: 'text',
      boost: 2,
      section: 'Templates',
      apply: templateApply
    });

    if (isSlashActive) {
      const slug = template.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      if (slug) {
        options.push({
          label: `/${slug}`,
          detail: `[TMPL] ${template.category || 'Template'}`,
          info: varCount > 0 ? `Variables: ${template.variables.join(', ')}` : (template.description || 'Insert template'),
          type: 'text',
          boost: 2,
          section: 'Templates',
          apply: templateApply
        });
      }
    }
  });

  // 3. Dynamic Slash Commands & Snippets from engine
  slashCommandEngine.getCommands().forEach(cmd => {
    options.push({
      label: cmd.label,
      detail: cmd.detail,
      info: cmd.info,
      type: cmd.type,
      boost: 1,
      section: 'Commands',
      apply: (view: EditorView, completion: Completion, applyFrom: number, applyTo: number) => {
        if (typeof cmd.apply === 'function') {
          cmd.apply(view, completion, applyFrom, applyTo);
        } else if (typeof cmd.apply === 'string') {
          view.dispatch({
            changes: { from: applyFrom, to: applyTo, insert: cmd.apply },
            selection: { anchor: applyFrom + cmd.apply.length }
          });
        }
      }
    });
  });

  // Compute starting position for filtering
  let from = context.pos;
  if (slashWord) {
    from = slashWord.from;
  } else if (context.explicit && word && word.from < word.to) {
    const query = word.text.toLowerCase();
    const hasMatchingOption = options.some(opt =>
      opt.label.toLowerCase().includes(query) ||
      (opt.detail && opt.detail.toLowerCase().includes(query))
    );
    from = hasMatchingOption ? word.from : context.pos;
  } else {
    from = context.pos;
  }

  return {
    from,
    options,
    filter: true
  };
}

/**
 * DOM event handler capturing Ctrl+Space, Mod-Space, and Alt+/ at the highest priority
 */
export const completionDomHandler = Prec.highest(
  EditorView.domEventHandlers({
    keydown(event: KeyboardEvent, view: EditorView) {
      const isSpace = event.code === 'Space' || event.key === ' ' || event.key === 'Spacebar' || event.keyCode === 32;
      const isCtrlOrCmd = event.ctrlKey || event.metaKey;
      const isAltSlash = event.altKey && (event.key === '/' || event.code === 'Slash');

      if ((isCtrlOrCmd && isSpace) || isAltSlash) {
        event.preventDefault();
        event.stopPropagation();
        startCompletion(view);
        return true;
      }
      return false;
    }
  })
);

/**
 * Keymap binding Ctrl+Space, Mod-Space, and Alt+/ explicitly to start completion
 */
export const completionKeymap = Prec.highest(
  keymap.of([
    {
      key: 'Ctrl-Space',
      run: (view: EditorView) => {
        startCompletion(view);
        return true;
      }
    },
    {
      key: 'Mod-Space',
      run: (view: EditorView) => {
        startCompletion(view);
        return true;
      }
    },
    {
      key: 'Alt-/',
      run: (view: EditorView) => {
        startCompletion(view);
        return true;
      }
    }
  ])
);

/**
 * Custom theme for autocompletion popup aligned with CNTXT theme tokens
 */
const completionTheme = EditorView.theme({
  '.cm-tooltip.cm-tooltip-autocomplete': {
    backgroundColor: 'var(--card-bg, #1e1e1e)',
    border: '1px solid var(--border-primary, #333333)',
    borderRadius: '8px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
    maxHeight: '360px',
    minWidth: '300px',
    zIndex: '2000',
    padding: '4px',
    fontFamily: 'inherit'
  },
  '.cm-tooltip.cm-tooltip-autocomplete > ul': {
    fontFamily: 'inherit',
    maxHeight: 'inherit',
    padding: '2px',
    margin: '0',
    listStyle: 'none',
    overflowY: 'auto'
  },
  '.cm-tooltip.cm-tooltip-autocomplete > ul > li': {
    padding: '6px 10px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    color: 'var(--text-primary, #ffffff)',
    fontSize: '12px'
  },
  '.cm-tooltip.cm-tooltip-autocomplete > ul > li[aria-selected]': {
    backgroundColor: 'var(--card-hover-bg, #2a2a2a)',
    color: 'var(--accent-primary, #a855f7)'
  },
  '.cm-tooltip.cm-tooltip-autocomplete .cm-completionSection': {
    padding: '6px 10px 2px',
    fontSize: '10px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: 'var(--text-muted, #888888)',
    borderTop: '1px solid var(--border-primary, #333333)',
    marginTop: '4px'
  },
  '.cm-tooltip.cm-tooltip-autocomplete .cm-completionSection:first-child': {
    borderTop: 'none',
    marginTop: '0'
  },
  '.cm-tooltip.cm-tooltip-autocomplete .cm-completionLabel': {
    fontWeight: '500',
    fontSize: '12px'
  },
  '.cm-tooltip.cm-tooltip-autocomplete .cm-completionDetail': {
    fontSize: '10px',
    color: 'var(--text-muted, #888888)',
    marginLeft: 'auto',
    fontStyle: 'normal',
    fontWeight: '600'
  },
  '.cm-completionInfo': {
    backgroundColor: 'var(--card-bg, #1e1e1e)',
    border: '1px solid var(--border-primary, #333333)',
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '11px',
    color: 'var(--text-secondary, #cccccc)',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)',
    maxWidth: '280px'
  }
});

export function slashCommandExtension(): Extension {
  return [
    completionDomHandler,
    completionKeymap,
    autocompletion({
      override: [completionSource],
      activateOnTyping: true,
      defaultKeymap: true,
      closeOnBlur: true,
      icons: true
    }),
    completionTheme
  ];
}
