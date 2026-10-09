import React from 'react';
import { PreflightResult } from '../../features/panelApps/preflight/scan';
import { SIZE_SOFT_BYTES, SIZE_HARD_BYTES } from '../../features/panelApps/preflight/limits';
import { NetworkBadge } from './NetworkBadge';
import { AlertCircle, AlertTriangle, Info, HardDrive, Globe, FileCode } from 'lucide-react';

export interface PreflightReportProps {
  preflight: PreflightResult;
  networkMode: 'offline' | 'cdn';
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export const PreflightReport: React.FC<PreflightReportProps> = ({ preflight, networkMode }) => {
  const percentHard = Math.min(100, Math.round((preflight.bytes / SIZE_HARD_BYTES) * 100));
  const isOverSoft = preflight.bytes > SIZE_SOFT_BYTES;
  const isOverHard = preflight.bytes > SIZE_HARD_BYTES;

  const barColor = isOverHard
    ? 'bg-red-500'
    : isOverSoft
    ? 'bg-amber-500'
    : 'bg-[var(--accent-primary)]';

  return (
    <div className="space-y-4 text-xs">
      {/* Top Status Summary */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--card-secondary-bg)] border border-[var(--border-primary)]">
        <div className="flex items-center gap-2">
          <span className="text-[var(--text-muted)] font-medium">Network Assessment:</span>
          <NetworkBadge offlineReady={preflight.offlineReady} />
        </div>
        <div className="text-[11px] font-mono text-[var(--text-secondary)]">
          {formatBytes(preflight.bytes)}
        </div>
      </div>

      {/* Network Conflict Warning */}
      {!preflight.offlineReady && networkMode === 'offline' && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>External Resources Restricted in Offline Mode</span>
          </div>
          <p className="text-[11px] text-amber-200/90 leading-relaxed">
            This app references external resources, but Network Mode is currently set to <strong>Offline</strong>. External scripts and fonts will be blocked by Content Security Policy. Switch to <strong>CDN Mode</strong> in Details if you need these to load.
          </p>
        </div>
      )}

      {/* Size Bar */}
      <div className="p-3 rounded-xl bg-[var(--card-secondary-bg)] border border-[var(--border-primary)] space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="flex items-center gap-1.5 text-[var(--text-secondary)] font-medium">
            <HardDrive className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
            <span>Document Size</span>
          </span>
          <span className="font-mono text-[var(--text-muted)]">
            {formatBytes(preflight.bytes)} / 2.0 MB max
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-[var(--app-bg)] overflow-hidden border border-[var(--border-subtle)]">
          <div
            className={`h-full transition-all duration-300 rounded-full ${barColor}`}
            style={{ width: `${percentHard}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-[var(--text-muted)] font-mono">
          <span>0 KB</span>
          <span>512 KB (Soft)</span>
          <span>2 MB (Hard)</span>
        </div>
      </div>

      {/* External References (if any) */}
      {preflight.externalRefs.length > 0 && (
        <div className="p-3 rounded-xl bg-[var(--card-secondary-bg)] border border-[var(--border-primary)] space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--text-primary)]">
            <Globe className="w-3.5 h-3.5 text-amber-400" />
            <span>External References Detected ({preflight.externalRefs.length})</span>
          </div>
          <div className="max-h-28 overflow-y-auto space-y-1 pr-1 text-[11px] font-mono text-[var(--text-secondary)]">
            {preflight.externalRefs.map((ref, idx) => (
              <div key={idx} className="p-1 rounded bg-[var(--app-bg)] truncate border border-[var(--border-subtle)]">
                {ref}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Size Contributors */}
      {preflight.contributors.length > 0 && (
        <div className="p-3 rounded-xl bg-[var(--card-secondary-bg)] border border-[var(--border-primary)] space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--text-primary)]">
            <FileCode className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
            <span>Top Contributors</span>
          </div>
          <div className="space-y-1">
            {preflight.contributors.map((c, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-1.5 rounded bg-[var(--app-bg)] text-[11px] border border-[var(--border-subtle)]"
              >
                <span className="text-[var(--text-secondary)] truncate pr-2">{c.label}</span>
                <span className="font-mono text-[var(--text-muted)] shrink-0">{formatBytes(c.bytes)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Findings List */}
      {preflight.findings.length > 0 && (
        <div className="space-y-1.5">
          {preflight.findings.map((f) => {
            const Icon = f.severity === 'block' ? AlertCircle : f.severity === 'warn' ? AlertTriangle : Info;
            const colorClass =
              f.severity === 'block'
                ? 'bg-red-500/10 border-red-500/30 text-red-300'
                : f.severity === 'warn'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : 'bg-blue-500/10 border-blue-500/30 text-blue-300';

            return (
              <div key={f.id} className={`p-2.5 rounded-lg border flex items-start gap-2 ${colorClass}`}>
                <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <div className="text-[11px] leading-tight flex-1">
                  <div className="font-medium">{f.message}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
