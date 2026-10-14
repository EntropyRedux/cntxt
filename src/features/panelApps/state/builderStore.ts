import { create } from 'zustand';
import { PanelAppCreatedFrom, PanelAppNetworkMode } from '../../../contracts/data_shapes';

export type BuilderStep = 'source' | 'details' | 'review';

export type SourceRef =
  | { kind: 'tab'; docId: string; name: string; content: string }
  | { kind: 'file'; path: string; name: string; content: string };

export interface BuilderDetails {
  name: string;
  icon: string;
  description: string;
  network: PanelAppNetworkMode;
  panelWidth: number;
}

interface BuilderState {
  isOpen: boolean;
  step: BuilderStep;
  source: SourceRef | null;
  html: string | null;
  sourceNote: string | null;
  createdFrom: PanelAppCreatedFrom;
  details: BuilderDetails;
  isCreating: boolean;

  // Actions
  start: (preload?: SourceRef) => void;
  setSource: (source: SourceRef, html: string, note?: string | null, createdFrom?: PanelAppCreatedFrom) => void;
  setDetails: (updates: Partial<BuilderDetails>) => void;
  setStep: (step: BuilderStep) => void;
  setIsCreating: (isCreating: boolean) => void;
  reset: () => void;
  close: () => void;
}

const INITIAL_DETAILS: BuilderDetails = {
  name: '',
  icon: 'Layers',
  description: '',
  network: 'offline',
  panelWidth: 480,
};

export const useBuilderStore = create<BuilderState>((set) => ({
  isOpen: false,
  step: 'source',
  source: null,
  html: null,
  sourceNote: null,
  createdFrom: 'tab',
  details: INITIAL_DETAILS,
  isCreating: false,

  start: (preload) => {
    if (preload) {
      const cleanName = preload.name.replace(/\.[^/.]+$/, '').trim() || 'My App';
      set({
        isOpen: true,
        step: 'details',
        source: preload,
        html: preload.content,
        sourceNote: null,
        createdFrom: preload.kind === 'tab' ? 'tab' : 'file',
        details: {
          ...INITIAL_DETAILS,
          name: cleanName,
        },
      });
    } else {
      set({
        isOpen: true,
        step: 'source',
        source: null,
        html: null,
        sourceNote: null,
        createdFrom: 'tab',
        details: INITIAL_DETAILS,
      });
    }
  },

  setSource: (source, html, note, createdFrom) => {
    const cleanName = source.name.replace(/\.[^/.]+$/, '').trim() || 'My App';
    set((s) => ({
      source,
      html,
      sourceNote: note ?? null,
      createdFrom: createdFrom || (source.kind === 'tab' ? 'tab' : 'file'),
      details: {
        ...s.details,
        name: s.details.name || cleanName,
      },
    }));
  },

  setDetails: (updates) =>
    set((s) => ({
      details: { ...s.details, ...updates },
    })),

  setStep: (step) => set({ step }),

  setIsCreating: (isCreating) => set({ isCreating }),

  reset: () =>
    set({
      isOpen: false,
      step: 'source',
      source: null,
      html: null,
      sourceNote: null,
      createdFrom: 'tab',
      details: INITIAL_DETAILS,
      isCreating: false,
    }),

  close: () => set({ isOpen: false }),
}));
