import { create } from 'zustand';
import { NotificationItem } from '../types';

const activeTimers = new Map<string, ReturnType<typeof setTimeout>>();

interface NotificationState {
  notifications: NotificationItem[];
  addNotification: (title: string, message?: string, type?: NotificationItem['type']) => string;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  clearAllTimers: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],

  addNotification: (title, message, type = 'info') => {
    const id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const newItem: NotificationItem = {
      id,
      title,
      message,
      type,
      timestamp: Date.now()
    };

    set({ notifications: [newItem, ...get().notifications.slice(0, 4)] });

    // Auto dismiss after 4.5 seconds with lifecycle tracking
    const timer = setTimeout(() => {
      activeTimers.delete(id);
      get().removeNotification(id);
    }, 4500);
    activeTimers.set(id, timer);

    return id;
  },

  removeNotification: (id) => {
    const existing = activeTimers.get(id);
    if (existing) {
      clearTimeout(existing);
      activeTimers.delete(id);
    }
    set({ notifications: get().notifications.filter(n => n.id !== id) });
  },

  clearAll: () => {
    for (const timer of activeTimers.values()) {
      clearTimeout(timer);
    }
    activeTimers.clear();
    set({ notifications: [] });
  },

  clearAllTimers: () => {
    for (const timer of activeTimers.values()) {
      clearTimeout(timer);
    }
    activeTimers.clear();
  }
}));
