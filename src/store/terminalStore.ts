import { create } from 'zustand';
import {
  TerminalChannelConfig,
  TerminalChannelStatus,
  TerminalChunkEntry,
  TerminalStreamType,
} from '../../contracts/data_shapes';

export const MAX_CHANNEL_BUFFER_CHARS = 250_000; // ~250KB per channel buffer limit
export const MAX_CHANNEL_LOG_ENTRIES = 1_000;

export interface TerminalChannelState extends TerminalChannelConfig {
  status: TerminalChannelStatus;
  exitCode: number | null;
  logs: TerminalChunkEntry[];
  buffer: string;
  cols: number;
  rows: number;
  createdAt: number;
}

export interface TerminalStoreState {
  channels: Record<string, TerminalChannelState>;
  activeChannelId: string | null;

  createChannel: (config: {
    id?: string;
    name: string;
    command?: string;
    args?: string[];
    cwd?: string;
    env?: Record<string, string>;
    cols?: number;
    rows?: number;
  }) => string;
  removeChannel: (id: string) => void;
  setActiveChannel: (id: string | null) => void;
  appendOutput: (id: string, stream: TerminalStreamType, data: string) => void;
  setChannelStatus: (id: string, status: TerminalChannelStatus, exitCode?: number | null) => void;
  clearChannelOutput: (id: string) => void;
  getChannelList: () => TerminalChannelState[];
  reset: () => void;
}

export const useTerminalStore = create<TerminalStoreState>((set, get) => ({
  channels: {},
  activeChannelId: null,

  createChannel: (config) => {
    const id = config.id || `term_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newChannel: TerminalChannelState = {
      id,
      name: config.name || 'Terminal',
      command: config.command,
      args: config.args || [],
      cwd: config.cwd,
      env: config.env,
      status: 'idle',
      exitCode: null,
      logs: [],
      buffer: '',
      cols: config.cols || 80,
      rows: config.rows || 24,
      createdAt: Date.now(),
    };

    set((state) => ({
      channels: {
        ...state.channels,
        [id]: newChannel,
      },
      activeChannelId: state.activeChannelId || id,
    }));

    return id;
  },

  removeChannel: (id) => {
    set((state) => {
      const next = { ...state.channels };
      delete next[id];
      const remainingIds = Object.keys(next);
      const nextActiveId =
        state.activeChannelId === id
          ? remainingIds.length > 0
            ? remainingIds[0]
            : null
          : state.activeChannelId;

      return {
        channels: next,
        activeChannelId: nextActiveId,
      };
    });
  },

  setActiveChannel: (id) => {
    set({ activeChannelId: id });
  },

  appendOutput: (id, stream, data) => {
    set((state) => {
      const channel = state.channels[id];
      if (!channel) return state;

      const newEntry: TerminalChunkEntry = {
        t: Date.now(),
        stream,
        data,
      };

      let newLogs = [...channel.logs, newEntry];
      if (newLogs.length > MAX_CHANNEL_LOG_ENTRIES) {
        newLogs = newLogs.slice(newLogs.length - MAX_CHANNEL_LOG_ENTRIES);
      }

      let newBuffer = channel.buffer + data;
      if (newBuffer.length > MAX_CHANNEL_BUFFER_CHARS) {
        newBuffer = newBuffer.slice(newBuffer.length - MAX_CHANNEL_BUFFER_CHARS);
      }

      return {
        channels: {
          ...state.channels,
          [id]: {
            ...channel,
            logs: newLogs,
            buffer: newBuffer,
          },
        },
      };
    });
  },

  setChannelStatus: (id, status, exitCode = null) => {
    set((state) => {
      const channel = state.channels[id];
      if (!channel) return state;

      return {
        channels: {
          ...state.channels,
          [id]: {
            ...channel,
            status,
            exitCode: exitCode !== undefined ? exitCode : channel.exitCode,
          },
        },
      };
    });
  },

  clearChannelOutput: (id) => {
    set((state) => {
      const channel = state.channels[id];
      if (!channel) return state;

      return {
        channels: {
          ...state.channels,
          [id]: {
            ...channel,
            logs: [],
            buffer: '',
          },
        },
      };
    });
  },

  getChannelList: () => {
    return Object.values(get().channels);
  },

  reset: () => {
    set({ channels: {}, activeChannelId: null });
  },
}));
