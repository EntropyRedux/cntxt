import React, { useState, useEffect } from 'react';
import { 
  Coins, 
  CheckCircle2, 
  AlertTriangle,
  Layers,
  Code2,
  Variable,
  FileText
} from 'lucide-react';
import { useTabStore } from '../../store/tabStore';
import { useSettingsStore } from '../../store/settingsStore';
import { tokenEstimatorService } from '../../services/tokenEstimator/tokenEstimatorService';
import { AI_MODELS } from '../../constants/models';
import { TokenEstimate } from '../../types';

export const TokenAnalytics: React.FC = () => {
  const { tabs, activeTabId } = useTabStore();
  const { settings, setModel } = useSettingsStore();

  const activeTab = tabs.find(t => t.id === activeTabId);
  const [estimate, setEstimate] = useState<TokenEstimate | null>(null);

  useEffect(() => {
    let isMounted = true;
    const calculate = async () => {
      if (!activeTab) return;
      const res = await tokenEstimatorService.estimateTokensAsync(
        activeTab.content, 
        settings.selectedModelId
      );
      if (isMounted) {
        setEstimate(res);
      }
    };

    calculate();

    const unsubscribe = tokenEstimatorService.subscribe((est) => {
      if (isMounted) setEstimate(est);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [activeTab?.content, settings.selectedModelId]);

  if (!activeTab || !estimate) {
    return (
      <div className="p-6 text-center text-[var(--text-muted)] text-xs">
        <Coins className="w-8 h-8 mx-auto mb-2 opacity-30 text-[var(--text-muted)]" />
        <p>No active document to analyze</p>
      </div>
    );
  }

  const model = estimate.model;
  const isOverBudget = estimate.tokenCount > settings.budgetThreshold;
  const percentOfContext = Math.min(100, Math.max(0.1, (estimate.tokenCount / model.contextWindow) * 100));

  return (
    <div className="theme-sidebar flex flex-col h-full overflow-y-auto p-3 space-y-3 text-xs select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[var(--border-primary)]">
        <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[var(--text-secondary)] text-[11px]">
          <span>Token & Cost Analytics</span>
        </div>
        <span className={`px-2 py-0.2 rounded text-[10px] font-mono border ${
          estimate.status === 'live' 
            ? 'bg-[var(--status-success)]/15 text-[var(--status-success)] border-[var(--status-success)]/30' 
            : 'bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] border-[var(--accent-primary)]/30'
        }`}>
          ● {estimate.status}
        </span>
      </div>

      {/* Primary Token & Cost Metric Card */}
      <div className="theme-card p-3 rounded space-y-2.5 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-[var(--text-muted)] font-medium">Active Model</span>
          <select
            value={settings.selectedModelId}
            onChange={(e) => setModel(e.target.value)}
            className="theme-input rounded px-2 py-0.5 text-xs"
          >
            {AI_MODELS.map(m => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.provider})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="p-2 bg-[var(--card-secondary-bg)] rounded border border-[var(--border-primary)]">
            <span className="text-[10px] text-[var(--text-muted)] block uppercase tracking-wider">Estimated Tokens</span>
            <span className="text-xl font-bold text-[var(--text-primary)] font-mono tracking-tight">
              {estimate.tokenCount.toLocaleString()}
            </span>
          </div>

          <div className="p-2 bg-[var(--card-secondary-bg)] rounded border border-[var(--border-primary)]">
            <span className="text-[10px] text-[var(--text-muted)] block uppercase tracking-wider">Estimated Input Cost</span>
            <span className="text-xl font-bold text-[var(--status-success)] font-mono tracking-tight">
              ${estimate.cost < 0.0001 && estimate.cost > 0 ? '<$0.0001' : `$${estimate.cost.toFixed(5)}`}
            </span>
          </div>
        </div>

        {/* Context Window Usage Bar */}
        <div className="space-y-1 pt-1">
          <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
            <span>Context Window Usage</span>
            <span className="font-mono text-[var(--text-secondary)]">{estimate.tokenCount.toLocaleString()} / {model.contextWindow.toLocaleString()} ({percentOfContext.toFixed(2)}%)</span>
          </div>
          <div className="w-full h-1.5 bg-[var(--card-secondary-bg)] rounded-full overflow-hidden border border-[var(--border-primary)]">
            <div
              className={`h-full transition-all duration-300 ${
                percentOfContext > 80 ? 'bg-[var(--status-error)]' : percentOfContext > 40 ? 'bg-[var(--status-warning)]' : 'bg-[var(--accent-primary)]'
              }`}
              style={{ width: `${Math.max(1, percentOfContext)}%` }}
            />
          </div>
        </div>

        {/* Budget Alert */}
        {isOverBudget && (
          <div className="p-2 bg-[var(--status-error)]/10 border border-[var(--status-error)]/30 rounded flex items-center gap-2 text-[var(--status-error)] text-[11px]">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Exceeds target budget of {settings.budgetThreshold.toLocaleString()} tokens</span>
          </div>
        )}
      </div>

      {/* Content Breakdown */}
      {estimate.breakdown && (
        <div className="theme-card p-3 rounded space-y-2">
          <span className="font-bold text-[var(--text-secondary)] text-[10px] block uppercase tracking-wider">
            Token Breakdown
          </span>

          <div className="space-y-1 text-[11px]">
            <div className="flex items-center justify-between p-1.5 bg-[var(--card-secondary-bg)] rounded border border-[var(--border-primary)]">
              <div className="flex items-center gap-1.5 text-[var(--text-primary)] font-medium">
                <FileText className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                <span>User Content</span>
              </div>
              <span className="font-mono text-[var(--text-secondary)]">
                {estimate.breakdown.userContentTokens.toLocaleString()} tokens
              </span>
            </div>

            <div className="flex items-center justify-between p-1.5 bg-[var(--card-secondary-bg)] rounded border border-[var(--border-primary)]">
              <div className="flex items-center gap-1.5 text-[var(--text-primary)] font-medium">
                <Layers className="w-3.5 h-3.5 text-[var(--status-info)]" />
                <span>System Instructions (XML)</span>
              </div>
              <span className="font-mono text-[var(--text-secondary)]">
                {estimate.breakdown.systemPromptTokens.toLocaleString()} tokens
              </span>
            </div>

            <div className="flex items-center justify-between p-1.5 bg-[var(--card-secondary-bg)] rounded border border-[var(--border-primary)]">
              <div className="flex items-center gap-1.5 text-[var(--text-primary)] font-medium">
                <Code2 className="w-3.5 h-3.5 text-[var(--status-success)]" />
                <span>Code Blocks</span>
              </div>
              <span className="font-mono text-[var(--text-secondary)]">
                {estimate.breakdown.codeTokens.toLocaleString()} tokens
              </span>
            </div>

            <div className="flex items-center justify-between p-1.5 bg-[var(--card-secondary-bg)] rounded border border-[var(--border-primary)]">
              <div className="flex items-center gap-1.5 text-[var(--text-primary)] font-medium">
                <Variable className="w-3.5 h-3.5 text-[var(--status-warning)]" />
                <span>Template Variables</span>
              </div>
              <span className="font-mono text-[var(--text-secondary)]">
                {estimate.breakdown.templateVariableTokens.toLocaleString()} tokens
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Model Comparison Table */}
      <div className="theme-card p-3 rounded space-y-2">
        <span className="font-bold text-[var(--text-secondary)] text-[10px] block uppercase tracking-wider">
          Model Cost Comparison
        </span>

        <div className="space-y-1">
          {AI_MODELS.map(m => {
            const mTokens = tokenEstimatorService.calculateTokens(activeTab.content, m.id).count;
            const mCost = (mTokens / 1_000_000) * m.inputCostPerMillion;
            const isCurrent = m.id === settings.selectedModelId;

            return (
              <button
                key={m.id}
                onClick={() => setModel(m.id)}
                className={`w-full p-2 rounded border text-left flex items-center justify-between transition-all ${
                  isCurrent 
                    ? 'bg-[var(--accent-container)] border-[var(--accent-primary)]/50 text-[var(--text-primary)] font-semibold' 
                    : 'bg-[var(--card-secondary-bg)] border-[var(--border-primary)] hover:bg-[var(--card-hover-bg)] text-[var(--text-muted)]'
                }`}
              >
                <div>
                  <div className="font-medium text-xs flex items-center gap-1 text-[var(--text-primary)]">
                    <span>{m.name}</span>
                    {isCurrent && <CheckCircle2 className="w-3 h-3 text-[var(--accent-primary)]" />}
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)]">{m.contextWindow.toLocaleString()} ctx • ${m.inputCostPerMillion}/1M</span>
                </div>
                <div className="text-right font-mono">
                  <div className="text-xs font-bold text-[var(--status-success)]">${mCost.toFixed(5)}</div>
                  <div className="text-[10px] text-[var(--text-muted)]">{mTokens.toLocaleString()} tok</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
