import { create } from 'zustand';

interface ImageModalState {
  isOpen: boolean;
  openImageModal: () => void;
  closeImageModal: () => void;
}

export const useImageModalStore = create<ImageModalState>((set) => ({
  isOpen: false,
  openImageModal: () => set({ isOpen: true }),
  closeImageModal: () => set({ isOpen: false }),
}));
