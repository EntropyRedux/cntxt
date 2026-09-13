/**
 * Centralized Storage Keys
 * Prevents key drift across web adapters, mock storage, and desktop Tauri store plugins.
 */

export const STORAGE_KEYS = {
  SETTINGS: 'contextpad_settings',
  ACTIONS: 'contextpad_actions',
  WORKFLOWS: 'contextpad_workflows',
  TEMPLATES: 'contextpad_templates',
  RIBBON: 'contextpad_modular_ribbon',
  FORMATTING_BUTTONS: 'contextpad_formatting_buttons',
  FORMATTING_MULTIROW: 'contextpad_formatting_multirow',
  FORMATTING_SIZE: 'contextpad_formatting_size',
  TABS_META: 'contextpad_tabs_meta',
  ACTIVE_TAB_ID: 'contextpad_active_tab_id',
  TAB_CONTENT_PREFIX: 'cp_tab_',
  VIRTUAL_FILES: 'contextpad_virtual_files',
  SIDEBAR_WIDTH: 'contextpad_sidebar_width',
  ACCESSORY_BAR_EXPANDED: 'contextpad_accessory_bar_expanded',
  PINNED_ITEMS: 'contextpad_pinned_items',
  OPENED_FILE_HISTORY: 'contextpad_opened_file_history',
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS] | string;
