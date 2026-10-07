import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { UserProfile, UserLibraryItem, LibraryCollection } from '../../contracts/data_shapes';

/**
 * SUPABASE RUNTIME ADAPTER (src/adapters/supabaseClient.ts)
 * 
 * Provides an isolated, decoupled client bridge for Supabase Auth and Database.
 * When environment variables are missing (local demo mode / specification sandbox),
 * it safely falls back without throwing runtime exceptions.
 */

// Scope marker: SPEC REFERENCE: ADAPT FOR NATIVE STACK
const metaEnv = (typeof import.meta !== 'undefined' && (import.meta as any).env) || {};
const rawSupabaseUrl = (metaEnv.VITE_SUPABASE_URL || '').trim();
const supabaseUrl = rawSupabaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const supabaseAnonKey = (metaEnv.VITE_SUPABASE_ANON_KEY || metaEnv.VITE_SUPABASE_PUBLISHABLE_KEY || '').trim();

let clientInstance: SupabaseClient | null = null;

/**
 * Check if valid Supabase credentials have been configured
 */
export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl && 
    supabaseAnonKey && 
    supabaseUrl.startsWith('https://') &&
    !supabaseUrl.includes('your-project')
  );
};

/**
 * Get or initialize the singleton Supabase client
 */
export const getSupabase = (): SupabaseClient | null => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!clientInstance) {
    try {
      clientInstance = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
        },
      });
    } catch (err) {
      console.warn('[Supabase] Failed to initialize client instance:', err);
      return null;
    }
  }

  return clientInstance;
};

/**
 * Maps a Supabase User object into ContextPad canonical UserProfile data shape
 */
export const mapSupabaseUserToProfile = (
  user: User, 
  libraryItemsCount = 0, 
  syncedDevicesCount = 1
): UserProfile => {
  const metadata = user.user_metadata || {};
  const appMetadata = user.app_metadata || {};
  
  // Extract provider
  const rawProvider = (appMetadata.provider || metadata.provider || 'google').toLowerCase();
  const provider: 'google' | 'github' | 'offline' = 
    rawProvider.includes('github') ? 'github' : 
    rawProvider.includes('google') ? 'google' : 'offline';

  // Extract display name or fallback
  const name = 
    metadata.full_name || 
    metadata.name || 
    metadata.user_name || 
    user.email?.split('@')[0] || 
    'User';

  // Extract avatar URL
  const avatarUrl = 
    metadata.avatar_url || 
    metadata.picture || 
    `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(user.id)}`;

  // Extract linked personal GitHub library configuration
  let githubLibrary = undefined;
  if (metadata.github_library) {
    try {
      githubLibrary = typeof metadata.github_library === 'string'
        ? JSON.parse(metadata.github_library)
        : metadata.github_library;
    } catch {}
  }

  return {
    id: user.id,
    name,
    email: user.email || '',
    avatarUrl,
    provider,
    lastSynced: 'Just now',
    libraryItemsCount,
    syncedDevicesCount,
    role: metadata.role || 'Member',
    githubLibrary,
  };
};

/**
 * Get active provider access token (e.g. GitHub OAuth token for repository access)
 */
