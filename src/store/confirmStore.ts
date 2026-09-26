import { create } from 'zustand';

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

interface ConfirmState {
  isOpen: boolean;
  options: ConfirmDialogOptions | null;
  isLoading: boolean;
  showConfirm: (options: ConfirmDialogOptions) => void;
  closeConfirm: () => void;
  triggerConfirm: () => Promise<void>;
}

export const useConfirmStore = create<ConfirmState>((set, get) => ({
  isOpen: false,
  options: null,
  isLoading: false,

  showConfirm: (options: ConfirmDialogOptions) => {
    set({ isOpen: true, options, isLoading: false });
  },

  closeConfirm: () => {
    const { options } = get();
    if (options?.onCancel) {
      options.onCancel();
    }
    set({ isOpen: false, options: null, isLoading: false });
  },

  triggerConfirm: async () => {
    const { options } = get();
    if (!options) return;
    try {
      set({ isLoading: true });
      await options.onConfirm();
    } finally {
      set({ isOpen: false, options: null, isLoading: false });
    }
  }
}));
