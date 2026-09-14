import { describe, it, expect } from 'vitest';
import { FormulaEngine } from '../src/services/formulaParser';

describe('FormulaEngine', () => {
  const engine = new FormulaEngine({
    line: 1,
    column: 1,
    lineCount: 10,
    charCount: 250,
    wordCount: 45
  });

  it('evaluates basic arithmetic correctly', () => {
    expect(engine.evaluate('=1 + 2').value).toBe(3);
    expect(engine.evaluate('=10 - 4').value).toBe(6);
    expect(engine.evaluate('=3 * 7').value).toBe(21);
    expect(engine.evaluate('=20 / 4').value).toBe(5);
  });

  it('evaluates math functions SUM, MIN, MAX, AVERAGE', () => {
    expect(engine.evaluate('=SUM(1, 2, 3, 4)').value).toBe(10);
    expect(engine.evaluate('=MIN(5, 2, 9, 1)').value).toBe(1);
    expect(engine.evaluate('=MAX(5, 2, 9, 1)').value).toBe(9);
    expect(engine.evaluate('=AVERAGE(10, 20, 30)').value).toBe(20);
  });

  it('evaluates string functions UPPER, LOWER, LEN', () => {
    expect(engine.evaluate('=UPPER("contextpad")').value).toBe('CONTEXTPAD');
    expect(engine.evaluate('=LOWER("HELLO")').value).toBe('hello');
    expect(engine.evaluate('=LEN("test")').value).toBe(4);
  });

  it('evaluates document metrics WORDS, CHARS, LINES', () => {
    expect(engine.evaluate('=WORDS()').value).toBe(45);
    expect(engine.evaluate('=CHARS()').value).toBe(250);
    expect(engine.evaluate('=LINES()').value).toBe(10);
  });

  it('handles empty input gracefully', () => {
    const res = engine.evaluate('');
    expect(res.success).toBe(true);
    expect(res.value).toBe('');
  });

  it('handles division by zero gracefully without crashing', () => {
    const res = engine.evaluate('=10 / 0');
    expect(res.value).toBe('#DIV/0!');
  });

  it('resolves selection keyword and parameterless formatting transforms', () => {
    const selEngine = new FormulaEngine({
      line: 2,
      column: 5,
      lineCount: 3,
      charCount: 35,
      wordCount: 7,
      selectedText: 'Featured Section'
    });

    // Resolves identifier 'selection' and 'selected'
    expect(selEngine.evaluate('=UPPER(selection)').value).toBe('FEATURED SECTION');
    expect(selEngine.evaluate('=LOWER(selected)').value).toBe('featured section');
    expect(selEngine.evaluate('=selection').value).toBe('Featured Section');

    // Default to selection when called without arguments
    expect(selEngine.evaluate('=BOLD()').value).toBe('**Featured Section**');
    expect(selEngine.evaluate('=ITALIC()').value).toBe('*Featured Section*');
    expect(selEngine.evaluate('=STRIKE()').value).toBe('~~Featured Section~~');
    expect(selEngine.evaluate('=CODE()').value).toBe('`Featured Section`');
    expect(selEngine.evaluate('=QUOTE()').value).toBe('> Featured Section');
    expect(selEngine.evaluate('=WRAP(selection, "[", "]")').value).toBe('[Featured Section]');
    expect(selEngine.evaluate('=PARENTHESES()').value).toBe('(Featured Section)');
    expect(selEngine.evaluate('=SLUGIFY()').value).toBe('featured-section');
  });

  it('evaluates line list operations with selection', () => {
    const listEngine = new FormulaEngine({
      selectedText: 'Beta\nAlpha\nGamma'
    });

    expect(listEngine.evaluate('=SORT(selection)').value).toBe('Alpha\nBeta\nGamma');
    expect(listEngine.evaluate('=SORTDESC(selection)').value).toBe('Gamma\nBeta\nAlpha');
    expect(listEngine.evaluate('=BULLETLIST(selection)').value).toBe('* Beta\n* Alpha\n* Gamma');
    expect(listEngine.evaluate('=CHECKLIST(selection)').value).toBe('- [ ] Beta\n- [ ] Alpha\n- [ ] Gamma');
    expect(listEngine.evaluate('=INDENT(selection, 2)').value).toBe('  Beta\n  Alpha\n  Gamma');
  });

  it('supports custom formula expressions with nested arithmetic and string concatenation', () => {
    const exprEngine = new FormulaEngine({
      lineCount: 5,
      charCount: 120,
      selectedText: 'Custom Section'
    });

    const res = exprEngine.evaluate('="Chars: " + (CHARS() * 2) + " / Lines: " + LINES() + " / " + UPPER(selection)');
    expect(res.success).toBe(true);
    expect(res.value).toBe('Chars: 240 / Lines: 5 / CUSTOM SECTION');
  });

  it('allows registering and evaluating custom extensible functions', () => {
    // Static registration
    FormulaEngine.registerFunction('CUSTOM_GREETING', (args, ctx) => {
      const name = args[0] || ctx.selectedText || 'world';
      return `Hello, ${name}!`;
    }, {
      category: 'Text',
      description: 'Greets someone or the selected text',
      example: 'CUSTOM_GREETING("Alice")'
    });

    const testEngine = new FormulaEngine({
      selectedText: 'Alex'
    });

    expect(testEngine.evaluate('=CUSTOM_GREETING()').value).toBe('Hello, Alex!');
    expect(testEngine.evaluate('=CUSTOM_GREETING("Bob")').value).toBe('Hello, Bob!');

    // Instance registration
    testEngine.registerFunction('DOUBLE_WORD', (args) => {
      const str = args[0] || '';
      return `${str} ${str}`;
    });
    expect(testEngine.evaluate('=DOUBLE_WORD("Hi")').value).toBe('Hi Hi');

    // Clean up
    FormulaEngine.unregisterFunction('CUSTOM_GREETING');
    const unregisteredRes = testEngine.evaluate('=CUSTOM_GREETING()');
    expect(unregisteredRes.success).toBe(false);
    expect(unregisteredRes.error).toContain('Unknown formula function: CUSTOM_GREETING');
  });

  it('evaluates INSERT and REPLACE_SELECTION directives', () => {
    const selEngine = new FormulaEngine({
      selectedText: 'Headline'
    });

    const insertRes = selEngine.evaluate('=INSERT(" [Tag: " + UPPER(selection) + "]")');
    expect(insertRes.success).toBe(true);
    expect(insertRes.value).toBe(' [Tag: HEADLINE]');

    const replaceRes = selEngine.evaluate('=REPLACE_SELECTION("## " + selection)');
    expect(replaceRes.success).toBe(true);
    expect(replaceRes.value).toBe('## Headline');
  });
});
