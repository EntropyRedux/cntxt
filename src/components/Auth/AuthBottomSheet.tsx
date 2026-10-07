import React, { useEffect } from 'react';
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
import { isSupabaseConfigured } from '../../adapters';

interface AuthBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenGitHubModal?: () => void;
}

export const AuthBottomSheet: React.FC<AuthBottomSheetProps> = ({ 
  isOpen, 
  onClose,
  onOpenGitHubModal 
}) => {
  const { user, loginWithGoogle, loginWithGitHub, signOut, syncStatus, lastSyncTime, triggerSync } = useAuthStore();
  const { setActiveSidebarTab } = useSettingsStore();
  const isRealAuthAvailable = isSupabaseConfigured();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 md:hidden animate-in fade-in duration-200"
      />

      {/* Bottom Sheet Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={user ? 'Account menu' : 'Sign in to CNTXT'}
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl border-t border-[var(--border-primary)] bg-[var(--modal-bg,#1e1e24)] text-[var(--text-primary)] shadow-2xl overflow-hidden pb-8 px-5 pt-3 md:hidden select-none animate-in slide-in-from-bottom duration-200"
      >
        {/* Sheet Drag Handle */}
        <div className="w-10 h-1 rounded-full bg-[var(--border-primary)] mx-auto mb-4" />

        {user ? (
          /* Signed In State (Mobile Sheet) */
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img
                    src={user.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`}
                    alt={user.name}
                    className="w-12 h-12 rounded-full object-cover ring-2 ring-[var(--accent-primary)]"
                  />
                  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-[var(--modal-bg)]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-base">{user.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent-container)] text-[var(--accent-primary)] uppercase">
                      {user.provider}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">{user.email}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Close dialog"
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--card-hover-bg)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1.5">
              {onOpenGitHubModal && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenGitHubModal();
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-[var(--card-bg)] hover:bg-[var(--card-hover-bg)] border border-[var(--border-subtle)] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <FolderGit2 className="w-5 h-5 text-purple-400" />
                    <div className="text-left">
                      <div className="font-medium text-sm">Personal GitHub Library</div>
                      <div className="text-xs text-[var(--text-muted)]">
                        {user.githubLibrary ? `${user.githubLibrary.repoOwner}/${user.githubLibrary.repoName}` : 'Zero-cost private cloud repo'}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-purple-400 font-medium">Manage</span>
                </button>
              )}

              <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--card-bg)] border border-[var(--border-subtle)]">
                <div className="flex items-center gap-3">
                  <CloudCheck className="w-5 h-5 text-emerald-500" />
                  <div>
                    <div className="font-medium text-sm">Cloud Sync</div>
                    <div className="text-xs text-[var(--text-muted)]">
                      {syncStatus === 'syncing' ? 'Syncing...' : (lastSyncTime || 'Active')}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => triggerSync()}
                  disabled={syncStatus === 'syncing'}
                  className="p-2 rounded-lg bg-[var(--card-secondary-bg)] hover:bg-[var(--card-hover-bg)] text-[var(--text-primary)] cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <button
                onClick={() => {
                  setActiveSidebarTab('settings');
                  onClose();
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-[var(--card-bg)] hover:bg-[var(--card-hover-bg)] border border-[var(--border-subtle)] transition-colors cursor-pointer"
              >
                <Settings className="w-5 h-5 text-[var(--text-muted)]" />
                <span className="font-medium text-sm">Preferences & Settings</span>
              </button>
            </div>

            <button
              onClick={() => {
                signOut();
                onClose();
              }}
              className="w-full flex items-center justify-center gap-2 p-3 rounded-xl text-red-400 bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 font-medium text-sm transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        ) : (
          /* Sign In State (Mobile Sheet) */
          <div className="space-y-4">
            <div className="flex items-start justify-between pb-2 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[var(--accent-container)] flex items-center justify-center text-[var(--accent-primary)]">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-base">Sign in to CNTXT</h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    {isRealAuthAvailable ? 'OAuth Sync Active' : 'Offline / Guest Mode'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Close dialog"
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--card-hover-bg)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  loginWithGoogle();
                  onClose();
                }}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl text-sm font-medium bg-white text-gray-800 shadow-sm active:scale-98 transition-all cursor-pointer"
              >
                <GoogleIcon className="w-5 h-5 shrink-0" />
                <span>Continue with Google</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  loginWithGitHub();
                  onClose();
                }}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl text-sm font-medium bg-[#24292F] text-white border border-[#30363d] shadow-sm active:scale-98 transition-all cursor-pointer"
              >
                <GitHubIcon className="w-5 h-5 shrink-0" />
                <span>Continue with GitHub</span>
              </button>
            </div>

            <div className="p-3 rounded-xl bg-[var(--card-secondary-bg)] border border-[var(--border-subtle)] space-y-1.5 text-xs text-[var(--text-muted)]">
              <div className="font-medium text-[var(--text-secondary)] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[var(--accent-primary)]" />
                <span>Free Cloud Storage Benefits</span>
              </div>
              <div className="space-y-1 pl-1 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Personal GitHub repo as your private prompt cloud</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Zero database fees, unlimited prompt revisions</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 text-center text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              Continue Offline
            </button>
          </div>
        )}
      </div>
    </>
  );
};
