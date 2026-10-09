import React from 'react';
import { Wifi, ShieldCheck } from 'lucide-react';

export interface NetworkBadgeProps {
  offlineReady: boolean;
  className?: string;
}

export const NetworkBadge: React.FC<NetworkBadgeProps> = ({ offlineReady, className = '' }) => {
  if (offlineReady) {
    return (
      <span
        title="Zero external network dependencies found. Runs completely offline."
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-2xs ${className}`}
      >
        <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
        <span>Offline-ready</span>
      </span>
    );
  }

  return (
    <span
      title="App references external scripts, stylesheets, or fetch endpoints."
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-2xs ${className}`}
    >
      <Wifi className="w-3 h-3 text-amber-400 shrink-0" />
      <span>Needs network</span>
    </span>
  );
};