export const getSessionProviderToken = async (): Promise<string | null> => {
  const supabase = getSupabase();
  try {
    if (supabase) {
      const { data } = await supabase.auth.getSession();
      if (data.session?.provider_token) return data.session.provider_token;
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem('cntxt_provider_token');
      if (stored) return stored;
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * Trigger OAuth login flow with repository access for GitHub
 */
export const signInWithOAuthProvider = async (
  provider: 'google' | 'github'
): Promise<{ error: Error | null; user?: User | null }> => {
  const supabase = getSupabase();
  if (!supabase) {
    return { 
      error: new Error('Supabase is not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment.'),
      user: null
    };
  }

  try {
    const isTauri = typeof window !== 'undefined' && Boolean(
      (window as any).isTauri || (window as any).__TAURI_INTERNALS__ || (window as any).__TAURI__
    );

    if (isTauri) {
      // 1. Resolve Tauri invoke function
      let invokeFn: (cmd: string, args?: Record<string, unknown>) => Promise<any>;
      if ((window as any).__TAURI_INTERNALS__?.invoke) {
        invokeFn = (window as any).__TAURI_INTERNALS__.invoke;
      } else if ((window as any).__TAURI__?.core?.invoke) {
        invokeFn = (window as any).__TAURI__.core.invoke;
      } else {
        const { invoke } = await import('@tauri-apps/api/core');
        invokeFn = invoke;
      }

      // 2. Start local OAuth callback listener on localhost:1420
      const listenerPromise = invokeFn('start_oauth_listener') as Promise<string>;

      // 3. Obtain OAuth authorization URL with skipBrowserRedirect: true
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: 'http://localhost:1420/auth/callback',
          skipBrowserRedirect: true,
          scopes: provider === 'github' ? 'repo read:user' : undefined,
        },
      });

      if (error) {
        return { error: new Error(error.message), user: null };
      }
      if (!data?.url) {
        return { error: new Error('Failed to obtain OAuth authorization URL from Supabase'), user: null };
      }

      // 4. Launch default system browser (Chrome/Edge/etc.) with authorization URL
      await invokeFn('open_oauth_url', { url: data.url });

      // 5. Await captured authorization code from the local listener
      const captured = await listenerPromise;
      if (!captured) {
        return { error: new Error('Sign-in cancelled or no code received'), user: null };
      }

      let payload: Record<string, string> = {};
      try {
        payload = JSON.parse(captured);
      } catch {
        payload = { code: captured };
      }

      if (payload.provider_token && typeof window !== 'undefined' && window.localStorage) {
        try {
          window.localStorage.setItem('cntxt_provider_token', payload.provider_token);
        } catch {}
      }

      let resolvedUser: User | null = null;

      if (payload.access_token) {
        const refreshToken = payload.refresh_token || payload.access_token;
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: payload.access_token,
          refresh_token: refreshToken,
        });
        if (sessionError) {
          console.warn('[Supabase] setSession error:', sessionError);
          return { error: new Error(sessionError.message), user: null };
        }
        resolvedUser = sessionData?.user || null;
      } else if (payload.code) {
        const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(payload.code);
        if (exchangeError) {
          return { error: new Error(exchangeError.message), user: null };
        }
        resolvedUser = sessionData?.user || null;
      } else {
        return { error: new Error('Missing authorization code or tokens from login provider'), user: null };
      }

      if (!resolvedUser) {
        const { data: userData } = await supabase.auth.getUser();
        resolvedUser = userData?.user || null;
      }

      return { error: null, user: resolvedUser };
    }

    // Standard web browser redirect flow
    const redirectUrl = typeof window !== 'undefined' ? window.location.origin : undefined;
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectUrl,
        scopes: provider === 'github' ? 'repo read:user' : undefined,
      },
    });
    return { error: error ? new Error(error.message) : null };
  } catch (err: any) {
    return { error: err instanceof Error ? err : new Error(String(err)) };
  }
};

/**
 * Sign out user from Supabase session
 */
export const signOutUser = async (): Promise<{ error: Error | null }> => {
  const supabase = getSupabase();
  if (!supabase) return { error: null };

  try {
    const { error } = await supabase.auth.signOut();
    return { error: error ? new Error(error.message) : null };
  } catch (err: any) {
    return { error: err instanceof Error ? err : new Error(String(err)) };
  }
};

/**
 * Sync user profile to Supabase 'profiles' table if it exists
 */
