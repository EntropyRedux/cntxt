/**
 * COMMUNITY LIBRARY SERVICE (src/services/communityLibraryService.ts)
 * 
 * Free-Tier GitHub-Backed Community Catalog Provider.
 * Fetches prompts, skills, and collections directly from https://github.com/EntropyRedux/cntxt-library
 * via GitHub's Raw CDN and jsDelivr CDN fallback.
 * 
 * ZERO API COST:
 * - Bypasses GitHub REST API rate limits (60 req/hr unauthenticated limit)
 * - Caches catalog and templates in browser IndexedDB via idb-keyval (1-hr TTL)
 * - Enables offline-first browsing
 */

import { get, set } from 'idb-keyval';
import { CommunityLibraryItem, LibraryCollection, LibraryField } from '../../contracts/data_shapes';
import { validateGitHubCatalog, GitHubCatalogItem } from '../contracts/boundarySchemas';

const PRIMARY_CDN_URL = 'https://raw.githubusercontent.com/EntropyRedux/cntxt-library/main';
const FALLBACK_CDN_URL = 'https://cdn.jsdelivr.net/gh/EntropyRedux/cntxt-library@main';

const IDB_CATALOG_KEY = 'cntxt_community_catalog_v1';
const IDB_CATALOG_TS_KEY = 'cntxt_community_catalog_ts_v1';
const IDB_TEMPLATE_PREFIX = 'cntxt_comm_template_';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour cache TTL

export interface RemoteCatalogItem extends GitHubCatalogItem {
  category?: string;
}

/**
 * Extract structured {{variable}} tags from raw prompt text into LibraryField[]
 */
export function extractFieldsFromTemplate(content: string): LibraryField[] {
  const regex = /\{\{([a-zA-Z0-9_-]+)(?:=([^}]+))?\}\}/g;
  const fields: LibraryField[] = [];
  const seen = new Set<string>();

  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    const id = match[1].trim();
    if (!seen.has(id)) {
      seen.add(id);
      fields.push({
        id,
        label: id.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        placeholder: match[2] ? match[2].trim() : `Enter ${id}...`,
        defaultValue: match[2] ? match[2].trim() : undefined,
        multiline: false
      });
    }
  }

  return fields;
}

/**
 * Maps a raw GitHub catalog item to ContextPad canonical CommunityLibraryItem shape
 */
function mapCatalogItemToCommunityItem(item: RemoteCatalogItem, content: string = ''): CommunityLibraryItem {
  // Infer category from directory path (e.g. "prompts/coding/code-reviewer.md" -> "Code Review")
  let category: CommunityLibraryItem['category'] = 'Prompt Engineering';
  const pathLower = (item.path || '').toLowerCase();
  if (pathLower.includes('coding') || pathLower.includes('code-review')) {
    category = 'Code Review';
  } else if (pathLower.includes('architecture') || pathLower.includes('system')) {
    category = 'Architecture';
  } else if (pathLower.includes('technical') || pathLower.includes('spec') || pathLower.includes('rfc')) {
    category = 'Technical Specs';
  } else if (pathLower.includes('test')) {
    category = 'Testing';
  } else if (pathLower.includes('research') || pathLower.includes('analysis') || pathLower.includes('reasoning')) {
    category = 'Reasoning';
  }

  const fields = content ? extractFieldsFromTemplate(content) : [];

  return {
    id: `comm-gh-${item.id}`,
    name: item.name,
    type: item.type === 'skill' ? 'skill' : 'prompt',
    category,
    description: item.description || '',
    author: item.author && item.author !== 'community' ? `@${item.author}` : '@cntxt_community',
    authorBadge: item.verified ? 'Verified Architect' : 'Community Contributor',
    downloads: 42,
    rating: 5.0,
    targetAIs: item.targetAIs || ['Claude 3.7 Sonnet', 'GPT-4o', 'DeepSeek R1'],
    fields,
    template: content || `# ${item.name}\n\n${item.description}\n\n(Loading full content from library...)`,
    tags: item.tags || [category, item.type],
    collectionId: `col-comm-${category.toLowerCase().replace(/\s+/g, '-')}`,
    collectionName: category
  };
}

