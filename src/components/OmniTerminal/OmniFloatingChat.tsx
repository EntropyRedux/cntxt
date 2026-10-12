import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Minus, Maximize2, Move } from 'lucide-react';
import { useSettingsStore, isOmniTerminalFeatureEnabled } from '../../store/settingsStore';
import { OmniTerminalView } from './OmniTerminalView';

export const OmniFloatingChat: React.FC = () => {
  const { settings, updateSettings } = useSettingsStore();

  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    return settings.omniFloatingPosition || { x: window.innerWidth - 420, y: window.innerHeight - 560 };
  });
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number }>({
    mouseX: 0,
    mouseY: 0,
    startX: 0,
    startY: 0,
  });

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: position.x,
      startY: position.y,
    };
  };

  useEffect(() => {
    if (!settings.isOmniFloating || !isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStartRef.current.mouseX;
      const dy = e.clientY - dragStartRef.current.mouseY;

      const maxX = Math.max(0, window.innerWidth - (isMinimized ? 200 : 400));
      const maxY = Math.max(0, window.innerHeight - (isMinimized ? 50 : 540));

      const newX = Math.min(Math.max(10, dragStartRef.current.startX + dx), maxX);
      const newY = Math.min(Math.max(10, dragStartRef.current.startY + dy), maxY);

      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      updateSettings({ omniFloatingPosition: position });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [settings.isOmniFloating, isDragging, isMinimized, position, updateSettings]);

  const handleClose = () => {
    updateSettings({ isOmniFloating: false });
  };

  if (!settings.isOmniFloating || !isOmniTerminalFeatureEnabled(settings)) return null;

  return (
    <div
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      className={`fixed z-40 rounded-xl border border-[var(--border-primary)] bg-[var(--app-bg)] shadow-2xl overflow-hidden flex flex-col transition-all duration-100 ${
        isMinimized ? 'w-48 h-10' : 'w-96 sm:w-[420px] h-[540px]'
      }`}
    >
      {/* Floating Drag Header */}
      <div
        onMouseDown={handleMouseDown}
        className="px-3 py-2 bg-[var(--card-bg)] border-b border-[var(--border-subtle)] flex items-center justify-between cursor-grab active:cursor-grabbing select-none shrink-0"
      >
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)]">
          <Move className="w-3 h-3 text-[var(--text-muted)]" />
          <Bot className="w-4 h-4 text-[var(--accent-primary)]" />
          <span>Omni Terminal</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] transition-colors"
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? <Maximize2 className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--status-error)] hover:bg-[var(--card-hover-bg)] transition-colors"
            title="Dock to Sidebar"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Floating Window Content */}
      {!isMinimized && (
        <div className="flex-1 overflow-hidden relative">
          <OmniTerminalView />
        </div>
      )}
    </div>
  );
};
