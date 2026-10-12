import { describe, it, expect } from 'vitest';
import { parseAnsi, sanitizeAnsiText } from '../src/features/terminal/ansiParser';

describe('ansiParser (Terminal ANSI Tokenizer)', () => {
  it('parses plain text without ANSI codes', () => {
    const tokens = parseAnsi('Hello world');
    expect(tokens).toHaveLength(1);
    expect(tokens[0].text).toBe('Hello world');
    expect(tokens[0].bold).toBeUndefined();
    expect(tokens[0].color).toBeUndefined();
  });

  it('parses colored text (green and red)', () => {
    const raw = '\x1b[32mSuccess!\x1b[0m \x1b[31mError!\x1b[0m';
    const tokens = parseAnsi(raw);

    expect(tokens.length).toBeGreaterThanOrEqual(2);
    expect(tokens[0].text).toBe('Success!');
    expect(tokens[0].color).toBe('#22c55e');

    const errToken = tokens.find(t => t.text.includes('Error!'));
    expect(errToken).toBeDefined();
    expect(errToken?.color).toBe('#ef4444');
  });

  it('handles bold and underline attributes', () => {
    const raw = '\x1b[1m\x1b[4mBold Underline\x1b[0m';
    const tokens = parseAnsi(raw);

    expect(tokens[0].text).toBe('Bold Underline');
    expect(tokens[0].bold).toBe(true);
    expect(tokens[0].underline).toBe(true);
  });

  it('strips non-formatting OSC and cursor control sequences', () => {
    const raw = '\x1b]0;Title\x07\x1b[2KClean Line';
    const clean = sanitizeAnsiText(raw);
    expect(clean).toBe('Clean Line');
  });
});
