import { describe, it, expect } from 'vitest';
import { BlueprintAnswersSchema } from '../src/features/panelApps/blueprint/answers';
import {
  buildPanelAppPrompt,
  buildBrainstormPrompt,
  buildAdaptPrompt,
  buildArchetypePrompt,
  CNTXT_THEME_TOKENS,
} from '../src/features/panelApps/blueprint/promptBuilder';
import {
  BUILTIN_TEMPLATES,
  getBuiltinTemplates,
  getTemplateById,
} from '../src/features/panelApps/blueprint/templates';
import { buildAddPersistencePrompt } from '../src/features/panelApps/blueprint/addPersistence';
import { extractHtmlFromReply } from '../src/features/panelApps/import/extractReply';

describe('Panel Apps Flow B: Answers Schema', () => {
  it('validates a correct answers object with default values', () => {
    const valid = BlueprintAnswersSchema.parse({
      appName: 'My Calculator',
      purpose: 'Performs arithmetic calculation',
    });
    expect(valid.appName).toBe('My Calculator');
    expect(valid.persistence).toBe('file');
    expect(valid.layout).toBe('single-column');
    expect(valid.themeMode).toBe('cntxt');
    expect(valid.archetype).toBe('build');
  });

  it('rejects short app names or purposes', () => {
    expect(() =>
      BlueprintAnswersSchema.parse({
        appName: 'A',
        purpose: 'Too',
      })
    ).toThrow();
  });

  it('trims extra whitespace from inputs', () => {
    const parsed = BlueprintAnswersSchema.parse({
      appName: '   Timer App   ',
      purpose: '   Count down timer for tasks   ',
    });
    expect(parsed.appName).toBe('Timer App');
    expect(parsed.purpose).toBe('Count down timer for tasks');
  });

  it('supports brainstorm and adapt archetype fields', () => {
    const parsed = BlueprintAnswersSchema.parse({
      archetype: 'adapt',
      appName: 'Legacy Calculator',
      purpose: 'Adapt to CNTXT',
      existingHtml: '<div>123</div>',
      targetStateDescription: 'Current tape',
    });
    expect(parsed.archetype).toBe('adapt');
    expect(parsed.existingHtml).toBe('<div>123</div>');
    expect(parsed.targetStateDescription).toBe('Current tape');
  });
});

