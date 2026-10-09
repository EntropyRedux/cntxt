import React from 'react';
import { PanelAppRecord } from '../../contracts/data_shapes';
import { AppIcon } from '../Common/AppIcon';
import { Layers, Plus } from 'lucide-react';

export interface AppRailProps {
  apps: PanelAppRecord[];
  activeId: string | null;
  isBuilderActive: boolean;
  onOpenApp: (id: string) => void;
  onOpenBuilder: () => void;
  orientation?: 'vertical' | 'horizontal';
}

export const AppRail: React.FC<AppRailProps> = ({
  apps,
  activeId,
  isBuilderActive,
  onOpenApp,
  onOpenBuilder,
  orientation = 'vertical',
}) => {
  if (orientation === 'horizontal') {
    return (
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar shrink-0 px-1">
        {/* Launch App Builder Button */}
        <button
          type="button"
          onClick={onOpenBuilder}
          title="Panel App Builder"
          aria-label="Panel App Builder"
          className={`h-9 px-2.5 rounded-lg flex items-center gap-1.5 transition-all shrink-0 cursor-pointer text-xs ${
            isBuilderActive
              ? 'text-[var(--accent-primary)] bg-[var(--accent-container)] shadow-xs'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)]'
          }`}
        >
          <Layers className="w-4 h-4 shrink-0 text-[var(--accent-primary)]" />
          <span className="font-medium text-[11px]">Builder</span>
        </button>

        {/* Dynamic App Icons */}
        {apps.map((app) => {
          const isActive = activeId === app.id;
          return (
            <button
              key={app.id}
              type="button"
              onClick={() => onOpenApp(app.id)}
              title={`${app.name} (Panel App)`}
              aria-label={app.name}
              className={`h-9 px-2 rounded-lg flex items-center gap-1.5 transition-all shrink-0 cursor-pointer text-xs ${
                isActive
                  ? 'text-[var(--accent-primary)] bg-[var(--accent-container)] shadow-xs font-semibold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)]'
              }`}
            >
              <AppIcon name={app.icon} size={15} className="shrink-0" />
              <span className="truncate max-w-[100px] text-[11px]">{app.name}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-1.5 w-full py-1">
      {/* Subtle Divider */}
      <div className="w-6 h-px bg-[var(--border-subtle)] opacity-70 my-0.5 shrink-0" />

      {/* Launch App Builder Button */}
      <button
        type="button"
        onClick={onOpenBuilder}
        title="Panel App Builder (Create or manage HTML mini-apps)"
        aria-label="Panel App Builder"
        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all relative cursor-pointer group ${
          isBuilderActive
            ? 'text-[var(--accent-primary)] bg-[var(--accent-container)] shadow-xs'
            : 'text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:bg-[var(--card-hover-bg)]'
        }`}
      >
        <Layers className="w-4 h-4" />
        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[var(--accent-primary)] text-white flex items-center justify-center text-[9px] font-bold">
          +
        </span>
        {isBuilderActive && (
          <div className="absolute left-0 w-0.5 h-4 bg-[var(--accent-primary)] rounded-r" />
        )}
      </button>

      {/* Dynamic Registered Apps Scrollable Stack */}
      {apps.map((app) => {
        const isActive = activeId === app.id;
        return (
          <button
            key={app.id}
            type="button"
            onClick={() => onOpenApp(app.id)}
            title={`${app.name} (Panel App)`}
            aria-label={app.name}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all relative cursor-pointer ${
              isActive
                ? 'text-[var(--accent-primary)] bg-[var(--accent-container)] shadow-xs ring-1 ring-[var(--accent-primary)]/40'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)]'
            }`}
          >
            <AppIcon name={app.icon} size={16} />
            {isActive && (
              <div className="absolute left-0 w-0.5 h-4 bg-[var(--accent-primary)] rounded-r" />
            )}
          </button>
        );
      })}
    </div>
  );
};
