import React, { useEffect, useMemo } from 'react';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { BrowserRuntimeAdapter } from './adapters/browserRuntimeAdapter';
import { RuntimeBridgeProvider } from './adapters/runtimeBridge';
import { TauriRuntimeAdapter } from './adapters/tauriRuntimeAdapter';
import { ShellFrame } from './shell/ShellFrame';
import { useNotificationStore } from './store/notificationStore';
import { useTabStore } from './store/tabStore';

/**
 * CNTXT Frontend UI Application Root
 *
 * Dependency-injection site for the platform bridge:
 * - Inside the Tauri desktop shell, the TauriRuntimeAdapter is injected.
 * - In a plain web browser, the BrowserRuntimeAdapter is used.
 */
export default function App() {
  const bridge = useMemo(() => {
    if (isTauri()) {
      return new TauriRuntimeAdapter();
    }
    return new BrowserRuntimeAdapter();
  }, []);

  useEffect(() => {
    if (!isTauri()) return;
    let unlisten: UnlistenFn | undefined;

    const setup = async () => {
      // The Rust side blocks the window close and emits this event.
      // You can only close once all tabs are saved.
      unlisten = await listen('app-close-requested', () => {
        const { tabs } = useTabStore.getState();
        if (tabs.some((t) => t.isDirty)) {
          useNotificationStore.getState().addNotification(
            'Unsaved changes',
            'Save or close your tabs before exiting.',
            'warning',
          );
          return;
        }
        void invoke('confirm_close');
      });

      // Files opened via the OS ("Open with" / deep links).
      await listen<string[]>('open-files', (event) => {
        for (const path of event.payload || []) {
          void openFileInNewTab(path);
        }
      });
    };

    void setup();
    return () => {
      unlisten?.();
    };
  }, []);

  return (
    <RuntimeBridgeProvider bridge={bridge}>
      <ShellFrame />
    </RuntimeBridgeProvider>
  );
}

async function openFileInNewTab(path: string) {
  try {
    const content = await invoke<string>('read_file', { path });
    const language = await invoke<string>('detect_language_from_path', { path });
    const name = path.split(/[/\\]/).pop() || 'Untitled';
    useTabStore.getState().createTab(name, content, language as never, path);
  } catch (err) {
    console.error('Failed to open file from OS:', err);
    useNotificationStore.getState().addNotification(
      'Could not open file',
      path,
      'error',
    );
  }
}