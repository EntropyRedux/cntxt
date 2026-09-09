import React, { createContext, useContext, useMemo } from 'react';
import { IRuntimeBridge } from '../ui-contract/bridgeContract';
import { BrowserRuntimeAdapter } from './browserRuntimeAdapter';

const RuntimeBridgeContext = createContext<IRuntimeBridge | null>(null);

export interface RuntimeBridgeProviderProps {
  bridge?: IRuntimeBridge;
  children: React.ReactNode;
}

/**
 * RuntimeBridgeProvider
 * Injects the runtime bridge into the React component tree.
 * 
 * - In Web / AI Studio: uses default BrowserRuntimeAdapter
 * - In CNTXT Desktop: pass `<RuntimeBridgeProvider bridge={new TauriRuntimeBridge()}>`
 */
export const RuntimeBridgeProvider: React.FC<RuntimeBridgeProviderProps> = ({
  bridge,
  children
}) => {
  const activeBridge = useMemo(() => {
    return bridge || new BrowserRuntimeAdapter();
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
    // Fallback if rendered outside provider
    return new BrowserRuntimeAdapter();
  }
  return bridge;
};
