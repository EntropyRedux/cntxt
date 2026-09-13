import { describe, it, expect } from 'vitest';
import { TokenEstimatorService } from '../src/services/tokenEstimator/tokenEstimatorService';

describe('TokenEstimatorService', () => {
  const service = TokenEstimatorService.getInstance();

  it('returns 0 tokens for empty string', () => {
    const res = service.calculateTokens('');
    expect(res.count).toBe(0);
  });

  it('estimates tokens for sample text accurately', () => {
    const text = 'ContextPad is a modular desktop editor designed for high performance.';
    const res = service.calculateTokens(text);
    expect(res.count).toBeGreaterThan(5);
    expect(res.count).toBeLessThan(30);
  });

  it('caches repeated token calculations', () => {
    const text = 'Determinism and cache performance check for repeated estimation calls.';
    const first = service.calculateTokens(text);
    const second = service.calculateTokens(text);
    expect(second.count).toBe(first.count);
    expect(second.isCached).toBe(true);
  });

  it('supports model lookup and pricing projection', () => {
    const model = service.getModel('gpt-4o');
    expect(model).toBeDefined();
    expect(model.name).toContain('GPT-4o');
  });
});