describe('Panel Apps Flow B: Prompt Builder', () => {
  it('embeds all 14 CNTXT theme tokens and color-scheme when themeMode is cntxt', () => {
    const prompt = buildPanelAppPrompt({
      archetype: 'build',
      appName: 'Color Picker',
      purpose: 'Inspect and pick hex colors',
      inputsOutputs: 'Color input, hex display',
      persistence: 'file',
      layout: 'single-column',
      themeMode: 'cntxt',
    });

    expect(prompt).toContain('color-scheme: dark light;');
    for (const token of CNTXT_THEME_TOKENS) {
      expect(prompt).toContain(token);
    }
    expect(CNTXT_THEME_TOKENS.length).toBe(14);
  });

  it('includes state postMessage protocol when persistence is file', () => {
    const prompt = buildPanelAppPrompt({
      archetype: 'build',
      appName: 'Notes App',
      purpose: 'Keep quick notes on the sidebar',
      inputsOutputs: 'Text box',
      persistence: 'file',
      layout: 'single-column',
      themeMode: 'cntxt',
    });

    expect(prompt).toContain('CNTXT_APP_READY');
    expect(prompt).toContain('CNTXT_STATE_INIT');
    expect(prompt).toContain('CNTXT_STATE_SAVE');
  });

  it('switches to localStorage guidance when persistence is native', () => {
    const prompt = buildPanelAppPrompt({
      archetype: 'build',
      appName: 'Native Pad',
      purpose: 'Keep quick notes locally',
      inputsOutputs: 'Text box',
      persistence: 'native',
      layout: 'single-column',
      themeMode: 'custom',
    });

    expect(prompt).toContain('local storage');
    expect(prompt).toContain('cntxt_native_pad_');
    expect(prompt).not.toContain('CNTXT_STATE_SAVE');
  });

  it('includes viewport meta and soft size limit', () => {
    const prompt = buildPanelAppPrompt({
      archetype: 'build',
      appName: 'Widget',
      purpose: 'Small widget',
      inputsOutputs: '',
      persistence: 'none',
      layout: 'compact-card',
      themeMode: 'cntxt',
    });

    expect(prompt).toContain('<meta name="viewport" content="width=device-width, initial-scale=1.0">');
    expect(prompt).toContain('512 KB');
  });

  it('generates brainstorm prompt with sidebar constraints and task structure', () => {
    const prompt = buildBrainstormPrompt({
      archetype: 'brainstorm',
      appName: 'Idea Workshop',
      purpose: 'Brainstorm concepts',
      brainstormTopic: 'Markdown table generation and CSV import',
      persistence: 'file',
      layout: 'single-column',
      themeMode: 'cntxt',
    });

    expect(prompt).toContain('PROMPT: Brainstorm Panel App Concepts for CNTXT');
    expect(prompt).toContain('Markdown table generation and CSV import');
    expect(prompt).toContain('320px–480px width');
    expect(prompt).toContain('3 distinct, high-utility sidebar panel app concepts');
  });

  it('generates adapt prompt wrapping existing HTML and injecting 14 theme tokens', () => {
    const prompt = buildAdaptPrompt({
      archetype: 'adapt',
      appName: 'Existing Timer',
      purpose: 'Port timer to CNTXT',
      existingHtml: '<button id="start">Start</button>',
      targetStateDescription: 'Elapsed seconds',
      persistence: 'file',
      layout: 'single-column',
      themeMode: 'cntxt',
    });

    expect(prompt).toContain('PROMPT: Adapt Existing Web App to CNTXT Panel Architecture for "Existing Timer"');
    expect(prompt).toContain('<button id="start">Start</button>');
    expect(prompt).toContain('CNTXT_APP_READY');
    expect(prompt).toContain('CNTXT_STATE_SAVE');
    expect(prompt).toContain('Elapsed seconds');
    expect(prompt).toContain('var(--bg-primary)');
  });

  it('routes correctly through buildArchetypePrompt dispatcher', () => {
    const buildPrompt = buildArchetypePrompt({
      archetype: 'build',
      appName: 'New Tool',
      purpose: 'Tool purpose here',
      inputsOutputs: '',
      persistence: 'file',
      layout: 'single-column',
      themeMode: 'cntxt',
    });
    expect(buildPrompt).toContain('PROMPT: Create Monolithic Panel App "New Tool"');

    const brainstormPrompt = buildArchetypePrompt({
      archetype: 'brainstorm',
      appName: 'Ideas',
      purpose: 'Ideation',
      brainstormTopic: 'Writing metrics',
      persistence: 'file',
      layout: 'single-column',
      themeMode: 'cntxt',
    });
    expect(brainstormPrompt).toContain('PROMPT: Brainstorm Panel App Concepts');

    const adaptPrompt = buildArchetypePrompt({
      archetype: 'adapt',
      appName: 'Old Calculator',
      purpose: 'Porting',
      existingHtml: '<div>calc</div>',
      persistence: 'file',
      layout: 'single-column',
      themeMode: 'cntxt',
    });
    expect(adaptPrompt).toContain('PROMPT: Adapt Existing Web App to CNTXT Panel Architecture');
  });
});

