import React from 'react';
import { ShellMode } from '../ui-contract/appShellContract';
import { Layout, Sparkles, Sliders } from 'lucide-react';

export interface ShellModeSwitcherProps {
  currentMode: ShellMode;
  onModeChange: (mode: ShellMode) => void;
}

export const ShellModeSwitcher: React.FC<ShellModeSwitcherProps> = ({
  currentMode,
  onModeChange,
}) => {
  const modes: { id: ShellMode; label: string; icon: React.ComponentType<{ className?: string }>; description: string }[] = [
    {
      id: 'classic',
      label: 'Classic',
      icon: Layout,
      description: 'Standard ContextPad desktop shell'
    },
    {
      id: 'prototype',
      label: 'Modular UI',
      icon: Sparkles,
      description: 'Next-Gen CNTXT modular frontend shell'
    },
    {
      id: 'workbench',
      label: 'AI Workbench',
      icon: Sliders,
      description: 'Prompt Engineer & Token Workbench'
    }
  ];

  return (
    <div className="flex items-center bg-[var(--editor-bg)] p-0.5 rounded-lg border border-[var(--border-subtle)] shadow-2xs">
      {modes.map((mode) => {
        const Icon = mode.icon;
        const isActive = currentMode === mode.id;
        return (
          <button
            key={mode.id}
            type="button"
            onClick={() => onModeChange(mode.id)}
            title={mode.description}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-all select-none ${
              isActive
                ? 'bg-[var(--card-bg)] text-[var(--accent-primary)] shadow-xs border border-[var(--border-primary)] font-semibold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)]'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{mode.label}</span>
          </button>
        );
      })}
    </div>
  );
};
