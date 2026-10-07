import React, { useState, useEffect } from 'react';
import { 
  X, 
  Github, 
  Lock, 
  Unlock, 
  FolderGit2, 
  Plus, 
  RefreshCw, 
  Check, 
  ExternalLink, 
  AlertCircle, 
  Key, 
  CloudUpload,
  ArrowRight
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { personalGitHubLibraryService, GitHubRepoSummary } from '../../services/personalGitHubLibraryService';
import { getSessionProviderToken } from '../../adapters/supabaseClient';
import { useNotificationStore } from '../../store/notificationStore';
import { PersonalGitHubLibraryConfig } from '../../contracts/data_shapes';
import { STORAGE_KEYS, getSafeStorageItem, setSafeStorageItem, getSessionStorageItem, setSessionStorageItem } from '../../adapters';

interface PersonalGitHubLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PersonalGitHubLibraryModal: React.FC<PersonalGitHubLibraryModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuthStore();
  const { addNotification } = useNotificationStore();

  const [gitHubLibraryConfig, setGitHubLibraryConfig] = useState<PersonalGitHubLibraryConfig | null>(() => {
    try {
      const stored = getSafeStorageItem(STORAGE_KEYS.GITHUB_LIBRARY_CONFIG);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState<'create' | 'existing'>('create');
  const [token, setToken] = useState<string>('');
  const [hasResolvedToken, setHasResolvedToken] = useState<boolean>(false);
  const [isLoadingRepos, setIsLoadingRepos] = useState<boolean>(false);
  const [repos, setRepos] = useState<GitHubRepoSummary[]>([]);
  const [selectedRepoFullName, setSelectedRepoFullName] = useState<string>('');

  // Form fields for new repo
  const [newRepoName, setNewRepoName] = useState<string>('');
  const [isPrivate, setIsPrivate] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Initialize token and suggested name
  useEffect(() => {
    if (!isOpen) return;

    // Set initial suggested repo name
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    const username = user?.name ? user.name.toLowerCase().replace(/[^a-z0-9]/g, '') : 'my';
    setNewRepoName(`${username}-cntxt-library-${randomSuffix}`);

    // Try resolving token from Supabase session if authenticated via GitHub
    getSessionProviderToken().then(providerToken => {
      const sessionCustomToken = getSessionStorageItem('cntxt_github_custom_token');

      if (providerToken) {
        setToken(providerToken);
        setHasResolvedToken(true);
      } else if (sessionCustomToken) {
        setToken(sessionCustomToken);
        setHasResolvedToken(true);
      } else if (gitHubLibraryConfig?.customToken) {
        setToken(gitHubLibraryConfig.customToken);
        setHasResolvedToken(true);
      } else {
        setHasResolvedToken(false);
      }
    });
  }, [isOpen, user, gitHubLibraryConfig]);

  // Load repositories when switching to 'existing' tab
  useEffect(() => {
    if (isOpen && activeTab === 'existing' && token.trim()) {
      setIsLoadingRepos(true);
      personalGitHubLibraryService.listRepositories(token)
        .then(fetchedRepos => {
          setRepos(fetchedRepos);
          if (fetchedRepos.length > 0 && !selectedRepoFullName) {
            setSelectedRepoFullName(fetchedRepos[0].fullName);
          }
        })
        .catch(err => {
          console.warn('Failed to load GitHub repositories:', err);
          addNotification('Repositories Unavailable', 'Could not fetch your GitHub repository list.', 'warning');
        })
        .finally(() => setIsLoadingRepos(false));
    }
  }, [isOpen, activeTab, token]);

  if (!isOpen) return null;

  const saveConfig = (cfg: PersonalGitHubLibraryConfig | null) => {
    if (cfg?.customToken) {
      setSessionStorageItem('cntxt_github_custom_token', cfg.customToken);
    }
    // Redact customToken from unencrypted persistent storage
    const safeCfg = cfg ? { ...cfg, customToken: undefined } : null;
    setSafeStorageItem(STORAGE_KEYS.GITHUB_LIBRARY_CONFIG, safeCfg ? JSON.stringify(safeCfg) : '');
    setGitHubLibraryConfig(cfg);
  };

  const handleCreateRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      addNotification('Token Required', 'Please enter a GitHub Personal Access Token.', 'warning');
      return;
    }

    setIsSubmitting(true);
    setSyncError(null);
    try {
      const createRes = await personalGitHubLibraryService.createRepository(token.trim(), newRepoName, isPrivate);
      if (!createRes.success || !createRes.repo) {
        throw new Error(createRes.error || 'Failed to create repository on GitHub.');
      }

      const [owner, name] = createRes.repo.fullName.split('/');
      const config: PersonalGitHubLibraryConfig = {
        connected: true,
        repoOwner: owner,
        repoName: name,
        branch: 'main',
        isPrivate,
        customToken: token.trim(),
        lastSyncTimestamp: Date.now(),
      };
      saveConfig(config);
      addNotification('Repository Connected', `Successfully created and linked ${owner}/${name}`, 'success');
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create repository';
      setSyncError(msg);
      addNotification('Creation Failed', msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConnectExisting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRepoFullName) {
      addNotification('Select Repository', 'Please select a repository to connect.', 'warning');
      return;
    }

    const [owner, name] = selectedRepoFullName.split('/');
    const targetRepo = repos.find(r => r.fullName === selectedRepoFullName);
    const isRepoPrivate = targetRepo ? targetRepo.private : true;

    setIsSubmitting(true);
    setSyncError(null);
    try {
      const config: PersonalGitHubLibraryConfig = {
        connected: true,
        repoOwner: owner,
        repoName: name,
        branch: 'main',
        isPrivate: isRepoPrivate,
        customToken: token.trim(),
        lastSyncTimestamp: Date.now(),
      };
      saveConfig(config);
      addNotification('Repository Connected', `Connected to ${owner}/${name}`, 'success');
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to connect repository';
      setSyncError(msg);
      addNotification('Connection Failed', msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisconnect = () => {
    saveConfig(null);
    addNotification('Disconnected', 'Disconnected personal GitHub library.', 'info');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
      <div 
        className="w-full max-w-lg bg-[var(--card-bg)] border border-[var(--border-primary)] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)] bg-[var(--sidebar-header-bg)]/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/20">
              <Github className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">
                Personal Cloud Library
              </h2>
              <p className="text-[11px] text-[var(--text-muted)]">
                Zero database cost • 100% owned and versioned in your GitHub account
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-md hover:bg-[var(--card-hover-bg)] cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 no-scrollbar">
          {/* Active Connection Status Card */}
          {gitHubLibraryConfig?.connected ? (
            <div className="p-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-semibold text-emerald-400">Connected to GitHub</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--text-muted)]">
                  {gitHubLibraryConfig.isPrivate ? (
                    <span className="flex items-center gap-1 text-amber-400">
                      <Lock className="w-3 h-3" /> Private
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-sky-400">
                      <Unlock className="w-3 h-3" /> Public
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div>
                  <a
                    href={`https://github.com/${gitHubLibraryConfig.repoOwner}/${gitHubLibraryConfig.repoName}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-mono font-bold text-[var(--text-primary)] hover:text-[var(--accent-primary)] flex items-center gap-1.5"
                  >
                    <span>{gitHubLibraryConfig.repoOwner}/{gitHubLibraryConfig.repoName}</span>
                    <ExternalLink className="w-3 h-3 text-[var(--text-muted)]" />
                  </a>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                    Branch: <span className="font-mono text-[var(--text-primary)]">{gitHubLibraryConfig.branch}</span>
                    {gitHubLibraryConfig.lastSyncTimestamp && (
                      <> • Last synced: {new Date(gitHubLibraryConfig.lastSyncTimestamp).toLocaleTimeString()}</>
                    )}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between">
                <span className="text-[11px] text-[var(--text-muted)]">
                  All prompts and blueprints sync directly to this repo.
                </span>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="text-[11px] text-red-400 hover:text-red-300 hover:underline cursor-pointer"
                >
                  Disconnect Repository
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Token Input (Needed if not already provided via GitHub OAuth) */}
              {!hasResolvedToken && (
                <div className="p-3.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--card-secondary-bg)]/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                      <span>GitHub Personal Access Token (PAT)</span>
                    </label>
                    <a
                      href="https://github.com/settings/tokens/new?scopes=repo&description=CNTXT+Personal+Cloud+Library"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-[var(--accent-primary)] hover:underline flex items-center gap-1"
                    >
                      <span>Create Token</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <input
                    type="password"
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx (requires 'repo' scope)"
                    value={token}
                    onChange={e => setToken(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-[var(--input-bg)] border border-[var(--input-border)] rounded-md text-[var(--text-primary)] font-mono placeholder-[var(--input-placeholder)] focus:outline-none focus:border-[var(--accent-primary)]"
                  />
                  <p className="text-[10px] text-[var(--text-muted)]">
                    Used to read and commit prompts to your private GitHub repository. Never stored on external servers.
                  </p>
                </div>
              )}

              {/* Segmented Mode Selector: Create New vs Select Existing */}
              <div className="grid grid-cols-2 p-0.5 rounded-lg bg-[var(--card-secondary-bg)] border border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => setActiveTab('create')}
                  className={`py-1.5 px-3 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                    activeTab === 'create'
                      ? 'bg-[var(--card-bg)] text-[var(--accent-primary)] shadow-xs border border-[var(--border-primary)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create New Repo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('existing')}
                  className={`py-1.5 px-3 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                    activeTab === 'existing'
                      ? 'bg-[var(--card-bg)] text-[var(--accent-primary)] shadow-xs border border-[var(--border-primary)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <FolderGit2 className="w-3.5 h-3.5" />
                  <span>Select Existing Repo</span>
                </button>
              </div>

              {/* Tab 1: Create New Repo Form */}
              {activeTab === 'create' && (
                <form onSubmit={handleCreateRepo} className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-[var(--text-secondary)]">
                      Repository Name
                    </label>
                    <input
                      type="text"
                      required
                      value={newRepoName}
                      onChange={e => setNewRepoName(e.target.value)}
                      placeholder="e.g. alice-cntxt-library-9x2k"
                      className="w-full px-3 py-1.5 text-xs bg-[var(--input-bg)] border border-[var(--input-border)] rounded-md text-[var(--text-primary)] font-mono placeholder-[var(--input-placeholder)] focus:outline-none focus:border-[var(--accent-primary)]"
                    />
                    <p className="text-[10px] text-[var(--text-muted)]">
                      Suggested unique name for your GitHub account. You can rename or customize it.
                    </p>
                  </div>

                  {/* Private vs Public Toggle (Private by default) */}
                  <div className="flex items-center justify-between p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--card-secondary-bg)]/20">
                    <div className="flex items-center gap-2">
                      {isPrivate ? (
                        <Lock className="w-4 h-4 text-amber-400" />
                      ) : (
                        <Unlock className="w-4 h-4 text-sky-400" />
                      )}
                      <div>
                        <span className="text-xs font-medium text-[var(--text-primary)]">
                          {isPrivate ? 'Private Repository' : 'Public Repository'}
                        </span>
                        <p className="text-[10px] text-[var(--text-muted)]">
                          {isPrivate 
                            ? 'Recommended: Only you can view or sync your personal prompts.'
                            : 'Anyone can view your prompts via standard GitHub links.'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsPrivate(!isPrivate)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isPrivate ? 'bg-[var(--accent-primary)]' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          isPrivate ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {syncError && (
                    <div className="p-2.5 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{syncError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting || !newRepoName.trim()}
                    className="w-full py-2 px-4 rounded-md bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <CloudUpload className="w-4 h-4" />
                    )}
                    <span>Create & Connect Private Repository</span>
                  </button>
                </form>
              )}

              {/* Tab 2: Select Existing Repo Form */}
              {activeTab === 'existing' && (
                <form onSubmit={handleConnectExisting} className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-[var(--text-secondary)]">
                      Select Existing Repository
                    </label>

                    {isLoadingRepos ? (
                      <div className="py-4 text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-2">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-[var(--accent-primary)]" />
                        <span>Loading repositories from GitHub...</span>
                      </div>
                    ) : repos.length > 0 ? (
                      <select
                        value={selectedRepoFullName}
                        onChange={e => setSelectedRepoFullName(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-[var(--input-bg)] border border-[var(--input-border)] rounded-md text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--accent-primary)]"
                      >
                        {repos.map(r => (
                          <option key={r.id} value={r.fullName}>
                            {r.fullName} ({r.private ? 'Private' : 'Public'})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="space-y-1.5">
                        <input
                          type="text"
                          required
                          value={selectedRepoFullName}
                          onChange={e => setSelectedRepoFullName(e.target.value)}
                          placeholder="e.g. username/repo-name"
                          className="w-full px-3 py-1.5 text-xs bg-[var(--input-bg)] border border-[var(--input-border)] rounded-md text-[var(--text-primary)] font-mono placeholder-[var(--input-placeholder)] focus:outline-none focus:border-[var(--accent-primary)]"
                        />
                        <p className="text-[10px] text-[var(--text-muted)]">
                          Enter target repository in <code className="text-[var(--accent-primary)]">owner/repo</code> format.
                        </p>
                      </div>
                    )}
                  </div>

                  {syncError && (
                    <div className="p-2.5 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{syncError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting || !selectedRepoFullName.trim()}
                    className="w-full py-2 px-4 rounded-md bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <ArrowRight className="w-4 h-4" />
                    )}
                    <span>Connect Repository</span>
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
