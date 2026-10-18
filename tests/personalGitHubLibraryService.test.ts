import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { personalGitHubLibraryService } from '../src/services/personalGitHubLibraryService';
import type { UserLibraryItem, LibraryCollection } from '../contracts/data_shapes';

describe('personalGitHubLibraryService (GAP-01)', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('generateSuggestedRepoName', () => {
    it('returns default repo name when username is omitted', () => {
      expect(personalGitHubLibraryService.generateSuggestedRepoName()).toBe('my-cntxt-library');
      expect(personalGitHubLibraryService.generateSuggestedRepoName('')).toBe('my-cntxt-library');
    });

    it('sanitizes username and appends -cntxt-library', () => {
      expect(personalGitHubLibraryService.generateSuggestedRepoName('JohnDoe')).toBe('johndoe-cntxt-library');
      expect(personalGitHubLibraryService.generateSuggestedRepoName('Alice_Dev@Org')).toBe('alice_dev-org-cntxt-library');
    });
  });

  describe('listRepositories', () => {
    it('returns empty array when token is empty or whitespace', async () => {
      const res = await personalGitHubLibraryService.listRepositories('   ');
      expect(res).toEqual([]);
    });

    it('fetches and maps repositories successfully', async () => {
      const mockRepos = [
        {
          id: 101,
          name: 'my-prompts',
          full_name: 'alice/my-prompts',
          private: true,
          default_branch: 'main',
          description: 'Prompts collection',
          html_url: 'https://github.com/alice/my-prompts',
        },
      ];

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockRepos,
      } as any);

      const result = await personalGitHubLibraryService.listRepositories('ghp_testtoken');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 101,
        name: 'my-prompts',
        fullName: 'alice/my-prompts',
        private: true,
        defaultBranch: 'main',
        description: 'Prompts collection',
        htmlUrl: 'https://github.com/alice/my-prompts',
      });
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://api.github.com/user/repos?per_page=100&sort=updated&type=all',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer ghp_testtoken',
          }),
        })
      );
    });

    it('handles network or fetch errors gracefully and returns empty array', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network offline'));
      const result = await personalGitHubLibraryService.listRepositories('ghp_testtoken');
      expect(result).toEqual([]);
    });
  });

  describe('createRepository', () => {
    it('returns error when token is empty', async () => {
      const result = await personalGitHubLibraryService.createRepository('', 'new-repo');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Authentication token missing');
    });

    it('returns error when repoName is invalid or whitespace only', async () => {
      const result = await personalGitHubLibraryService.createRepository('ghp_token', '     ');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid repository name');
    });

    it('handles 422 Conflict when repository already exists', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        json: async () => ({ message: 'Repository already exists' }),
      } as any);

      const result = await personalGitHubLibraryService.createRepository('ghp_token', 'existing-repo');
      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists on your account');
    });

    it('handles successful repository creation', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 202,
          name: 'new-library',
          full_name: 'user/new-library',
          private: true,
          default_branch: 'main',
          description: 'Personal Library',
          html_url: 'https://github.com/user/new-library',
        }),
      } as any);

      const result = await personalGitHubLibraryService.createRepository('ghp_token', 'new-library');
      expect(result.success).toBe(true);
      expect(result.repo?.fullName).toBe('user/new-library');
    });
  });

  describe('getFileSha', () => {
    it('returns null on 404 response', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      } as any);

      const sha = await personalGitHubLibraryService.getFileSha('ghp_token', 'owner', 'repo', 'file.json');
      expect(sha).toBeNull();
    });

    it('returns sha string when file exists', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ sha: 'abc123sha' }),
      } as any);

      const sha = await personalGitHubLibraryService.getFileSha('ghp_token', 'owner', 'repo', 'file.json');
      expect(sha).toBe('abc123sha');
    });
  });

  describe('fetchRemoteLibrary', () => {
    it('returns empty collections when remote manifest is 404 (empty repo)', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      } as any);

      const result = await personalGitHubLibraryService.fetchRemoteLibrary('owner', 'repo', 'main', 'ghp_token');
      expect(result.success).toBe(true);
      expect(result.items).toEqual([]);
      expect(result.collections).toEqual([]);
    });

    it('fetches and decodes authenticated base64 manifest content', async () => {
      const manifestData = {
        version: '1.0',
        items: [
          {
            id: 'item-1',
            name: 'Prompt 1',
            type: 'prompt',
            category: 'Testing',
            description: 'Test prompt',
            author: 'Alice',
            source: 'personal',
            targetAIs: ['gemini'],
            fields: [],
            template: 'You are a tester.',
            createdAt: 1000,
            updatedAt: 1000,
          },
        ],
        collections: [],
      };

      const base64Content = Buffer.from(JSON.stringify(manifestData)).toString('base64');

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ sha: 'manifest_sha_1', content: base64Content }),
      } as any);

      const result = await personalGitHubLibraryService.fetchRemoteLibrary('owner', 'repo', 'main', 'ghp_token');
      expect(result.success).toBe(true);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe('Prompt 1');
      expect(result.sha).toBe('manifest_sha_1');
    });

    it('handles unauthenticated public CDN fetch when no token is provided', async () => {
      const manifestData = { version: '1.0', items: [], collections: [] };
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(manifestData),
      } as any);

      const result = await personalGitHubLibraryService.fetchRemoteLibrary('owner', 'repo', 'main');
      expect(result.success).toBe(true);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://raw.githubusercontent.com/owner/repo/main/cntxt-manifest.json'
      );
    });

    it('returns error when JSON parsing fails', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => 'INVALID NOT JSON',
      } as any);

      const result = await personalGitHubLibraryService.fetchRemoteLibrary('owner', 'repo', 'main');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('syncToRemoteLibrary', () => {
    it('returns error when token is missing', async () => {
      const result = await personalGitHubLibraryService.syncToRemoteLibrary('', 'owner', 'repo', [], []);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Authentication token missing');
    });

    it('handles 409 Conflict when remote repository has newer commits', async () => {
      vi.spyOn(personalGitHubLibraryService, 'getFileSha').mockResolvedValue('old_sha');

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({ message: 'is at old_sha but expected new_sha' }),
      } as any);

      const result = await personalGitHubLibraryService.syncToRemoteLibrary('ghp_token', 'owner', 'repo', [], []);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Conflict: Remote repository has newer changes');
    });

    it('successfully pushes manifest and returns new SHA', async () => {
      vi.spyOn(personalGitHubLibraryService, 'getFileSha').mockResolvedValue('current_sha');

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ content: { sha: 'updated_commit_sha' } }),
      } as any);

      const items: UserLibraryItem[] = [
        {
          id: 'item-1',
          name: 'Prompt',
          type: 'prompt',
          category: 'Testing',
          description: 'Desc',
          author: 'Alice',
          source: 'personal',
          targetAIs: ['gemini'],
          fields: [],
          template: 'Template',
          createdAt: 100,
          updatedAt: 100,
        },
      ];

      const collections: LibraryCollection[] = [];

      const result = await personalGitHubLibraryService.syncToRemoteLibrary(
        'ghp_token',
        'owner',
        'repo',
        items,
        collections
      );

      expect(result.success).toBe(true);
      expect(result.newSha).toBe('updated_commit_sha');
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/repo/contents/cntxt-manifest.json',
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            Authorization: 'Bearer ghp_token',
          }),
        })
      );
    });
  });
});
