import { create } from 'zustand';
import { 
  getSupabase,
  isSupabaseConfigured,
  signInWithOAuthProvider,
  signOutUser,
  mapSupabaseUserToProfile,
  syncUserProfileToDatabase,
  getStoredGuestMode,
  setStoredGuestMode,
  getStoredOnboardingCompleted,
  setStoredOnboardingCompleted,
  clearStoredAuthSession,
} from '../adapters';
import { UserProfile } from '../../contracts/data_shapes';
import { useNotificationStore } from './notificationStore';

interface AuthState {
  user: UserProfile | null;
  isGuestMode: boolean;
  isInitialized: boolean;
  syncStatus: 'idle' | 'syncing' | 'up-to-date' | 'error';
  lastSyncTime: string | null;
  hasCompletedOnboarding: boolean;
  authError: string | null;

  // Actions
  loginWithGoogle: () => Promise<void>;
  loginWithGitHub: () => Promise<void>;
  continueAsGuest: () => void;
  signOut: () => Promise<void>;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  triggerSync: () => Promise<void>;
  initAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isGuestMode: false,
  isInitialized: false,
  syncStatus: 'idle',
  lastSyncTime: null,
  hasCompletedOnboarding: false,
  authError: null,

  loginWithGoogle: async () => {
    set({ syncStatus: 'syncing', authError: null });
    const { error } = await signInWithOAuthProvider('google');
    if (error) {
      set({ syncStatus: 'error', authError: error.message });
      useNotificationStore.getState().addNotification('Sign In Failed', error.message, 'error');
    }
  },

  loginWithGitHub: async () => {
    set({ syncStatus: 'syncing', authError: null });
    const { error } = await signInWithOAuthProvider('github');
    if (error) {
      set({ syncStatus: 'error', authError: error.message });
      useNotificationStore.getState().addNotification('Sign In Failed', error.message, 'error');
    }
  },

  continueAsGuest: () => {
    setStoredGuestMode(true);
    set({ isGuestMode: true, authError: null });
    useNotificationStore.getState().addNotification(
      'Guest Workspace Active',
      'You are using offline browser storage. Sign in anytime to sync to cloud.',
      'info'
    );
  },

  signOut: async () => {
    set({ syncStatus: 'syncing' });
    const { error } = await signOutUser();
    clearStoredAuthSession();
    set({ 
      user: null, 
      isGuestMode: false, 
      syncStatus: 'idle', 
      authError: error ? error.message : null 
    });
    useNotificationStore.getState().addNotification('Signed Out', 'You have been signed out.', 'info');
  },

  completeOnboarding: () => {
    setStoredOnboardingCompleted(true);
    set({ hasCompletedOnboarding: true });
  },

  resetOnboarding: () => {
    setStoredOnboardingCompleted(false);
    set({ hasCompletedOnboarding: false });
  },

  triggerSync: async () => {
    const { user } = get();
    if (!user) return;

    set({ syncStatus: 'syncing' });
    const { error } = await syncUserProfileToDatabase(user);
    if (error) {
      set({ syncStatus: 'error' });
      useNotificationStore.getState().addNotification('Sync Warning', error.message, 'warning');
    } else {
      set({ syncStatus: 'up-to-date', lastSyncTime: 'Just now' });
    }
  },

  initAuth: async () => {
    const savedGuestMode = getStoredGuestMode();
    const savedOnboarding = getStoredOnboardingCompleted();

    const supabase = getSupabase();
    if (!supabase) {
      // Supabase is not configured or offline
      set({ 
        isInitialized: true, 
        isGuestMode: savedGuestMode, 
        hasCompletedOnboarding: savedOnboarding 
      });
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const profile = mapSupabaseUserToProfile(session.user);
        set({
          user: profile,
          isGuestMode: false,
          isInitialized: true,
          hasCompletedOnboarding: savedOnboarding,
          syncStatus: 'up-to-date',
          lastSyncTime: 'Just now'
        });
      } else {
        set({
          user: null,
          isGuestMode: savedGuestMode,
          isInitialized: true,
          hasCompletedOnboarding: savedOnboarding,
          syncStatus: 'idle'
        });
      }

      // Listen for auth state transitions (OAuth redirects)
      supabase.auth.onAuthStateChange(async (event, newSession) => {
        if (newSession?.user) {
          const profile = mapSupabaseUserToProfile(newSession.user);
          set({
            user: profile,
            isGuestMode: false,
            syncStatus: 'up-to-date',
            lastSyncTime: 'Just now',
            authError: null
          });
          syncUserProfileToDatabase(profile).catch(() => {});
        } else if (event === 'SIGNED_OUT') {
          set({ user: null, syncStatus: 'idle' });
        }
      });
    } catch (err) {
      console.warn('[AuthStore] Session check failed:', err);
      set({ 
        isInitialized: true, 
        isGuestMode: savedGuestMode, 
        hasCompletedOnboarding: savedOnboarding 
      });
    }
  }
}));
