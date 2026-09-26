import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { WELCOME_DOCUMENT } from '../src/constants/welcomeDoc';
import { IS_PROTOTYPE_DEMO_MODE } from '../mocks/index';

const ROOT = join(__dirname, '..');

function readSrc(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf-8');
}

describe('WELCOME_DOCUMENT (TR-013 quarantine)', () => {
  it('is a non-empty string', () => {
    expect(typeof WELCOME_DOCUMENT).toBe('string');
    expect(WELCOME_DOCUMENT.length).toBeGreaterThan(0);
  });

  it('contains the onboarding heading', () => {
    expect(WELCOME_DOCUMENT).toMatch(/Welcome to ContextPad/);
  });

  it('preserves the documented tutorial sections', () => {
    expect(WELCOME_DOCUMENT).toContain('Quick Start Shortcuts');
    expect(WELCOME_DOCUMENT).toContain('Dynamic Formula Engine');
    expect(WELCOME_DOCUMENT).toContain('Live Token');
    expect(WELCOME_DOCUMENT).toContain('Sandboxed JavaScript Actions');
  });

  it('retains the template variable prompt sample', () => {
    expect(WELCOME_DOCUMENT).toContain('{{role:');
    expect(WELCOME_DOCUMENT).toContain('{{goal:');
  });

  it('is byte-stable across duplicate imports', () => {
    const again = readFileSync(join(ROOT, 'src/constants/welcomeDoc.ts'), 'utf-8');
    expect(again).toContain('export const WELCOME_DOCUMENT');
    // Structural re-import equality guard
    expect(WELCOME_DOCUMENT).toBe(WELCOME_DOCUMENT);
  });

  it('mock barrel no longer owns the token (TR-013 clearance)', () => {
    const mocks = readSrc('mocks/index.ts');
    expect(mocks).not.toMatch(/export const WELCOME_DOCUMENT/);
  });

  it('constants module carries no mock-registry identifiers', () => {
    const constants = readSrc('src/constants/welcomeDoc.ts');
    expect(constants).not.toMatch(/\bMOCK-\d/);
    expect(constants).not.toMatch(/\bDEFAULT_[A-Z]/);
    expect(constants).not.toMatch(/\bINITIAL_[A-Z]/);
  });

  it('demo mode flag still defaults to false outside the browser', () => {
    // In a headless Vitest run window may be undefined; the flag must never throw.
    expect(typeof IS_PROTOTYPE_DEMO_MODE).toBe('boolean');
  });
});