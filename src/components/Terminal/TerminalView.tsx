import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Terminal as TerminalIcon,
  Plus,
  X,
  Square,
  Trash2,
  Copy,
  Check,
  Play,
  ExternalLink,
} from 'lucide-react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { useTerminalStore, TerminalChannelState } from '../../store/terminalStore';
import { useRuntimeBridge } from '../../adapters/runtimeBridge';
import { useNotificationStore } from '../../store/notificationStore';
import { STORAGE_KEYS } from '../../adapters/storageKeys';

export interface TerminalViewProps {
  className?: string;
  defaultChannelId?: string;
}

export const TerminalView: React.FC<TerminalViewProps> = ({
  className = '',
  defaultChannelId,
}) => {
  const bridge = useRuntimeBridge();
  const {
    channels,
    activeChannelId,
    createChannel,
    removeChannel,
    setActiveChannel,
    appendOutput,
    setChannelStatus,
    clearChannelOutput,
    getChannelList,
  } = useTerminalStore();

  const [isCopied, setIsCopied] = useState(false);
  const [canvasError, setCanvasError] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  const channelList = useMemo(() => getChannelList(), [channels]);
  const activeChannel: TerminalChannelState | undefined = activeChannelId
    ? channels[activeChannelId]
    : channelList[0];

  const isTerminalAvailable = bridge.terminal?.isAvailable() ?? false;

  // Auto-create initial channel or switch to defaultChannelId if provided
  useEffect(() => {
    if (defaultChannelId && channels[defaultChannelId]) {
      if (activeChannelId !== defaultChannelId) {
        setActiveChannel(defaultChannelId);
      }
      return;
    }

    if (channelList.length === 0) {
      const defaultName = 'Shell';
      const defaultCmd = bridge.platform.os === 'windows' ? 'powershell' : 'bash';
      let wsCwd: string | undefined;
      if (bridge.storage) {
        bridge.storage
          .getItem(STORAGE_KEYS.WORKSPACE_PATH)
          .then((stored) => {
            if (stored && stored.trim()) wsCwd = stored.trim();
            createChannel({
              id: defaultChannelId || `term_${Date.now()}`,
              name: defaultName,
              command: defaultCmd,
              cwd: wsCwd,
            });
          })
          .catch(() => {
            createChannel({
              id: defaultChannelId || `term_${Date.now()}`,
              name: defaultName,
              command: defaultCmd,
            });
          });
      } else {
        createChannel({
          id: defaultChannelId || `term_${Date.now()}`,
          name: defaultName,
          command: defaultCmd,
        });
      }
    } else if (!activeChannelId && channelList[0]) {
      setActiveChannel(channelList[0].id);
    }
  }, [
    channelList.length,
    activeChannelId,
    createChannel,
    setActiveChannel,
    defaultChannelId,
    bridge.platform.os,
    channels,
    bridge.storage,
  ]);

  // Mount @xterm/xterm inside containerRef whenever activeChannel changes
  useEffect(() => {
    if (!containerRef.current || !activeChannel) return;

    let term: Terminal;
    let fitAddon: FitAddon;

    try {
      term = new Terminal({
        cursorBlink: true,
        cursorStyle: 'block',
        fontSize: 13,
        lineHeight: 1.25,
        fontFamily:
          'JetBrains Mono, Fira Code, Consolas, Monaco, "Courier New", monospace',
        theme: {
          background: '#0a0b0e',
          foreground: '#e2e8f0',
          cursor: '#38bdf8',
          cursorAccent: '#0a0b0e',
          selectionBackground: 'rgba(56, 189, 248, 0.3)',
          black: '#1a1c23',
          red: '#f87171',
          green: '#34d399',
          yellow: '#fbbf24',
          blue: '#60a5fa',
          magenta: '#c084fc',
          cyan: '#38bdf8',
          white: '#f1f5f9',
          brightBlack: '#64748b',
          brightRed: '#ef4444',
          brightGreen: '#10b981',
          brightYellow: '#f59e0b',
          brightBlue: '#3b82f6',
          brightMagenta: '#a855f7',
          brightCyan: '#06b6d4',
          brightWhite: '#ffffff',
        },
        scrollback: 10000,
        convertEol: true,
        allowProposedApi: true,
      });

      fitAddon = new FitAddon();
      term.loadAddon(fitAddon);

      // Clear container DOM children
      containerRef.current.innerHTML = '';
      term.open(containerRef.current);
      fitAddon.fit();

      termRef.current = term;
      fitAddonRef.current = fitAddon;
      setCanvasError(false);
    } catch {
      setCanvasError(true);
      return;
    }

    // Write existing buffer history
    if (activeChannel.buffer) {
      term.write(activeChannel.buffer);
    }

    // Direct user typing -> PTY stdin write
    const onDataDisposable = term.onData((data) => {
      if (bridge.terminal?.isAvailable() && activeChannel.status === 'running') {
        bridge.terminal.write(activeChannel.id, data).catch(console.error);
      }
    });

    // PTY stdout -> xterm write
    let unlistenData = () => {};
    let unlistenExit = () => {};

    if (bridge.terminal?.isAvailable()) {
      unlistenData = bridge.terminal.onData(activeChannel.id, (event) => {
        appendOutput(event.id, 'stdout', event.data);
        term.write(event.data);
      });

      unlistenExit = bridge.terminal.onExit(activeChannel.id, (event) => {
        setChannelStatus(activeChannel.id, 'exited', event.exitCode);
        useNotificationStore
          .getState()
          .addNotification(
            'Process Exited',
            `Channel '${activeChannel.name}' exited with code ${event.exitCode ?? 0}`,
            event.exitCode === 0 ? 'info' : 'warning'
          );
      });
    }

    // Resize handling via ResizeObserver
    const resizeObserver = new ResizeObserver(() => {
      try {
        if (!fitAddon || !term) return;
        fitAddon.fit();
        if (bridge.terminal?.resize && activeChannel.id) {
          bridge.terminal.resize(activeChannel.id, term.cols, term.rows).catch(() => {});
        }
      } catch {
        // Ignore resize errors
      }
    });

    resizeObserver.observe(containerRef.current);

    // Initial focus
    term.focus();

    return () => {
      resizeObserver.disconnect();
      onDataDisposable.dispose();
      unlistenData();
      unlistenExit();
      term.dispose();
      termRef.current = null;
      fitAddonRef.current = null;
    };
  }, [activeChannel?.id, bridge.terminal, appendOutput, setChannelStatus]);

  // Spawn new shell process
  const handleSpawn = useCallback(
    async (channel: TerminalChannelState) => {
      if (!bridge.terminal?.isAvailable()) {
        useNotificationStore
          .getState()
          .addNotification(
            'Terminal Unavailable',
            'PTY terminal is supported in CNTXT Desktop.',
            'info'
          );
        return;
      }

      try {
        setChannelStatus(channel.id, 'running');
        const defaultCmd =
          channel.command || (bridge.platform.os === 'windows' ? 'powershell' : 'bash');

        await bridge.terminal.spawn({
          id: channel.id,
          command: defaultCmd,
          args: channel.args || [],
          cwd: channel.cwd,
          cols: termRef.current?.cols || 80,
          rows: termRef.current?.rows || 24,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setChannelStatus(channel.id, 'error');
        useNotificationStore
          .getState()
          .addNotification('Terminal Spawn Error', msg, 'error');
      }
    },
    [bridge, setChannelStatus]
  );

  // Kill running process
  const handleKill = useCallback(async () => {
    if (!activeChannel || !bridge.terminal?.isAvailable()) return;
    try {
      await bridge.terminal.kill(activeChannel.id);
      setChannelStatus(activeChannel.id, 'exited', -1);
    } catch (err) {
      console.warn('Failed to kill terminal process:', err);
    }
  }, [activeChannel, bridge.terminal, setChannelStatus]);

  // Clear output buffer
  const handleClear = useCallback(() => {
    if (!activeChannel) return;
    clearChannelOutput(activeChannel.id);
    if (termRef.current) {
      termRef.current.clear();
      termRef.current.reset();
    }
  }, [activeChannel, clearChannelOutput]);

  // Copy terminal logs
  const handleCopy = useCallback(async () => {
    if (!activeChannel) return;
    try {
      const selected = termRef.current?.hasSelection()
        ? termRef.current.getSelection()
        : activeChannel.buffer;
      await bridge.clipboard.writeText(selected || activeChannel.buffer);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // Fallback
    }
  }, [activeChannel, bridge.clipboard]);

  // Spawn external window
  const handleSpawnExternal = useCallback(async () => {
    if (!bridge.terminal?.spawnExternal) return;
    try {
      const cwd = activeChannel?.cwd || 'C:/';
      await bridge.terminal.spawnExternal(cwd, activeChannel?.command);
    } catch (err) {
      console.warn('Failed to spawn external window:', err);
    }
  }, [bridge.terminal, activeChannel]);

  // Create new channel
  const handleNewChannel = useCallback(async () => {
    const num = channelList.length + 1;
    const defaultCmd = bridge.platform.os === 'windows' ? 'powershell' : 'bash';
    let wsCwd: string | undefined;
    if (bridge.storage) {
      try {
        const stored = await bridge.storage.getItem(STORAGE_KEYS.WORKSPACE_PATH);
        if (stored && stored.trim()) wsCwd = stored.trim();
      } catch {
        // Fallback
      }
    }
    const newId = createChannel({
      name: `Shell ${num}`,
      command: defaultCmd,
      cwd: wsCwd,
    });
    setActiveChannel(newId);
  }, [
    channelList.length,
    bridge.platform.os,
    bridge.storage,
    createChannel,
    setActiveChannel,
  ]);

  return (
    <div
      className={`flex flex-col h-full w-full bg-[var(--bg-primary,#0a0b0e)] text-[var(--text-primary,#e2e8f0)] font-mono select-text overflow-hidden ${className}`}
    >
      {/* Platform banner if in web/unsupported mode */}
      {!isTerminalAvailable && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border-b border-amber-500/20 text-amber-300 text-xs shrink-0 select-none">
          <TerminalIcon className="w-3.5 h-3.5 shrink-0" />
          <span>
            Web Preview Mode: Native PTY terminal execution runs in CNTXT Desktop.
          </span>
        </div>
      )}

      {/* Terminal Channel Tabs & Controls Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--border-subtle,#1e222d)] bg-[var(--bg-secondary,#0f1117)] shrink-0 gap-2">
        {/* Left: Channel Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          {channelList.map((channel) => {
            const isActive = channel.id === activeChannel?.id;
            const isRunning = channel.status === 'running';

            return (
              <div
                key={channel.id}
                onClick={() => setActiveChannel(channel.id)}
                className={`group flex items-center gap-1.5 px-2.5 py-1 rounded text-xs cursor-pointer border transition-all select-none ${
                  isActive
                    ? 'bg-[var(--card-secondary-bg,#1a1d26)] text-[var(--text-primary,#ffffff)] border-sky-500/40 shadow-sm'
                    : 'bg-[var(--bg-primary,#12141a)] text-[var(--text-muted,#8e95a5)] border-transparent hover:text-[var(--text-primary,#ffffff)] hover:bg-[var(--card-secondary-bg,#161822)]'
                }`}
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    isRunning
                      ? 'bg-emerald-400 animate-pulse'
                      : channel.status === 'error'
                      ? 'bg-rose-400'
                      : 'bg-zinc-500'
                  }`}
                />
                <span className="font-medium max-w-[120px] truncate">
                  {channel.name}
                </span>

                {channelList.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeChannel(channel.id);
                    }}
                    className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:text-rose-400 transition-opacity"
                    title="Close Channel"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}

          <button
            onClick={handleNewChannel}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs text-[var(--text-muted,#8e95a5)] hover:text-[var(--text-primary,#ffffff)] hover:bg-[var(--card-secondary-bg,#1a1d26)] transition-colors"
            title="Create New Terminal Shell"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New</span>
          </button>
        </div>

        {/* Right: Controls & Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] text-[var(--text-muted,#64748b)] hidden md:inline select-none">
            Click terminal to type
          </span>

          {activeChannel &&
            activeChannel.status !== 'running' &&
            isTerminalAvailable && (
              <button
                onClick={() => handleSpawn(activeChannel)}
                className="flex items-center gap-1 px-2 py-0.5 rounded text-xs text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                title="Spawn / Run Process"
              >
                <Play className="w-3 h-3" />
                <span className="hidden sm:inline">Start</span>
              </button>
            )}

          {activeChannel &&
            activeChannel.status === 'running' &&
            isTerminalAvailable && (
              <button
                onClick={handleKill}
                className="flex items-center gap-1 px-2 py-0.5 rounded text-xs text-rose-400 hover:bg-rose-500/10 transition-colors"
                title="Kill Running Process"
              >
                <Square className="w-3 h-3" />
                <span className="hidden sm:inline">Stop</span>
              </button>
            )}

          {bridge.terminal?.spawnExternal && (
            <button
              onClick={handleSpawnExternal}
              className="p-1 rounded text-[var(--text-muted,#8e95a5)] hover:text-sky-400 hover:bg-[var(--card-secondary-bg,#1a1d26)] transition-colors"
              title="Open in External Native Window"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={handleClear}
            className="p-1 rounded text-[var(--text-muted,#8e95a5)] hover:text-[var(--text-primary,#ffffff)] hover:bg-[var(--card-secondary-bg,#1a1d26)] transition-colors"
            title="Clear Terminal Output"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleCopy}
            className="p-1 rounded text-[var(--text-muted,#8e95a5)] hover:text-[var(--text-primary,#ffffff)] hover:bg-[var(--card-secondary-bg,#1a1d26)] transition-colors"
            title="Copy Output"
          >
            {isCopied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Terminal Viewport */}
      <div
        className="flex-1 w-full h-full relative overflow-hidden bg-[var(--bg-primary,#0a0b0e)]"
        onClick={() => termRef.current?.focus()}
      >
        {canvasError ? (
          // Graceful fallback for environments where canvas/WebGL context is missing
          <div className="p-3 text-xs text-zinc-400 whitespace-pre-wrap font-mono h-full overflow-auto">
            {activeChannel?.buffer || 'Terminal ready. Type commands in desktop.'}
          </div>
        ) : (
          <div
            ref={containerRef}
            className="w-full h-full p-2"
            style={{ width: '100%', height: '100%' }}
          />
        )}
      </div>
    </div>
  );
};
