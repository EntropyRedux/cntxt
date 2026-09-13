import React from 'react';
import { RuntimeBridgeProvider } from './adapters/runtimeBridge';
import { ShellFrame } from './shell/ShellFrame';

/**
 * CNTXT Frontend UI Application Root
 * 
 * Clean, decoupled frontend scaffold for ContextPad.
 * Wraps the application in RuntimeBridgeProvider (which can be swapped
 * with a Tauri / Electron / Native bridge when ported to desktop).
 */
export default function App() {
  return (
    <RuntimeBridgeProvider>
      <ShellFrame />
    </RuntimeBridgeProvider>
  );
}
