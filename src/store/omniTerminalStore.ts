/**
 * Headless Omni Terminal Store
 * 
 * Central coordinator for:
 * 1. Multi-agent mission control & session lifecycle
 * 2. Target device storage directory selection
 * 3. Chat message journal & @mention input router
 * 4. PTY channel binding & external terminal window launching
 * 5. Dual .cntxt document bus auto-sync
 */

import { create } from 'zustand';
import {
  OmniAgentProfile,
  OmniChatMessage,
  OmniSession,
} from '../contracts/data_shapes';
import {
  buildInitialSessionFiles,
  serializeRawTurn,
  serializeOutputTurn,
  parseOutputDocumentTurns,
  extractCleanDeliverable,
  cleanTerminalStream,
  parseCommandLine,
} from '../features/omniTerminal/format/omniDocumentSync';
import { detectInteractivePrompt } from '../features/omniTerminal/format/omniPromptDetector';
import { STORAGE_KEYS } from '../adapters/storageKeys';
import { IRuntimeBridge } from '../ui-contract/bridgeContract';
import { useTerminalStore } from './terminalStore';

export interface OmniTerminalState {
  activeSession: OmniSession | null;
  messages: OmniChatMessage[];
  targetFolder: string;
  isStartingSession: boolean;
  error: string | null;
  
  // Actions
  setTargetFolder: (folder: string) => void;
  createSession: (title: string, bridge?: IRuntimeBridge) => Promise<OmniSession>;
  addAgent: (agent: Omit<OmniAgentProfile, 'status'>) => void;
  removeAgent: (agentId: string) => void;
  setAgentStatus: (agentId: string, status: OmniAgentProfile['status']) => void;
  startAgent: (agentId: string, bridge?: IRuntimeBridge) => Promise<void>;
  killAgent: (agentId: string, bridge?: IRuntimeBridge) => Promise<void>;
  startAllAgents: (bridge?: IRuntimeBridge) => Promise<void>;
  killAllAgents: (bridge?: IRuntimeBridge) => Promise<void>;
  sendMessage: (content: string, targetHandle?: string, bridge?: IRuntimeBridge) => Promise<void>;
  sendRawKey: (key: string, targetHandle?: string, bridge?: IRuntimeBridge) => Promise<void>;
  appendAgentChunk: (agentId: string, chunk: string, bridge?: IRuntimeBridge) => void;
  pinMessageToOutput: (messageId: string, bridge?: IRuntimeBridge) => Promise<void>;
  syncFromOutputFile: (bridge?: IRuntimeBridge) => Promise<void>;
  startWatcher: (bridge?: IRuntimeBridge) => void;
  stopWatcher: () => void;
  clearSession: () => void;
}

// In-memory agent idle timers for turn-boundary detection
const agentIdleTimers = new Map<string, ReturnType<typeof setTimeout>>();
const agentTurnBuffers = new Map<string, { content: string; thought: string; rawOutput: string }>();
let fileWatcherTimer: ReturnType<typeof setInterval> | null = null;
let lastKnownOutputLength = 0;

// Tracks prompts sent to agent PTYs to detect and suppress terminal input echoes
interface SentPromptRecord {
  prompt: string;
  sentAt: number;
}
const recentSentPrompts = new Map<string, SentPromptRecord[]>();

function recordSentPrompt(agentId: string, prompt: string) {
  const list = recentSentPrompts.get(agentId) || [];
  list.push({ prompt: prompt.trim(), sentAt: Date.now() });
  recentSentPrompts.set(agentId, list.slice(-10));
}

function getActiveSentPrompts(agentId: string): SentPromptRecord[] {
  const list = recentSentPrompts.get(agentId) || [];
  const now = Date.now();
  // Retain prompts sent within the last 60 seconds
  const active = list.filter((p) => now - p.sentAt < 60000);
  recentSentPrompts.set(agentId, active);
  return active;
}

/**
 * Checks whether text matches or is purely an echo of recently sent user prompt(s)
 */
