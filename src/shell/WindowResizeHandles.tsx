import React, { useEffect, useState, useCallback } from 'react';
import { useRuntimeBridge } from '../adapters/runtimeBridge';
import { WindowResizeDirection } from '../ui-contract/bridgeContract';
import { addWindowListener } from '../adapters/domHelper';

/**
 * WindowResizeHandles
 * Provides client-side resize handles for frameless windows (decorations: false).
 * Critical for Linux/WebKitGTK where the window manager does not provide invisible
 * native resize borders around undecorated client surfaces.
 */
export const WindowResizeHandles: React.FC = () => {
  const bridge = useRuntimeBridge();
  const [isMaximized, setIsMaximized] = useState(false);

  const checkMaximized = useCallback(async () => {
    if (bridge.window.isMaximized) {
      try {
        const max = await bridge.window.isMaximized();
        setIsMaximized(max);
      } catch {
        // ignore
      }
    }
  }, [bridge.window]);

  useEffect(() => {
    if (!bridge.window.isNative) return;
    checkMaximized();
    const unsub = addWindowListener('resize', checkMaximized);
    return unsub;
  }, [bridge.window.isNative, checkMaximized]);

  if (!bridge.window.isNative || isMaximized) {
    return null;
  }

  const handleMouseDown = (direction: WindowResizeDirection) => (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    bridge.window.startResizeDragging?.(direction);
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden select-none" aria-hidden="true">
      {/* 4 Edges */}
      <div
        className="pointer-events-auto absolute top-0 left-3 right-3 h-1.5 cursor-ns-resize"
        onMouseDown={handleMouseDown('North')}
        title="Resize"
      />
      <div
        className="pointer-events-auto absolute bottom-0 left-3 right-3 h-1.5 cursor-ns-resize"
        onMouseDown={handleMouseDown('South')}
        title="Resize"
      />
      <div
        className="pointer-events-auto absolute top-3 bottom-3 left-0 w-1.5 cursor-ew-resize"
        onMouseDown={handleMouseDown('West')}
        title="Resize"
      />
      <div
        className="pointer-events-auto absolute top-3 bottom-3 right-0 w-1.5 cursor-ew-resize"
        onMouseDown={handleMouseDown('East')}
        title="Resize"
      />

      {/* 4 Corners */}
      <div
        className="pointer-events-auto absolute top-0 left-0 h-3 w-3 cursor-nwse-resize"
        onMouseDown={handleMouseDown('NorthWest')}
        title="Resize"
      />
      <div
        className="pointer-events-auto absolute top-0 right-0 h-3 w-3 cursor-nesw-resize"
        onMouseDown={handleMouseDown('NorthEast')}
        title="Resize"
      />
      <div
        className="pointer-events-auto absolute bottom-0 left-0 h-3 w-3 cursor-nesw-resize"
        onMouseDown={handleMouseDown('SouthWest')}
        title="Resize"
      />
      <div
        className="pointer-events-auto absolute bottom-0 right-0 h-3 w-3 cursor-nwse-resize"
        onMouseDown={handleMouseDown('SouthEast')}
        title="Resize"
      />
    </div>
  );
};
