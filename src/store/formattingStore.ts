import { create } from 'zustand';
import { MarkdownFormatButton, FormattingButtonSize } from '../types';
import { IStorageBridge } from '../ui-contract/bridgeContract';
import { STORAGE_KEYS } from '../adapters/storageKeys';

let activeStorage: IStorageBridge | null = null;

export const PRESET_FORMATTING_BUTTONS: MarkdownFormatButton[] = [
  // Headings
  {
    id: 'fmt_h1',
    label: 'H1',
    icon: 'Heading1',
    title: 'Heading 1 (# text)',
    prefix: '# ',
    type: 'line-prefix',
    category: 'heading',
    enabled: true,
    order: 0,
    isBuiltIn: true
  },
  {
    id: 'fmt_h2',
    label: 'H2',
    icon: 'Heading2',
    title: 'Heading 2 (## text)',
    prefix: '## ',
    type: 'line-prefix',
    category: 'heading',
    enabled: true,
    order: 1,
    isBuiltIn: true
  },
  {
    id: 'fmt_h3',
    label: 'H3',
    icon: 'Heading3',
    title: 'Heading 3 (### text)',
    prefix: '### ',
    type: 'line-prefix',
    category: 'heading',
    enabled: false,
    order: 2,
    isBuiltIn: true
  },
  {
    id: 'fmt_h4',
    label: 'H4',
    icon: 'Heading4',
    title: 'Heading 4 (#### text)',
    prefix: '#### ',
    type: 'line-prefix',
    category: 'heading',
    enabled: false,
    order: 3,
    isBuiltIn: true
  },

  // Text Styling
  {
    id: 'fmt_bold',
    label: 'Bold',
    icon: 'Bold',
    title: 'Bold (**text**)',
    prefix: '**',
    suffix: '**',
    type: 'wrap',
    category: 'format',
    enabled: true,
    order: 4,
    isBuiltIn: true,
    shortcut: 'Ctrl+B'
  },
  {
    id: 'fmt_italic',
    label: 'Italic',
    icon: 'Italic',
    title: 'Italic (*text*)',
    prefix: '*',
    suffix: '*',
    type: 'wrap',
    category: 'format',
    enabled: true,
    order: 5,
    isBuiltIn: true,
    shortcut: 'Ctrl+I'
  },
  {
    id: 'fmt_strikethrough',
    label: 'Strike',
    icon: 'Strikethrough',
    title: 'Strikethrough (~~text~~)',
    prefix: '~~',
    suffix: '~~',
    type: 'wrap',
    category: 'format',
    enabled: false,
    order: 6,
    isBuiltIn: true
  },
  {
    id: 'fmt_code',
    label: 'Code',
    icon: 'Code',
    title: 'Inline Code (`text`)',
    prefix: '`',
    suffix: '`',
    type: 'wrap',
    category: 'format',
    enabled: true,
    order: 7,
    isBuiltIn: true
  },
  {
    id: 'fmt_highlight',
    label: 'Highlight',
    icon: 'Highlighter',
    title: 'Highlight (==text==)',
    prefix: '==',
    suffix: '==',
    type: 'wrap',
    category: 'format',
    enabled: false,
    order: 8,
    isBuiltIn: true
  },
  {
    id: 'fmt_subscript',
    label: 'Sub',
    icon: 'Subscript',
    title: 'Subscript (~text~)',
    prefix: '~',
    suffix: '~',
    type: 'wrap',
    category: 'format',
    enabled: false,
    order: 9,
    isBuiltIn: true
  },
  {
    id: 'fmt_superscript',
    label: 'Super',
    icon: 'Superscript',
    title: 'Superscript (^text^)',
    prefix: '^',
    suffix: '^',
    type: 'wrap',
    category: 'format',
    enabled: false,
    order: 10,
    isBuiltIn: true
  },

  // Lists & Tasks
  {
    id: 'fmt_task',
    label: 'Task',
    icon: 'ListTodo',
    title: 'Task Item (- [ ] )',
    prefix: '- [ ] ',
    type: 'line-prefix',
    category: 'list',
    enabled: true,
    order: 11,
    isBuiltIn: true
  },
  {
    id: 'fmt_bullet',
    label: 'Bullet',
    icon: 'List',
    title: 'Bullet List (- )',
    prefix: '- ',
    type: 'line-prefix',
    category: 'list',
    enabled: true,
    order: 12,
    isBuiltIn: true
  },
  {
    id: 'fmt_ordered',
    label: '1. List',
    icon: 'ListOrdered',
    title: 'Numbered List (1. )',
    prefix: '1. ',
    type: 'line-prefix',
    category: 'list',
    enabled: false,
    order: 13,
    isBuiltIn: true
  },

  // Quotes & Blocks
  {
    id: 'fmt_quote',
    label: 'Quote',
    icon: 'Quote',
    title: 'Blockquote (> )',
    prefix: '> ',
    type: 'line-prefix',
    category: 'block',
    enabled: true,
    order: 14,
    isBuiltIn: true
  },
  {
    id: 'fmt_codeblock',
    label: 'Block',
    icon: 'Code2',
    title: 'Fenced Code Block (```lang)',
    prefix: '```markdown\n',
    suffix: '\n```',
    type: 'block',
    category: 'block',
    enabled: false,
    order: 15,
    isBuiltIn: true
  },
  {
    id: 'fmt_callout_note',
    label: 'Note',
    icon: 'Info',
    title: 'Note Callout (> [!NOTE])',
    prefix: '> [!NOTE]\n> ',
    type: 'line-prefix',
    category: 'block',
    enabled: false,
    order: 16,
    isBuiltIn: true
  },
  {
    id: 'fmt_callout_warn',
    label: 'Warning',
    icon: 'AlertCircle',
    title: 'Warning Callout (> [!WARNING])',
    prefix: '> [!WARNING]\n> ',
    type: 'line-prefix',
    category: 'block',
    enabled: false,
    order: 17,
    isBuiltIn: true
  },

  // Inserts (Links, Tables, HR)
  {
    id: 'fmt_link',
    label: 'Link',
    icon: 'Link',
    title: 'Link ([text](url))',
    prefix: '[',
    suffix: '](https://)',
    type: 'wrap',
    category: 'insert',
    enabled: false,
    order: 18,
    isBuiltIn: true
  },
  {
    id: 'fmt_image',
    label: 'Image',
    icon: 'Image',
    title: 'Image (![alt](url))',
    prefix: '![',
    suffix: '](https://)',
    type: 'wrap',
    category: 'insert',
    enabled: true,
    order: 19,
    isBuiltIn: true
  },
  {
    id: 'fmt_table',
    label: 'Table',
    icon: 'Table',
    title: 'Markdown Table',
    prefix: '| Column 1 | Column 2 | Column 3 |\n| :--- | :--- | :--- |\n| Item 1 | Item 2 | Item 3 |\n',
    type: 'insert',
    category: 'insert',
    enabled: false,
    order: 20,
    isBuiltIn: true
  },
  {
    id: 'fmt_hr',
    label: 'Divider',
    icon: 'Minus',
    title: 'Horizontal Divider (---)',
    prefix: '\n---\n',
    type: 'insert',
    category: 'insert',
    enabled: false,
    order: 21,
    isBuiltIn: true
  },

  // Editor Commands
  {
    id: 'fmt_indent',
    label: 'Indent',
    icon: 'Indent',
    title: 'Indent (Tab)',
    prefix: '',
    type: 'command',
    commandId: 'indent',
    category: 'tool',
    enabled: true,
    order: 22,
    isBuiltIn: true
  },
  {
    id: 'fmt_outdent',
    label: 'Outdent',
    icon: 'Outdent',
    title: 'Outdent (Shift+Tab)',
    prefix: '',
    type: 'command',
    commandId: 'outdent',
    category: 'tool',
    enabled: true,
    order: 23,
    isBuiltIn: true
  },
  {
    id: 'fmt_undo',
    label: 'Undo',
    icon: 'Undo2',
    title: 'Undo',
    prefix: '',
    type: 'command',
    commandId: 'undo',
    category: 'tool',
    enabled: true,
    order: 24,
    isBuiltIn: true
  },
  {
    id: 'fmt_redo',
    label: 'Redo',
    icon: 'Redo2',
    title: 'Redo',
    prefix: '',
    type: 'command',
    commandId: 'redo',
    category: 'tool',
    enabled: true,
    order: 25,
    isBuiltIn: true
  }
];