export function isPromptEchoOrBlank(text: string, agentId: string): boolean {
  if (!text) return true;
  const cleaned = cleanTerminalStream(text);
  if (!cleaned || cleaned.trim().length === 0) return true;

  const active = getActiveSentPrompts(agentId);
  if (active.length === 0) return false;

  const norm = cleaned
    .replace(/^(agy|cline|opencode|kilo|powershell|bash|sh|cmd)[\s>❯$:]+/i, '')
    .replace(/^[>❯$:\s\r\n\t]+/, '')
    .replace(/[\s\r\n\t]+$/, '')
    .trim()
    .toLowerCase();

  if (!norm) return true;

  for (const rec of active) {
    const normPrompt = rec.prompt
      .replace(/^(agy|cline|opencode|kilo|powershell|bash|sh|cmd)[\s>❯$:]+/i, '')
      .replace(/^[>❯$:\s\r\n\t]+/, '')
      .replace(/[\s\r\n\t]+$/, '')
      .trim()
      .toLowerCase();

    if (!normPrompt) continue;

    // Exact match
    if (norm === normPrompt) return true;
    // Prompt with minor terminal prompt artifact (e.g. "> prompt" or trailing chars)
    if (norm.startsWith(normPrompt) && norm.length <= normPrompt.length + 8) return true;
    if (normPrompt.startsWith(norm) && norm.length > 2) return true;
  }

  return false;
}

export function stripPromptEcho(text: string, agentId: string): string {
  if (!text) return '';
  const active = getActiveSentPrompts(agentId);
  let current = text;

  for (const rec of active) {
    if (!rec.prompt || rec.prompt.length < 2) continue;
    const escaped = rec.prompt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // 1. Strip leading prompt echo
    const leadingRegex = new RegExp(
      `^(?:(?:agy|cline|opencode|kilo|powershell|bash|cmd)?[>❯$:\\s\\r\\n]*)${escaped}[>❯$:\\s\\r\\n]*`,
      'i'
    );
    current = current.replace(leadingRegex, '').trim();

    // 2. Strip standalone lines that repeat the user's prompt
    const lineRegex = new RegExp(
      `^[>❯$:\\s]*(?:(?:agy|cline|opencode|kilo)?[>❯$:\\s]*)?${escaped}[>❯$:\\s]*$`,
      'gim'
    );
    current = current.replace(lineRegex, '').trim();
  }

  return current;
}

