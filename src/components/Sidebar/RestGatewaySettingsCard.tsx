import React from 'react';
import { 
  Server, 
  Key, 
  Copy, 
  Check, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  AlertCircle 
} from 'lucide-react';

export interface RestGatewaySettingsCardProps {
  enabled: boolean;
  port: number;
  running: boolean;
  boundPort: number;
  authToken: string;
  isAvailable: boolean;
  isLoading: boolean;
  isCopied: boolean;
  showToken: boolean;
  error?: string | null;
  onToggleEnabled: (enabled: boolean) => void;
  onPortChange: (port: number) => void;
  onToggleShowToken: () => void;
  onCopyToken: () => void;
  onRegenerateToken: () => void;
}

/**
 * Pure Presenter Component for the Localhost REST API Gateway settings card.
 * Adheres strictly to Universal Presenter Purity (zero direct native IPC calls).
 */
export const RestGatewaySettingsCard: React.FC<RestGatewaySettingsCardProps> = ({
  enabled,
  port,
  running,
  boundPort,
  authToken,
  isAvailable,
  isLoading,
  isCopied,
  showToken,
  error,
  onToggleEnabled,
  onPortChange,
  onToggleShowToken,
  onCopyToken,
  onRegenerateToken,
}) => {
  const [localPort, setLocalPort] = React.useState(port);
  React.useEffect(() => {
    setLocalPort(port);
  }, [port]);

  const commitPort = () => {
    const val = Number(localPort);
    if (val >= 1024 && val <= 65535) {
      onPortChange(val);
    } else {
      setLocalPort(port);
    }
  };
  return (
    <div className="space-y-3 pt-2 border-t border-[var(--border-subtle)]">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
            <span className="text-xs text-[var(--text-primary)] font-medium">Localhost REST API Gateway</span>
          </div>
          <span className="text-[10px] text-[var(--text-muted)] leading-tight block mt-0.5">
            Expose a local REST endpoint protected by <code className="font-mono text-[var(--accent-primary)]">X-CNTXT-Token</code> for external CLI agents (agy, cline) to automate editing, inspect workspaces, and call host RPCs.
          </span>
        </div>
        <input
          type="checkbox"
          id="toggle-rest-gateway"
          checked={enabled}
          disabled={!isAvailable || isLoading}
          onChange={(e) => onToggleEnabled(e.target.checked)}
          className="accent-[var(--accent-primary)] rounded w-4 h-4 cursor-pointer shrink-0 mt-0.5 disabled:opacity-50"
        />
      </div>

      {!isAvailable ? (
        <div className="p-2 rounded bg-[var(--card-secondary-bg)] border border-[var(--border-subtle)] text-[10px] text-[var(--text-muted)] flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-[var(--status-warning)] shrink-0" />
          <span>Desktop native runtime required. REST Gateway is unavailable in browser or mobile mode.</span>
        </div>
      ) : enabled ? (
        <div className="space-y-2.5 pl-2.5 border-l-2 border-[var(--accent-primary)]/40 bg-[var(--card-secondary-bg)]/50 p-2.5 rounded-r-md">
          {/* Status Badge */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[var(--text-secondary)] font-medium">Gateway Service Status</span>
            <div className="flex items-center gap-1.5">
              {running ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </span>
                  <span>Active (Port {boundPort || port})</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--card-hover-bg)] text-[var(--text-muted)] border border-[var(--border-subtle)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--text-muted)] opacity-50"></span>
                  <span>{isLoading ? 'Starting...' : 'Inactive'}</span>
                </span>
              )}
            </div>
          </div>

          {/* Port Input */}
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="text-[10px] text-[var(--text-primary)] block font-medium">Listen Port</span>
              <span className="text-[9px] text-[var(--text-muted)]">Default: 9876 (1024 - 65535)</span>
            </div>
            <input
              type="number"
              id="rest-gateway-port-input"
              min={1024}
              max={65535}
              value={localPort || ''}
              disabled={running || isLoading}
              onChange={(e) => setLocalPort(Number(e.target.value) || 0)}
              onBlur={commitPort}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  commitPort();
                  (e.target as HTMLInputElement).blur();
                }
              }}
              className="w-20 px-2 py-1 text-xs font-mono bg-[var(--input-bg)] border border-[var(--input-border)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] disabled:opacity-50 text-right"
            />
          </div>

          {/* Authentication Token Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[var(--text-primary)] font-medium flex items-center gap-1">
                <Key className="w-3 h-3 text-[var(--accent-primary)]" />
                <span>Security Token (X-CNTXT-Token)</span>
              </span>
              <button
                type="button"
                onClick={onRegenerateToken}
                disabled={isLoading}
                title="Regenerate token (invalidates existing token)"
                className="text-[9px] text-[var(--accent-primary)] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-2.5 h-2.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Regenerate</span>
              </button>
            </div>

            <div className="flex items-center gap-1">
              <input
                type={showToken ? 'text' : 'password'}
                readOnly
                value={authToken || 'No token generated'}
                className="flex-1 px-2 py-1 text-[11px] font-mono bg-[var(--input-bg)] border border-[var(--input-border)] rounded text-[var(--text-secondary)] select-all focus:outline-none focus:border-[var(--accent-primary)]"
              />
              <button
                type="button"
                onClick={onToggleShowToken}
                title={showToken ? 'Hide token' : 'Show token'}
                className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-[var(--card-secondary-bg)] hover:bg-[var(--card-hover-bg)] border border-[var(--border-subtle)] rounded cursor-pointer transition-colors"
              >
                {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={onCopyToken}
                disabled={!authToken}
                title="Copy token to clipboard"
                className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-[var(--card-secondary-bg)] hover:bg-[var(--card-hover-bg)] border border-[var(--border-subtle)] rounded cursor-pointer transition-colors disabled:opacity-50"
              >
                {isCopied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Quick CLI usage tip */}
          <div className="p-1.5 rounded bg-[var(--input-bg)]/80 border border-[var(--border-subtle)] text-[9px] font-mono text-[var(--text-muted)] flex items-center gap-1.5 overflow-x-auto">
            <ShieldCheck className="w-3 h-3 text-[var(--accent-primary)] shrink-0" />
            <span className="truncate">curl -H &quot;X-CNTXT-Token: {authToken ? authToken.slice(0, 14) + '...' : 'TOKEN'}&quot; http://127.0.0.1:{boundPort || port}/api/v1/health</span>
          </div>

          {error && (
            <div className="p-1.5 rounded bg-rose-500/10 border border-rose-500/30 text-[10px] text-rose-400 flex items-center gap-1.5">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};
