import React, { useState } from 'react';
import { Plus, Play, Square, Bot, X, Terminal, Monitor, ExternalLink } from 'lucide-react';
import { useOmniTerminalStore } from '../../store/omniTerminalStore';
import { useTemplateStore } from '../../store/templateStore';
import { useTabStore } from '../../store/tabStore';
import { useRuntimeBridge } from '../../adapters';
import { OmniAgentProfile, OmniAgentRole } from '../../contracts/data_shapes';

interface ScriptPreset {
  name: string;
  handle: string;
  role: OmniAgentRole;
  command: string;
  color: string;
  emoji: string;
}

const PRESET_SCRIPTS: ScriptPreset[] = [
  {
    name: 'Antigravity CLI',
    handle: 'agy',
    role: 'Auditor Agent',
    command: 'powershell.exe -NoLogo -NoExit -Command "agy --dangerously-skip-permissions"',
    color: '#10b981',
    emoji: '🤖',
  },
  {
    name: 'Cline CLI',
    handle: 'cline',
    role: 'Prod Agent',
    command: 'powershell.exe -NoLogo -NoExit -Command "cline --auto-approve true"',
    color: '#6366f1',
    emoji: '🚀',
  },
  {
    name: 'OpenCode CLI',
    handle: 'opencode',
    role: 'Prod Agent',
    command: 'powershell.exe -NoLogo -NoExit -Command "opencode --auto"',
    color: '#f59e0b',
    emoji: '⚡',
  },
  {
    name: 'Kilo CLI',
    handle: 'kilo',
    role: 'Prod Agent',
    command: 'powershell.exe -NoLogo -NoExit -Command "kilo"',
    color: '#06b6d4',
    emoji: '🔵',
  },
  {
    name: 'PowerShell',
    handle: 'pwsh',
    role: 'Custom',
    command: 'powershell.exe -NoLogo',
    color: '#8b5cf6',
    emoji: '🐚',
  },
];

