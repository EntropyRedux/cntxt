import React, { createContext, useContext, useMemo } from 'react';
import { IRuntimeBridge } from '../ui-contract/bridgeContract';
import { BrowserRuntimeAdapter } from './browserRuntimeAdapter';
import { TauriRuntimeAdapter } from './tauriRuntimeAdapter';

const RuntimeBridgeContext = createContext<IRuntimeBridge | null>(null);

export interface RuntimeBridgeProviderProps {
  bridge?: IRuntimeBridge;
  children: React.ReactNode;
}

const isTauriRuntime = (): boolean => {
  return typeof window !== 'undefined' && Boolean(
    (window as any).isTauri || (window as any).__TAURI_INTERNALS__ || (window as any).__TAURI__
  );
};

/**
 * RuntimeBridgeProvider
 * Injects the runtime bridge into the React component tree.
 * 
 * - In Web / AI Studio: uses default BrowserRuntimeAdapter
 * - In CNTXT Desktop: automatically selects TauriRuntimeAdapter
 */
export const RuntimeBridgeProvider: React.FC<RuntimeBridgeProviderProps> = ({
  bridge,
  children
}) => {
  const activeBridge = useMemo(() => {
    if (bridge) return bridge;
    return getRuntimeBridge();
  }, [bridge]);

  return (
    <RuntimeBridgeContext.Provider value={activeBridge}>
      {children}
    </RuntimeBridgeContext.Provider>
  );
};

let globalBridgeInstance: IRuntimeBridge | null = null;

export const getRuntimeBridge = (): IRuntimeBridge => {
  if (!globalBridgeInstance) {
    globalBridgeInstance = isTauriRuntime() ? new TauriRuntimeAdapter() : new BrowserRuntimeAdapter();
  }
  return globalBridgeInstance;
};

export const useRuntimeBridge = (): IRuntimeBridge => {
  const bridge = useContext(RuntimeBridgeContext);
  if (!bridge) {
    return getRuntimeBridge();
  }
  return bridge;
};
