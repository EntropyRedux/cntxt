/**
 * Omni Terminal Role Gate Middleware
 * 
 * Enforces strict architectural role boundaries (Pillar 2 & Pillar 8 invariants):
 * - Auditor Agent: Strictly read-only code. Blocked from code insertion and production file edits.
 * - Prod Agent: Full realization authority.
 * - Tester Agent: Scoped write authority restricted to test files and test reports.
 */

import { CntxtRpcDomain, OmniAgentRole } from '../../../contracts/data_shapes';

export interface RoleRpcValidationResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Validates whether an agent with a given role is authorized to invoke a specific Host RPC method
 */
export function validateRoleRpcAccess(
  role: OmniAgentRole,
  domain: CntxtRpcDomain,
  method: string,
  params?: Record<string, unknown>
): RoleRpcValidationResult {
  if (role === 'Auditor Agent') {
    // Invariant: Auditor CANNOT edit active editor document
    if (domain === 'editor' && (method === 'insert' || method === 'replace' || method === 'replaceSelection')) {
      return {
        allowed: false,
        reason: 'Pillar 2 Invariant Violation: Auditor Agent is strictly read-only; editor modifications are prohibited.',
      };
    }

    // Invariant: Auditor CANNOT overwrite production source files
    if (domain === 'workspace' && method === 'writeFile') {
      const targetPath = String(params?.path || '').replace(/\\/g, '/');
      const isAuditDoc = targetPath.includes('audits/') || targetPath.includes('generated-documents/audits/');
      const isReportDoc = targetPath.includes('test-reports/') || targetPath.endsWith('.cntxt');

      if (!isAuditDoc && !isReportDoc) {
        return {
          allowed: false,
          reason: `Pillar 2 Invariant Violation: Auditor Agent may only write to 'audits/' or session logs. Attempted write to '${targetPath}' is blocked.`,
        };
      }
    }
  }

  if (role === 'Tester Agent') {
    // Tester can only write test suites, fixtures, or test reports
    if (domain === 'workspace' && method === 'writeFile') {
      const targetPath = String(params?.path || '').replace(/\\/g, '/');
      const isTestPath =
        targetPath.includes('tests/') ||
        targetPath.includes('__fixtures__/') ||
        targetPath.includes('test-reports/') ||
        targetPath.endsWith('.cntxt');

      if (!isTestPath) {
        return {
          allowed: false,
          reason: `Tester Agent authority is restricted to tests and test reports. Attempted write to '${targetPath}' is blocked.`,
        };
      }
    }
  }

  return { allowed: true };
}

/**
 * Throws an Error if the role is not authorized to call the RPC method
 */
export function assertRoleRpcAllowed(
  role: OmniAgentRole,
  domain: CntxtRpcDomain,
  method: string,
  params?: Record<string, unknown>
): void {
  const check = validateRoleRpcAccess(role, domain, method, params);
  if (!check.allowed) {
    throw new Error(`[OmniRoleGate 403 Forbidden] ${check.reason}`);
  }
}