export const AgentRosterBar: React.FC = () => {
  const bridge = useRuntimeBridge();
  const {
    activeSession,
    addAgent,
    removeAgent,
    startAgent,
    killAgent,
    startAllAgents,
    killAllAgents,
  } = useOmniTerminalStore();
  const { templates } = useTemplateStore();
  const { openTerminalTab } = useTabStore();

  const [isAddingAgent, setIsAddingAgent] = useState(false);
  const [handle, setHandle] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<OmniAgentRole>('Auditor Agent');
  const [command, setCommand] = useState('powershell.exe -NoLogo');
  const [spawnMode, setSpawnMode] = useState<'headless' | 'external-window'>('headless');
  const [color, setColor] = useState('#10b981');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  if (!activeSession) return null;

  const handleApplyPreset = (preset: ScriptPreset) => {
    const existing = activeSession.pinnedAgents.find((a) => a.handle.toLowerCase() === preset.handle.toLowerCase());
    if (existing) {
      // If already added, toggle start
      if (existing.status === 'stopped' || existing.status === 'error' || existing.status === 'idle') {
        startAgent(existing.id, bridge);
      }
      return;
    }

    const agentId = `agent_${preset.handle}_${Date.now()}`;
    addAgent({
      id: agentId,
      name: preset.name,
      handle: preset.handle,
      role: preset.role,
      command: preset.command,
      spawnMode: 'headless',
      color: preset.color,
    });

    // Auto-start newly added preset agent
    setTimeout(() => {
      startAgent(agentId, bridge);
    }, 50);
  };

  const handleApplyTemplate = (tmplId: string) => {
    setSelectedTemplateId(tmplId);
    const tmpl = templates.find((t) => t.id === tmplId);
    if (tmpl) {
      setName(tmpl.name || 'Agent');
      const safeHandle = (tmpl.name || 'agent')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 10);
      setHandle(safeHandle);
      if (tmpl.description?.toLowerCase().includes('audit')) {
        setRole('Auditor Agent');
        setColor('#10b981');
      } else if (tmpl.description?.toLowerCase().includes('test')) {
        setRole('Tester Agent');
        setColor('#3b82f6');
      } else {
        setRole('Prod Agent');
        setColor('#6366f1');
      }
      if (tmpl.content && tmpl.category === 'SCRIPTS') {
        setCommand(tmpl.content);
      }
    }
  };

  const handleCreateAgent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!handle.trim()) return;

    addAgent({
      id: `agent_${handle.trim().toLowerCase()}_${Date.now()}`,
      name: name.trim() || handle.trim(),
      handle: handle.trim().toLowerCase(),
      role,
      command: command.trim() || 'powershell.exe',
      spawnMode,
      color,
      templateId: selectedTemplateId || undefined,
    });

    setIsAddingAgent(false);
    setHandle('');
    setName('');
  };

  return (
    <div className="border-b border-[var(--border-subtle)] bg-[var(--card-bg)] px-3 py-2 flex flex-col gap-2">
      {/* 1. Header Bar with Bulk Controls */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
          <Bot className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
          Active Terminals ({activeSession.pinnedAgents.length})
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => startAllAgents(bridge)}
            className="p-1 rounded text-xs bg-[var(--card-hover-bg)] text-[var(--text-primary)] hover:bg-[var(--accent-primary)] hover:text-white transition-colors cursor-pointer"
            title="Start All Agents"
          >
            <Play className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => killAllAgents(bridge)}
            className="p-1 rounded text-xs bg-[var(--card-hover-bg)] text-[var(--text-primary)] hover:bg-[var(--status-error)] hover:text-white transition-colors cursor-pointer"
            title="Stop All Agents"
          >
            <Square className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => setIsAddingAgent(!isAddingAgent)}
            className="p-1 rounded text-xs bg-[var(--accent-primary)] text-white hover:opacity-90 transition-opacity cursor-pointer"
            title="Add Custom Agent or Script"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* 2. Color-Coded Terminal Roster Pills */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {activeSession.pinnedAgents.length === 0 && (
          <span className="text-xs text-[var(--text-muted)] italic">
            No agents launched. Click a preset below to start.
          </span>
        )}

        {activeSession.pinnedAgents.map((agent) => {
          const agentColor = agent.color || '#10b981';
          return (
            <div
              key={agent.id}
              style={{ borderColor: `${agentColor}60` }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border bg-[var(--card-bg)] text-[var(--text-primary)] shadow-xs transition-all"
            >
              {/* Status Indicator Dot */}
              <span
                className={`w-2 h-2 rounded-full ${
                  agent.status === 'busy'
                    ? 'animate-pulse'
                    : agent.status === 'waiting_permission'
                    ? 'animate-ping'
                    : ''
                }`}
                style={{
                  backgroundColor:
                    agent.status === 'busy'
                      ? '#3b82f6'
                      : agent.status === 'waiting_permission'
                      ? '#f59e0b'
                      : agent.status === 'starting'
                      ? '#eab308'
                      : agent.status === 'error'
                      ? '#ef4444'
                      : agent.status === 'stopped'
                      ? '#6b7280'
                      : agentColor,
                }}
              />

              {/* Handle with Accent Color */}
              <span className="font-mono font-bold" style={{ color: agentColor }}>
                @{agent.handle}
              </span>
              <span className="text-[10px] text-[var(--text-muted)]">[{agent.role.split(' ')[0]}]</span>

              {/* Show Agent in Native Terminal Tab */}
              <button
                type="button"
                onClick={() => {
                  if (agent.channelId) {
                    openTerminalTab(`@${agent.handle} Terminal`, agent.channelId);
                  } else {
                    startAgent(agent.id, bridge);
                    setTimeout(() => {
                      const updated = useOmniTerminalStore.getState().activeSession?.pinnedAgents.find((a) => a.id === agent.id);
                      openTerminalTab(`@${agent.handle} Terminal`, updated?.channelId);
                    }, 100);
                  }
                }}
                className="hover:text-[var(--accent-primary)] text-[var(--text-muted)] transition-colors ml-0.5 cursor-pointer"
                title="Show Agent in In-App Terminal Tab (Interactive View)"
              >
                <Monitor className="w-3 h-3" />
              </button>

              {/* Launch in External Native Terminal Window */}
              <button
                type="button"
                onClick={async () => {
                  const executionCwd = activeSession.workspacePath || activeSession.targetFolder;
                  if (bridge?.terminal?.spawnExternal) {
                    await bridge.terminal.spawnExternal(executionCwd, agent.command);
                  }
                }}
                className="hover:text-[var(--accent-primary)] text-[var(--text-muted)] transition-colors ml-0.5 cursor-pointer"
                title="Launch Agent in External Terminal Window (wt.exe / powershell.exe)"
              >
                <ExternalLink className="w-3 h-3" />
              </button>

              {/* Start / Stop Toggle */}
              {agent.status === 'busy' || agent.status === 'waiting_permission' ? (
                <button
                  type="button"
                  onClick={() => killAgent(agent.id, bridge)}
                  className="hover:text-[var(--status-error)] text-[var(--text-muted)] transition-colors cursor-pointer"
                  title="Stop Terminal"
                >
                  <Square className="w-2.5 h-2.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => startAgent(agent.id, bridge)}
                  className="hover:text-emerald-500 text-[var(--text-muted)] transition-colors cursor-pointer"
                  title="Start Terminal"
                >
                  <Play className="w-2.5 h-2.5" />
                </button>
              )}

              {/* Remove Agent */}
              <button
                type="button"
                onClick={() => removeAgent(agent.id)}
                className="hover:text-[var(--status-error)] text-[var(--text-muted)] transition-colors cursor-pointer"
                title="Remove Agent"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* 3. 1-Click Script Launch Bar */}
      <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-[var(--border-subtle)]">
        <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold mr-1">
          Launch:
        </span>
        {PRESET_SCRIPTS.map((preset) => (
          <button
            key={preset.handle}
            type="button"
            onClick={() => handleApplyPreset(preset)}
            style={{
              borderColor: `${preset.color}40`,
              backgroundColor: `${preset.color}08`,
            }}
            className="px-2 py-0.5 rounded text-[11px] font-mono border hover:opacity-90 transition-all flex items-center gap-1 cursor-pointer active:scale-95"
            title={`Launch ${preset.name} (${preset.command})`}
          >
            <span>{preset.emoji}</span>
            <span className="font-semibold" style={{ color: preset.color }}>
              +{preset.handle}
            </span>
          </button>
        ))}
      </div>

      {/* 4. Custom Add Agent Form Drawer */}
      {isAddingAgent && (
        <form
          onSubmit={handleCreateAgent}
          className="p-2.5 rounded border border-[var(--border-subtle)] bg-[var(--app-bg)] flex flex-col gap-2 mt-1 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-primary)]">Add Custom Agent / Script</span>
            <button
              type="button"
              onClick={() => setIsAddingAgent(false)}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          {/* Template Picker */}
          {templates.length > 0 && (
            <div>
              <label className="text-[10px] text-[var(--text-secondary)] block mb-0.5">Preset from Template:</label>
              <select
                value={selectedTemplateId}
                onChange={(e) => handleApplyTemplate(e.target.value)}
                className="w-full text-xs p-1 rounded border border-[var(--border-primary)] bg-[var(--card-bg)] text-[var(--text-primary)]"
              >
                <option value="">-- Choose Template or Script (Optional) --</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.category})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] text-[var(--text-secondary)] block mb-0.5">Handle (@):</label>
              <input
                type="text"
                placeholder="agy"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                required
                className="w-full text-xs p-1 rounded border border-[var(--border-primary)] bg-[var(--card-bg)] text-[var(--text-primary)] font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-[var(--text-secondary)] block mb-0.5">Role:</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as OmniAgentRole)}
                className="w-full text-xs p-1 rounded border border-[var(--border-primary)] bg-[var(--card-bg)] text-[var(--text-primary)]"
              >
                <option value="Auditor Agent">Auditor Agent</option>
                <option value="Prod Agent">Prod Agent</option>
                <option value="Tester Agent">Tester Agent</option>
                <option value="Custom">Custom Shell</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-[var(--text-secondary)] block mb-0.5">Accent Color:</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-7 h-6 p-0 rounded border border-[var(--border-primary)] bg-transparent cursor-pointer"
                />
                <span className="font-mono text-[10px] text-[var(--text-muted)]">{color}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-[var(--text-secondary)] block mb-0.5">Shell Command:</label>
              <input
                type="text"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                required
                className="w-full text-xs p-1 rounded border border-[var(--border-primary)] bg-[var(--card-bg)] text-[var(--text-primary)] font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-[var(--text-secondary)] block mb-0.5">Spawn Mode:</label>
              <select
                value={spawnMode}
                onChange={(e) => setSpawnMode(e.target.value as 'headless' | 'external-window')}
                className="w-full text-xs p-1 rounded border border-[var(--border-primary)] bg-[var(--card-bg)] text-[var(--text-primary)]"
              >
                <option value="headless">Headless PTY (In-App)</option>
                <option value="external-window">External Terminal Window</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-1.5 rounded text-xs bg-[var(--accent-primary)] text-white hover:opacity-90 font-medium transition-opacity mt-1 cursor-pointer"
          >
            Add Agent to Session
          </button>
        </form>
      )}
    </div>
  );
};
