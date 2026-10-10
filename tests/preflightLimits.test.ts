import { describe, it, expect } from 'vitest';
import { SIZE_SOFT_BYTES, SIZE_HARD_BYTES } from '../src/features/panelApps/preflight/limits';

describe('preflight limits', () => {
  describe('SIZE_SOFT_BYTES', () => {
    it('is exactly 512 KB (512 * 1024 bytes)', () => {
      expect(SIZE_SOFT_BYTES).toBe(512 * 1024);
      expect(SIZE_SOFT_BYTES).toBe(524288);
    });

    it('is a positive integer', () => {
      expect(SIZE_SOFT_BYTES).toBeGreaterThan(0);
      expect(Number.isInteger(SIZE_SOFT_BYTES)).toBe(true);
    });
  });

  describe('SIZE_HARD_BYTES', () => {
    it('is exactly 2 MB (2 * 1024 * 1024 bytes)', () => {
      expect(SIZE_HARD_BYTES).toBe(2 * 1024 * 1024);
      expect(SIZE_HARD_BYTES).toBe(2097152);
    });

    it('is a positive integer', () => {
      expect(SIZE_HARD_BYTES).toBeGreaterThan(0);
      expect(Number.isInteger(SIZE_HARD_BYTES)).toBe(true);
    });
  });

  describe('relative relationship', () => {
    it('soft limit is less than hard limit', () => {
      expect(SIZE_SOFT_BYTES).toBeLessThan(SIZE_HARD_BYTES);
    });

    it('hard limit is exactly 4 times the soft limit', () => {
      expect(SIZE_HARD_BYTES).toBe(SIZE_SOFT_BYTES * 4);
    });
  });
});
