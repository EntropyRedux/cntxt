import { describe, it, expect, beforeEach } from 'vitest';
import {
  recordDiagnostic,
  getRecentDiagnostics,
  clearDiagnostics,
} from '../src/services/diagnosticLogger';

describe('diagnosticLogger (Pillar 9 Ring Buffer)', () => {
  beforeEach(() => {
    clearDiagnostics();
  });

  it('records structured diagnostic events in chronological order', () => {
    recordDiagnostic('info', 'AuthService', 'User signed in', { userId: '123' });
    recordDiagnostic('warn', 'TabCache', 'Checksum mismatch');

    const logs = getRecentDiagnostics();
    expect(logs).toHaveLength(2);
    expect(logs[0].context).toBe('AuthService');
    expect(logs[0].level).toBe('info');
    expect(logs[0].metadata?.userId).toBe('123');
    expect(logs[1].context).toBe('TabCache');
    expect(logs[1].level).toBe('warn');
  });

  it('redacts sensitive fields in metadata', () => {
    recordDiagnostic('error', 'Gateway', 'Connection failed', {
      token: 'super-secret-token',
      password: 'mypassword',
      safeParam: 'public-data',
    });

    const logs = getRecentDiagnostics();
    expect(logs).toHaveLength(1);
    expect(logs[0].metadata?.token).toBe('[REDACTED]');
    expect(logs[0].metadata?.password).toBe('[REDACTED]');
    expect(logs[0].metadata?.safeParam).toBe('public-data');
  });

  it('bounds capacity to maximum 100 entries', () => {
    for (let i = 0; i < 110; i++) {
      recordDiagnostic('info', 'StressTest', `Message ${i}`);
    }

    const logs = getRecentDiagnostics(200);
    expect(logs).toHaveLength(100);
    expect(logs[0].message).toBe('Message 10');
    expect(logs[99].message).toBe('Message 109');
  });
});
