import { recordDiagnostic } from '../services/diagnosticLogger';
/**
 * tabSessionCache — localStorage write-through cache for tab state.
 *
 * On every meaningful tab mutation the full tab list + activeTabId is written
 * synchronously to localStorage. On next app launch, initializeTabs reads this
 * cache synchronously (zero IPC) so the Editor can mount in the first frame
 * instead of waiting for N+1 Tauri kv_get round-trips.
 *
 * Integrity is guarded by a djb2 checksum. On mismatch the cache is cleared and
 * the store falls back to the normal IPC path.
 *
 * Storage budget: ~1-2 MB for typical usage (tabs with content). Tabs over
 * MAX_CONTENT_CACHE_BYTES have their content replaced with '' in the cache but
 * the tab metadata is still preserved so structure is correct.
 */

import { Tab } from '../../contracts/data_shapes';
import { TabCacheEntrySchema } from '../contracts/boundarySchemas';

const CACHE_KEY = 'cntxt_tab_cache_v2';
/** Max content size (bytes) stored per tab. Larger tabs use IPC on restore. */
const MAX_CONTENT_CACHE_BYTES = 256 * 1024; // 256 KB

interface TabCacheEntry {
  tabs: Tab[];
  activeTabId: string;
  checksum: string;
  ts: number;
}

/** djb2 hash — fast, non-cryptographic, good enough for cache integrity. */
function djb2(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; // keep 32-bit unsigned
  }
  return h.toString(36);
}

function computeChecksum(tabs: Tab[], activeTabId: string): string {
  const sig = tabs
    .map(t => `${t.id}:${t.title}:${t.lastModifiedTime ?? 0}:${t.content.length}`)
    .join('|');
  return djb2(sig + '|' + activeTabId);
}

function clampTabsForCache(tabs: Tab[]): Tab[] {
  return tabs.map(t => {
    const byteLen = new Blob([t.content]).size;
    return byteLen <= MAX_CONTENT_CACHE_BYTES
      ? t
      : { ...t, content: '' }; // drop oversized content, keep metadata
  });
}

/**
 * Persist current tab state to localStorage.
 * Called from store mutations — synchronous and non-blocking.
 */
export function writeTabCache(tabs: Tab[], activeTabId: string): void {
  if (typeof localStorage === 'undefined') return; // Node.js / SSR / Vitest
  try {
    const clamped = clampTabsForCache(tabs);
    const entry: TabCacheEntry = {
      tabs: clamped,
      activeTabId,
      checksum: computeChecksum(clamped, activeTabId),
      ts: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch (e) {
    // Quota exceeded or storage unavailable — record diagnostic and degrade.
    recordDiagnostic('warn', 'TabCache', 'write failed', { error: String(e) });
    console.warn('[TabCache] write failed:', e);
  }
}

/**
 * Read tab state from localStorage synchronously.
 * Returns null if cache is absent, corrupt, or fails checksum.
 */
export function readTabCache(): { tabs: Tab[]; activeTabId: string } | null {
  if (typeof localStorage === 'undefined') return null; // Node.js / SSR / Vitest
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const validation = TabCacheEntrySchema.safeParse(parsed);
    if (!validation.success) {
      recordDiagnostic('warn', 'TabCache', 'boundary schema validation failed — discarding invalid cache');
      console.warn('[TabCache] boundary schema validation failed — discarding invalid cache');
      clearTabCache();
      return null;
    }
    const entry = validation.data;

    const expected = computeChecksum(entry.tabs, entry.activeTabId);
    if (expected !== entry.checksum) {
      recordDiagnostic('warn', 'TabCache', 'checksum mismatch — discarding stale cache');
      console.warn('[TabCache] checksum mismatch — discarding stale cache');
      clearTabCache();
      return null;
    }

    return { tabs: entry.tabs, activeTabId: entry.activeTabId };
  } catch (e) {
    console.warn('[TabCache] read failed:', e);
    clearTabCache();
    return null;
  }
}

/** Remove the cache entry. Called when the authoritative IPC load diverges. */
export function clearTabCache(): void {
  if (typeof localStorage === 'undefined') return; // Node.js / SSR / Vitest
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore
  }
}
