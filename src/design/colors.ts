/**
 * CNTXT Semantic Color Token Mappings
 * 
 * Maps high-level UI intentions to CSS variable custom properties
 * ensuring seamless runtime theme switching (Material 3, Dark, Dracula, Nord, etc.)
 */

export const semanticColorTokens = {
  // App Canvas & Backgrounds
  background: {
    app: 'var(--app-bg)',
    titlebar: 'var(--titlebar-bg)',
    sidebar: 'var(--sidebar-bg)',
    editor: 'var(--editor-bg)',
    card: 'var(--card-bg)',
    cardHover: 'var(--card-hover-bg)',
    activityBar: 'var(--activity-bar-bg)',
    statusBar: 'var(--statusbar-bg)',
    modal: 'var(--modal-bg)',
    dropdown: 'var(--dropdown-bg)',
  },

  // Foreground & Typography
  foreground: {
    primary: 'var(--text-primary)',
    secondary: 'var(--text-secondary)',
    muted: 'var(--text-muted)',
    accent: 'var(--accent-primary)',
    onAccent: '#ffffff',
    inverse: 'var(--text-inverse, #ffffff)',
  },

  // Borders & Dividers
  border: {
    primary: 'var(--border-primary)',
    subtle: 'var(--border-subtle)',
    accent: 'var(--accent-primary)',
    focus: 'var(--border-focus, var(--accent-primary))',
  },

  // Accents & Actions
  accent: {
    primary: 'var(--accent-primary)',
    hover: 'var(--accent-primary-hover)',
    container: 'var(--accent-container, rgba(59, 130, 246, 0.15))',
    onContainer: 'var(--on-accent-container, var(--accent-primary))',
    subtle: 'var(--accent-subtle, rgba(59, 130, 246, 0.08))',
  },

  // Status & Feedback
  status: {
    info: 'var(--status-info, #3b82f6)',
    success: 'var(--status-success, #10b981)',
    warning: 'var(--status-warning, #f59e0b)',
    error: 'var(--status-error, #ef4444)',
    dirtyBadge: '#ef4444',
  }
} as const;

export type SemanticColorCategory = keyof typeof semanticColorTokens;
