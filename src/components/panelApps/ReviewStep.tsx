import React from 'react';
import { BuilderDetails } from '../../features/panelApps/state/builderStore';
import { PreflightResult } from '../../features/panelApps/preflight/scan';
import { PreflightReport } from './PreflightReport';
import { AppIcon } from '../Common/AppIcon';
import { Loader2, Plus, Sparkles } from 'lucide-react';

export interface ReviewStepProps {
  details: BuilderDetails;
  preflight: PreflightResult;
  creating: boolean;
  onCreate: () => void;
}

export const ReviewStep: React.FC<ReviewStepProps> = ({
  details,
  preflight,
  creating,
  onCreate,
}) => {
  return (
    <div className="space-y-4 text-xs">
      {/* App Identity Card */}
      <div className="p-3 rounded-xl bg-[var(--card-secondary-bg)] border border-[var(--border-primary)] flex items-center justify-between">
        <div className="flex items-center gap-2.5 truncate pr-2">
          <div className="w-9 h-9 rounded-lg bg-[var(--accent-container)] text-[var(--accent-primary)] flex items-center justify-center shrink-0 border border-[var(--border-subtle)] shadow-xs">
            <AppIcon name={details.icon} size={18} />
          </div>
          <div className="truncate">
            <div className="font-semibold text-xs text-[var(--text-primary)] truncate">{details.name}</div>
            <div className="text-[11px] text-[var(--text-muted)] truncate">
              {details.description || 'No description provided'}
            </div>
          </div>
        </div>

        <div className="text-right shrink-0">
          <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-[var(--app-bg)] text-[var(--text-muted)] border border-[var(--border-subtle)]">
            {details.panelWidth}px
          </span>
        </div>
      </div>

      {/* Preflight Report */}
      <PreflightReport preflight={preflight} networkMode={details.network} />

      {/* Action Footer */}
      <div className="pt-2">
        <button
          type="button"
          disabled={preflight.blocked || creating}
          onClick={onCreate}
          className={`w-full h-9 rounded-lg font-medium text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm ${
            preflight.blocked
              ? 'bg-[var(--card-secondary-bg)] text-[var(--text-muted)] border border-[var(--border-primary)] cursor-not-allowed opacity-60'
              : 'bg-[var(--accent-primary)] text-white hover:opacity-95 active:scale-98'
          }`}
        >
          {creating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <span>Generating .cntxt Panel App...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>Create Panel App</span>
            </>
          )}
        </button>

        {preflight.blocked && (
          <p className="text-[10px] text-red-400 text-center mt-1.5 font-medium">
            Creation blocked: source exceeds maximum 2.0 MB size limit.
          </p>
        )}
      </div>
    </div>
  );
};
