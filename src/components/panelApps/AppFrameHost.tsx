import React, { useEffect, useRef, useState, useCallback } from 'react';
import { getActiveThemeTokens, isDarkTheme } from '../../features/panelApps/theme/themeSync';
import { PanelAppRecord, PanelAppPresentationMode } from '../../contracts/data_shapes';
import { AppIcon } from '../Common/AppIcon';
import { X, ExternalLink } from 'lucide-react';

export interface AppFrameHostProps {
  mountedIds: string[];
  activeId: string | null;
  visible: boolean;
  reloadNonce: Record<string, number>;
  getUrl?: (id: string) => string;
  getSrcDoc?: (id: string) => string;
  titleOf: (id: string) => string;
  topOffset?: string;
  theme?: string;
  apps?: PanelAppRecord[];
  onSetFloatingPosition?: (id: string, pos: WindowRect) => void;
  onSetPresentation?: (id: string, mode: PanelAppPresentationMode) => void;
}

interface WindowRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const AppFrameHost: React.FC<AppFrameHostProps> = ({
  mountedIds,
  activeId,
  visible,
  reloadNonce,
  getUrl,
  getSrcDoc,
  titleOf,
  topOffset = '0px',
  theme,
  apps = [],
  onSetFloatingPosition,
  onSetPresentation,
}) => {
  const iframeRefs = useRef<Record<string, HTMLIFrameElement | null>>({});
  const panelApps = apps;

  const [positions, setPositions] = useState<Record<string, WindowRect>>({});
  const latestPositionsRef = useRef<Record<string, WindowRect>>({});
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [activeResizeId, setActiveResizeId] = useState<string | null>(null);

  const dragMeta = useRef<{
    id: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
  } | null>(null);

  // Freeze srcDoc per session/nonce to prevent spurious iframe document reloads
  const initialDocMap = useRef<Record<string, string>>({});

  const hasFloating = mountedIds.some((mid) => {
    const a = panelApps.find((app) => app.id === mid);
    return a?.presentation === 'floating';
  });

  // Broadcast theme updates live to all mounted iframes when CNTXT theme changes
  useEffect(() => {
    const tokens = getActiveThemeTokens();
    const isDark = isDarkTheme();

    Object.values(iframeRefs.current).forEach((iframe) => {
      try {
        iframe?.contentWindow?.postMessage(
          {
            type: 'CNTXT_THEME_UPDATE',
            tokens,
            colorScheme: isDark ? 'dark' : 'light',
          },
          '*'
        );
      } catch {
        // Sandboxed window cross-origin security guard
      }
    });
  }, [theme]);

  // Window drag handler
  const handleDragStart = useCallback((id: string, e: React.MouseEvent) => {
    e.preventDefault();
    const app = panelApps.find((a) => a.id === id);
    const winWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const current = positions[id] || app?.floatingPosition || {
      x: Math.max(20, winWidth - 460),
      y: 70,
      width: 420,
      height: 560,
    };

    dragMeta.current = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      origX: current.x,
      origY: current.y,
      origW: current.width,
      origH: current.height,
    };
    setActiveDragId(id);
  }, [panelApps, positions]);

  // Window resize handler
  const handleResizeStart = useCallback((id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const app = panelApps.find((a) => a.id === id);
    const winWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const current = positions[id] || app?.floatingPosition || {
      x: Math.max(20, winWidth - 460),
      y: 70,
      width: 420,
      height: 560,
    };

    dragMeta.current = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      origX: current.x,
      origY: current.y,
      origW: current.width,
      origH: current.height,
    };
    setActiveResizeId(id);
  }, [panelApps, positions]);

  // Global mousemove and mouseup listeners for drag/resize
  useEffect(() => {
    if (!activeDragId && !activeResizeId) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragMeta.current) return;
      const { id, startX, startY, origX, origY, origW, origH } = dragMeta.current;
      const winW = window.innerWidth;
      const winH = window.innerHeight;

      if (activeDragId === id) {
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        const newX = Math.max(0, Math.min(winW - origW, origX + deltaX));
        const newY = Math.max(30, Math.min(winH - 50, origY + deltaY));
        const nextRect = { x: newX, y: newY, width: origW, height: origH };
        latestPositionsRef.current[id] = nextRect;
        setPositions((prev) => ({
          ...prev,
          [id]: nextRect,
        }));
      } else if (activeResizeId === id) {
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        const newW = Math.max(220, Math.min(winW - origX - 10, origW + deltaX));
        const newH = Math.max(160, Math.min(winH - origY - 10, origH + deltaY));
        const nextRect = { x: origX, y: origY, width: newW, height: newH };
        latestPositionsRef.current[id] = nextRect;
        setPositions((prev) => ({
          ...prev,
          [id]: nextRect,
        }));
      }
    };

    const handleMouseUp = () => {
      if (dragMeta.current) {
        const { id } = dragMeta.current;
        const finalPos = latestPositionsRef.current[id];
        if (finalPos && onSetFloatingPosition) {
          onSetFloatingPosition(id, finalPos);
        }
      }
      dragMeta.current = null;
      setActiveDragId(null);
      setActiveResizeId(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [activeDragId, activeResizeId, onSetFloatingPosition]);

  return (
    <>
      {/* 1. App Frames Host (stable DOM nodes for all mounted mini-apps) */}
      <div
        className={`app-frame-host absolute inset-x-0 w-full ${hasFloating ? 'overflow-visible' : 'overflow-hidden'}`}
        style={{
          top: topOffset,
          height: `calc(100% - ${topOffset})`,
          overflow: hasFloating ? 'visible' : undefined,
        }}
      >
        {mountedIds.map((id) => {
          const app = panelApps.find((a) => a.id === id);
          const isActive = id === activeId;
          const nonce = reloadNonce[id] ?? 0;
          const url = getUrl ? getUrl(id) : 'about:blank';
          const doc = getSrcDoc ? getSrcDoc(id) : undefined;
          const frameKey = `${id}:${nonce}`;
          if (doc && !initialDocMap.current[frameKey]) {
            initialDocMap.current[frameKey] = doc;
          }
          const stableDoc = initialDocMap.current[frameKey] || doc;

          const presentation = app?.presentation || 'docked';
          const isFloating = presentation === 'floating';

          const winW = typeof window !== 'undefined' ? window.innerWidth : 1024;
          const currentPos = positions[id] || app?.floatingPosition || {
            x: Math.max(20, winW - 460),
            y: 70,
            width: 420,
            height: 560,
          };

          return (
            <div
              key={`${id}:${nonce}`}
              data-app-id={id}
              data-presentation={presentation}
              className={
                isFloating
                  ? 'fixed z-50 rounded-xl shadow-2xl border border-[var(--border-primary)] bg-[var(--sidebar-bg)] backdrop-blur-md overflow-hidden flex flex-col select-none transition-shadow'
                  : 'absolute inset-0 w-full h-full border-0 bg-transparent'
              }
              style={
                isFloating
                  ? {
                      left: `${currentPos.x}px`,
                      top: `${currentPos.y}px`,
                      width: `${currentPos.width}px`,
                      height: `${currentPos.height}px`,
                      visibility: 'visible',
                      pointerEvents: 'auto',
                    }
                  : {
                      visibility: isActive && visible ? 'visible' : 'hidden',
                      pointerEvents: isActive && visible ? 'auto' : 'none',
                    }
              }
            >
              {/* Floating Window Header Chrome */}
              {isFloating && (
                <div
                  className="h-9 px-3 bg-[var(--sidebar-header-bg)] border-b border-[var(--border-subtle)] flex items-center justify-between shrink-0 cursor-move"
                  onMouseDown={(e) => handleDragStart(id, e)}
                >
                  <div className="flex items-center gap-2 truncate pointer-events-none">
                    <div className="w-5 h-5 rounded bg-[var(--accent-container)] text-[var(--accent-primary)] flex items-center justify-center shrink-0">
                      <AppIcon name={app?.icon || 'AppWindow'} size={12} />
                    </div>
                    <span className="font-semibold text-xs text-[var(--text-primary)] truncate">
                      {app?.name || titleOf(id)}
                    </span>
                    {app?.keepAlive && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[var(--accent-container)] text-[var(--accent-primary)] font-medium">
                        Keep Alive
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {/* Dock back to Sidebar */}
                    <button
                      type="button"
                      onClick={() => onSetPresentation?.(id, 'docked')}
                      title="Dock back into Sidebar"
                      aria-label="Dock back to Sidebar"
                      className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>

                    {/* Close Floating Window */}
                    <button
                      type="button"
                      onClick={() => onSetPresentation?.(id, 'docked')}
                      title="Close Floating Window"
                      aria-label="Close Floating Window"
                      className="p-1 rounded text-[var(--text-muted)] hover:text-red-400 hover:bg-[var(--card-hover-bg)] cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Iframe Viewport Container */}
              <div className="flex-1 w-full h-full relative overflow-hidden bg-transparent">
                <iframe
                  ref={(el) => {
                    iframeRefs.current[id] = el;
                  }}
                  src={stableDoc ? undefined : url}
                  srcDoc={stableDoc || undefined}
                  title={titleOf(id)}
                  data-active={isActive ? 'true' : 'false'}
                  className="absolute inset-0 w-full h-full border-0 bg-transparent"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
                />

                {/* Transparent Mouse Shield during drag or resize */}
                {(activeDragId === id || activeResizeId === id) && (
                  <div className="absolute inset-0 z-50 bg-transparent cursor-move" />
                )}
              </div>

              {/* Resize Handle for Floating Window */}
              {isFloating && (
                <div
                  className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] z-20"
                  onMouseDown={(e) => handleResizeStart(id, e)}
                  title="Resize Floating Window"
                >
                  <svg viewBox="0 0 6 6" className="w-2.5 h-2.5 opacity-60 fill-current">
                    <circle cx="5" cy="5" r="0.8" />
                    <circle cx="5" cy="2.5" r="0.8" />
                    <circle cx="2.5" cy="5" r="0.8" />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
};