describe('Panel Apps Flow B: Archetype Templates', () => {
  it('provides a catalog of 3 foundational archetype templates with unique IDs', () => {
    const templates = getBuiltinTemplates();
    expect(templates.length).toBe(3);

    const ids = templates.map((t) => t.id);
    expect(ids).toEqual(['build', 'brainstorm', 'adapt']);
  });

  it('verifies that each template answers conforms to BlueprintAnswersSchema', () => {
    for (const tmpl of BUILTIN_TEMPLATES) {
      const validated = BlueprintAnswersSchema.safeParse(tmpl.answers);
      expect(validated.success).toBe(true);
    }
  });

  it('retrieves template by ID', () => {
    const buildTemplate = getTemplateById('build');
    expect(buildTemplate).toBeDefined();
    expect(buildTemplate?.name).toBe('Build New App');
    expect(buildTemplate?.archetype).toBe('build');

    const adaptTemplate = getTemplateById('adapt');
    expect(adaptTemplate).toBeDefined();
    expect(adaptTemplate?.name).toBe('Adapt Existing App');

    expect(getTemplateById('non-existent')).toBeUndefined();
  });
});

describe('Panel Apps Flow B: Add Persistence Prompt Generator', () => {
  it('generates prompt wrapping existing HTML with state sync protocol', () => {
    const existingHtml = '<!DOCTYPE html><html><body><input id="text"></body></html>';
    const prompt = buildAddPersistencePrompt(existingHtml, {
      appName: 'Existing Form',
      targetStateDescription: 'Input field text',
    });

    expect(prompt).toContain('CNTXT_APP_READY');
    expect(prompt).toContain('CNTXT_STATE_INIT');
    expect(prompt).toContain('CNTXT_STATE_SAVE');
    expect(prompt).toContain(existingHtml);
    expect(prompt).toContain('Input field text');
  });
});

describe('Panel Apps Flow B: Safe AI Reply Extractor', () => {
  it('extracts HTML from standard ```html code blocks', () => {
    const aiReply = `Here is your app:
\`\`\`html
<!DOCTYPE html>
<html>
<head><title>App</title></head>
<body><h1>Hello World</h1></body>
</html>
\`\`\`
Hope this helps!`;

    const result = extractHtmlFromReply(aiReply);
    expect(result).not.toBeNull();
    expect(result?.sourceType).toBe('fence');
    expect(result?.isTruncated).toBe(false);
    expect(result?.html).toContain('<h1>Hello World</h1>');
  });

  it('picks the largest HTML candidate when multiple blocks exist', () => {
    const aiReply = `
Small block:
\`\`\`html
<div>small</div>
\`\`\`

Full application:
\`\`\`html
<!DOCTYPE html>
<html>
<head><style>body { color: red; }</style></head>
<body><h1>Complete Large Application</h1></body>
</html>
\`\`\`
`;
    const result = extractHtmlFromReply(aiReply);
    expect(result).not.toBeNull();
    expect(result?.html).toContain('Complete Large Application');
  });

  it('handles unterminated code fence gracefully and marks isTruncated true', () => {
    const cutOffReply = `\`\`\`html
<!DOCTYPE html>
<html>
<body><p>Stream ended abruptly`;

    const result = extractHtmlFromReply(cutOffReply);
    expect(result).not.toBeNull();
    expect(result?.isTruncated).toBe(true);
    expect(result?.html).toContain('Stream ended abruptly');
  });

  it('falls back to raw <!DOCTYPE html> if no fences are used', () => {
    const rawReply = `Sure!
<!DOCTYPE html>
<html>
<head><title>No Fences</title></head>
<body><button>Click</button></body>
</html>`;

    const result = extractHtmlFromReply(rawReply);
    expect(result).not.toBeNull();
    expect(result?.sourceType).toBe('raw_doctype');
    expect(result?.html).toContain('<button>Click</button>');
  });

  it('normalizes CRLF line endings to LF', () => {
    const crlfReply = '```html\r\n<div>Line 1</div>\r\n<div>Line 2</div>\r\n```';
    const result = extractHtmlFromReply(crlfReply);
    expect(result).not.toBeNull();
    expect(result?.html).toBe('<div>Line 1</div>\n<div>Line 2</div>');
  });

  it('returns null for text with no HTML content', () => {
    expect(extractHtmlFromReply('Hello, how can I assist you today?')).toBeNull();
    expect(extractHtmlFromReply('')).toBeNull();
  });
});
