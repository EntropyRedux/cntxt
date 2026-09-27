import { create } from 'zustand';

interface LargeDocModalState {
  isOpen: boolean;
  tabId: string | null;
  fileTitle: string;
  fileSizeKb: number;
  headings: Array<{ level: number; text: string; lineNumber: number }>;
  rawContent: string;
  openLargeDocModal: (tabId: string, title: string, content: string) => void;
  closeLargeDocModal: () => void;
}

export const useLargeDocModalStore = create<LargeDocModalState>((set) => ({
  isOpen: false,
  tabId: null,
  fileTitle: '',
  fileSizeKb: 0,
  headings: [],
  rawContent: '',

  openLargeDocModal: (tabId: string, title: string, content: string) => {
    const fileSizeKb = Math.round(new Blob([content]).size / 1024);
    const lines = content.split('\n');
    const headings: Array<{ level: number; text: string; lineNumber: number }> = [];

    lines.forEach((line, idx) => {
      const match = line.match(/^(#{1,6})\s+(.*)$/);
      if (match) {
        headings.push({
          level: match[1].length,
          text: match[2].trim(),
          lineNumber: idx + 1
        });
      }
    });

    set({
      isOpen: true,
      tabId,
      fileTitle: title,
      fileSizeKb,
      headings,
      rawContent: content
    });
  },

  closeLargeDocModal: () => set({ isOpen: false, tabId: null, rawContent: '', headings: [] }),
}));
