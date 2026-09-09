import React from 'react';
import { RuntimeBridgeProvider } from './adapters/runtimeBridge';
import { ShellFrame } from './shell/ShellFrame';

/**
 * CNTXT Frontend UI Application Root
 * 
 * Clean, decoupled frontend scaffold for ContextPad.
 * Detects runtime environment and injects appropriate bridge:
 * - Tauri Desktop: Uses TauriRuntimeAdapter for native OS integration
 * - Web/Browser: Uses BrowserRuntimeAdapter with IndexedDB storage
 * - Testing: Uses MockRuntimeAdapter for unit tests
 */
export default function App() {
  return (
    <RuntimeBridgeProvider>
      <ShellFrame />
    </RuntimeBridgeProvider>
  );
}
