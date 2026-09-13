import React, { useState, useEffect, useCallback } from 'react';
import { Minus, Square, Copy, X } from 'lucide-react';
import { useRuntimeBridge } from '../../adapters';

export interface WindowControlsProps {
  className?: string;
}

/**
 * WindowControls
 * Pure Presenter for Desktop Window Controls (Minimize, Maximize/Restore, Close).
 * 
 * - In Native Desktop (Tauri): Renders themed window controls.
 * - In Web / AI Studio: Gracefully returns null (zero DOM footprint).
 */
export const WindowControls: React.FC<WindowControlsProps> = ({ className = '' }) => {
  const bridge = useRuntimeBridge();
  const [isMaximized, setIsMaximized] = useState(false);

  const checkMaximized = useCallback(async () => {
    if (bridge.window.isMaximized) {
      try {
        const max = await bridge.window.isMaximized();
        setIsMaximized(max);
      } catch {
        // Fallback
      }
    }
  }, [bridge]);

  useEffect(() => {
    if (!bridge.window.isNative) return;
    checkMaximized();

    const handleResize = () => {
      checkMaximized();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [bridge, checkMaximized]);

  // Graceful degradation: do not render window controls in browser or AI Studio
  if (!bridge.window.isNative) {
    return null;
  }

  const handleMinimize = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await bridge.window.minimize?.();
    } catch (err) {
      console.error('[WindowControls] minimize error:', err);
    }
  };

  const handleToggleMaximize = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (bridge.window.toggleMaximize) {
        await bridge.window.toggleMaximize();
      } else if (isMaximized) {
        await bridge.window.unmaximize?.();
      } else {
        await bridge.window.maximize?.();
      }
      setIsMaximized(prev => !prev);
    } catch (err) {
      console.error('[WindowControls] toggleMaximize error:', err);
    }
  };

  const handleClose = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await bridge.window.close?.();
    } catch (err) {
      console.error('[WindowControls] close error:', err);
    }
  };

  return (
    <div 
      className={`flex items-center h-full shrink-0 select-none ${className}`}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Minimize Button */}
      <button
        type="button"
        onClick={handleMinimize}
        title="Minimize"
        aria-label="Minimize Window"
        className="w-11 h-full flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] transition-colors cursor-pointer"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>

      {/* Maximize / Restore Button */}
      <button
        type="button"
        onClick={handleToggleMaximize}
        title={isMaximized ? "Restore Down" : "Maximize"}
        aria-label={isMaximized ? "Restore Window" : "Maximize Window"}
        className="w-11 h-full flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] transition-colors cursor-pointer"
      >
        {isMaximized ? (
          <Copy className="w-3 h-3 rotate-180" />
        ) : (
          <Square className="w-3 h-3" />
        )}
      </button>

      {/* Close Button */}
      <button
        type="button"
        onClick={handleClose}
        title="Close"
        aria-label="Close Window"
        className="w-11 h-full flex items-center justify-center text-[var(--text-secondary)] hover:text-white hover:bg-[#e81123] transition-colors cursor-pointer"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
