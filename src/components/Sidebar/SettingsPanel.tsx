import React, { useState, useEffect } from 'react';
import { 
  Check, 
  Download, 
  Upload, 
  RotateCcw,
  Sparkles,
  Sun,
  Moon,
  Smartphone,
  Laptop,
  Touchpad,
  SlidersHorizontal,
  Type,
  Layers,
  Activity,
  Cpu,
  Clock,
  FlaskConical,
  Trash2,
  FolderGit2,
  CloudCheck,
  RefreshCw,
  LogOut,
  User
} from 'lucide-react';
import { useSettingsStore } from '../../store/settingsStore';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useFormattingStore } from '../../store/formattingStore';
import { useConfirmStore } from '../../store/confirmStore';
import { useRuntimeBridge, STORAGE_KEYS, getSafeStorageItem } from '../../adapters';
import { ThemeName } from '../../types';
import { CURATED_FONTS, getCuratedFontByFamily, THEME_DEFAULT_FONTS } from '../../constants/fonts';
import { validateWorkspaceBackup } from '../../contracts/boundarySchemas';
import { recordDiagnostic } from '../../services/diagnosticLogger';
import { PersonalGitHubLibraryConfig } from '../../contracts/data_shapes';
import { GoogleIcon, GitHubIcon } from '../Auth/BrandIcons';
import { PersonalGitHubLibraryModal } from './PersonalGitHubLibraryModal';
import { RestGatewaySettingsCard } from './RestGatewaySettingsCard';
import { ErrorBoundary } from '../Common/ErrorBoundary';
import { IRestGatewayStatus } from '../../ui-contract/bridgeContract';

