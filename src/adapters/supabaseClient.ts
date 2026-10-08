import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { UserProfile } from '../../contracts/data_shapes';
import { getSessionToken } from './tauriRuntimeAdapter';

/**
 * SUPABASE RUNTIME ADAPTER (src/adapters/supabaseClient.ts)
 * 
 * Provides an isolated, decoupled client bridge for Supabase Auth and Database.
 * When environment variables are missing (local demo mode / specification sandbox),
 * it safely falls back without throwing runtime exceptions.
 */

// Scope marker: SPEC REFERENCE: ADAPT FOR NATIVE STACK
const metaEnv = (typeof import.meta !== 'undefined' && (import.meta as unknown as { env?: Record<string, string | undefined> }).env) || {};
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
    } catch (e) {
      console.debug('[Supabase] Failed to parse github_library metadata:', e);
    }
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
  } catch (e) {
    console.debug('[Supabase] Failed to get session provider token:', e);
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
    interface TauriWindow extends Window {
      isTauri?: boolean;
      __TAURI_INTERNALS__?: { invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown> };
      __TAURI__?: { core?: { invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown> } };
    }
    const tauriWin = typeof window !== 'undefined' ? (window as unknown as TauriWindow) : undefined;
    const isTauri = Boolean(
      tauriWin?.isTauri || tauriWin?.__TAURI_INTERNALS__ || tauriWin?.__TAURI__
    );

    if (isTauri) {
      // 1. Resolve Tauri invoke function
      let invokeFn: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
      if (tauriWin?.__TAURI_INTERNALS__?.invoke) {
        invokeFn = tauriWin.__TAURI_INTERNALS__.invoke;
      } else if (tauriWin?.__TAURI__?.core?.invoke) {
        invokeFn = tauriWin.__TAURI__.core.invoke;
      } else {
        const { invoke } = await import('@tauri-apps/api/core');
        invokeFn = invoke;
      }

      // 2. Obtain OAuth authorization URL with skipBrowserRedirect: true
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

      // 3. Extract CSRF state from generated URL and fetch session token
      let expectedState = '';
      try {
        const parsedUrl = new URL(data.url);
        expectedState = parsedUrl.searchParams.get('state') || '';
      } catch {
        const match = data.url.match(/[?&]state=([^&]+)/);
        if (match) expectedState = decodeURIComponent(match[1]);
      }

      const sessionToken = await getSessionToken();

      // 4. Start local OAuth callback listener on localhost:1420 with state and session token
      const listenerPromise = invokeFn('start_oauth_listener', { 
        expectedState, 
        sessionToken 
      }) as Promise<string>;

      // 5. Launch default system browser (Chrome/Edge/etc.) with authorization URL and session token
      await invokeFn('open_oauth_url', { 
        url: data.url, 
        sessionToken 
      });

      // 6. Await captured authorization code from the local listener
      const captured = await listenerPromise;
      if (!captured) {
        return { error: new Error('Sign-in cancelled or no code received'), user: null };
      }

      let payload: Record<string, string> = {};
      try {
        payload = JSON.parse(captured);
      } catch (e) {
        console.debug('[Supabase] Non-JSON OAuth payload captured, treating as raw code:', e);
        payload = { code: captured };
      }

      if (payload.provider_token && typeof window !== 'undefined' && window.localStorage) {
        try {
          window.localStorage.setItem('cntxt_provider_token', payload.provider_token);
        } catch (e) {
          console.debug('[Supabase] Failed to persist provider token in localStorage:', e);
        }
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
  } catch (err: unknown) {
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
  } catch (err: unknown) {
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
  } catch (err: unknown) {
    // Non-blocking: table might not be initialized yet
    console.debug('[Supabase] Profile sync skipped or table absent:', err);
    return { error: err instanceof Error ? err : new Error(String(err)) };
  }
};

