import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../src/store/authStore';

describe('AuthStore & Web Session Management', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      isGuestMode: false,
      isInitialized: false,
      syncStatus: 'idle',
      lastSyncTime: null,
      hasCompletedOnboarding: false,
      authError: null,
    });
  });

  it('starts with unauthenticated clean state', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isGuestMode).toBe(false);
    expect(state.isInitialized).toBe(false);
    expect(state.hasCompletedOnboarding).toBe(false);
  });

  it('activates guest demo mode and notifies the user', () => {
    const store = useAuthStore.getState();
    store.continueAsGuest();

    const updated = useAuthStore.getState();
    expect(updated.isGuestMode).toBe(true);
    expect(updated.user).toBeNull();
    expect(updated.authError).toBeNull();
  });

  it('toggles and persists onboarding completion flag', () => {
    const store = useAuthStore.getState();
    expect(store.hasCompletedOnboarding).toBe(false);

    store.completeOnboarding();
    expect(useAuthStore.getState().hasCompletedOnboarding).toBe(true);

    store.resetOnboarding();
    expect(useAuthStore.getState().hasCompletedOnboarding).toBe(false);
  });

  it('resets session on sign out', async () => {
    useAuthStore.setState({
      user: {
        id: 'usr_test_123',
        email: 'test@example.com',
        name: 'Tester',
        provider: 'google',
        createdAt: '2026-10-01T00:00:00Z',
      },
      isGuestMode: true,
      syncStatus: 'up-to-date',
    });

    const store = useAuthStore.getState();
    await store.signOut();

    const updated = useAuthStore.getState();
    expect(updated.user).toBeNull();
    expect(updated.isGuestMode).toBe(false);
    expect(updated.syncStatus).toBe('idle');
  });

  it('initializes auth state gracefully in offline/browser environment', async () => {
    const store = useAuthStore.getState();
    await store.initAuth();

    const state = useAuthStore.getState();
    expect(state.isInitialized).toBe(true);
  });
});