export const SettingsPanel: React.FC = () => {
  const bridge = useRuntimeBridge();
  const { settings, updateSettings, resetSettings } = useSettingsStore();
  const { addNotification } = useNotificationStore();
  const { showConfirm } = useConfirmStore();
  const { user, loginWithGoogle, loginWithGitHub, signOut, syncStatus, lastSyncTime, triggerSync } = useAuthStore();
  const [isGitHubModalOpen, setIsGitHubModalOpen] = useState(false);

  // REST Gateway State
  const [gatewayStatus, setGatewayStatus] = useState<IRestGatewayStatus>({
    running: false,
    port: settings.restGatewayPort ?? 9876,
    authToken: '',
  });
  const [gatewayLoading, setGatewayLoading] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);
  const [lanUrlCopied, setLanUrlCopied] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [gatewayError, setGatewayError] = useState<string | null>(null);

  const isAndroid = bridge.platform.os === 'android';
  const effectiveAllowLan = settings.allowRestGatewayLan ?? isAndroid;

  // Sync gateway state on mount or when settings change
  useEffect(() => {
    let isMounted = true;
    if (!bridge.gateway?.isAvailable?.()) return;

    const checkGateway = async () => {
      try {
        const isEnabled = Boolean(settings.enableExperimentalSettings && settings.enableRestGateway);
        if (isEnabled) {
          const res = await bridge.gateway?.start(settings.restGatewayPort ?? 9876, effectiveAllowLan);
          if (isMounted && res) {
            setGatewayStatus({
              running: true,
              port: res.port,
              authToken: res.authToken,
              lanIp: res.lanIp,
              allowLan: effectiveAllowLan,
            });
            setGatewayError(null);
          }
        } else {
          try {
            await bridge.gateway?.stop();
          } catch {
            // Ignore stop errors
          }
          const status = await bridge.gateway?.getStatus();
          if (isMounted && status) {
            setGatewayStatus(status);
          }
        }
      } catch (err) {
        if (isMounted) {
          setGatewayError(err instanceof Error ? err.message : 'Gateway error');
        }
      }
    };

    checkGateway();
    return () => {
      isMounted = false;
    };
  }, [bridge.gateway, settings.enableExperimentalSettings, settings.enableRestGateway, settings.restGatewayPort, effectiveAllowLan]);

  const handleToggleRestGateway = async (enabled: boolean) => {
    updateSettings({ enableRestGateway: enabled });
    if (!bridge.gateway?.isAvailable?.()) return;

    setGatewayLoading(true);
    setGatewayError(null);
    try {
      if (enabled) {
        const res = await bridge.gateway.start(settings.restGatewayPort ?? 9876, effectiveAllowLan);
        setGatewayStatus({
          running: true,
          port: res.port,
          authToken: res.authToken,
          lanIp: res.lanIp,
          allowLan: effectiveAllowLan,
        });
        addNotification('REST Gateway Active', `Listening on port ${res.port}${res.lanIp ? ` (LAN: ${res.lanIp})` : ''}`, 'info');
      } else {
        await bridge.gateway.stop();
        const status = await bridge.gateway.getStatus();
        setGatewayStatus(status);
        addNotification('REST Gateway Inactive', 'REST listener disabled', 'info');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update gateway';
      setGatewayError(msg);
      addNotification('REST Gateway Error', msg, 'error');
    } finally {
      setGatewayLoading(false);
    }
  };

  const handleToggleAllowLan = async (allow: boolean) => {
    updateSettings({ allowRestGatewayLan: allow });
    if (!bridge.gateway?.isAvailable?.() || !settings.enableRestGateway) return;

    setGatewayLoading(true);
    setGatewayError(null);
    try {
      await bridge.gateway.stop();
      const res = await bridge.gateway.start(settings.restGatewayPort ?? 9876, allow);
      setGatewayStatus({
        running: true,
        port: res.port,
        authToken: res.authToken,
        lanIp: res.lanIp,
        allowLan: allow,
      });
      addNotification('REST Gateway Updated', `LAN mode ${allow ? 'enabled' : 'disabled'}`, 'info');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update LAN mode';
      setGatewayError(msg);
      addNotification('REST Gateway Error', msg, 'error');
    } finally {
      setGatewayLoading(false);
    }
  };

  const handleCopyLanUrl = async () => {
    if (!gatewayStatus.lanIp) return;
    const url = `http://${gatewayStatus.lanIp}:${gatewayStatus.port || settings.restGatewayPort || 9876}`;
    try {
      await bridge.clipboard.writeText(url);
      setLanUrlCopied(true);
      setTimeout(() => setLanUrlCopied(false), 2000);
      addNotification('LAN Endpoint Copied', `${url} copied to clipboard`, 'info');
    } catch {
      addNotification('Copy Failed', 'Unable to copy LAN endpoint URL', 'error');
    }
  };

  const handleToggleKeepScreenAwake = (awake: boolean) => {
    updateSettings({ keepScreenAwake: awake });
    bridge.platform.setKeepScreenOn?.(awake);
    addNotification(
      awake ? 'Screen Kept Awake' : 'Normal Screen Timeout',
      awake ? 'Display will remain active during review sessions' : 'Standard display sleep restored',
      'info'
    );
  };

  useEffect(() => {
    if (settings.keepScreenAwake && bridge.platform.os === 'android') {
      bridge.platform.setKeepScreenOn?.(true);
    }
  }, [settings.keepScreenAwake, bridge.platform]);

  const handlePortChange = (port: number) => {
    updateSettings({ restGatewayPort: port });
  };

  const handleCopyToken = async () => {
    if (!gatewayStatus.authToken) return;
    try {
      await bridge.clipboard.writeText(gatewayStatus.authToken);
      setTokenCopied(true);
      setTimeout(() => setTokenCopied(false), 2000);
      addNotification('Token Copied', 'X-CNTXT-Token copied to clipboard', 'info');
    } catch {
      addNotification('Copy Failed', 'Unable to copy token', 'error');
    }
  };

  const handleRegenerateToken = async () => {
    if (!bridge.gateway?.regenerateToken) return;
    setGatewayLoading(true);
    try {
      const newToken = await bridge.gateway.regenerateToken();
      setGatewayStatus((prev) => ({ ...prev, authToken: newToken }));
      addNotification('Token Regenerated', 'Generated new X-CNTXT-Token', 'info');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to regenerate token';
      addNotification('Token Error', msg, 'error');
    } finally {
      setGatewayLoading(false);
    }
  };

  const gitHubConfig: PersonalGitHubLibraryConfig | null = (() => {
    try {
      const stored = getSafeStorageItem(STORAGE_KEYS.GITHUB_LIBRARY_CONFIG);
      return stored ? JSON.parse(stored) : (user?.githubLibrary || null);
    } catch {
      return user?.githubLibrary || null;
    }
  })();
  const { 
    isMultiRowExpanded, 
    setIsMultiRowExpanded, 
    openCustomizer,
    buttonSize,
    setButtonSize 
  } = useFormattingStore();

  const themes: { id: ThemeName; name: string; mode: 'light' | 'dark'; bg: string; accent: string; badge?: string }[] = [
    { 
      id: 'google-material-3', 
      name: 'Google Material 3', 
      mode: 'light', 
      bg: '#FFFFFF', 
      accent: '#0B57D0',
      badge: 'Material 3 Light' 
    },
    { 
      id: 'parchment', 
      name: 'Parchment', 
      mode: 'light', 
      bg: '#FAF6EE', 
      accent: '#9C522B',
      badge: 'Warm Linen' 
    },
    { 
      id: 'contextpad-dark', 
      name: 'ContextPad Dark+', 
      mode: 'dark', 
      bg: '#1E1E1E', 
      accent: '#007ACC' 
    },
    { 
      id: 'one-dark', 
      name: 'Atom One Dark', 
      mode: 'dark', 
      bg: '#282C34', 
      accent: '#61AFEF' 
    },
    { 
      id: 'dracula', 
      name: 'Dracula Purple', 
      mode: 'dark', 
      bg: '#282A36', 
      accent: '#BD93F9' 
    },
    { 
      id: 'nord', 
      name: 'Nord Arctic', 
      mode: 'dark', 
      bg: '#2E3440', 
      accent: '#88C0D0' 
    },
    { 
      id: 'monokai', 
      name: 'Monokai Pro', 
      mode: 'dark', 
      bg: '#2D2A2E', 
      accent: '#FFD866' 
    },
    { 
      id: 'github-dark', 
      name: 'GitHub Dark', 
      mode: 'dark', 
      bg: '#0D1117', 
      accent: '#58A6FF' 
    },
    { 
      id: 'github-light', 
      name: 'GitHub Light', 
      mode: 'light', 
      bg: '#FFFFFF', 
      accent: '#0969DA' 
    },
    { 
      id: 'solarized-dark', 
      name: 'Solarized Dark', 
      mode: 'dark', 
      bg: '#002B36', 
      accent: '#268BD2' 
    }
  ];

  const handleExportBackup = async () => {
    try {
      await bridge.fs.exportWorkspace();
      addNotification('Backup Exported', 'Full workspace JSON downloaded', 'success');
    } catch (e: unknown) {
      addNotification('Export Failed', (e as Error)?.message || 'Export error', 'error');
    }
  };

  const handleImportBackup = async () => {
    try {
      const file = await bridge.fs.openFile();
      if (!file) return;
      const json = JSON.parse(file.content);
      const validation = validateWorkspaceBackup(json);
      if (!validation.success) {
        addNotification('Import Error', 'Invalid backup format: missing settings or data object', 'error');
        return;
      }
      if (json.data && json.data.contextpad_settings) {
        updateSettings(json.data.contextpad_settings);
      } else if (json.settings) {
        updateSettings(json.settings);
      }
      await bridge.fs.importWorkspace(file.content);
      addNotification('Settings Restored', 'Configuration restored from backup', 'success');
    } catch (err: unknown) {
      addNotification('Import Error', (err as Error)?.message || 'Invalid backup format', 'error');
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-3 space-y-3 text-xs select-none theme-sidebar">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[var(--border-primary)]">
        <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[var(--text-secondary)] text-[11px]">
          <span>Preferences & Themes</span>
        </div>
      </div>

      {/* Account, Cloud Sync & Personal GitHub Library */}
      <div className="p-3 theme-card rounded-lg space-y-3 shadow-xs border border-[var(--border-subtle)]">
        <div className="flex items-center justify-between">
          <div className="font-bold text-[var(--text-primary)] text-[11px] uppercase tracking-wider flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
            <span>Account & Cloud Sync</span>
          </div>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
            user ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25' : 'bg-[var(--card-secondary-bg)] text-[var(--text-muted)]'
          }`}>
            {user ? `${user.provider} Synced` : 'Guest / Offline'}
          </span>
        </div>

        {user ? (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between p-2 rounded-md bg-[var(--card-secondary-bg)] border border-[var(--border-subtle)]">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={user.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`}
                  alt={user.name}
                  className="w-8 h-8 rounded-full object-cover ring-1 ring-[var(--border-primary)] shrink-0"
                />
                <div className="min-w-0">
                  <div className="font-semibold text-xs text-[var(--text-primary)] truncate">
                    {user.name}
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] truncate">
                    {user.email}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => signOut()}
                title="Sign out of your account"
                className="px-2 py-1 text-[10.5px] rounded hover:bg-red-500/15 text-[var(--text-muted)] hover:text-red-400 border border-[var(--border-subtle)] hover:border-red-500/30 transition-colors cursor-pointer shrink-0"
              >
                Sign Out
              </button>
            </div>

            {/* Sync Status Row */}
            <div className="flex items-center justify-between text-[11px] px-1">
              <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
                <CloudCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Cloud Sync: {syncStatus === 'syncing' ? 'Syncing...' : (lastSyncTime || 'Active')}</span>
              </div>
              <button
                type="button"
                onClick={() => triggerSync()}
                disabled={syncStatus === 'syncing'}
                className="text-[10.5px] text-[var(--accent-primary)] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                <span>Sync Now</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
              Sign in with Google or GitHub to sync your templates, actions, and custom library across your devices.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => loginWithGoogle()}
                className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md bg-white text-gray-800 hover:bg-gray-100 border border-gray-200 text-xs font-medium shadow-xs transition-all cursor-pointer"
              >
                <GoogleIcon className="w-3.5 h-3.5" />
                <span>Google</span>
              </button>
              <button
                type="button"
                onClick={() => loginWithGitHub()}
                className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md bg-[#24292F] text-white hover:bg-[#1B1F23] border border-[#30363d] text-xs font-medium shadow-xs transition-all cursor-pointer"
              >
                <GitHubIcon className="w-3.5 h-3.5" />
                <span>GitHub</span>
              </button>
            </div>
          </div>
        )}

        {/* Personal GitHub Cloud Library Section */}
        <div className="pt-2 border-t border-[var(--border-subtle)] space-y-2">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-xs text-[var(--text-primary)] flex items-center gap-1.5">
              <FolderGit2 className="w-3.5 h-3.5 text-purple-400" />
              <span>Personal GitHub Library</span>
            </div>
            {gitHubConfig && (
              <span className="text-[9.5px] px-1 py-0.2 rounded bg-purple-500/15 text-purple-300 font-mono">
                {gitHubConfig.isPrivate ? 'private' : 'public'}
              </span>
            )}
          </div>

          <p className="text-[10.5px] text-[var(--text-muted)] leading-relaxed">
            Store templates, actions, and blueprints in your own private GitHub repository. 100% private with zero database limits.
          </p>

          {gitHubConfig ? (
            <div className="p-2.5 rounded-lg bg-purple-500/5 border border-purple-500/20 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-mono font-semibold text-purple-300 truncate">
                    {gitHubConfig.repoOwner}/{gitHubConfig.repoName}
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] truncate">
                    Branch: {gitHubConfig.branch || 'main'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsGitHubModalOpen(true)}
                  className="px-2 py-1 text-[10.5px] font-semibold bg-purple-600 hover:bg-purple-500 text-white rounded-md shrink-0 transition-colors shadow-xs cursor-pointer"
                >
                  Manage
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsGitHubModalOpen(true)}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs shadow-xs transition-colors cursor-pointer"
            >
              <FolderGit2 className="w-3.5 h-3.5" />
              <span>Connect Personal GitHub Repo</span>
            </button>
          )}
        </div>
      </div>

      {/* Global Application Theme Engine */}
      <div className="p-3 theme-card rounded-lg space-y-2.5 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="font-bold text-[var(--text-primary)] text-[11px] uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
            <span>Application Theme Engine</span>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--accent-container)] text-[var(--on-accent-container)] font-semibold">
            {settings.theme === 'parchment' ? 'Parchment' : settings.theme === 'google-material-3' ? 'M3 Light' : settings.theme === 'github-light' ? 'GitHub Light' : 'Dark Mode'}
          </span>
        </div>

        <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
          Themes dynamically re-skin the entire application interface, toolbars, sidebars, modals, and editor typography.
        </p>

        <div className="grid grid-cols-2 gap-2 pt-1">
          {themes.map(t => {
            const isSelected = settings.theme === t.id;
            const themeDefaultFontFamily = THEME_DEFAULT_FONTS[t.id];
            const matchingFont = getCuratedFontByFamily(themeDefaultFontFamily);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  updateSettings({ theme: t.id, fontFamily: themeDefaultFontFamily, isFontCustomizedByUser: false, autoAdaptFontToTheme: true });
                  bridge.theme.applyTheme(t.id);
                  addNotification('Theme & Font Applied', `Switched to ${t.name} (Font: ${matchingFont.name})`, 'info');
                }}
                title={`Theme: ${t.name} (Default Font: ${matchingFont.name})`}
                aria-label={`Select ${t.name} theme`}
                className={`p-2 rounded-lg border text-left transition-all relative flex flex-col justify-between ${
                  isSelected 
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-container)]/30 ring-2 ring-[var(--accent-primary)]/40 shadow-xs' 
                    : 'border-[var(--border-primary)] bg-[var(--card-secondary-bg)] hover:border-[var(--accent-primary)]/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-[11px] text-[var(--text-primary)] truncate flex items-center gap-1">
                    {t.mode === 'light' ? (
                      <Sun className="w-3 h-3 text-[#E68A00] shrink-0" />
                    ) : (
                      <Moon className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
                    )}
                    <span className="truncate">{t.name}</span>
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />}
                </div>

                <div className="text-[10px] text-[var(--text-muted)] truncate mb-1">
                  Font: <span className="text-[var(--text-secondary)] font-medium">{matchingFont.name}</span>
                </div>

                <div className="flex items-center justify-between mt-0.5">
                  <div className="flex items-center gap-1">
                    <div 
                      className="w-4 h-3.5 rounded-xs border border-[var(--border-primary)]" 
                      style={{ backgroundColor: t.bg }} 
                      title={`Background: ${t.bg}`}
                    />
                    <div 
                      className="w-4 h-3.5 rounded-xs" 
                      style={{ backgroundColor: t.accent }} 
                      title={`Accent: ${t.accent}`}
                    />
                  </div>
                  {t.badge && (
                    <span className="text-[9px] font-bold uppercase tracking-tight text-[var(--accent-primary)] bg-[var(--accent-container)] px-1 py-0.2 rounded">
                      {t.badge}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Touchscreen & Adaptive UI Optimization */}
      <div className="p-3 theme-card rounded-lg space-y-2.5 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="font-bold text-[var(--text-primary)] text-[11px] uppercase tracking-wider flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
            <span>Touchscreen & Mobile Optimization</span>
          </div>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
            settings.touchOptimized 
              ? 'bg-[var(--accent-container)] text-[var(--on-accent-container)]' 
              : 'bg-[var(--card-secondary-bg)] text-[var(--text-muted)]'
          }`}>
            {settings.touchOptimized ? 'Touch Active (44px+)' : 'Desktop Mode'}
          </span>
        </div>

        <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
          Adapt layout density, tap targets, mobile drawers, and virtual keyboard accessory toolbar for seamless desktop, tablet, and mobile workflows.
        </p>

        <div className="space-y-2.5 pt-1">
          {/* Touch-Optimized Mode Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[var(--text-primary)] block font-medium">Touch-Optimized Mode</span>
              <span className="text-[10px] text-[var(--text-muted)]">Increases button & tab hit targets (44px+)</span>
            </div>
            <input
              type="checkbox"
              checked={settings.touchOptimized}
              onChange={(e) => updateSettings({ 
                touchOptimized: e.target.checked,
                uiDensity: e.target.checked ? 'touch' : 'desktop'
              })}
              className="accent-[var(--accent-primary)] rounded w-4 h-4 cursor-pointer"
            />
          </div>

          {/* Keep Screen Awake Toggle (Active Review Mode) */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[var(--text-primary)] block font-medium">Keep Screen Awake</span>
              <span className="text-[10px] text-[var(--text-muted)]">Prevents screen timeout during review and companion display sessions</span>
            </div>
            <input
              type="checkbox"
              id="toggle-keep-screen-awake"
              checked={settings.keepScreenAwake ?? false}
              onChange={(e) => handleToggleKeepScreenAwake(e.target.checked)}
              className="accent-[var(--accent-primary)] rounded w-4 h-4 cursor-pointer"
            />
          </div>

          {/* Mobile Markdown Accessory Bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[var(--text-primary)] block">Mobile Virtual Keyboard Bar</span>
                <span className="text-[10px] text-[var(--text-muted)]">One-tap Markdown & prompt symbols</span>
              </div>
              <input
                type="checkbox"
                checked={settings.showMobileAccessoryBar}
                onChange={(e) => updateSettings({ showMobileAccessoryBar: e.target.checked })}
                className="accent-[var(--accent-primary)] rounded w-4 h-4 cursor-pointer"
              />
            </div>
            {settings.showMobileAccessoryBar && (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between pl-2 border-l-2 border-[var(--accent-primary)]/40">
                  <div>
                    <span className="text-xs text-[var(--text-primary)] block">Multi-row on narrow screens</span>
                    <span className="text-[10px] text-[var(--text-muted)]">Show all buttons without horizontal scrolling</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isMultiRowExpanded}
                    onChange={(e) => setIsMultiRowExpanded(e.target.checked)}
                    className="accent-[var(--accent-primary)] rounded w-3.5 h-3.5 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between pl-2 border-l-2 border-[var(--accent-primary)]/40 pt-0.5">
                  <div>
                    <span className="text-xs text-[var(--text-primary)] block">Toolbar Button Size</span>
                    <span className="text-[10px] text-[var(--text-muted)]">Compact, standard, or touch-friendly</span>
                  </div>
                  <div className="flex items-center gap-1 bg-[var(--card-bg)] p-0.5 rounded border border-[var(--border-subtle)]">
                    {(['small', 'medium', 'large'] as const).map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setButtonSize(sz)}
                        className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${
                          buttonSize === sz
                            ? 'bg-[var(--accent-primary)] text-white font-semibold shadow-2xs'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {sz === 'small' ? 'Sm' : sz === 'medium' ? 'Med' : 'Lrg'}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={openCustomizer}
                  className="w-full mt-1 py-1.5 px-2.5 rounded-md text-xs font-medium bg-[var(--card-bg)] hover:bg-[var(--card-hover-bg)] text-[var(--accent-primary)] border border-[var(--border-subtle)] flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Customize Formatting Buttons</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Workspace & Side Panel Layout */}
      <div className="p-3 theme-card rounded-lg space-y-2.5 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="font-bold text-[var(--text-primary)] text-[11px] uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
            <span>Workspace & Panels</span>
          </div>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
            settings.sidebarOverlay 
              ? 'bg-[var(--accent-container)] text-[var(--on-accent-container)]' 
              : 'bg-[var(--card-secondary-bg)] text-[var(--text-muted)]'
          }`}>
            {settings.sidebarOverlay ? 'Overlay Active' : 'Docked (Pushes Editor)'}
          </span>
        </div>

        <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
          Configure how the right side panel displays relative to the editor surface.
        </p>

        <div className="space-y-2 pt-1">
          {/* Right Panel as Overlay Toggle */}
          <div className="flex items-center justify-between">
            <div className="pr-3">
              <span className="text-[var(--text-primary)] block font-medium">Right Panel as Overlay</span>
              <span className="text-[10px] text-[var(--text-muted)]">
                Display right panel as an overlay over the editor instead of pushing or resizing editor contents (does not overlay on left rail buttons)
              </span>
            </div>
            <input
              type="checkbox"
              id="toggle-sidebar-overlay"
              checked={!!settings.sidebarOverlay}
              onChange={(e) => updateSettings({ sidebarOverlay: e.target.checked })}
              className="accent-[var(--accent-primary)] rounded w-4 h-4 cursor-pointer shrink-0"
            />
          </div>
        </div>
      </div>

      {/* Editor & Typography */}
      <div className="p-3 theme-card rounded-lg space-y-2.5 shadow-xs">
        <div className="font-bold text-[var(--text-primary)] text-[11px] uppercase tracking-wider">
          Editor & Typography
        </div>

        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[var(--text-primary)] block font-medium">Editor Mode</span>
              <span className="text-[10px] text-[var(--text-muted)]">Active editing behavior</span>
            </div>
            <select
              value={settings.editorMode || 'rendered'}
              onChange={(e) => updateSettings({ editorMode: e.target.value as 'rendered' | 'raw' })}
              className="theme-input font-medium rounded px-2 py-1 text-xs text-[var(--accent-primary)] font-semibold"
            >
              <option value="rendered">Live Rendered Markdown</option>
              <option value="raw">Raw Markdown</option>
            </select>
          </div>

          {/* Syntax Color Highlighting Switcher (AI Studio Single-Row 4-Button Grid) */}
          <div className="space-y-1.5 pt-1 border-t border-[var(--border-subtle)]">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[var(--text-primary)] block font-medium">Syntax Color Highlighting</span>
                <span className="text-[10px] text-[var(--text-muted)]">Control colorization for headers, markdown, and text</span>
              </div>
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                (settings.syntaxHighlighting || 'automatic') === 'off' || settings.syntaxHighlighting === 'none'
                  ? 'bg-rose-500/15 text-rose-500'
                  : (settings.syntaxHighlighting || 'automatic') === 'automatic' || settings.syntaxHighlighting === 'auto'
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : 'bg-[var(--accent-container)] text-[var(--on-accent-container)]'
              }`}>
                {settings.syntaxHighlighting === 'off' || settings.syntaxHighlighting === 'none'
                  ? 'Off' 
                  : settings.syntaxHighlighting === 'headers-only' || settings.syntaxHighlighting === 'headers'
                    ? 'Headers' 
                    : settings.syntaxHighlighting === 'markdown-formatted' || settings.syntaxHighlighting === 'markdown'
                      ? 'Markdown' 
                      : 'Auto'}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {[
                { id: 'automatic' as const, label: 'Auto' },
                { id: 'markdown-formatted' as const, label: 'Markdown' },
                { id: 'headers-only' as const, label: 'Headers' },
                { id: 'off' as const, label: 'OFF' },
              ].map(opt => {
                const isCurrent = 
                  (settings.syntaxHighlighting || 'automatic') === opt.id ||
                  (settings.syntaxHighlighting === 'auto' && opt.id === 'automatic') ||
                  (settings.syntaxHighlighting === 'markdown' && opt.id === 'markdown-formatted') ||
                  (settings.syntaxHighlighting === 'headers' && opt.id === 'headers-only') ||
                  (settings.syntaxHighlighting === 'none' && opt.id === 'off');
                return (
                  <button
                    key={opt.id}
                    id={`btn-syntax-mode-${opt.id}`}
                    type="button"
                    onClick={() => {
                      updateSettings({ syntaxHighlighting: opt.id });
                      addNotification(
                        'Syntax Highlighting Updated',
                        opt.id === 'off' 
                          ? 'Turned OFF: Monochrome white on dark themes, black on light themes'
                          : opt.id === 'headers-only'
                            ? 'Headers Only: Only headings get colors'
                            : opt.id === 'markdown-formatted'
                              ? 'Markdown Formatted: Headers, bold, italicized, and formatted text get colors'
                              : 'Automatic: Full syntax color highlighting active',
                        'info'
                      );
                    }}
                    className={`min-h-[36px] flex items-center justify-center py-1.5 px-1 text-[10.5px] sm:text-[11px] font-semibold rounded-md border text-center transition-all cursor-pointer truncate ${
                      isCurrent
                        ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)] shadow-2xs'
                        : 'bg-[var(--card-secondary-bg)] hover:bg-[var(--card-hover-bg)] text-[var(--text-secondary)] border-[var(--border-subtle)]'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            <div className="text-[10px] text-[var(--text-muted)] bg-[var(--card-secondary-bg)] p-2 rounded border border-[var(--border-subtle)] leading-normal">
              {((settings.syntaxHighlighting || 'automatic') === 'automatic' || settings.syntaxHighlighting === 'auto') && (
                <span><strong>Automatic:</strong> Full multi-color syntax highlighting for markdown, code blocks, variables, and keywords.</span>
              )}
              {(settings.syntaxHighlighting === 'markdown-formatted' || settings.syntaxHighlighting === 'markdown') && (
                <span><strong>Markdown Formatted:</strong> Headers, bold, italicized, and markdown-formatted text only get colors. Plain text and code blocks remain monochrome.</span>
              )}
              {(settings.syntaxHighlighting === 'headers-only' || settings.syntaxHighlighting === 'headers') && (
                <span><strong>Headers Only:</strong> Only headings (#, ##, etc.) get colors. Bold, italic, code blocks, and body text remain monochrome.</span>
              )}
              {(settings.syntaxHighlighting === 'off' || settings.syntaxHighlighting === 'none') && (
                <span><strong>Syntax Highlighting OFF:</strong> All text in editor displays as solid white font on dark themes, and solid black font on light themes.</span>
              )}
            </div>
          </div>

          {/* Auto-adapt Font to Theme */}
          <div className="flex items-center justify-between py-1">
            <div>
              <span className="text-[var(--text-primary)] block font-medium">Auto-Adapt Font to Theme</span>
              <span className="text-[10px] text-[var(--text-muted)]">Switch to each theme's default curated font</span>
            </div>
            <button
              type="button"
              onClick={() => {
                const nextVal = !(settings.autoAdaptFontToTheme ?? true);
                const updates: Partial<typeof settings> = { autoAdaptFontToTheme: nextVal };
                if (nextVal) {
                  updates.fontFamily = THEME_DEFAULT_FONTS[settings.theme] || settings.fontFamily;
                  updates.isFontCustomizedByUser = false;
                }
                updateSettings(updates);
              }}
              className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                (settings.autoAdaptFontToTheme ?? true) ? 'bg-[var(--accent-primary)]' : 'bg-[var(--border-primary)]'
              }`}
            >
              <div
                className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.75 transition-transform ${
                  (settings.autoAdaptFontToTheme ?? true) ? 'right-0.75' : 'left-0.75'
                }`}
              />
            </button>
          </div>

          {/* Editor Font Family Selector */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[var(--text-primary)] block font-medium">Editor Font Family</span>
                <span className="text-[10px] text-[var(--text-muted)]">Scientifically curated typefaces</span>
              </div>
            </div>
            <select
              value={settings.fontFamily}
              onChange={(e) => {
                const newFont = e.target.value;
                const isDefault = newFont === THEME_DEFAULT_FONTS[settings.theme];
                updateSettings({ 
                  fontFamily: newFont,
                  isFontCustomizedByUser: !isDefault,
                  autoAdaptFontToTheme: isDefault
                });
              }}
              className="theme-input w-full font-medium rounded px-2 py-1.5 text-xs text-[var(--text-primary)]"
            >
              {CURATED_FONTS.map(f => (
                <option key={f.id} value={f.fontFamily}>
                  {f.name} ({f.badge})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[var(--text-primary)]">Editor Font Size</span>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={10}
                max={22}
                value={settings.fontSize}
                onChange={(e) => updateSettings({ fontSize: Number(e.target.value) })}
                className="w-24 accent-[var(--accent-primary)]"
              />
              <span className="font-mono text-[var(--text-primary)] w-6 text-right font-medium">{settings.fontSize}px</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[var(--text-primary)]">Word Wrap</span>
            <input
              type="checkbox"
              checked={settings.wordWrap}
              onChange={(e) => updateSettings({ wordWrap: e.target.checked })}
              className="accent-[var(--accent-primary)] rounded w-4 h-4 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-[var(--text-primary)] block">Typing Direction</span>
              <span className="text-[10px] text-[var(--text-muted)]">Top-to-Bottom or Bottom-to-Up</span>
            </div>
            <select
              value={settings.typingDirection || 'top-to-bottom'}
              onChange={(e) => updateSettings({ typingDirection: e.target.value as 'top-to-bottom' | 'bottom-to-up' })}
              className="theme-input rounded px-2 py-0.5 text-xs text-[var(--text-primary)]"
            >
              <option value="top-to-bottom">Top to Bottom (Standard)</option>
              <option value="bottom-to-up">Bottom to Up (Conversation)</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[var(--text-primary)]">Editor Max Width</span>
            <select
              value={settings.editorMaxWidth}
              onChange={(e) => updateSettings({ editorMaxWidth: e.target.value as 'narrow' | 'standard' | 'wide' | 'full' })}
              className="theme-input rounded px-2 py-0.5 text-xs text-[var(--text-primary)]"
            >
              <option value="narrow">Narrow (680px)</option>
              <option value="standard">Standard (880px)</option>
              <option value="wide">Wide (1160px)</option>
              <option value="full">Full 100% Width</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[var(--text-primary)]">Editor Padding</span>
            <select
              value={settings.editorPadding}
              onChange={(e) => updateSettings({ editorPadding: e.target.value as 'compact' | 'normal' | 'spacious' })}
              className="theme-input rounded px-2 py-0.5 text-xs text-[var(--text-primary)]"
            >
              <option value="compact">Compact (12px)</option>
              <option value="normal">Normal (24px)</option>
              <option value="spacious">Spacious (36px)</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[var(--text-primary)]">Line Numbers</span>
            <input
              type="checkbox"
              checked={settings.showLineNumbers}
              onChange={(e) => updateSettings({ showLineNumbers: e.target.checked })}
              className="accent-[var(--accent-primary)] rounded w-4 h-4 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[var(--text-primary)]">Bracket Matching</span>
            <input
              type="checkbox"
              checked={settings.enableBracketMatching}
              onChange={(e) => updateSettings({ enableBracketMatching: e.target.checked })}
              className="accent-[var(--accent-primary)] rounded w-4 h-4 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[var(--text-primary)]">Auto Indent</span>
            <input
              type="checkbox"
              checked={settings.enableAutoIndent}
              onChange={(e) => updateSettings({ enableAutoIndent: e.target.checked })}
              className="accent-[var(--accent-primary)] rounded w-4 h-4 cursor-pointer"
            />
          </div>

          {/* Large Document Detection */}
          <div className="space-y-2 border-t border-[var(--border-subtle)] pt-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[var(--text-primary)] block font-medium">Large Document Detection</span>
                <span className="text-[10px] text-[var(--text-muted)]">Prompt section loading on opening large files</span>
              </div>
              <input
                type="checkbox"
                id="toggle-large-doc-detection"
                checked={settings.enableLargeDocDetection ?? true}
                onChange={(e) => updateSettings({ enableLargeDocDetection: e.target.checked })}
                className="accent-[var(--accent-primary)] rounded w-4 h-4 cursor-pointer"
              />
            </div>

            {settings.enableLargeDocDetection && (
              <div className="grid grid-cols-2 gap-2 pl-2 border-l-2 border-[var(--accent-primary)]/40 pt-1">
                <div>
                  <label htmlFor="input-large-doc-kb" className="text-[10px] text-[var(--text-secondary)] block">
                    Size Limit (KB)
                  </label>
                  <input
                    id="input-large-doc-kb"
                    type="number"
                    min={50}
                    max={100000}
                    step={50}
                    value={settings.largeDocThresholdKb ?? 500}
                    onChange={(e) => updateSettings({ largeDocThresholdKb: Math.max(10, Number(e.target.value) || 500) })}
                    className="w-full h-6 px-1.5 theme-input rounded text-xs font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="input-large-doc-lines" className="text-[10px] text-[var(--text-secondary)] block">
                    Line Limit
                  </label>
                  <input
                    id="input-large-doc-lines"
                    type="number"
                    min={500}
                    max={1000000}
                    step={500}
                    value={settings.largeDocThresholdLines ?? 10000}
                    onChange={(e) => updateSettings({ largeDocThresholdLines: Math.max(100, Number(e.target.value) || 10000) })}
                    className="w-full h-6 px-1.5 theme-input rounded text-xs font-mono"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Token & AI Budget */}
      <div className="p-3 theme-card rounded-lg space-y-2.5 shadow-xs">
        <div className="font-bold text-[var(--text-primary)] text-[11px] uppercase tracking-wider">
          Token Budget & Warning
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[var(--text-primary)]">Budget Warning Limit</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                step={5000}
                min={0}
                max={10000000}
                value={settings.budgetThreshold}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  updateSettings({ budgetThreshold: Number.isFinite(val) ? Math.max(0, val) : 0 });
                }}
                className="w-24 h-6 px-2 theme-input rounded font-mono text-[var(--status-warning)] text-xs text-right font-medium"
              />
              <span className="text-[10px] text-[var(--text-muted)]">tok</span>
            </div>
          </div>
        </div>
      </div>

      {/* Experimental Settings & Background Process Gating (Mandatory Invariant 4) */}
      <div className="p-3 theme-card rounded-lg space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="font-bold text-[var(--text-primary)] text-[11px] uppercase tracking-wider flex items-center gap-1.5">
            <FlaskConical className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
            <span>Experimental Settings</span>
          </div>
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <span className="text-[10px] text-[var(--text-secondary)] font-medium">
              {settings.enableExperimentalSettings ? 'Enabled' : 'Disabled'}
            </span>
            <input
              type="checkbox"
              id="toggle-experimental-settings"
              checked={settings.enableExperimentalSettings ?? false}
              onChange={async (e) => {
                const isChecked = e.target.checked;
                updateSettings({ enableExperimentalSettings: isChecked });
                if (!isChecked && bridge.gateway?.isAvailable?.()) {
                  try {
                    await bridge.gateway.stop();
                    const status = await bridge.gateway.getStatus();
                    setGatewayStatus(status);
                  } catch (err) {
                    recordDiagnostic('warn', 'SettingsPanel', 'Failed to stop REST gateway on disable', { error: String(err) });
                    useNotificationStore.getState().addNotification('Gateway Notice', 'REST gateway process could not be stopped cleanly.', 'warning');
                  }
                }
              }}
              className="accent-[var(--accent-primary)] rounded w-4 h-4 cursor-pointer"
            />
          </label>
        </div>

        <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
          Unlock granular controls for background workers, asynchronous DOM sync, and performance optimization toggles.
        </p>

        {/* Toggles remain HIDDEN by default unless explicitly enabled by the user under Experimental Settings master toggle */}
        {!settings.enableExperimentalSettings ? (
          <div className="p-2 rounded bg-[var(--card-secondary-bg)] border border-dashed border-[var(--border-subtle)] text-[10px] text-[var(--text-muted)] flex items-center justify-between">
            <span>Background process toggles are hidden. Standard background workers are active.</span>
          </div>
        ) : (
          <div className="space-y-3 pt-1 border-t border-[var(--border-subtle)] animate-in fade-in duration-200">
            <div className="text-[10px] uppercase font-semibold text-[var(--accent-primary)] tracking-wider flex items-center gap-1">
              <Cpu className="w-3 h-3" />
              <span>Background Processes</span>
            </div>

            {/* 1. Live Token Estimator */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-xs text-[var(--text-primary)] block font-medium">Live Token Estimator</span>
                <span className="text-[10px] text-[var(--text-muted)] leading-tight block mt-0.5">
                  Calculate token counts and model costs on every keystroke. Zero background computation or polling when toggled off.
                </span>
              </div>
              <input
                type="checkbox"
                id="toggle-live-token-estimator"
                checked={settings.enableLiveTokenEstimator ?? true}
                onChange={(e) => updateSettings({ enableLiveTokenEstimator: e.target.checked })}
                className="accent-[var(--accent-primary)] rounded w-4 h-4 cursor-pointer shrink-0 mt-0.5"
              />
            </div>

            {/* 2. Document Autosave */}
            <div className="space-y-2 border-t border-[var(--border-subtle)] pt-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-xs text-[var(--text-primary)] block font-medium">Document Autosave</span>
                  <span className="text-[10px] text-[var(--text-muted)] leading-tight block mt-0.5">
                    Automatically persist open tabs and buffer edits to storage in the background.
                  </span>
                </div>
                <input
                  type="checkbox"
                  id="toggle-enable-autosave"
                  checked={settings.enableAutosave ?? true}
                  onChange={(e) => updateSettings({ enableAutosave: e.target.checked })}
                  className="accent-[var(--accent-primary)] rounded w-4 h-4 cursor-pointer shrink-0 mt-0.5"
                />
              </div>

              {settings.enableAutosave && (
                <div className="flex items-center justify-between pl-2 border-l-2 border-[var(--accent-primary)]/40 pt-1">
                  <span className="text-[10px] text-[var(--text-secondary)] flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[var(--accent-primary)]" />
                    <span>Autosave Interval ({settings.autosaveIntervalMs ?? 1000}ms)</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="range"
                      min={250}
                      max={5000}
                      step={250}
                      value={settings.autosaveIntervalMs ?? 1000}
                      onChange={(e) => updateSettings({ autosaveIntervalMs: Number(e.target.value) })}
                      className="w-20 accent-[var(--accent-primary)]"
                    />
                    <span className="text-[9px] font-mono text-[var(--text-muted)] w-10 text-right">
                      {((settings.autosaveIntervalMs ?? 1000) / 1000).toFixed(1)}s
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Live Markdown DOM-Sync */}
            <div className="flex items-start justify-between gap-2 border-t border-[var(--border-subtle)] pt-2">
              <div>
                <span className="text-xs text-[var(--text-primary)] block font-medium">Live Markdown DOM-Sync</span>
                <span className="text-[10px] text-[var(--text-muted)] leading-tight block mt-0.5">
                  Continuously synchronize editor changes with Markdown AST, LaTeX, Mermaid diagrams, and DOM preview in real-time.
                </span>
              </div>
              <input
                type="checkbox"
                id="toggle-live-dom-sync"
                checked={settings.enableLiveDomSync ?? settings.enableLiveMarkdownSync ?? true}
                onChange={(e) => updateSettings({ 
                  enableLiveDomSync: e.target.checked,
                  enableLiveMarkdownSync: e.target.checked
                })}
                className="accent-[var(--accent-primary)] rounded w-4 h-4 cursor-pointer shrink-0 mt-0.5"
              />
            </div>

            {/* 4. Terminal Shells & Multi-Agent Bus */}
            <div className="flex items-start justify-between gap-2 border-t border-[var(--border-subtle)] pt-2">
              <div>
                <span className="text-xs text-[var(--text-primary)] block font-medium">Terminal Shells & Multi-Agent Bus</span>
                <span className="text-[10px] text-[var(--text-muted)] leading-tight block mt-0.5">
                  Allow persistent PTY terminal shell sessions and background multi-agent orchestration buses in .cntxt documents.
                </span>
              </div>
              <input
                type="checkbox"
                id="toggle-terminal-bus"
                checked={settings.enableTerminalBus ?? false}
                onChange={(e) => updateSettings({ enableTerminalBus: e.target.checked })}
                className="accent-[var(--accent-primary)] rounded w-4 h-4 cursor-pointer shrink-0 mt-0.5"
              />
            </div>

            {/* 5. Localhost REST API Gateway */}
            <ErrorBoundary fallbackTitle="REST Gateway Settings Error">
              <RestGatewaySettingsCard
                enabled={settings.enableRestGateway ?? false}
                port={settings.restGatewayPort ?? 9876}
                running={gatewayStatus.running}
                boundPort={gatewayStatus.port}
                authToken={gatewayStatus.authToken}
                lanIp={gatewayStatus.lanIp}
                allowLan={effectiveAllowLan}
                isCopiedLanUrl={lanUrlCopied}
                isAvailable={Boolean(bridge.gateway?.isAvailable?.())}
                isLoading={gatewayLoading}
                isCopied={tokenCopied}
                showToken={showToken}
                error={gatewayError}
                onToggleEnabled={handleToggleRestGateway}
                onPortChange={handlePortChange}
                onToggleAllowLan={handleToggleAllowLan}
                onToggleShowToken={() => setShowToken(!showToken)}
                onCopyToken={handleCopyToken}
                onCopyLanUrl={handleCopyLanUrl}
                onRegenerateToken={handleRegenerateToken}
              />
            </ErrorBoundary>

            {/* 6. Agent Deliverables & Thread Routing */}
            <div className="p-2.5 rounded border border-[var(--border-subtle)] bg-[var(--card-secondary-bg)] space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-xs text-[var(--text-primary)]">Agent Deliverables & Thread Routing</div>
                  <div className="text-[10px] text-[var(--text-muted)]">
                    Default folder for new .cntxt deliverables when no tab is set as Active Thread.
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="deliverableLocation"
                    value="workspace"
                    checked={(settings.deliverableSaveLocation ?? 'workspace') === 'workspace'}
                    onChange={() => updateSettings({ deliverableSaveLocation: 'workspace' })}
                    className="accent-[var(--accent-primary)] cursor-pointer"
                  />
                  <span className="text-[var(--text-primary)]">Workspace Folder</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="deliverableLocation"
                    value="custom-folder"
                    checked={settings.deliverableSaveLocation === 'custom-folder'}
                    onChange={() => updateSettings({ deliverableSaveLocation: 'custom-folder' })}
                    className="accent-[var(--accent-primary)] cursor-pointer"
                  />
                  <span className="text-[var(--text-primary)]">Custom Device Folder</span>
                </label>
              </div>

              {(settings.deliverableSaveLocation ?? 'workspace') === 'workspace' ? (
                <div className="space-y-1">
                  <label className="text-[10px] text-[var(--text-muted)]">Workspace Subfolder</label>
                  <input
                    type="text"
                    value={settings.deliverableWorkspaceSubfolder ?? '.cntxt/deliverables'}
                    onChange={(e) => updateSettings({ deliverableWorkspaceSubfolder: e.target.value })}
                    placeholder=".cntxt/deliverables"
                    className="w-full text-xs font-mono px-2 py-1 rounded bg-[var(--input-bg)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none"
                  />
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-[10px] text-[var(--text-muted)]">Custom Folder Path</label>
                  <input
                    type="text"
                    value={settings.deliverableCustomFolderPath ?? ''}
                    onChange={(e) => updateSettings({ deliverableCustomFolderPath: e.target.value })}
                    placeholder="e.g. C:/Users/Documents/CNTXT/deliverables"
                    className="w-full text-xs font-mono px-2 py-1 rounded bg-[var(--input-bg)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Storage, Backup & Reset */}
      <div className="p-3 theme-card rounded-lg space-y-2.5 shadow-xs">
        <div className="font-bold text-[var(--text-primary)] text-[11px] uppercase tracking-wider">
          Storage & Reset
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleExportBackup}
            title="Export Settings JSON"
            className="h-8 px-2.5 theme-card-secondary hover:bg-[var(--card-hover-bg)] rounded-md text-[var(--text-primary)] flex items-center justify-center gap-1.5 transition-colors text-xs font-medium cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
            <span>Export JSON</span>
          </button>
          <button
            type="button"
            onClick={handleImportBackup}
            title="Import Settings JSON"
            className="h-8 px-2.5 theme-card-secondary hover:bg-[var(--card-hover-bg)] rounded-md text-[var(--text-primary)] flex items-center justify-center gap-1.5 transition-colors text-xs font-medium cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
            <span>Import JSON</span>
          </button>
        </div>

        <div className="pt-1 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => {
              showConfirm({
                title: 'Reset Settings to Factory Defaults',
                message: 'This will restore all theme, editor, font, and view settings to their initial factory defaults. Your document files will NOT be affected. Are you sure you want to proceed?',
                confirmLabel: 'Reset Settings',
                variant: 'danger',
                onConfirm: () => {
                  resetSettings();
                  addNotification('Settings Reset', 'Default settings restored', 'info');
                }
              });
            }}
            title="Reset All Settings to Factory Defaults"
            className="w-full h-8 px-3 bg-[var(--status-error)]/10 hover:bg-[var(--status-error)]/20 text-[var(--status-error)] border border-[var(--status-error)]/30 rounded-md flex items-center justify-center gap-2 transition-colors text-xs font-medium cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All Settings to Factory Defaults</span>
          </button>

          <button
            type="button"
            onClick={() => {
              showConfirm({
                title: 'Clear Local Storage & Cache',
                message: 'This will purge all cached virtual files, recently opened history, pinned items, and stored UI states from local storage. The window will reload cleanly. Proceed?',
                confirmLabel: 'Clear Cache & Reload',
                variant: 'danger',
                onConfirm: async () => {
                  try {
                    const keys = [
                      'contextpad_tabs_meta',
                      'contextpad_active_tab_id',
                      'contextpad_view_settings',
                      'contextpad_editor_settings',
                      'contextpad_formatting_settings',
                      'contextpad_virtual_files',
                      'contextpad_pinned_files',
                      'contextpad_opened_history',
                      'contextpad_ribbon_items'
                    ];
                    for (const key of keys) {
                      await bridge.storage.removeItem(key);
                    }
                    useNotificationStore.getState().addNotification('Cache Cleared', 'Application cache has been cleared successfully.', 'info');
                    bridge.window.reload?.();
                  } catch (err: unknown) {
                    console.error('[SettingsPanel] Failed to clear application cache:', err);
                    useNotificationStore.getState().addNotification('Cache Clear Error', 'Failed to remove some cached items from local storage.', 'error');
                  }
                }
              });
            }}
            title="Clear Local Storage / Cache"
            className="w-full h-8 px-3 bg-[var(--status-warning)]/10 hover:bg-[var(--status-warning)]/20 text-[var(--status-warning)] border border-[var(--status-warning)]/30 rounded-md flex items-center justify-center gap-2 transition-colors text-xs font-medium cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Local Storage / Cache</span>
          </button>
        </div>
      </div>

      {/* Personal GitHub Library Modal */}
      <PersonalGitHubLibraryModal
        isOpen={isGitHubModalOpen}
        onClose={() => setIsGitHubModalOpen(false)}
      />
    </div>
  );
};
