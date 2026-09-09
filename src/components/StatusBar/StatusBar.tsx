import React, { useState, useEffect, useRef } from 'react';
import { 
  Coins,
  ChevronDown,
  Sparkles,
  PanelRight,
  Check
} from 'lucide-react';
import { useTabStore } from '../../store/tabStore';
import { useSettingsStore } from '../../store/settingsStore';
import { tokenEstimatorService } from '../../services/tokenEstimator/tokenEstimatorService';
import { AI_MODELS } from '../../constants/models';
import { TokenEstimate } from '../../types';
import { addDocumentListener } from '../../adapters';

export const StatusBar: React.FC = () => {
  const { tabs, activeTabId } = useTabStore();
  const { settings, setActiveSidebarTab, toggleSidebar, setModel } = useSettingsStore();

  const activeTab = tabs.find(t => t.id === activeTabId);
  const [estimate, setEstimate] = useState<TokenEstimate | null>(null);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const modelMenuRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modelMenuRef.current && !modelMenuRef.current.contains(e.target as Node)) {
        setIsModelMenuOpen(false);
      }
    };
    if (isModelMenuOpen) {
      return addDocumentListener('mousedown', handleClickOutside);
    }
  }, [isModelMenuOpen]);

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

  const currentModel = AI_MODELS.find(m => m.id === settings.selectedModelId) || AI_MODELS[0];
  const isTokensSidebarActive = settings.showSidebar && settings.activeSidebarTab === 'tokens';
  const isOverBudget = estimate ? estimate.tokenCount > settings.budgetThreshold : false;
  const percentOfContext = estimate && currentModel.contextWindow 
    ? Math.min(100, Math.max(0.1, (estimate.tokenCount / currentModel.contextWindow) * 100))
    : 0;

  const handleToggleTokenSidebar = () => {
    if (isTokensSidebarActive) {
      toggleSidebar();
    } else {
      setActiveSidebarTab('tokens');
    }
  };

  return (
    <footer className="theme-statusbar flex items-center h-6 px-3.5 text-[11px] justify-between select-none font-sans z-30 shrink-0 relative">
      {/* Left side metrics */}
      <div className="flex items-center space-x-3.5 min-w-0">
        <span className="font-mono text-[var(--text-primary)] font-medium shrink-0">
          Ln {cursorLine}, Col {cursorCol}
        </span>

        <span className="text-[var(--text-muted)] opacity-40 hidden md:inline">•</span>

        <span className="hidden md:inline font-mono text-[var(--text-secondary)] truncate">
          {wordCount} words <span className="text-[var(--text-muted)] opacity-40">/</span> {charCount} chars <span className="text-[var(--text-muted)] opacity-40">/</span> {lineCount} lines
        </span>
      </div>

      {/* Right side metrics (Live Token Estimator & In-Depth Sidebar Toggle) */}
      <div className="flex items-center space-x-2 shrink-0">
        {/* Live Token Estimator for Selected Model */}
        <div 
          ref={modelMenuRef}
          className="relative flex items-center bg-[var(--editor-bg)] rounded border border-[var(--border-subtle)] px-2 py-0.5 gap-2 text-[10px] text-[var(--text-secondary)] shadow-2xs"
        >
          {/* Quick Model Switcher Dropdown */}
          <button
            type="button"
            onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
            title="Click to switch model for live estimate"
            aria-label={`Current model: ${currentModel.name}. Click to switch model.`}
            className="flex items-center gap-1 font-medium text-[var(--text-primary)] hover:text-[var(--accent-primary)] transition-colors focus:outline-none"
          >
            <Sparkles className="w-3 h-3 text-[var(--accent-primary)] shrink-0" />
            <span className="max-w-[90px] truncate">{currentModel.name.replace(/\s*\(.*?\)/, '')}</span>
            <ChevronDown className={`w-2.5 h-2.5 opacity-60 transition-transform ${isModelMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Model Selection Upward Popover */}
          {isModelMenuOpen && (
            <div className="absolute bottom-full right-0 mb-1.5 w-64 bg-[var(--card-bg)] border border-[var(--border-primary)] rounded-lg shadow-xl py-1 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
              <div className="px-2.5 py-1 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider border-b border-[var(--border-subtle)] mb-1">
                Select Model for Live Estimate
              </div>
              <div className="max-h-56 overflow-y-auto py-0.5">
                {AI_MODELS.map((m) => {
                  const isSelected = m.id === currentModel.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setModel(m.id);
                        setIsModelMenuOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 text-[11px] flex items-center justify-between hover:bg-[var(--card-hover-bg)] transition-colors ${
                        isSelected ? 'bg-[var(--accent-container)] text-[var(--accent-primary)] font-medium' : 'text-[var(--text-primary)]'
                      }`}
                    >
                      <div className="flex flex-col min-w-0 pr-2">
                        <span className="truncate">{m.name}</span>
                        <span className="text-[9px] text-[var(--text-muted)] font-mono">
                          {m.provider} · ${(m.inputCostPerMillion).toFixed(2)}/1M tok
                        </span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 shrink-0 text-[var(--accent-primary)]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="h-2.5 w-px bg-[var(--border-subtle)]" />

          {/* Live Token Count */}
          <div 
            className="flex items-center gap-1 font-mono text-[var(--text-primary)]"
            title={estimate ? `${estimate.tokenCount.toLocaleString()} tokens (${percentOfContext.toFixed(2)}% of ${(currentModel.contextWindow / 1000).toFixed(0)}k context)` : 'Calculating tokens...'}
          >
            <span className="font-semibold">
              {estimate ? estimate.tokenCount.toLocaleString() : '0'}
            </span>
            <span className="text-[var(--text-muted)] font-sans">tok</span>
          </div>

          <div className="h-2.5 w-px bg-[var(--border-subtle)]" />

          {/* Live Estimated Cost */}
          <div 
            className="font-mono text-[var(--text-secondary)]"
            title={estimate ? `Estimated Input Cost: $${estimate.cost.toFixed(6)}` : ''}
          >
            {estimate ? (estimate.cost < 0.0001 && estimate.cost > 0 ? '<$0.0001' : `$${estimate.cost.toFixed(4)}`) : '$0.0000'}
          </div>

          {/* Status/Budget Indicator */}
          <span 
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              isOverBudget ? 'bg-[var(--status-error)]' : 'bg-[var(--status-success)]'
            }`}
            title={isOverBudget ? `Token count exceeds budget limit (${settings.budgetThreshold.toLocaleString()} tokens)` : `Normal context usage (${percentOfContext.toFixed(1)}%)`}
          />
        </div>

        {/* Button to show right panel for in-depth token estimates & comparison */}
        <button
          type="button"
          onClick={handleToggleTokenSidebar}
          title={isTokensSidebarActive ? "Hide in-depth token estimates & comparison panel" : "Show in-depth token estimates & comparison panel"}
          aria-label={isTokensSidebarActive ? "Hide in-depth token estimates & comparison panel" : "Show in-depth token estimates & comparison panel"}
          aria-pressed={isTokensSidebarActive}
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] transition-all border ${
            isTokensSidebarActive
              ? 'bg-[var(--accent-container)] text-[var(--accent-primary)] border-[var(--accent-primary)]/40 font-medium'
              : 'hover:bg-[var(--card-hover-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-transparent'
          }`}
        >
          <Coins className="w-3.5 h-3.5 text-[var(--status-success)]" />
          <PanelRight className="w-3 h-3 opacity-70" />
        </button>

        <div className="h-3 w-px bg-[var(--border-primary)] mx-0.5 hidden sm:block" />

        <div className="hidden lg:flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-success)]"></span>
          <span>Ready</span>
        </div>
      </div>
    </footer>
  );
};
