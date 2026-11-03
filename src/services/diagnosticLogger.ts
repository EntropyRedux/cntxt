/**
 * Diagnostic Logger & In-Memory Ring Buffer (Pillar 9 Compliance)
 *
 * Maintains a fixed-capacity circular ring buffer of structured diagnostic events
 * for client-side observability, error reporting, and supportability.
 */

export type DiagnosticLevel = 'info' | 'warn' | 'error';

export interface DiagnosticEntry {
  id: string;
  timestamp: string;
  level: DiagnosticLevel;
  context: string;
  message: string;
  metadata?: Record<string, unknown>;
}

const MAX_RING_BUFFER_SIZE = 100;
const ringBuffer: DiagnosticEntry[] = [];
let nextId = 1;

/**
 * Record a structured diagnostic event into the rolling in-memory ring buffer.
 */
export function recordDiagnostic(
  level: DiagnosticLevel,
  context: string,
  message: string,
  metadata?: Record<string, unknown>
): DiagnosticEntry {
  const entry: DiagnosticEntry = {
    id: `diag_${Date.now()}_${nextId++}`,
    timestamp: new Date().toISOString(),
    level,
    context,
    message,
    metadata: metadata ? sanitizeMetadata(metadata) : undefined,
  };

  if (ringBuffer.length >= MAX_RING_BUFFER_SIZE) {
    ringBuffer.shift();
  }
  ringBuffer.push(entry);

  return entry;
}

/**
 * Retrieve recent diagnostic entries in chronological order.
 */
export function getRecentDiagnostics(limit: number = 50): DiagnosticEntry[] {
  return ringBuffer.slice(-Math.min(limit, ringBuffer.length));
}

/**
 * Clear the in-memory diagnostic buffer.
 */
export function clearDiagnostics(): void {
  ringBuffer.length = 0;
}

/**
 * Sanitize metadata to strip sensitive values (passwords, auth tokens)
 * before storing in diagnostic telemetry.
 */
function sanitizeMetadata(raw: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  const REDACTED_KEYS = new Set(['token', 'password', 'secret', 'key', 'auth', 'bearer']);

  for (const [k, v] of Object.entries(raw)) {
    if (REDACTED_KEYS.has(k.toLowerCase())) {
      sanitized[k] = '[REDACTED]';
    } else if (v instanceof Error) {
      sanitized[k] = {
        name: v.name,
        message: v.message,
        stack: v.stack,
      };
    } else if (typeof v === 'object' && v !== null) {
      try {
        sanitized[k] = JSON.parse(JSON.stringify(v));
      } catch {
        sanitized[k] = String(v);
      }
    } else {
      sanitized[k] = v;
    }
  }

  return sanitized;
}