export const useOmniTerminalStore = create<OmniTerminalState>((set, get) => ({
  activeSession: null,
  messages: [],
  targetFolder: '',
  isStartingSession: false,
  error: null,

  setTargetFolder: (folder: string) => {
    set({ targetFolder: folder });
  },

  createSession: async (title: string, bridge?: IRuntimeBridge) => {
    const { targetFolder } = get();
    const folder = targetFolder.trim() || 'C:/CNTXT_Sessions';
    const sessionId = `ses_${Date.now()}`;
    const cleanTitle = title.trim() || 'Multi-Agent Session';
    const now = new Date().toISOString();

    const normalizedFolder = folder.replace(/\\/g, '/').replace(/\/+$/, '');
    const rawPath = `${normalizedFolder}/${sessionId}_raw.cntxt`;
    const outputPath = `${normalizedFolder}/${sessionId}_output.cntxt`;

    // Resolve active workspace path from storage (where terminal commands and scripts execute)
    let workspacePath = normalizedFolder;
    if (bridge?.storage) {
      try {
        const storedWs = await bridge.storage.getItem(STORAGE_KEYS.WORKSPACE_PATH);
        if (storedWs && storedWs.trim()) {
          workspacePath = storedWs.trim();
        }
      } catch (err) {
        console.warn('Could not read workspace path from storage:', err);
      }
    }

    const newSession: OmniSession = {
      id: sessionId,
      title: cleanTitle,
      targetFolder: normalizedFolder,
      workspacePath,
      rawFilePath: rawPath,
      outputFilePath: outputPath,
      createdAt: now,
      updatedAt: now,
      pinnedAgents: [],
      status: 'idle',
    };

    // Initialize files on disk if bridge is provided
    if (bridge?.fs) {
      try {
        const { rawContent, outputContent } = buildInitialSessionFiles(newSession);
        await bridge.fs.saveFile(rawPath, rawContent);
        await bridge.fs.saveFile(outputPath, outputContent);
      } catch (err) {
        console.warn('Failed to save initial session files to disk:', err);
      }
    }

    lastKnownOutputLength = 0;
    set({
      activeSession: newSession,
      messages: [],
      error: null,
    });

    // Start background file tailer watcher
    get().startWatcher(bridge);

    return newSession;
  },

  addAgent: (agentData) => {
    const { activeSession } = get();
    if (!activeSession) return;

    const newAgent: OmniAgentProfile = {
      ...agentData,
      status: 'idle',
    };

    const updatedAgents = [...activeSession.pinnedAgents.filter((a) => a.id !== newAgent.id), newAgent];
    set({
      activeSession: {
        ...activeSession,
        pinnedAgents: updatedAgents,
        updatedAt: new Date().toISOString(),
      },
    });
  },

  removeAgent: (agentId: string) => {
    const { activeSession } = get();
    if (!activeSession) return;

    set({
      activeSession: {
        ...activeSession,
        pinnedAgents: activeSession.pinnedAgents.filter((a) => a.id !== agentId),
        updatedAt: new Date().toISOString(),
      },
    });
  },

  setAgentStatus: (agentId: string, status: OmniAgentProfile['status']) => {
    const { activeSession } = get();
    if (!activeSession) return;
    set({
      activeSession: {
        ...activeSession,
        pinnedAgents: activeSession.pinnedAgents.map((a) =>
          a.id === agentId ? { ...a, status } : a
        ),
      },
    });
  },

  startAgent: async (agentId: string, bridge?: IRuntimeBridge) => {
    const { activeSession } = get();
    if (!activeSession) return;

    const agent = activeSession.pinnedAgents.find((a) => a.id === agentId);
    if (!agent) return;

    // Update status to starting
    set({
      activeSession: {
        ...activeSession,
        pinnedAgents: activeSession.pinnedAgents.map((a) =>
          a.id === agentId ? { ...a, status: 'starting' as const } : a
        ),
      },
    });

    const executionCwd = activeSession.workspacePath || activeSession.targetFolder;

    if (agent.spawnMode === 'external-window') {
      if (bridge?.terminal?.spawnExternal) {
        try {
          await bridge.terminal.spawnExternal(executionCwd, agent.command);
          set({
            activeSession: {
              ...get().activeSession!,
              pinnedAgents: get().activeSession!.pinnedAgents.map((a) =>
                a.id === agentId ? { ...a, status: 'busy' as const } : a
              ),
            },
          });
        } catch (err) {
          set({
            error: `Failed to spawn external terminal for ${agent.name}: ${err}`,
            activeSession: {
              ...get().activeSession!,
              pinnedAgents: get().activeSession!.pinnedAgents.map((a) =>
                a.id === agentId ? { ...a, status: 'error' as const } : a
              ),
            },
          });
        }
      }
      return;
    }

    // Headless PTY spawning
    if (bridge?.terminal?.spawn) {
      try {
        const channelId = `omni_${agent.handle}_${Date.now()}`;
        const { command: execCmd, args: execArgs } = parseCommandLine(agent.command);
        await bridge.terminal.spawn({
          id: channelId,
          command: execCmd,
          args: execArgs,
          cwd: executionCwd,
        });

        // Register in useTerminalStore so the in-app terminal tab attaches directly to this live process
        useTerminalStore.getState().createChannel({
          id: channelId,
          name: `@${agent.handle} Terminal`,
          command: execCmd,
          args: execArgs,
          cwd: executionCwd,
        });
        useTerminalStore.getState().setChannelStatus(channelId, 'running');

        // Listen for output
        bridge.terminal.onData(channelId, (evt) => {
          useTerminalStore.getState().appendOutput(channelId, 'stdout', evt.data);
          get().appendAgentChunk(agent.id, evt.data, bridge);
        });

        bridge.terminal.onExit(channelId, (evt) => {
          useTerminalStore.getState().setChannelStatus(channelId, 'exited', evt.exitCode);
          set({
            activeSession: {
              ...get().activeSession!,
              pinnedAgents: get().activeSession!.pinnedAgents.map((a) =>
                a.id === agentId ? { ...a, status: 'stopped' as const } : a
              ),
            },
          });
        });

        set({
          activeSession: {
            ...get().activeSession!,
            pinnedAgents: get().activeSession!.pinnedAgents.map((a) =>
              a.id === agentId ? { ...a, channelId, status: 'busy' as const } : a
            ),
          },
        });
      } catch (err) {
        set({
          error: `Failed to spawn PTY for ${agent.name}: ${err}`,
          activeSession: {
            ...get().activeSession!,
            pinnedAgents: get().activeSession!.pinnedAgents.map((a) =>
              a.id === agentId ? { ...a, status: 'error' as const } : a
            ),
          },
        });
      }
    } else {
      // In web/test stub mode
      set({
        activeSession: {
          ...get().activeSession!,
          pinnedAgents: get().activeSession!.pinnedAgents.map((a) =>
            a.id === agentId ? { ...a, status: 'busy' as const } : a
          ),
        },
      });
    }
  },

  killAgent: async (agentId: string, bridge?: IRuntimeBridge) => {
    const { activeSession } = get();
    if (!activeSession) return;

    const agent = activeSession.pinnedAgents.find((a) => a.id === agentId);
    if (!agent) return;

    if (agent.channelId && bridge?.terminal?.kill) {
      try {
        await bridge.terminal.kill(agent.channelId);
      } catch {
        // Ignore kill errors
      }
    }

    set({
      activeSession: {
        ...activeSession,
        pinnedAgents: activeSession.pinnedAgents.map((a) =>
          a.id === agentId ? { ...a, status: 'stopped' as const } : a
        ),
      },
    });
  },

  startAllAgents: async (bridge?: IRuntimeBridge) => {
    const { activeSession } = get();
    if (!activeSession) return;

    for (const agent of activeSession.pinnedAgents) {
      await get().startAgent(agent.id, bridge);
    }
  },

  killAllAgents: async (bridge?: IRuntimeBridge) => {
    const { activeSession } = get();
    if (!activeSession) return;

    for (const agent of activeSession.pinnedAgents) {
      await get().killAgent(agent.id, bridge);
    }
  },

  sendMessage: async (content: string, targetHandle?: string, bridge?: IRuntimeBridge) => {
    const { activeSession } = get();
    if (!activeSession) return;

    const trimmed = content.trim();
    if (!trimmed) return;

    // Detect target handle from message if prefixed with @
    let resolvedTarget = targetHandle;
    let actualContent = trimmed;

    if (!resolvedTarget && trimmed.startsWith('@')) {
      const match = trimmed.match(/^@([a-zA-Z0-9_-]+)\s*(.*)/s);
      if (match) {
        resolvedTarget = match[1];
        actualContent = match[2];
      }
    }

    const now = new Date().toISOString();
    const userMsg: OmniChatMessage = {
      id: `msg_${Date.now()}_u`,
      sessionId: activeSession.id,
      senderId: 'user',
      senderName: 'User',
      targetHandle: resolvedTarget,
      content: actualContent,
      timestamp: now,
      isPinnedToOutput: false,
      color: '#38bdf8',
    };

    set((state) => ({
      messages: [...state.messages, userMsg],
    }));

    // Append user message to raw session file and output document
    if (bridge?.fs) {
      try {
        const rawTurnStr = serializeRawTurn(userMsg);
        const currentRaw = (await bridge.fs.readFile(activeSession.rawFilePath)) || '';
        await bridge.fs.saveFile(activeSession.rawFilePath, currentRaw + rawTurnStr);

        const outputTurnStr = serializeOutputTurn(userMsg);
        const currentOutput = (await bridge.fs.readFile(activeSession.outputFilePath)) || '';
        await bridge.fs.saveFile(activeSession.outputFilePath, currentOutput + outputTurnStr);
      } catch (err) {
        console.warn('Failed to append turn to session files:', err);
      }
    }

    // Route to agent PTY stdin:
    // If targeted: send only to specified agent.
    // If not targeted: broadcast to all active AI agents (excluding plain shells like pwsh by default)
    const isAiAgent = (a: OmniAgentProfile) => a.handle.toLowerCase() !== 'pwsh' && a.role !== 'Custom';
    const targets = resolvedTarget
      ? activeSession.pinnedAgents.filter((a) => a.handle.toLowerCase() === resolvedTarget!.toLowerCase())
      : activeSession.pinnedAgents.filter(isAiAgent);

    for (const target of targets) {
      recordSentPrompt(target.id, actualContent);
      if (target.channelId && bridge?.terminal?.write) {
        bridge.terminal.write(target.channelId, actualContent + '\r\n').catch(console.error);
        get().setAgentStatus(target.id, 'busy');
      }
    }
  },

  sendRawKey: async (key: string, targetHandle?: string, bridge?: IRuntimeBridge) => {
    const { activeSession } = get();
    if (!activeSession) return;

    const targets = targetHandle
      ? activeSession.pinnedAgents.filter((a) => a.handle.toLowerCase() === targetHandle.toLowerCase())
      : activeSession.pinnedAgents.filter((a) => a.status !== 'stopped' && a.status !== 'error');

    const targetList = targets.length > 0 ? targets : activeSession.pinnedAgents;

    for (const target of targetList) {
      if (target.channelId && bridge?.terminal?.write) {
        const keyToSend = key === '\n' || key === '\r' ? '\r\n' : key;
        bridge.terminal.write(target.channelId, keyToSend).catch(console.error);
        if (target.status === 'waiting_permission') {
          get().setAgentStatus(target.id, 'busy');
        }
      }
    }
  },

  appendAgentChunk: (agentId: string, chunk: string, bridge?: IRuntimeBridge) => {
    const { activeSession } = get();
    if (!activeSession) return;

    const agent = activeSession.pinnedAgents.find((a) => a.id === agentId);
    if (!agent) return;

    // Accumulate in buffer (handle clear-screen \x1b[2J)
    let buf = agentTurnBuffers.get(agentId) || { content: '', thought: '', rawOutput: '' };
    buf.rawOutput += chunk;

    if (chunk.includes('\x1b[2J')) {
      const lastClearIdx = chunk.lastIndexOf('\x1b[2J');
      buf.content = chunk.slice(lastClearIdx + 4);
    } else {
      buf.content += chunk;
    }

    agentTurnBuffers.set(agentId, buf);

    // Debounce turn completion (800ms)
    if (agentIdleTimers.has(agentId)) {
      clearTimeout(agentIdleTimers.get(agentId)!);
    }

    const timer = setTimeout(async () => {
      agentIdleTimers.delete(agentId);
      const finishedBuf = agentTurnBuffers.get(agentId);
      if (!finishedBuf || !finishedBuf.content.trim()) return;

      const rawCleaned = cleanTerminalStream(finishedBuf.content);

      // Check if this chunk is purely the user's prompt echoed back by the terminal PTY
      if (isPromptEchoOrBlank(rawCleaned, agentId)) {
        // Discard echoed text from answer buffer so it doesn't leak into agent bubble,
        // but preserve rawOutput for flight recorder and keep status as 'busy' (agent is thinking!)
        agentTurnBuffers.set(agentId, {
          content: '',
          thought: finishedBuf.thought,
          rawOutput: finishedBuf.rawOutput,
        });
        return;
      }

      const strippedContent = stripPromptEcho(rawCleaned, agentId);

      // Extract thoughts vs content
      let extractedThought = '';
      const thoughtMatch = finishedBuf.content.match(/<thought>([\s\S]*?)<\/thought>/i);
      if (thoughtMatch) {
        extractedThought = thoughtMatch[1].trim();
      }

      const now = new Date().toISOString();
      const agentMsgContent = strippedContent;

      // Filter out pure TUI banners, status lines, or echoes with no actual response
      if (!agentMsgContent || agentMsgContent.trim().length < 3) {
        return;
      }

      agentTurnBuffers.delete(agentId);

      const existingMessages = get().messages;
      const lastMsg = existingMessages.length > 0 ? existingMessages[existingMessages.length - 1] : null;

      // Deduplicate/merge consecutive same-agent updates if no intervening user message
      if (lastMsg && lastMsg.senderId === agent.id && !lastMsg.isPinnedToOutput) {
        const mergedMsg: OmniChatMessage = {
          ...lastMsg,
          content: agentMsgContent,
          thought: extractedThought || lastMsg.thought,
          rawTerminalOutput: (lastMsg.rawTerminalOutput || '') + finishedBuf.rawOutput,
          timestamp: now,
          color: agent.color || lastMsg.color,
        };

        set((state) => ({
          messages: state.messages.map((m) => (m.id === lastMsg.id ? mergedMsg : m)),
        }));
      } else {
        const agentMsg: OmniChatMessage = {
          id: `msg_${Date.now()}_${agent.handle}`,
          sessionId: activeSession.id,
          senderId: agent.id,
          senderName: agent.handle,
          content: agentMsgContent,
          thought: extractedThought || undefined,
          rawTerminalOutput: finishedBuf.rawOutput,
          timestamp: now,
          isPinnedToOutput: false,
          color: agent.color,
        };

        set((state) => ({
          messages: [...state.messages, agentMsg],
        }));

        // Append to raw session document
        if (bridge?.fs) {
          try {
            const rawTurnStr = serializeRawTurn(agentMsg);
            const currentRaw = (await bridge.fs.readFile(activeSession.rawFilePath)) || '';
            await bridge.fs.saveFile(activeSession.rawFilePath, currentRaw + rawTurnStr);

            // Check if clean deliverable should be extracted to _output.cntxt
            const deliverable = extractCleanDeliverable(agentMsg);
            if (deliverable) {
              const deliverableTurn: OmniChatMessage = {
                ...agentMsg,
                content: deliverable.replace(/^###[^\n]+\n+/, '').trim() || agentMsg.content,
                color: agent.color,
              };
              const outputTurnStr = serializeOutputTurn(deliverableTurn);
              const currentOutput = (await bridge.fs.readFile(activeSession.outputFilePath)) || '';
              await bridge.fs.saveFile(activeSession.outputFilePath, currentOutput + outputTurnStr);
            }
          } catch (err) {
            console.warn('Failed to append agent turn to session files:', err);
          }
        }
      }

      // Update agent status based on genuine interactive prompts at turn end
      const finalPromptCheck = detectInteractivePrompt(finishedBuf.content);
      if (finalPromptCheck.isPrompt && finalPromptCheck.choices.length > 0) {
        get().setAgentStatus(agentId, 'waiting_permission');
      } else {
        get().setAgentStatus(agentId, 'idle');
      }
    }, 1200);

    agentIdleTimers.set(agentId, timer);
  },

  pinMessageToOutput: async (messageId: string, bridge?: IRuntimeBridge) => {
    const { activeSession, messages } = get();
    if (!activeSession) return;

    const targetMsg = messages.find((m) => m.id === messageId);
    if (!targetMsg) return;

    const updatedMsg = { ...targetMsg, isPinnedToOutput: true };

    set({
      messages: messages.map((m) => (m.id === messageId ? updatedMsg : m)),
    });

    if (bridge?.fs) {
      try {
        const outputTurnStr = serializeOutputTurn(updatedMsg);
        const currentOutput = (await bridge.fs.readFile(activeSession.outputFilePath)) || '';
        await bridge.fs.saveFile(activeSession.outputFilePath, currentOutput + outputTurnStr);
      } catch (err) {
        console.warn('Failed to append pinned deliverable to output file:', err);
      }
    }
  },

  syncFromOutputFile: async (bridge?: IRuntimeBridge) => {
    const { activeSession } = get();
    if (!activeSession || !bridge?.fs) return;

    try {
      const content = await bridge.fs.readFile(activeSession.outputFilePath);
      if (!content) return;
      if (content.length === lastKnownOutputLength) return;
      lastKnownOutputLength = content.length;

      const parsedTurns = parseOutputDocumentTurns(content, activeSession.id);
      if (parsedTurns.length > 0) {
        set({ messages: parsedTurns });
      }
    } catch {
      // Ignore read collisions during background writes
    }
  },

  startWatcher: (bridge?: IRuntimeBridge) => {
    if (fileWatcherTimer) {
      clearInterval(fileWatcherTimer);
    }
    if (!bridge?.fs) return;
    fileWatcherTimer = setInterval(() => {
      get().syncFromOutputFile(bridge);
    }, 600);
  },

  stopWatcher: () => {
    if (fileWatcherTimer) {
      clearInterval(fileWatcherTimer);
      fileWatcherTimer = null;
    }
  },

  clearSession: () => {
    get().stopWatcher();
    agentIdleTimers.forEach((t) => clearTimeout(t));
    agentIdleTimers.clear();
    agentTurnBuffers.clear();
    recentSentPrompts.clear();
    set({
      activeSession: null,
      messages: [],
      error: null,
    });
  },
}));
