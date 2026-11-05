/**
 * Centralized Storage Keys
 * Prevents key drift across web adapters, mock storage, and desktop Tauri store plugins.
 */

export const STORAGE_KEYS = {
  SETTINGS: 'contextpad_settings',
  ACTIONS: 'contextpad_actions',
  ACTIONS_UI: 'contextpad_actions_ui',
  WORKFLOWS: 'contextpad_workflows',
  TEMPLATES: 'contextpad_templates',
  TEMPLATES_UI: 'contextpad_templates_ui',
  RIBBON: 'contextpad_modular_ribbon',
  FORMATTING_BUTTONS: 'contextpad_formatting_buttons',
  FORMATTING_CATEGORIES: 'contextpad_formatting_categories',
  FORMATTING_MULTIROW: 'contextpad_formatting_multirow',
  FORMATTING_SIZE: 'contextpad_formatting_size',
  FORMATTING_TOOLBAR_HEIGHT: 'contextpad_formatting_toolbar_height',
  TABS_META: 'contextpad_tabs_meta',
  ACTIVE_TAB_ID: 'contextpad_active_tab_id',
  TAB_CONTENT_PREFIX: 'cp_tab_',
  VIRTUAL_FILES: 'contextpad_virtual_files',
  SIDEBAR_WIDTH: 'contextpad_sidebar_width',
  ACCESSORY_BAR_EXPANDED: 'contextpad_accessory_bar_expanded',
  PINNED_ITEMS: 'contextpad_pinned_items',
  OPENED_FILE_HISTORY: 'contextpad_opened_file_history',
  AUTH_USER: 'contextpad_auth_user',
  GUEST_MODE: 'contextpad_guest_mode',
  ONBOARDING_COMPLETED: 'contextpad_onboarding_completed',
  GITHUB_LIBRARY_CONFIG: 'contextpad_github_library_config',
  PANEL_APPS_INDEX: 'contextpad_panel_apps_index',
  WORKSPACE_PATH: 'contextpad_workspace_path',
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS] | string;