const STORAGE_KEY = 'contextpad_markdown_format_buttons';
const MULTI_ROW_STORAGE_KEY = 'contextpad_formatting_toolbar_multi_row';
const BUTTON_SIZE_STORAGE_KEY = 'contextpad_formatting_toolbar_button_size';

interface FormattingState {
  buttons: MarkdownFormatButton[];
  isCustomizerOpen: boolean;
  isMultiRowExpanded: boolean;
  buttonSize: FormattingButtonSize;

  // Actions
  initializeFormattingStore: (storage?: IStorageBridge) => Promise<void>;
  openCustomizer: () => void;
  closeCustomizer: () => void;
  setIsMultiRowExpanded: (expanded: boolean) => void;
  toggleExpandMultiRow: () => void;
  setButtonSize: (size: FormattingButtonSize) => void;
  addButton: (buttonData: Omit<MarkdownFormatButton, 'id' | 'order'>) => MarkdownFormatButton;
  addPresetButton: (presetId: string) => void;
  removeButton: (id: string) => void;
  toggleButton: (id: string) => void;
  updateButton: (id: string, updates: Partial<MarkdownFormatButton>) => void;
  reorderButtons: (sourceIndex: number, destinationIndex: number) => void;
  moveButtonUp: (id: string) => void;
  moveButtonDown: (id: string) => void;
  resetToDefaults: () => void;
}

