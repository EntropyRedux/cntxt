/**
 * PERSONAL GITHUB LIBRARY SERVICE (src/services/personalGitHubLibraryService.ts)
 * 
 * Manages zero-database-cost personal cloud libraries stored in user's own GitHub repository.
 * Supports:
 * - Listing existing repositories
 * - One-click repository creation (Private by default, custom or random suffix)
 * - Two-way sync: Pull & Push with SHA conflict detection
 * - Offline-first caching
 */

import { UserLibraryItem, LibraryCollection, PersonalGitHubLibraryConfig } from '../../contracts/data_shapes';
import { useNotificationStore } from '../store/notificationStore';

const GITHUB_API_BASE = 'https://api.github.com';

function utf8ToBase64(str: string): string {
  try {
    return btoa(unescape(encodeURIComponent(str)));
  } catch {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(str, 'utf8').toString('base64');
    }
    return '';
  }
}

function base64ToUtf8(b64: string): string {
  try {
    return decodeURIComponent(escape(atob(b64.replace(/\n/g, ''))));
  } catch {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(b64.replace(/\n/g, ''), 'base64').toString('utf8');
    }
    return '';
  }
}

export interface GitHubRepoSummary {
  id: number;
  name: string;
  fullName: string;
  private: boolean;
  defaultBranch: string;
  description: string | null;
  htmlUrl: string;
}

export interface LibraryManifestPayload {
  version: string;
  updatedAt: number;
  items: UserLibraryItem[];
  collections: LibraryCollection[];
}

