import { describe, it, expect } from 'vitest';
import { validateRoleRpcAccess, assertRoleRpcAllowed } from '../src/features/omniTerminal/rpc/omniRoleGate';

describe('OmniRoleGate Middleware (FG-18 Verification)', () => {
  describe('Auditor Agent Boundaries', () => {
    it('blocks editor.insert and editor.replace for Auditor Agent', () => {
      const res = validateRoleRpcAccess('Auditor Agent', 'editor', 'insert', { text: 'code' });
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain('Pillar 2 Invariant Violation');

      expect(() => {
        assertRoleRpcAllowed('Auditor Agent', 'editor', 'insert');
      }).toThrow('[OmniRoleGate 403 Forbidden]');
    });

    it('blocks workspace.writeFile on production files for Auditor Agent', () => {
      const res = validateRoleRpcAccess('Auditor Agent', 'workspace', 'writeFile', { path: 'src/App.tsx' });
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain('Auditor Agent may only write to');
    });

    it('allows workspace.writeFile in audits/ directory for Auditor Agent', () => {
      const res = validateRoleRpcAccess('Auditor Agent', 'workspace', 'writeFile', {
        path: 'generated-documents/audits/raw_findings_2026-10-11.md',
      });
      expect(res.allowed).toBe(true);
    });

    it('allows read-only RPCs for Auditor Agent', () => {
      expect(validateRoleRpcAccess('Auditor Agent', 'workspace', 'readFile', { path: 'src/App.tsx' }).allowed).toBe(true);
      expect(validateRoleRpcAccess('Auditor Agent', 'editor', 'getActiveDocument').allowed).toBe(true);
      expect(validateRoleRpcAccess('Auditor Agent', 'tabs', 'list').allowed).toBe(true);
      expect(validateRoleRpcAccess('Auditor Agent', 'notify', 'notify').allowed).toBe(true);
    });
  });

  describe('Prod Agent Boundaries', () => {
    it('allows full read and write access for Prod Agent', () => {
      expect(validateRoleRpcAccess('Prod Agent', 'editor', 'insert', { text: 'code' }).allowed).toBe(true);
      expect(validateRoleRpcAccess('Prod Agent', 'workspace', 'writeFile', { path: 'src/App.tsx' }).allowed).toBe(true);
      expect(validateRoleRpcAccess('Prod Agent', 'tabs', 'create', { title: 'NewTab' }).allowed).toBe(true);
    });
  });

  describe('Tester Agent Boundaries', () => {
    it('blocks workspace.writeFile on source code for Tester Agent', () => {
      const res = validateRoleRpcAccess('Tester Agent', 'workspace', 'writeFile', { path: 'src/store/tabStore.ts' });
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain('Tester Agent authority is restricted to tests');
    });

    it('allows workspace.writeFile on test files and test reports for Tester Agent', () => {
      expect(
        validateRoleRpcAccess('Tester Agent', 'workspace', 'writeFile', { path: 'tests/tabStore.test.ts' }).allowed
      ).toBe(true);
      expect(
        validateRoleRpcAccess('Tester Agent', 'workspace', 'writeFile', {
          path: 'generated-documents/test-reports/test_report_2026-10-11.md',
        }).allowed
      ).toBe(true);
    });
  });
});
