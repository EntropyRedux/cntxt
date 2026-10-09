import React from 'react';
import { IconPicker } from '../Common/IconPicker';
import { PanelAppNetworkMode } from '../../contracts/data_shapes';
import { ShieldCheck, Wifi, Sliders } from 'lucide-react';

export interface DetailsStepProps {
  name: string;
  icon: string;
  description: string;
  network: PanelAppNetworkMode;
  panelWidth: number;
  onChangeName: (name: string) => void;
  onChangeIcon: (icon: string) => void;
  onChangeDescription: (desc: string) => void;
  onChangeNetwork: (network: PanelAppNetworkMode) => void;
  onChangePanelWidth: (width: number) => void;
  error?: string;
}

export const DetailsStep: React.FC<DetailsStepProps> = ({
  name,
  icon,
  description,
  network,
  panelWidth,
  onChangeName,
  onChangeIcon,
  onChangeDescription,
  onChangeNetwork,
  onChangePanelWidth,
  error,
}) => {
  return (
    <div className="space-y-4 text-xs">
      {/* App Name */}
      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">
          App Name <span className="text-[var(--accent-primary)]">*</span>
        </label>
        <input
          type="text"
          value={name}
          maxLength={40}
          onChange={(e) => onChangeName(e.target.value)}
          placeholder="e.g., Unit Converter, Pomodoro Timer..."
          className="w-full h-8 px-2.5 theme-input rounded-md text-xs placeholder:text-[var(--text-muted)] focus:outline-none"
        />
        {error && <p className="text-[10px] text-red-400 font-medium">{error}</p>}
      </div>

      {/* Icon Picker (Reuses existing common IconPicker) */}
      <div className="space-y-1">
        <IconPicker
          value={icon}
          onChange={onChangeIcon}
          label="App Rail Icon"
          gridMaxHeight="max-h-28"
          columnsClass="grid-cols-6 sm:grid-cols-8"
        />
      </div>

      {/* Description */}
      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">
          Description (Optional)
        </label>
        <textarea
          value={description}
          maxLength={200}
          rows={2}
          onChange={(e) => onChangeDescription(e.target.value)}
          placeholder="What does this panel app do?"
          className="w-full p-2 theme-input rounded-md text-xs placeholder:text-[var(--text-muted)] focus:outline-none resize-none"
        />
      </div>

      {/* Network Mode Switcher */}
      <div className="space-y-1.5 p-3 rounded-xl bg-[var(--card-secondary-bg)] border border-[var(--border-primary)]">
        <label className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">
          Network Isolation Mode
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onChangeNetwork('offline')}
            className={`p-2.5 rounded-lg border text-left flex items-start gap-2 transition-all cursor-pointer ${
              network === 'offline'
                ? 'border-[var(--accent-primary)] bg-[var(--accent-container)] text-[var(--text-primary)] shadow-xs'
                : 'border-[var(--border-subtle)] bg-[var(--app-bg)] text-[var(--text-secondary)] hover:bg-[var(--card-hover-bg)]'
            }`}
          >
            <ShieldCheck className={`w-4 h-4 mt-0.5 shrink-0 ${network === 'offline' ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)]'}`} />
            <div>
              <div className="font-semibold text-[11px]">Offline Only</div>
              <div className="text-[10px] text-[var(--text-muted)] leading-tight">CSP blocks all outbound network requests</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onChangeNetwork('cdn')}
            className={`p-2.5 rounded-lg border text-left flex items-start gap-2 transition-all cursor-pointer ${
              network === 'cdn'
                ? 'border-purple-500/50 bg-purple-500/10 text-[var(--text-primary)] shadow-xs'
                : 'border-[var(--border-subtle)] bg-[var(--app-bg)] text-[var(--text-secondary)] hover:bg-[var(--card-hover-bg)]'
            }`}
          >
            <Wifi className={`w-4 h-4 mt-0.5 shrink-0 ${network === 'cdn' ? 'text-purple-400' : 'text-[var(--text-muted)]'}`} />
            <div>
              <div className="font-semibold text-[11px]">CDN Allowed</div>
              <div className="text-[10px] text-[var(--text-muted)] leading-tight">Allows external CDNs & remote APIs</div>
            </div>
          </button>
        </div>
      </div>

      {/* Default Panel Width Slider */}
      <div className="space-y-1.5 p-3 rounded-xl bg-[var(--card-secondary-bg)] border border-[var(--border-primary)]">
        <div className="flex items-center justify-between text-[11px]">
          <span className="flex items-center gap-1.5 text-[var(--text-secondary)] font-medium">
            <Sliders className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
            <span>Default Panel Width</span>
          </span>
          <span className="font-mono text-[var(--accent-primary)] font-semibold">{panelWidth} px</span>
        </div>
        <input
          type="range"
          min={320}
          max={960}
          step={20}
          value={panelWidth}
          onChange={(e) => onChangePanelWidth(Number(e.target.value))}
          className="w-full accent-[var(--accent-primary)] cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-[var(--text-muted)] font-mono">
          <span>Compact (320px)</span>
          <span>Standard (480px)</span>
          <span>Wide (960px)</span>
        </div>
      </div>
    </div>
  );
};
