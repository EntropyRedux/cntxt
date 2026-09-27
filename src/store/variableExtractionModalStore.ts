import { create } from 'zustand';

interface VariableExtractionModalState {
  isOpen: boolean;
  openExtractionModal: () => void;
  closeExtractionModal: () => void;
}

export const useVariableExtractionModalStore = create<VariableExtractionModalState>((set) => ({
  isOpen: false,
  openExtractionModal: () => set({ isOpen: true }),
  closeExtractionModal: () => set({ isOpen: false }),
}));
