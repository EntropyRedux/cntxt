import React, { useState, useRef } from 'react';
import { Send, LayoutTemplate, AtSign, AlertCircle, Slash } from 'lucide-react';
import { useOmniTerminalStore } from '../../store/omniTerminalStore';
import { useTemplateStore } from '../../store/templateStore';
import { useRuntimeBridge } from '../../adapters';

interface SlashCommand {
  label: string;
  command: string;
  description: string;
}

const DEFAULT_SLASH_COMMANDS: SlashCommand[] = [
  { label: '/audit', command: '@agy Audit the codebase against all 9 architectural pillars', description: 'Trigger Pass 1 Independent Audit' },
  { label: '/refactor', command: '@cline Refactor and remediate identified defects', description: 'Trigger Pass 2 Prod Agent Implementation' },
  { label: '/test', command: 'npm test', description: 'Run test suite gate' },
  { label: '/lint', command: 'npm run lint', description: 'Run lint and leak check gates' },
  { label: '/clear', command: '', description: 'Clear terminal screen (Ctrl+L)' },
  { label: '/interrupt', command: '', description: 'Send SIGINT interrupt (Ctrl+C)' },
];

export const ChatInputBar: React.FC = () => {
  const bridge = useRuntimeBridge();
  const { activeSession, sendMessage, sendRawKey } = useOmniTerminalStore();
  const { templates } = useTemplateStore();

  const [input, setInput] = useState('');
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  if (!activeSession) return null;

  const waitingAgents = activeSession.pinnedAgents.filter((a) => a.status === 'waiting_permission');

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;

    // If a single agent is waiting for attention and user didn't prefix @handle:
    // Route text directly to that waiting agent as the answer
    if (waitingAgents.length === 1 && !text.startsWith('@')) {
      sendMessage(text, waitingAgents[0].handle, bridge);
    } else {
      sendMessage(text, undefined, bridge);
    }

    setInput('');
    setShowMentionMenu(false);
    setShowSlashMenu(false);
    setShowTemplateMenu(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Intercept physical key navigation when input is empty
    if (!input) {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        sendRawKey('\x1b[A', undefined, bridge);
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        sendRawKey('\x1b[B', undefined, bridge);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        sendRawKey('\r', undefined, bridge);
        return;
      }
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        sendRawKey(' ', undefined, bridge);
        return;
      }
    }

    if (e.ctrlKey && (e.key === 'c' || e.key === 'C') && !window.getSelection()?.toString()) {
      e.preventDefault();
      sendRawKey('\x03', undefined, bridge);
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);

    // If user typed '@'
    if (val.endsWith('@') || val === '@') {
      setShowMentionMenu(true);
      setShowSlashMenu(false);
      setShowTemplateMenu(false);
    } else if (!val.includes('@')) {
      setShowMentionMenu(false);
    }

    // If user typed '/' at the start
    if (val === '/') {
      setShowSlashMenu(true);
      setShowMentionMenu(false);
      setShowTemplateMenu(false);
    } else if (!val.startsWith('/')) {
      setShowSlashMenu(false);
    }
  };

  const insertMention = (handle: string) => {
    if (input.endsWith('@')) {
      setInput(input + `${handle} `);
    } else {
      setInput(input + `@${handle} `);
    }
    setShowMentionMenu(false);
    textareaRef.current?.focus();
  };

  const executeSlashCommand = (cmd: SlashCommand) => {
    setShowSlashMenu(false);
    if (cmd.label === '/clear') {
      sendRawKey('\x0c', undefined, bridge);
      setInput('');
      return;
    }
    if (cmd.label === '/interrupt') {
      sendRawKey('\x03', undefined, bridge);
      setInput('');
      return;
    }
    setInput(cmd.command);
    textareaRef.current?.focus();
  };

  const insertTemplate = (templateContent: string) => {
    setInput(input ? `${input}\n\n${templateContent}` : templateContent);
    setShowTemplateMenu(false);
    textareaRef.current?.focus();
  };

  return (
    <div className="border-t border-[var(--border-subtle)] bg-[var(--card-bg)] p-2 relative flex flex-col gap-2">
      {/* 1. Dynamic Attention Ribbons for Waiting Agents */}
      {waitingAgents.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {waitingAgents.map((agent) => {
            const agentColor = agent.color || '#10b981';
            return (
              <div
                key={agent.id}
                style={{
                  borderColor: `${agentColor}60`,
                  backgroundColor: `${agentColor}12`,
                }}
                className="px-2.5 py-1.5 rounded-md border flex items-center justify-between text-xs shadow-xs"
              >
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" style={{ color: agentColor }} />
                  <span className="font-medium text-[var(--text-primary)]">
                    <span className="font-mono font-bold" style={{ color: agentColor }}>
                      @{agent.handle}
                    </span>{' '}
                    requires attention:
                  </span>
                </div>

                <div className="flex items-center gap-1.5 font-mono text-[11px]">
                  <button
                    type="button"
                    onClick={() => sendRawKey('y\r', agent.handle, bridge)}
                    style={{
                      backgroundColor: `${agentColor}25`,
                      borderColor: `${agentColor}60`,
                      color: agentColor,
                    }}
                    className="px-2 py-0.5 rounded border hover:opacity-90 font-semibold cursor-pointer active:scale-95 transition-all"
                    title="Allow / Yes (Sends 'y' + Enter)"
                  >
                    ✓ Allow (y)
                  </button>
                  <button
                    type="button"
                    onClick={() => sendRawKey('a\r', agent.handle, bridge)}
                    style={{
                      backgroundColor: `${agentColor}15`,
                      borderColor: `${agentColor}40`,
                      color: agentColor,
                    }}
                    className="px-2 py-0.5 rounded border hover:opacity-90 font-medium cursor-pointer active:scale-95 transition-all"
                    title="Allow Always (Sends 'a' + Enter)"
                  >
                    Allow Always (a)
                  </button>
                  <button
                    type="button"
                    onClick={() => sendRawKey('n\r', agent.handle, bridge)}
                    className="px-2 py-0.5 rounded border bg-rose-500/15 border-rose-500/40 text-rose-400 hover:bg-rose-500/25 font-semibold cursor-pointer active:scale-95 transition-all"
                    title="Reject / Deny (Sends 'n' + Enter)"
                  >
                    ✕ Deny (n)
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 2. Mention Auto-Suggest Menu (@) */}
      {showMentionMenu && activeSession.pinnedAgents.length > 0 && (
        <div className="absolute bottom-full left-2 mb-1 w-60 rounded-md border border-[var(--border-primary)] bg-[var(--card-bg)] shadow-lg z-30 p-1 flex flex-col gap-0.5">
          <div className="px-2 py-1 text-[10px] text-[var(--text-muted)] font-semibold uppercase">
            Target Running Agent
          </div>
          {activeSession.pinnedAgents.map((agent) => {
            const agentColor = agent.color || '#10b981';
            return (
              <button
                key={agent.id}
                type="button"
                onClick={() => insertMention(agent.handle)}
                className="w-full text-left px-2 py-1 rounded text-xs hover:bg-[var(--card-hover-bg)] text-[var(--text-primary)] flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-1.5 font-mono">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: agentColor }} />
                  <span className="font-medium" style={{ color: agentColor }}>
                    @{agent.handle}
                  </span>
                </div>
                <span className="text-[10px] text-[var(--text-muted)]">{agent.role.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* 3. Slash Commands Menu (/) */}
      {showSlashMenu && (
        <div className="absolute bottom-full left-2 mb-1 w-72 rounded-md border border-[var(--border-primary)] bg-[var(--card-bg)] shadow-lg z-30 p-1 flex flex-col gap-0.5">
          <div className="px-2 py-1 text-[10px] text-[var(--text-muted)] font-semibold uppercase">
            Quick Slash Commands
          </div>
          {DEFAULT_SLASH_COMMANDS.map((cmd) => (
            <button
              key={cmd.label}
              type="button"
              onClick={() => executeSlashCommand(cmd)}
              className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-[var(--card-hover-bg)] text-[var(--text-primary)] flex flex-col cursor-pointer"
            >
              <div className="font-mono font-semibold text-[var(--accent-primary)]">{cmd.label}</div>
              <div className="text-[10px] text-[var(--text-muted)]">{cmd.description}</div>
            </button>
          ))}
        </div>
      )}

      {/* 4. Template Picker Menu */}
      {showTemplateMenu && templates.length > 0 && (
        <div className="absolute bottom-full left-2 mb-1 w-64 max-h-60 overflow-y-auto rounded-md border border-[var(--border-primary)] bg-[var(--card-bg)] shadow-lg z-30 p-1 flex flex-col gap-0.5">
          <div className="px-2 py-1 text-[10px] text-[var(--text-muted)] font-semibold uppercase">
            Insert Prompt Template / Script
          </div>
          {templates.map((tmpl) => (
            <button
              key={tmpl.id}
              type="button"
              onClick={() => insertTemplate(tmpl.content)}
              className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-[var(--card-hover-bg)] text-[var(--text-primary)] cursor-pointer"
            >
              <div className="font-medium truncate flex items-center justify-between">
                <span>{tmpl.name}</span>
                {tmpl.category === 'SCRIPTS' && (
                  <span className="text-[9px] px-1 py-0.2 rounded bg-purple-500/20 text-purple-400 font-mono">
                    SCRIPT
                  </span>
                )}
              </div>
              <div className="text-[10px] text-[var(--text-muted)] truncate">
                {tmpl.description || tmpl.content.slice(0, 40)}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* 5. Micro Terminal Keypad & Toolbar */}
      <div className="flex items-center justify-between px-1 text-[10px] text-[var(--text-muted)] select-none">
        <div className="flex items-center gap-1 font-mono">
          <span className="text-[9px] uppercase tracking-wider text-[var(--text-muted)] mr-0.5">Keypad:</span>
          <button
            type="button"
            onClick={() => sendRawKey('\x1b[A', undefined, bridge)}
            className="px-1.5 py-0.5 rounded bg-[var(--card-hover-bg)] hover:bg-[var(--accent-primary)]/20 hover:text-[var(--accent-primary)] border border-[var(--border-subtle)] active:scale-95 transition-all cursor-pointer font-bold"
            title="Arrow Up (\x1b[A)"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => sendRawKey('\x1b[B', undefined, bridge)}
            className="px-1.5 py-0.5 rounded bg-[var(--card-hover-bg)] hover:bg-[var(--accent-primary)]/20 hover:text-[var(--accent-primary)] border border-[var(--border-subtle)] active:scale-95 transition-all cursor-pointer font-bold"
            title="Arrow Down (\x1b[B)"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={() => sendRawKey('\r', undefined, bridge)}
            className="px-2 py-0.5 rounded bg-[var(--card-hover-bg)] hover:bg-[var(--accent-primary)]/20 hover:text-[var(--accent-primary)] border border-[var(--border-subtle)] font-semibold active:scale-95 transition-all cursor-pointer"
            title="Enter (\r)"
          >
            ↵ Enter
          </button>
          <button
            type="button"
            onClick={() => sendRawKey(' ', undefined, bridge)}
            className="px-1.5 py-0.5 rounded bg-[var(--card-hover-bg)] hover:bg-[var(--accent-primary)]/20 hover:text-[var(--accent-primary)] border border-[var(--border-subtle)] active:scale-95 transition-all cursor-pointer"
            title="Space"
          >
            ␣ Space
          </button>
          <button
            type="button"
            onClick={() => sendRawKey('y\r', undefined, bridge)}
            className="px-1.5 py-0.5 rounded bg-[var(--card-hover-bg)] hover:bg-emerald-500/20 hover:text-emerald-400 border border-[var(--border-subtle)] active:scale-95 transition-all cursor-pointer font-semibold"
            title="Send 'y' + Enter"
          >
            Y
          </button>
          <button
            type="button"
            onClick={() => sendRawKey('n\r', undefined, bridge)}
            className="px-1.5 py-0.5 rounded bg-[var(--card-hover-bg)] hover:bg-rose-500/20 hover:text-rose-400 border border-[var(--border-subtle)] active:scale-95 transition-all cursor-pointer font-semibold"
            title="Send 'n' + Enter"
          >
            N
          </button>
          <button
            type="button"
            onClick={() => sendRawKey('\x03', undefined, bridge)}
            className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 active:scale-95 transition-all cursor-pointer font-bold"
            title="Interrupt Process (SIGINT / Ctrl+C)"
          >
            ^C
          </button>
        </div>

        {/* Quick Toolbar: @, /, Templates */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setShowMentionMenu(!showMentionMenu);
              setShowSlashMenu(false);
              setShowTemplateMenu(false);
            }}
            className="inline-flex items-center gap-0.5 hover:text-[var(--accent-primary)] transition-colors cursor-pointer"
            title="Target specific agent (@)"
          >
            <AtSign className="w-2.5 h-2.5" />
            <span>@</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setShowSlashMenu(!showSlashMenu);
              setShowMentionMenu(false);
              setShowTemplateMenu(false);
            }}
            className="inline-flex items-center gap-0.5 hover:text-[var(--accent-primary)] transition-colors cursor-pointer"
            title="Slash commands (/)"
          >
            <Slash className="w-2.5 h-2.5" />
            <span>/</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setShowTemplateMenu(!showTemplateMenu);
              setShowMentionMenu(false);
              setShowSlashMenu(false);
            }}
            className="inline-flex items-center gap-0.5 hover:text-[var(--accent-primary)] transition-colors cursor-pointer"
            title="Insert prompt template or script"
          >
            <LayoutTemplate className="w-2.5 h-2.5" />
            <span>Templates</span>
          </button>
        </div>
      </div>

      {/* 6. Input Box & Send Button */}
      <div className="flex items-end gap-1.5 bg-[var(--app-bg)] border border-[var(--border-primary)] rounded-lg p-1.5 focus-within:border-[var(--accent-primary)] transition-colors">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={
            waitingAgents.length > 0
              ? `Type answer for @${waitingAgents[0].handle}...`
              : 'Message agents... (e.g. @agy audit codebase or broadcast)'
          }
          rows={2}
          className="w-full bg-transparent border-0 resize-none outline-none text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] leading-relaxed max-h-32"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!input.trim()}
          className="p-1.5 rounded-md bg-[var(--accent-primary)] text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity shrink-0 cursor-pointer"
          title="Send (Enter)"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