export const syncUserProfileToDatabase = async (profile: UserProfile): Promise<{ error: Error | null }> => {
  const supabase = getSupabase();
  if (!supabase) return { error: null };

  try {
    const { error } = await supabase.from('profiles').upsert({
      id: profile.id,
      name: profile.name,
      email: profile.email,
      avatar_url: profile.avatarUrl,
      provider: profile.provider,
      github_library: profile.githubLibrary ? JSON.stringify(profile.githubLibrary) : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
    return { error: error ? new Error(error.message) : null };
  } catch (err: any) {
    // Non-blocking: table might not be initialized yet
    console.debug('[Supabase] Profile sync skipped or table absent:', err);
    return { error: err instanceof Error ? err : new Error(String(err)) };
  }
};

/**
 * Upsert user library items to Supabase
 */
export const syncUserLibraryItemsToDatabase = async (
  userId: string, 
  items: UserLibraryItem[]
): Promise<{ error: Error | null }> => {
  const supabase = getSupabase();
  if (!supabase || !userId || items.length === 0) return { error: null };

  try {
    const rows = items.map(item => ({
      id: item.id,
      user_id: userId,
      name: item.name,
      type: item.type,
      category: item.category,
      description: item.description || '',
      author: item.author || 'User',
      source: item.source || 'user-authored',
      target_ais: item.targetAIs || [],
      fields: item.fields || [],
      template: item.template || '',
      is_favorite: Boolean(item.isFavorite),
      is_forked: Boolean(item.isForked),
      forked_from: item.forkedFrom || null,
      collection_id: item.collectionId || null,
      collection_name: item.collectionName || null,
      created_at: new Date(item.createdAt || Date.now()).toISOString(),
      updated_at: new Date(item.updatedAt || Date.now()).toISOString(),
    }));

    const { error } = await supabase
      .from('user_library_items')
      .upsert(rows, { onConflict: 'id' });

    if (error) {
      console.warn('[Supabase] Failed to sync user library items:', error.message);
      return { error: new Error(error.message) };
    }
    return { error: null };
  } catch (err: any) {
    console.warn('[Supabase] syncUserLibraryItems exception:', err);
    return { error: err instanceof Error ? err : new Error(String(err)) };
  }
};

/**
 * Fetch all user library items from Supabase for the given user
 */
export const fetchUserLibraryItemsFromDatabase = async (
  userId: string
): Promise<{ data: UserLibraryItem[] | null; error: Error | null }> => {
  const supabase = getSupabase();
  if (!supabase || !userId) return { data: null, error: null };

  try {
    const { data, error } = await supabase
      .from('user_library_items')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.warn('[Supabase] Failed to fetch user library items:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    if (!data) return { data: [], error: null };

    const items: UserLibraryItem[] = data.map((row: any) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      category: row.category,
      description: row.description || '',
      author: row.author || 'User',
      source: row.source || 'user-authored',
      targetAIs: row.target_ais || [],
      fields: Array.isArray(row.fields) ? row.fields : [],
      template: row.template || '',
      isFavorite: Boolean(row.is_favorite),
      isForked: Boolean(row.is_forked),
      forkedFrom: row.forked_from || undefined,
      collectionId: row.collection_id || undefined,
      collectionName: row.collection_name || undefined,
      createdAt: row.created_at ? Date.parse(row.created_at) : Date.now(),
      updatedAt: row.updated_at ? Date.parse(row.updated_at) : Date.now(),
    }));

    return { data: items, error: null };
  } catch (err: any) {
    console.warn('[Supabase] fetchUserLibraryItems exception:', err);
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
};

/**
 * Upsert user library collections to Supabase
 */
export const syncLibraryCollectionsToDatabase = async (
  userId: string,
  collections: LibraryCollection[]
): Promise<{ error: Error | null }> => {
  const supabase = getSupabase();
  if (!supabase || !userId || collections.length === 0) return { error: null };

  try {
    const rows = collections.map(col => ({
      id: col.id,
      user_id: userId,
      name: col.name,
      description: col.description || '',
      category: col.category,
      author: col.author || 'User',
      source: col.source || 'user-authored',
      tags: col.tags || [],
      item_ids: col.itemIds || [],
      is_favorite: Boolean(col.isFavorite),
      created_at: new Date(col.createdAt || Date.now()).toISOString(),
      updated_at: new Date(col.updatedAt || Date.now()).toISOString(),
    }));

    const { error } = await supabase
      .from('library_collections')
      .upsert(rows, { onConflict: 'id' });

    if (error) {
      console.warn('[Supabase] Failed to sync collections:', error.message);
      return { error: new Error(error.message) };
    }
    return { error: null };
  } catch (err: any) {
    console.warn('[Supabase] syncLibraryCollections exception:', err);
    return { error: err instanceof Error ? err : new Error(String(err)) };
  }
};

/**
 * Fetch all library collections from Supabase for the given user
 */
export const fetchLibraryCollectionsFromDatabase = async (
  userId: string
): Promise<{ data: LibraryCollection[] | null; error: Error | null }> => {
  const supabase = getSupabase();
  if (!supabase || !userId) return { data: null, error: null };

  try {
    const { data, error } = await supabase
      .from('library_collections')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.warn('[Supabase] Failed to fetch collections:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    if (!data) return { data: [], error: null };

    const collections: LibraryCollection[] = data.map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description || '',
      category: row.category,
      author: row.author || 'User',
      source: row.source || 'user-authored',
      tags: row.tags || [],
      itemIds: row.item_ids || [],
      isFavorite: Boolean(row.is_favorite),
      createdAt: row.created_at ? Date.parse(row.created_at) : Date.now(),
      updatedAt: row.updated_at ? Date.parse(row.updated_at) : Date.now(),
    }));

    return { data: collections, error: null };
  } catch (err: any) {
    console.warn('[Supabase] fetchLibraryCollections exception:', err);
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
};
