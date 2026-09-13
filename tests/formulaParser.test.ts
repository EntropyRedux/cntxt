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
});
