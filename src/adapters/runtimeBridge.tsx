import React, { createContext, useContext, useMemo } from 'react';
import { IRuntimeBridge } from '../ui-contract/bridgeContract';
import { BrowserRuntimeAdapter } from './browserRuntimeAdapter';
import { TauriRuntimeAdapter, isTauri } from './tauriRuntimeAdapter';

const RuntimeBridgeContext = createContext<IRuntimeBridge | null>(null);

export interface RuntimeBridgeProviderProps {
  bridge?: IRuntimeBridge;
  children: React.ReactNode;
}

/**
 * RuntimeBridgeProvider
 * Injects the runtime bridge into the React component tree.
 * 
 * - In Tauri Desktop: automatically detects and uses TauriRuntimeAdapter
 * - In Web / AI Studio: uses default BrowserRuntimeAdapter
 * - Custom bridge override can be passed as a prop
 */
export const RuntimeBridgeProvider: React.FC<RuntimeBridgeProviderProps> = ({
  bridge,
  children
}) => {
  const activeBridge = useMemo(() => {
    if (bridge) return bridge;
    if (isTauri()) {
      return new TauriRuntimeAdapter();
    }
    return new BrowserRuntimeAdapter();
  }, [bridge]);

  return (
    <RuntimeBridgeContext.Provider value={activeBridge}>
      {children}
    </RuntimeBridgeContext.Provider>
  );
};

export const useRuntimeBridge = (): IRuntimeBridge => {
  const bridge = useContext(RuntimeBridgeContext);
  if (!bridge) {
    if (isTauri()) {
      return new TauriRuntimeAdapter();
    }
    return new BrowserRuntimeAdapter();
  }
  return bridge;
};
