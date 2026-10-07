import React, { useEffect, useRef } from 'react';
import { 
  CloudCheck, 
  RefreshCw, 
  LogOut, 
  Sparkles, 
  X,
  ShieldCheck,
  Check,
  FolderGit2,
  Settings
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useSettingsStore } from '../../store/settingsStore';
import { GoogleIcon, GitHubIcon } from './BrandIcons';
import { addDocumentListener, isSupabaseConfigured } from '../../adapters';

interface AuthPopoverProps {
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  isOpen: boolean;
  onOpenGitHubModal?: () => void;
}

export const AuthPopover: React.FC<AuthPopoverProps> = ({ 
  anchorRef, 
  onClose, 
  isOpen,
  onOpenGitHubModal 
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const { 
    user, 
    loginWithGoogle, 
    loginWithGitHub, 
    signOut, 
    syncStatus, 
    lastSyncTime, 
    triggerSync,
    authError
  } = useAuthStore();
  const { setActiveSidebarTab } = useSettingsStore();
  const isRealAuthAvailable = isSupabaseConfigured();

  // Close on outside click or Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        popoverRef.current && 
        !popoverRef.current.contains(target) &&
        anchorRef.current && 
        !anchorRef.current.contains(target)
      ) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const unsubClick = addDocumentListener('mousedown', handleClickOutside);
    const unsubKey = addDocumentListener('keydown', handleKeyDown);

    return () => {
      unsubClick();
      unsubKey();
    };
  }, [isOpen, onClose, anchorRef]);

  if (!isOpen) return null;

  // Calculate vertical position anchored to the button
  const getPositionStyle = (): React.CSSProperties => {
    if (!anchorRef.current) {
      return { bottom: '16px', left: '56px' };
    }
    const rect = anchorRef.current.getBoundingClientRect();
    return {
      position: 'fixed',
      left: `${rect.right + 10}px`,
      bottom: `${Math.max(12, window.innerHeight - rect.bottom)}px`,
      zIndex: 100,
    };
  };

  return (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label={user ? 'Account menu' : 'Sign in to CNTXT'}
      style={getPositionStyle()}
      className="w-[310px] max-w-[calc(100vw-64px)] rounded-xl border border-[var(--border-primary)] bg-[var(--modal-bg,#1e1e24)] text-[var(--text-primary)] shadow-2xl overflow-hidden backdrop-blur-md select-none transition-all animate-in fade-in zoom-in-95 duration-150"
    >
      {user ? (
        /* ============================================================
           STATE 1: SIGNED IN POPOVER
           ============================================================ */
        <div className="flex flex-col text-sm">
          {/* Header / User Card */}
          <div className="p-3.5 bg-[var(--sidebar-header-bg)] border-b border-[var(--border-subtle)] flex items-start gap-3 relative">
            <div className="relative shrink-0">
              <img
                src={user.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`}
                alt={user.name}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-[var(--border-primary)]"
              />
              <span 
                className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[var(--modal-bg)]" 
                title="Active / Synced"
              />
            </div>

            <div className="flex-1 min-w-0 pr-6">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold truncate text-[var(--text-primary)] leading-tight">
                  {user.name}
                </span>
                <span className="inline-flex items-center px-1.5 py-0.2 text-[10px] font-medium rounded bg-[var(--accent-container)] text-[var(--accent-primary)] shrink-0 capitalize">
                  {user.provider}
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">
                {user.email}
              </p>
            </div>

            <button
              onClick={onClose}
              aria-label="Close popover"
              className="absolute top-3 right-3 text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-md hover:bg-[var(--card-hover-bg)] transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Menu Items */}
          <div className="p-1.5 space-y-0.5">
            {/* Personal GitHub Library Action */}
            {onOpenGitHubModal && (
              <button
                onClick={() => {
                  onClose();
                  onOpenGitHubModal();
                }}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-xs font-medium hover:bg-[var(--card-hover-bg)] text-[var(--text-primary)] transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <FolderGit2 className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>Personal GitHub Library</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300 font-mono font-medium">
                  {user.githubLibrary ? `${user.githubLibrary.repoName}` : 'Connect'}
                </span>
              </button>
            )}

            {/* Cloud Sync Status */}
            <div className="flex items-center justify-between px-2.5 py-2 rounded-lg text-xs hover:bg-[var(--card-hover-bg)] transition-colors">
              <div className="flex items-center gap-2.5 min-w-0">
                {syncStatus === 'syncing' ? (
                  <RefreshCw className="w-4 h-4 text-[var(--accent-primary)] animate-spin shrink-0" />
                ) : (
                  <CloudCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                )}
                <div className="truncate">
                  <div className="font-medium text-[var(--text-primary)] flex items-center gap-1.5">
                    <span>Cloud Sync</span>
                    <span className="text-[10px] font-normal text-emerald-500">Active</span>
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] truncate">
                    {syncStatus === 'syncing' ? 'Syncing workspaces...' : (lastSyncTime ? `Last synced: ${lastSyncTime}` : 'Up to date')}
                  </div>
                </div>
              </div>

              <button
                onClick={() => triggerSync()}
                disabled={syncStatus === 'syncing'}
                title="Force sync now"
                className="p-1.5 rounded-md hover:bg-[var(--card-secondary-bg)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Preferences */}
            <button
              onClick={() => {
                setActiveSidebarTab('settings');
                onClose();
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-xs font-medium hover:bg-[var(--card-hover-bg)] text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              <Settings className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
              <span>Preferences & Cloud Settings</span>
            </button>
          </div>

          {/* Divider */}
          <div className="h-px bg-[var(--border-subtle)] my-0.5" />

          {/* Sign Out Action */}
          <div className="p-1.5">
            <button
              onClick={() => {
                signOut();
                onClose();
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-xs text-[var(--text-muted)] hover:text-[var(--status-error,#ef4444)] hover:bg-[var(--card-hover-bg)] transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      ) : (
        /* ============================================================
           STATE 2: SIGN IN POPOVER (GUEST TRIGGERED)
           ============================================================ */
        <div className="flex flex-col p-4 text-sm">
          {/* Popover Header */}
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-[var(--accent-container)] flex items-center justify-center text-[var(--accent-primary)] shrink-0">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <h3 className="font-semibold text-sm text-[var(--text-primary)] tracking-tight">
                Sign in to CNTXT
              </h3>
            </div>
            <button
              onClick={onClose}
              aria-label="Close sign in dialog"
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-md hover:bg-[var(--card-hover-bg)] transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Subtext & Mode Indicator */}
          <div className="flex items-center justify-between gap-1 mb-2">
            <span className="text-[11px] text-[var(--text-muted)]">
              {isRealAuthAvailable ? 'Supabase OAuth enabled' : 'Local Guest Mode'}
            </span>
            <span 
              className={`w-2 h-2 rounded-full ${isRealAuthAvailable ? 'bg-emerald-500' : 'bg-amber-500'}`} 
              title={isRealAuthAvailable ? 'Supabase Connected' : 'Local Storage Mode'} 
            />
          </div>

          {authError && (
            <div className="mb-3 p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              {authError}
            </div>
          )}

          {/* OAuth Action Buttons */}
          <div className="space-y-2 mb-3">
            {/* Google OAuth Button */}
            <button
              type="button"
              onClick={() => {
                loginWithGoogle();
                onClose();
              }}
              className="w-full flex items-center justify-center gap-2.5 py-2 px-3 rounded-lg text-xs font-medium bg-white text-gray-800 hover:bg-gray-100 border border-gray-200 shadow-xs transition-all active:scale-[0.98] cursor-pointer"
            >
              <GoogleIcon className="w-4 h-4 shrink-0" />
              <span>Continue with Google</span>
            </button>

            {/* GitHub OAuth Button */}
            <button
              type="button"
              onClick={() => {
                loginWithGitHub();
                onClose();
              }}
              className="w-full flex items-center justify-center gap-2.5 py-2 px-3 rounded-lg text-xs font-medium bg-[#24292F] hover:bg-[#1B1F23] text-white border border-[#30363d] shadow-xs transition-all active:scale-[0.98] cursor-pointer"
            >
              <GitHubIcon className="w-4 h-4 shrink-0" />
              <span>Continue with GitHub</span>
            </button>
          </div>

          {/* What signing in unlocks */}
          <div className="p-2.5 rounded-lg bg-[var(--card-secondary-bg)] border border-[var(--border-subtle)] mb-3 space-y-1.5 text-[11px]">
            <div className="font-medium text-[var(--text-secondary)] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
              <span>What signing in unlocks</span>
            </div>
            <div className="text-[var(--text-muted)] space-y-1 pl-1">
              <div className="flex items-center gap-1.5">
                <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                <span>Zero-database cost personal GitHub library</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                <span>Seamless OAuth sync across desktop & mobile</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                <span>Automatic private repo backup & version control</span>
              </div>
            </div>
          </div>

          {/* Dismiss / Continue as Guest */}
          <div className="text-center pt-1 border-t border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors py-1 px-2 rounded hover:bg-[var(--card-hover-bg)] cursor-pointer"
            >
              or continue offline
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
