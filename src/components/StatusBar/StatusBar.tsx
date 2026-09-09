import React, { useState, useEffect } from 'react';
import { 
  Coins, 
  Sparkles, 
  CheckCircle2, 
  HelpCircle,
  Clock,
  Layers
} from 'lucide-react';
import { useTabStore } from '../../store/tabStore';
import { useSettingsStore } from '../../store/settingsStore';
import { tokenEstimatorService } from '../../services/tokenEstimator/tokenEstimatorService';
import { TokenEstimate } from '../../types';

export const StatusBar: React.FC = () => {
  const { tabs, activeTabId } = useTabStore();
  const { settings, setActiveSidebarTab } = useSettingsStore();

  const activeTab = tabs.find(t => t.id === activeTabId);
  const [estimate, setEstimate] = useState<TokenEstimate | null>(null);

  useEffect(() => {
    let isMounted = true;
    const updateEst = async () => {
      if (!activeTab) return;
      const res = await tokenEstimatorService.estimateTokensAsync(
        activeTab.content, 
        settings.selectedModelId
      );
      if (isMounted) setEstimate(res);
    };

    updateEst();

    const unsub = tokenEstimatorService.subscribe((est) => {
      if (isMounted) setEstimate(est);
    });

    return () => {
      isMounted = false;
      unsub();
    };
  }, [activeTab?.content, settings.selectedModelId]);

  if (!settings.showStatusBar) {
    return null;
  }

  // Document word / line / char metrics
  const text = activeTab?.content || '';
  const charCount = text.length;
  const lineCount = text ? text.split('\n').length : 0;
  const wordCount = (text.trim().match(/\S+/g) || []).length;
  const cursorLine = activeTab?.cursorLine || 1;
  const cursorCol = activeTab?.cursorCol || 1;

  return (
    <footer className="theme-statusbar flex items-center h-6 px-3.5 text-[11px] justify-between select-none font-sans z-30 shrink-0">
      {/* Left side metrics */}
      <div className="flex items-center space-x-3.5">
        <button 
          onClick={() => setActiveSidebarTab('explorer')}
          title="Switch Language / File Explorer"
          aria-label={`Current language: ${activeTab?.language || 'markdown'}. Click to open File Explorer`}
          className="flex items-center gap-1 hover:bg-[var(--card-hover-bg)] px-1.5 py-0.5 rounded transition-colors"
        >
          <span className="font-bold uppercase tracking-wider text-[10px] text-[var(--accent-primary)]">
            {activeTab?.language?.toUpperCase() || 'MARKDOWN'}
          </span>
        </button>

        <span className="text-[var(--text-muted)] opacity-40 hidden sm:inline">•</span>

        <span className="font-mono text-[var(--text-primary)] font-medium">
          Ln {cursorLine}, Col {cursorCol}
        </span>

        <span className="text-[var(--text-muted)] opacity-40 hidden md:inline">•</span>

        <span className="hidden md:inline font-mono text-[var(--text-secondary)]">
          {wordCount} words <span className="text-[var(--text-muted)] opacity-40">/</span> {charCount} chars <span className="text-[var(--text-muted)] opacity-40">/</span> {lineCount} lines
        </span>
      </div>

      {/* Right side metrics (AI Token & Cost metrics) */}
      <div className="flex items-center space-x-3">
        {estimate ? (
          <button
            onClick={() => setActiveSidebarTab('tokens')}
            title="Open Token & Cost Analytics"
            aria-label={`Token estimate: ${estimate.tokenCount.toLocaleString()} tokens, cost ${estimate.cost.toFixed(4)} dollars on ${estimate.model.name}. Click for detailed analytics.`}
            className="flex items-center gap-2 hover:bg-[var(--card-hover-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2 py-0.5 rounded transition-colors font-mono text-[11px]"
          >
            <span className="text-[var(--status-success)] font-semibold">{estimate.tokenCount.toLocaleString()} tokens</span>
            <span className="text-[var(--text-muted)] opacity-40">|</span>
            <span>Est. ${estimate.cost < 0.0001 && estimate.cost > 0 ? '<0.0001' : estimate.cost.toFixed(4)}</span>
            <span className="text-[var(--text-muted)] opacity-40">|</span>
            <span className="text-[var(--accent-primary)] font-medium">{estimate.model.name}</span>
          </button>
        ) : null}

        <div className="h-3 w-px bg-[var(--border-primary)] mx-0.5 hidden sm:block" />

        <div className="hidden lg:flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-success)]"></span>
          <span>Ready</span>
        </div>
      </div>
    </footer>
  );
};
