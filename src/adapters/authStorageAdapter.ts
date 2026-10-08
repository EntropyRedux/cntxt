/**
 * Auth Storage Adapter
 * Pure boundary adapter providing safe access to browser storage for auth/onboarding states.
 * Isolates direct window.localStorage access to prevent platform leaks in stores and presenters.
 */

import { STORAGE_KEYS } from './storageKeys';
import { useNotificationStore } from '../store/notificationStore';

export const getStoredGuestMode = (): boolean => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(STORAGE_KEYS.GUEST_MODE) === 'true';
    }
  } catch (err: unknown) {
    console.warn('[AuthStorageAdapter] getStoredGuestMode failed to access localStorage:', err);
    useNotificationStore.getState().addNotification('Storage Warning', 'Failed to read guest mode preference.', 'warning');
  }
  return false;
};

export const setStoredGuestMode = (enabled: boolean): void => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (enabled) {
        window.localStorage.setItem(STORAGE_KEYS.GUEST_MODE, 'true');
      } else {
        window.localStorage.removeItem(STORAGE_KEYS.GUEST_MODE);
      }
    }
  } catch (err: unknown) {
    console.warn('[AuthStorageAdapter] setStoredGuestMode failed to mutate localStorage:', err);
    useNotificationStore.getState().addNotification('Storage Warning', 'Failed to save guest mode preference.', 'warning');
  }
};

export const getStoredOnboardingCompleted = (): boolean => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED) === 'true';
    }
  } catch (err: unknown) {
    console.warn('[AuthStorageAdapter] getStoredOnboardingCompleted failed to access localStorage:', err);
    useNotificationStore.getState().addNotification('Storage Warning', 'Failed to read onboarding state.', 'warning');
  }
  return false;
};

export const setStoredOnboardingCompleted = (completed: boolean): void => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (completed) {
        window.localStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, 'true');
      } else {
        window.localStorage.removeItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
      }
    }
  } catch (err: unknown) {
    console.warn('[AuthStorageAdapter] setStoredOnboardingCompleted failed to mutate localStorage:', err);
    useNotificationStore.getState().addNotification('Storage Warning', 'Failed to save onboarding state.', 'warning');
  }
};

export const clearStoredAuthSession = (): void => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
      window.localStorage.removeItem(STORAGE_KEYS.GUEST_MODE);
    }
  } catch (err: unknown) {
    console.warn('[AuthStorageAdapter] clearStoredAuthSession failed to mutate localStorage:', err);
    useNotificationStore.getState().addNotification('Storage Warning', 'Failed to clear local session data.', 'warning');
  }
};

export const getSafeStorageItem = (key: string): string | null => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch (err: unknown) {
    console.warn(`[AuthStorageAdapter] getSafeStorageItem failed to read key "${key}":`, err);
    useNotificationStore.getState().addNotification('Storage Warning', `Failed to read storage key "${key}".`, 'warning');
  }
  return null;
};

export const setSafeStorageItem = (key: string, value: string): void => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch (err: unknown) {
    console.warn(`[AuthStorageAdapter] setSafeStorageItem failed to write key "${key}":`, err);
    useNotificationStore.getState().addNotification('Storage Warning', `Failed to persist storage key "${key}".`, 'warning');
  }
};

export const getSessionStorageItem = (key: string): string | null => {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      return window.sessionStorage.getItem(key);
    }
  } catch (err: unknown) {
    console.warn(`[AuthStorageAdapter] getSessionStorageItem failed to read key "${key}":`, err);
    useNotificationStore.getState().addNotification('Storage Warning', `Failed to read session key "${key}".`, 'warning');
  }
  return null;
};

export const setSessionStorageItem = (key: string, value: string): void => {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(key, value);
    }
  } catch (err: unknown) {
    console.warn(`[AuthStorageAdapter] setSessionStorageItem failed to write key "${key}":`, err);
    useNotificationStore.getState().addNotification('Storage Warning', `Failed to persist session key "${key}".`, 'warning');
  }
};