class CommunityLibraryService {
  /**
   * Fetch library catalog (index.json) with CDN fallback and IndexedDB caching
   */
  async fetchCatalog(forceRefresh = false): Promise<CommunityLibraryItem[]> {
    if (!forceRefresh) {
      try {
        const cachedTs = await get<number>(IDB_CATALOG_TS_KEY);
        const cachedItems = await get<CommunityLibraryItem[]>(IDB_CATALOG_KEY);
        if (cachedItems && cachedTs && (Date.now() - cachedTs < CACHE_TTL_MS)) {
          return cachedItems;
        }
      } catch (err) {
        console.warn('[CommunityLibraryService] Cache read error:', err);
      }
    }

    // Try Primary CDN, then Fallback CDN
    const endpoints = [
      `${PRIMARY_CDN_URL}/index.json`,
      `${FALLBACK_CDN_URL}/index.json`
    ];

    let rawJson: unknown = null;
    let fetchError: Error | null = null;

    for (const url of endpoints) {
      try {
        const resp = await fetch(url, { cache: 'no-cache' });
        if (resp.ok) {
          rawJson = await resp.json();
          break;
        }
      } catch (err) {
        fetchError = err instanceof Error ? err : new Error(String(err));
      }
    }

    if (!rawJson) {
      console.warn('[CommunityLibraryService] Remote fetch failed, falling back to cache:', fetchError);
      const fallbackCached = await get<CommunityLibraryItem[]>(IDB_CATALOG_KEY);
      if (fallbackCached && fallbackCached.length > 0) {
        return fallbackCached;
      }
      return [];
    }

    // Validate JSON schema
    const validation = validateGitHubCatalog(rawJson);
    const catalogList = validation.success ? validation.data : (Array.isArray(rawJson) ? (rawJson as GitHubCatalogItem[]) : []);

    const communityItems: CommunityLibraryItem[] = catalogList.map(item => 
      mapCatalogItemToCommunityItem(item)
    );

    // Save to IndexedDB cache
    try {
      await set(IDB_CATALOG_KEY, communityItems);
      await set(IDB_CATALOG_TS_KEY, Date.now());
    } catch (err) {
      console.warn('[CommunityLibraryService] Failed to cache catalog in IndexedDB:', err);
    }

    return communityItems;
  }

  /**
   * Fetch full markdown template for a specific catalog item
   */
  async fetchItemContent(itemPath: string, itemId: string): Promise<string> {
    const cacheKey = `${IDB_TEMPLATE_PREFIX}${itemId}`;
    try {
      const cached = await get<string>(cacheKey);
      if (cached) return cached;
    } catch {}

    const endpoints = [
      `${PRIMARY_CDN_URL}/${itemPath.replace(/^\//, '')}`,
      `${FALLBACK_CDN_URL}/${itemPath.replace(/^\//, '')}`
    ];

    for (const url of endpoints) {
      try {
        const resp = await fetch(url);
        if (resp.ok) {
          const content = await resp.text();
          try {
            await set(cacheKey, content);
          } catch {}
          return content;
        }
      } catch {}
    }

    return '';
  }

  /**
   * Derive community collections from catalog items
   */
  generateCollectionsFromItems(items: CommunityLibraryItem[]): LibraryCollection[] {
    const categoryMap = new Map<string, string[]>();

    for (const item of items) {
      const cat = item.category || 'Prompt Engineering';
      if (!categoryMap.has(cat)) {
        categoryMap.set(cat, []);
      }
      categoryMap.get(cat)!.push(item.id);
    }

    const collections: LibraryCollection[] = [];
    for (const [cat, itemIds] of categoryMap.entries()) {
      collections.push({
        id: `col-comm-${cat.toLowerCase().replace(/\s+/g, '-')}`,
        name: `${cat} Catalog`,
        description: `Verified community blueprints, prompts, and skills for ${cat}.`,
        category: cat as any,
        author: 'EntropyRedux/cntxt-library',
        authorBadge: 'Verified Architect',
        source: 'community-fork',
        sourceTitle: 'GitHub cntxt-library',
        tags: [cat, 'Community', 'Public'],
        itemIds,
        downloads: itemIds.length * 15,
        rating: 5.0,
        createdAt: 1726000000000,
        updatedAt: Date.now()
      });
    }

    return collections;
  }

  /**
   * Generates a pre-filled GitHub Issue / Pull Request submission URL
   * for contributing a user prompt or skill to the community library
   */
  generateContributionUrl(name: string, description: string, category: string, template: string): string {
    const title = encodeURIComponent(`[Contribution]: ${name}`);
    const body = encodeURIComponent(
`### Community Library Contribution

**Item Name:** ${name}
**Category:** ${category}
**Description:** ${description}

#### Template Content:
\`\`\`markdown
${template}
\`\`\`

---
*Submitted via ContextPad Web (https://github.com/EntropyRedux/cntxt-web)*`
    );

    return `https://github.com/EntropyRedux/cntxt-library/issues/new?title=${title}&body=${body}`;
  }
}

export const communityLibraryService = new CommunityLibraryService();