class PersonalGitHubLibraryService {
  /**
   * Validate token and return authenticated user details
   */
  async validateToken(token: string): Promise<{ valid: boolean; username: string; avatarUrl?: string; error?: string }> {
    if (!token.trim()) {
      return { valid: false, username: '', error: 'Token is empty.' };
    }

    try {
      const res = await fetch(`${GITHUB_API_BASE}/user`, {
        headers: {
          Authorization: `Bearer ${token.trim()}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (!res.ok) {
        if (res.status === 401) {
          return { valid: false, username: '', error: 'Invalid or expired GitHub token.' };
        }
        return { valid: false, username: '', error: `GitHub API error: ${res.statusText}` };
      }

      const data = await res.json();
      return {
        valid: true,
        username: data.login,
        avatarUrl: data.avatar_url,
      };
    } catch (err) {
      return {
        valid: false,
        username: '',
        error: err instanceof Error ? err.message : 'Network error validating GitHub token.',
      };
    }
  }

  /**
   * List user's available repositories for library linking
   */
  async listRepositories(token: string): Promise<GitHubRepoSummary[]> {
    if (!token.trim()) return [];

    try {
      const res = await fetch(`${GITHUB_API_BASE}/user/repos?per_page=100&sort=updated&type=all`, {
        headers: {
          Authorization: `Bearer ${token.trim()}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (!res.ok) {
        console.warn('[PersonalGitHubLibrary] Failed to list repos:', res.statusText);
        return [];
      }

      const data = await res.json();
      interface RawGitHubRepo {
        id: number;
        name: string;
        full_name: string;
        private?: boolean;
        default_branch?: string;
        description?: string | null;
        html_url: string;
      }

      return (data as RawGitHubRepo[]).map((r) => ({
        id: r.id,
        name: r.name,
        fullName: r.full_name,
        private: Boolean(r.private),
        defaultBranch: r.default_branch || 'main',
        description: r.description || null,
        htmlUrl: r.html_url,
      }));
    } catch (err) {
      console.warn('[PersonalGitHubLibrary] listRepositories error:', err);
      return [];
    }
  }

  /**
   * Create a new GitHub repository for the user's online library
   */
  async createRepository(
    token: string,
    repoName: string,
    isPrivate: boolean = true,
    description: string = 'Personal CNTXT Cloud Library (Prompts, Actions, Templates, and Blueprints)'
  ): Promise<{ success: boolean; repo?: GitHubRepoSummary; error?: string }> {
    if (!token.trim()) {
      return { success: false, error: 'Authentication token missing.' };
    }

    const cleanName = repoName.trim().replace(/[^a-zA-Z0-9._-]/g, '-');
    if (!cleanName) {
      return { success: false, error: 'Invalid repository name.' };
    }

    try {
      const res = await fetch(`${GITHUB_API_BASE}/user/repos`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token.trim()}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: cleanName,
          private: isPrivate,
          description,
          auto_init: true, // Creates initial README & main branch
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const message = errorData.message || res.statusText;
        if (res.status === 422) {
          return { success: false, error: `Repository "${cleanName}" already exists on your account.` };
        }
        return { success: false, error: `Failed to create repository: ${message}` };
      }

      const r = await res.json();
      return {
        success: true,
        repo: {
          id: r.id,
          name: r.name,
          fullName: r.full_name,
          private: Boolean(r.private),
          defaultBranch: r.default_branch || 'main',
          description: r.description || null,
          htmlUrl: r.html_url,
        },
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Network error creating repository.',
      };
    }
  }

  /**
   * Fetch current SHA of a file in the repository
   */
  async getFileSha(
    token: string,
    owner: string,
    repo: string,
    path: string,
    branch: string = 'main'
  ): Promise<string | null> {
    try {
      const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}?ref=${branch}`, {
        headers: {
          Authorization: `Bearer ${token.trim()}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (res.status === 404) return null;
      if (!res.ok) return null;

      const data = await res.json();
      return data.sha || null;
    } catch {
      return null;
    }
  }

  /**
   * Fetch library items and collections from the user's remote repository
   */
  async fetchRemoteLibrary(
    owner: string,
    repo: string,
    branch: string = 'main',
    token?: string
  ): Promise<{
    success: boolean;
    items: UserLibraryItem[];
    collections: LibraryCollection[];
    sha?: string;
    error?: string;
  }> {
    const manifestPath = 'cntxt-manifest.json';

    try {
      let content = '';
      let sha: string | undefined;

      // 1. If token is present, use authenticated GitHub Contents API (works for private repos)
      if (token && token.trim()) {
        const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${manifestPath}?ref=${branch}`, {
          headers: {
            Authorization: `Bearer ${token.trim()}`,
            Accept: 'application/vnd.github.v3+json',
          },
        });

        if (res.status === 404) {
          // Repo is empty or manifest not yet committed
          return { success: true, items: [], collections: [] };
        }

        if (!res.ok) {
          return { success: false, items: [], collections: [], error: `GitHub error: ${res.statusText}` };
        }

        const data = await res.json();
        sha = data.sha;
        content = base64ToUtf8(data.content || '');
      } else {
        // 2. Unauthenticated fallback for public repos (fast CDN)
        const cdnUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${manifestPath}`;
        const res = await fetch(cdnUrl);

        if (res.status === 404) {
          return { success: true, items: [], collections: [] };
        }

        if (!res.ok) {
          return { success: false, items: [], collections: [], error: `Failed to fetch library manifest: ${res.statusText}` };
        }

        content = await res.text();
      }

      if (!content.trim()) {
        return { success: true, items: [], collections: [], sha };
      }

      const parsed: LibraryManifestPayload = JSON.parse(content);
      return {
        success: true,
        items: Array.isArray(parsed.items) ? parsed.items : [],
        collections: Array.isArray(parsed.collections) ? parsed.collections : [],
        sha,
      };
    } catch (err) {
      return {
        success: false,
        items: [],
        collections: [],
        error: err instanceof Error ? err.message : 'Error reading remote library manifest.',
      };
    }
  }

  /**
   * Commit and push local library items to user's personal GitHub repository
   */
  async syncToRemoteLibrary(
    token: string,
    owner: string,
    repo: string,
    items: UserLibraryItem[],
    collections: LibraryCollection[],
    branch: string = 'main',
    existingSha?: string
  ): Promise<{ success: boolean; newSha?: string; error?: string }> {
    if (!token.trim()) {
      return { success: false, error: 'Authentication token missing.' };
    }

    const manifestPath = 'cntxt-manifest.json';

    try {
      // 1. Resolve current remote SHA if not provided
      let currentSha = existingSha;
      if (!currentSha) {
        currentSha = (await this.getFileSha(token, owner, repo, manifestPath, branch)) || undefined;
      }

      // 2. Prepare payload
      const manifest: LibraryManifestPayload = {
        version: '1.0',
        updatedAt: Date.now(),
        items,
        collections,
      };

      const jsonStr = JSON.stringify(manifest, null, 2);
      const encoded = utf8ToBase64(jsonStr);

      const body: Record<string, unknown> = {
        message: `sync(cntxt): update personal library (${items.length} items, ${collections.length} collections)`,
        content: encoded,
        branch,
      };

      if (currentSha) {
        body.sha = currentSha;
      }

      // 3. Commit to GitHub API
      const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${manifestPath}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token.trim()}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        if (res.status === 409) {
          return {
            success: false,
            error: 'Conflict: Remote repository has newer changes. Please pull before syncing.',
          };
        }
        return {
          success: false,
          error: errJson.message || `Failed to sync library to GitHub: ${res.statusText}`,
        };
      }

      const resData = await res.json();
      const newSha = resData.content?.sha;

      return { success: true, newSha };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Network error pushing to GitHub.',
      };
    }
  }

  /**
   * Generate an initial repository name suggestion based on username
   */
  generateSuggestedRepoName(username?: string): string {
    const base = username ? `${username}-cntxt-library` : 'my-cntxt-library';
    return base.toLowerCase().replace(/[^a-z0-9._-]/g, '-');
  }
}

export const personalGitHubLibraryService = new PersonalGitHubLibraryService();