const saveButtonsToStorage = (buttons: MarkdownFormatButton[]) => {
  if (!activeStorage) return;
  try {
    activeStorage.setItem(STORAGE_KEYS.FORMATTING_BUTTONS, JSON.stringify(buttons)).catch(() => {});
  } catch (e) {
    console.error('Failed to save formatting buttons to storage', e);
  }
};

export const useFormattingStore = create<FormattingState>((set, get) => ({
  buttons: PRESET_FORMATTING_BUTTONS,
  isCustomizerOpen: false,
  isMultiRowExpanded: false,
  buttonSize: 'medium',

  initializeFormattingStore: async (storage?: IStorageBridge) => {
    if (storage) {
      activeStorage = storage;
    }
    if (!activeStorage) return;

    try {
      const stored = await activeStorage.getItem(STORAGE_KEYS.FORMATTING_BUTTONS);
      if (stored) {
        const parsed = JSON.parse(stored) as MarkdownFormatButton[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Strictly Markdown formatting buttons only: filter out non-markdown items (variables, formulas, slash menus)
          const nonMarkdownIds = new Set(['fmt_var', 'fmt_formula', 'fmt_slash']);
          const cleanParsed = parsed.filter(b => !nonMarkdownIds.has(b.id));

          const cleanPresets = PRESET_FORMATTING_BUTTONS.filter(p => !nonMarkdownIds.has(p.id));
          const parsedIds = new Set(cleanParsed.map(b => b.id));
          const missingPresets = cleanPresets
            .filter(p => !parsedIds.has(p.id))
            .map(p => ({ ...p, enabled: false, order: cleanParsed.length + p.order }));

          const merged = [...cleanParsed, ...missingPresets].sort((a, b) => a.order - b.order);
          set({ buttons: merged });
          saveButtonsToStorage(merged);
        }
      } else {
        set({ buttons: PRESET_FORMATTING_BUTTONS });
        saveButtonsToStorage(PRESET_FORMATTING_BUTTONS);
      }
    } catch {
      console.warn('Failed to load stored formatting buttons, using defaults');
    }

    try {
      const multiRowStored = await activeStorage.getItem(STORAGE_KEYS.FORMATTING_MULTIROW);
      if (multiRowStored !== null) {
        set({ isMultiRowExpanded: multiRowStored === 'true' });
      }
      const sizeStored = await activeStorage.getItem(STORAGE_KEYS.FORMATTING_SIZE);
      if (sizeStored === 'small' || sizeStored === 'medium' || sizeStored === 'large') {
        set({ buttonSize: sizeStored as FormattingButtonSize });
      }
    } catch {}
  },

  openCustomizer: () => set({ isCustomizerOpen: true }),
  closeCustomizer: () => set({ isCustomizerOpen: false }),

  setIsMultiRowExpanded: (expanded: boolean) => {
    set({ isMultiRowExpanded: expanded });
    if (activeStorage) {
      activeStorage.setItem(STORAGE_KEYS.FORMATTING_MULTIROW, String(expanded)).catch(() => {});
    }
  },

  toggleExpandMultiRow: () => {
    const next = !get().isMultiRowExpanded;
    set({ isMultiRowExpanded: next });
    if (activeStorage) {
      activeStorage.setItem(STORAGE_KEYS.FORMATTING_MULTIROW, String(next)).catch(() => {});
    }
  },

  setButtonSize: (size: FormattingButtonSize) => {
    set({ buttonSize: size });
    if (activeStorage) {
      activeStorage.setItem(STORAGE_KEYS.FORMATTING_SIZE, size).catch(() => {});
    }
  },

  addButton: (buttonData) => {
    const current = get().buttons;
    const newButton: MarkdownFormatButton = {
      ...buttonData,
      id: `custom_fmt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      order: current.length,
      category: 'custom',
      isBuiltIn: false,
      enabled: true
    };

    const updated = [...current, newButton];
    set({ buttons: updated });
    saveButtonsToStorage(updated);
    return newButton;
  },

  addPresetButton: (presetId) => {
    const current = get().buttons;
    const existing = current.find(b => b.id === presetId);
    if (existing) {
      // If it exists but is disabled, enable it
      const updated = current.map(b => b.id === presetId ? { ...b, enabled: true } : b);
      set({ buttons: updated });
      saveButtonsToStorage(updated);
    } else {
      // Find from default presets
      const preset = PRESET_FORMATTING_BUTTONS.find(p => p.id === presetId);
      if (preset) {
        const updated = [...current, { ...preset, enabled: true, order: current.length }];
        set({ buttons: updated });
        saveButtonsToStorage(updated);
      }
    }
  },

  removeButton: (id) => {
    const current = get().buttons;
    const target = current.find(b => b.id === id);

    let updated: MarkdownFormatButton[];
    if (target?.isBuiltIn) {
      // Built-in buttons are disabled when removed from active list so user can easily re-add them
      updated = current.map(b => b.id === id ? { ...b, enabled: false } : b);
    } else {
      // Custom buttons are completely removed
      updated = current.filter(b => b.id !== id);
    }

    set({ buttons: updated });
    saveButtonsToStorage(updated);
  },

  toggleButton: (id) => {
    const current = get().buttons;
    const updated = current.map(b => b.id === id ? { ...b, enabled: !b.enabled } : b);
    set({ buttons: updated });
    saveButtonsToStorage(updated);
  },

  updateButton: (id, updates) => {
    const current = get().buttons;
    const updated = current.map(b => b.id === id ? { ...b, ...updates } : b);
    set({ buttons: updated });
    saveButtonsToStorage(updated);
  },

  reorderButtons: (sourceIndex, destinationIndex) => {
    const current = [...get().buttons];
    const [removed] = current.splice(sourceIndex, 1);
    current.splice(destinationIndex, 0, removed);

    // Reassign order
    const updated = current.map((btn, idx) => ({ ...btn, order: idx }));
    set({ buttons: updated });
    saveButtonsToStorage(updated);
  },

  moveButtonUp: (id) => {
    const current = [...get().buttons];
    const index = current.findIndex(b => b.id === id);
    if (index <= 0) return;

    const temp = current[index];
    current[index] = current[index - 1];
    current[index - 1] = temp;

    const updated = current.map((btn, idx) => ({ ...btn, order: idx }));
    set({ buttons: updated });
    saveButtonsToStorage(updated);
  },

  moveButtonDown: (id) => {
    const current = [...get().buttons];
    const index = current.findIndex(b => b.id === id);
    if (index === -1 || index >= current.length - 1) return;

    const temp = current[index];
    current[index] = current[index + 1];
    current[index + 1] = temp;

    const updated = current.map((btn, idx) => ({ ...btn, order: idx }));
    set({ buttons: updated });
    saveButtonsToStorage(updated);
  },

  resetToDefaults: () => {
    set({ buttons: PRESET_FORMATTING_BUTTONS });
    saveButtonsToStorage(PRESET_FORMATTING_BUTTONS);
  }
}));
