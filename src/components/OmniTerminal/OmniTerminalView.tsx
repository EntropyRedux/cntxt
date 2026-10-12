import React, { useState, useEffect, useRef } from 'react';
import { 
  Folder, 
  ExternalLink, 
  Plus, 
  FolderOpen, 
  Bot,
  AlertCircle
} from 'lucide-react';
import { useOmniTerminalStore } from '../../store/omniTerminalStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useRuntimeBridge } from '../../adapters';
import { AgentRosterBar } from './AgentRosterBar';
import { ChatMessageBubble } from './ChatMessageBubble';
import { ChatInputBar } from './ChatInputBar';

export const OmniTerminalView: React.FC = () => {
  const bridge = useRuntimeBridge();
  const { 
    activeSession, 
    messages, 
    targetFolder, 
    setTargetFolder, 
    createSession, 
    error 
  } = useOmniTerminalStore();
  const { settings, updateSettings } = useSettingsStore();

  const [sessionTitle, setSessionTitle] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const feedEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Sync initial target folder from settings if unset
  useEffect(() => {
    if (!targetFolder && settings.omniStorageFolder) {
      setTargetFolder(settings.omniStorageFolder);
    }
  }, [targetFolder, settings.omniStorageFolder, setTargetFolder]);

  const handlePickTargetFolder = async () => {
    try {
      if (!bridge.fs.openDirectory) return;
      const result = await bridge.fs.openDirectory();
      const folderPath = result?.path || result?.name;
      if (folderPath) {
        setTargetFolder(folderPath);
        updateSettings({ omniStorageFolder: folderPath });
      }
    } catch (err) {
      console.warn('Folder selection dialog cancelled or failed:', err);
    }
  };

  const handleStartSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetFolder) {
      await handlePickTargetFolder();
    }
    await createSession(sessionTitle || 'Multi-Agent Session', bridge);
    setIsCreatingNew(false);
    setSessionTitle('');
  };

  const handleToggleFloating = () => {
    updateSettings({ isOmniFloating: !settings.isOmniFloating });
  };

  return (
    <div className="flex flex-col h-full w-full bg-[var(--app-bg)] text-[var(--text-primary)] select-none">
      {/* 1. Subsystem Header Bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-subtle)] bg-[var(--card-bg)] shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-[var(--accent-primary)]" />
          <span className="text-xs font-semibold tracking-wide">Omni Terminal</span>
          {activeSession && (
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-500 font-medium">
              Live
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsCreatingNew(!isCreatingNew)}
            className="p-1 rounded text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] transition-colors"
            title="New Session"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleToggleFloating}
            className="p-1 rounded text-xs text-[var(--text-secondary)] hover:text-[var(--accent-primary)] hover:bg-[var(--card-hover-bg)] transition-colors"
            title={settings.isOmniFloating ? 'Dock to Sidebar' : 'Pop out into Floating Chat'}
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Error Alert Banner */}
      {error && (
        <div className="px-3 py-1.5 bg-red-500/10 border-b border-red-500/20 text-red-400 text-xs flex items-center gap-1.5 shrink-0">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{error}</span>
        </div>
      )}

      {/* 2. Target Storage Folder Selector Bar */}
      <div className="px-3 py-1.5 border-b border-[var(--border-subtle)] bg-[var(--sidebar-bg)] flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center gap-1.5 text-[var(--text-secondary)] truncate">
          <Folder className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />
          <div className="flex flex-col truncate">
            <span className="truncate font-mono text-[11px]" title={targetFolder || 'No folder selected'}>
              {targetFolder ? targetFolder.split('/').pop() || targetFolder : 'Choose session storage folder...'}
            </span>
            {activeSession?.workspacePath && (
              <span className="text-[9px] text-[var(--text-muted)] truncate" title={activeSession.workspacePath}>
                cwd: {activeSession.workspacePath.split('/').pop() || activeSession.workspacePath}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={handlePickTargetFolder}
          className="px-2 py-0.5 rounded text-[11px] font-medium bg-[var(--card-bg)] border border-[var(--border-primary)] hover:bg-[var(--card-hover-bg)] transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
        >
          <FolderOpen className="w-3 h-3" />
          <span>Browse</span>
        </button>
      </div>

      {/* 3. New Session Creator Drawer */}
      {isCreatingNew && (
        <form onSubmit={handleStartSession} className="p-3 border-b border-[var(--border-subtle)] bg-[var(--card-bg)] flex flex-col gap-2 shrink-0">
          <span className="text-xs font-semibold text-[var(--text-primary)]">Start New Multi-Agent Session</span>
          <input
            type="text"
            placeholder="Session Title (e.g. Audit & Rebuild Sprint)"
            value={sessionTitle}
            onChange={(e) => setSessionTitle(e.target.value)}
            className="w-full text-xs p-1.5 rounded border border-[var(--border-primary)] bg-[var(--app-bg)] text-[var(--text-primary)]"
          />
          <button
            type="submit"
            className="w-full py-1.5 rounded text-xs bg-[var(--accent-primary)] text-white font-medium hover:opacity-90 transition-opacity"
          >
            Create Session & Dual .cntxt Documents
          </button>
        </form>
      )}

      {/* 4. Active Session Content */}
      {activeSession ? (
        <>
          {/* Agent Roster Bar */}
          <AgentRosterBar />

          {/* Chat Stream Feed */}
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 min-h-0">
            {messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-muted)] text-center p-4">
                <Bot className="w-8 h-8 mb-2 opacity-40 text-[var(--accent-primary)]" />
                <p className="text-xs font-medium">Session Initialized</p>
                <p className="text-[11px] max-w-xs mt-1">
                  Type a prompt below to broadcast to all agents, or target a specific agent using <code className="text-[var(--accent-primary)]">@handle</code>.
                </p>
              </div>
            ) : (
              messages.map((msg) => <ChatMessageBubble key={msg.id} message={msg} />)
            )}
            <div ref={feedEndRef} />
          </div>

          {/* Chat Input Bar */}
          <ChatInputBar />
        </>
      ) : (
        /* Empty State / Welcome to Omni Terminal */
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-[var(--text-secondary)]">
          <Bot className="w-12 h-12 mb-3 text-[var(--accent-primary)] opacity-60" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Omni Terminal Mission Control</h3>
          <p className="text-xs text-[var(--text-muted)] max-w-xs mb-4">
            Coordinate multiple CLI agents in real-time with dual-bus .cntxt logging, role-gated RPCs, and targeted delegation.
          </p>
          <button
            type="button"
            onClick={() => setIsCreatingNew(true)}
            className="px-4 py-2 rounded-lg text-xs bg-[var(--accent-primary)] text-white font-medium hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Session</span>
          </button>
        </div>
      )}
    </div>
  );
};
