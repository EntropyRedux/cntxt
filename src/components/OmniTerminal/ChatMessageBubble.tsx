import React, { useState, useMemo } from 'react';
import { Pin, ChevronDown, ChevronRight, Terminal, User, Bot, Check, Copy, FileText } from 'lucide-react';
import { OmniChatMessage } from '../../contracts/data_shapes';
import { useOmniTerminalStore } from '../../store/omniTerminalStore';
import { useTabStore } from '../../store/tabStore';
import { useRuntimeBridge } from '../../adapters';
import { parseAnsi } from '../../features/terminal/ansiParser';
import { detectInteractivePrompt } from '../../features/omniTerminal/format/omniPromptDetector';
import { OmniMarkdownViewer } from './OmniMarkdownViewer';

export interface ChatMessageBubbleProps {
  message: OmniChatMessage;
}

export const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({ message }) => {
  const bridge = useRuntimeBridge();
  const { pinMessageToOutput, sendRawKey } = useOmniTerminalStore();
  const { createTab } = useTabStore();

  const [isThoughtOpen, setIsThoughtOpen] = useState(false);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [pinnedSuccess, setPinnedSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lastSelectedKey, setLastSelectedKey] = useState<string | null>(null);

  const terminalTokens = useMemo(() => {
    if (!message.rawTerminalOutput) return [];
    return parseAnsi(message.rawTerminalOutput);
  }, [message.rawTerminalOutput]);

  const isUser = message.senderId === 'user';

  const detectedPrompt = useMemo(() => {
    if (isUser || !message.content) return null;
    return detectInteractivePrompt(message.content);
  }, [isUser, message.content]);

  const handlePin = async () => {
    await pinMessageToOutput(message.id, bridge);
    setPinnedSuccess(true);
    setTimeout(() => setPinnedSuccess(false), 2000);
  };

  const handleCopy = () => {
    if (!message.content) return;
    bridge.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenInEditor = () => {
    if (!message.content) return;
    const timeFormatted = message.timestamp.includes('T') ? message.timestamp.split('T')[1].slice(0, 5) : '';
    const title = isUser
      ? `User Prompt (${timeFormatted || 'Turn'})`
      : `@${message.senderName} Deliverable`;
    createTab(title, message.content, 'markdown');
  };

  const handleOptionClick = async (rawKey: string, label: string) => {
    setLastSelectedKey(label);
    await sendRawKey(rawKey, message.senderName, bridge);
    setTimeout(() => setLastSelectedKey(null), 3000);
  };

  const bubbleAccentColor = message.color || (isUser ? '#38bdf8' : '#10b981');

  return (
    <div className={`flex flex-col gap-1 w-full text-xs ${isUser ? 'items-end' : 'items-start'}`}>
      {/* Sender Header */}
      <div className="flex items-center gap-1.5 px-1 text-[10px] text-[var(--text-muted)]">
        {isUser ? (
          <>
            <span>{message.timestamp.split('T')[1]?.slice(0, 5) || ''}</span>
            <span className="font-semibold text-[var(--text-primary)]">You</span>
            <User className="w-3 h-3 text-[var(--accent-primary)]" />
          </>
        ) : (
          <>
            <Bot className="w-3 h-3" style={{ color: bubbleAccentColor }} />
            <span className="font-semibold font-mono" style={{ color: bubbleAccentColor }}>
              @{message.senderName}
            </span>
            <span>{message.timestamp.split('T')[1]?.slice(0, 5) || ''}</span>
          </>
        )}
        {message.targetHandle && isUser && (
          <span className="px-1.5 py-0.2 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] font-mono">
            @{message.targetHandle}
          </span>
        )}
      </div>

      {/* Main Message Bubble */}
      <div
        style={{
          borderColor: isUser ? undefined : `${bubbleAccentColor}40`,
        }}
        className={`max-w-[95%] sm:max-w-[90%] rounded-lg px-3.5 py-2.5 border shadow-xs relative group ${
          isUser
            ? 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]/30 text-[var(--text-primary)]'
            : 'bg-[var(--card-bg)] text-[var(--text-primary)]'
        }`}
      >
        {/* Floating Quick Action Buttons on hover */}
        <div className="absolute top-1.5 right-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--card-bg)]/90 backdrop-blur-xs px-1 py-0.5 rounded border border-[var(--border-subtle)] shadow-xs z-10">
          <button
            type="button"
            onClick={handleCopy}
            className="p-1 rounded hover:bg-[var(--card-hover-bg)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            title="Copy Raw Markdown"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          </button>
          <button
            type="button"
            onClick={handleOpenInEditor}
            className="p-1 rounded hover:bg-[var(--card-hover-bg)] text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors cursor-pointer"
            title="Open in CNTXT Editor Tab"
          >
            <FileText className="w-3 h-3" />
          </button>
        </div>

        {/* User / Agent Content */}
        {detectedPrompt?.hasAsciiArt ? (
          <pre className="font-mono text-[10.5px] leading-tight whitespace-pre overflow-x-auto p-2 rounded bg-black/40 border border-[var(--border-subtle)] text-[var(--text-primary)] select-text mb-2">
            {message.content}
          </pre>
        ) : message.content ? (
          <OmniMarkdownViewer content={message.content} />
        ) : (
          <span className="text-[var(--text-muted)] italic font-mono text-[11px]">[Process output completed]</span>
        )}

        {/* Interactive Option Chips */}
        {detectedPrompt && detectedPrompt.isPrompt && detectedPrompt.choices.length > 0 && (
          <div className="mt-2.5 pt-2 border-t border-[var(--border-subtle)] flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] font-mono">
              <span className="flex items-center gap-1">
                <Terminal className="w-2.5 h-2.5" style={{ color: bubbleAccentColor }} />
                <span>{detectedPrompt.navigationHint || 'Select an option to send to terminal:'}</span>
              </span>
              {lastSelectedKey && (
                <span className="text-emerald-400 font-semibold animate-pulse">
                  ✓ Sent: {lastSelectedKey}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5 mt-0.5">
              {detectedPrompt.choices.map((choice) => (
                <button
                  key={choice.index}
                  type="button"
                  onClick={() => handleOptionClick(choice.rawKey, choice.label)}
                  className={`px-2.5 py-1 rounded-md text-xs font-mono font-medium transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 ${
                    choice.isSelected
                      ? 'bg-[var(--accent-primary)] text-white hover:opacity-90 ring-1 ring-[var(--accent-primary)]/60'
                      : 'bg-[var(--card-hover-bg)] text-[var(--text-primary)] hover:bg-[var(--card-bg)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)]/50'
                  }`}
                  title={`Click to send "${choice.label}" keypress to process`}
                >
                  <span className="text-[10px] opacity-70">{choice.isSelected ? '▶' : ' '}</span>
                  <span>{choice.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Collapsible Thought Accordion */}
        {message.thought && (
          <div className="mt-2 pt-2 border-t border-[var(--border-subtle)] text-[11px]">
            <button
              type="button"
              onClick={() => setIsThoughtOpen(!isThoughtOpen)}
              className="flex items-center gap-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors font-medium"
            >
              {isThoughtOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              <span>🧠 Thought Trajectory</span>
            </button>
            {isThoughtOpen && (
              <div className="mt-1 p-2 rounded bg-[var(--app-bg)] text-[var(--text-secondary)] font-mono whitespace-pre-wrap break-words border border-[var(--border-subtle)] max-h-48 overflow-y-auto">
                {message.thought}
              </div>
            )}
          </div>
        )}

        {/* Collapsible Raw Terminal Output */}
        {message.rawTerminalOutput && message.rawTerminalOutput.trim().length > 0 && (
          <div className="mt-2 pt-1 text-[11px]">
            <button
              type="button"
              onClick={() => setIsTerminalOpen(!isTerminalOpen)}
              className="flex items-center gap-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors font-mono"
            >
              {isTerminalOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              <Terminal className="w-3 h-3" />
              <span>Raw Terminal ({message.rawTerminalOutput.split('\n').length} lines)</span>
            </button>
            {isTerminalOpen && (
              <pre className="mt-1 p-2 rounded bg-black/90 font-mono text-[10px] whitespace-pre-wrap break-all max-h-48 overflow-y-auto border border-emerald-900/50">
                {terminalTokens.length > 0 ? (
                  terminalTokens.map((tok, i) => (
                    <span
                      key={i}
                      style={{
                        color: tok.color || '#34d399',
                        backgroundColor: tok.bgColor,
                        fontWeight: tok.bold ? 'bold' : 'normal',
                        textDecoration: tok.underline ? 'underline' : 'none',
                        fontStyle: tok.italic ? 'italic' : 'normal',
                      }}
                    >
                      {tok.text}
                    </span>
                  ))
                ) : (
                  <span className="text-emerald-400">{message.rawTerminalOutput}</span>
                )}
              </pre>
            )}
          </div>
        )}

        {/* Bottom Actions: Copy, Open as doc & Pin */}
        <div className="mt-2 pt-1 border-t border-[var(--border-subtle)] flex items-center justify-between text-[10px] text-[var(--text-muted)]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 hover:text-[var(--accent-primary)] transition-colors cursor-pointer font-medium"
              title="Copy markdown to clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-2.5 h-2.5 text-emerald-400" />
                  <span className="text-emerald-400 font-semibold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-2.5 h-2.5" />
                  <span>Copy</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleOpenInEditor}
              className="inline-flex items-center gap-1 hover:text-[var(--accent-primary)] transition-colors cursor-pointer"
              title="Open content as a new CNTXT document tab"
            >
              <FileText className="w-2.5 h-2.5" />
              <span>Open as doc</span>
            </button>
          </div>

          {!isUser && (
            <button
              type="button"
              onClick={handlePin}
              disabled={message.isPinnedToOutput || pinnedSuccess}
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] transition-colors cursor-pointer ${
                message.isPinnedToOutput || pinnedSuccess
                  ? 'text-emerald-500 font-medium'
                  : 'hover:text-[var(--accent-primary)]'
              }`}
              title="Pin Deliverable to Output Document"
            >
              <Pin className="w-2.5 h-2.5" />
              <span>{pinnedSuccess || message.isPinnedToOutput ? 'Pinned' : 'Pin'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
