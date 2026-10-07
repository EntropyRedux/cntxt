/**
 * Auth Storage Adapter
 * Pure boundary adapter providing safe access to browser storage for auth/onboarding states.
 * Isolates direct window.localStorage access to prevent platform leaks in stores and presenters.
 */

import { STORAGE_KEYS } from './storageKeys';

export const getStoredGuestMode = (): boolean => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(STORAGE_KEYS.GUEST_MODE) === 'true';
    }
  } catch {
    // Ignore errors
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
  } catch {
    // Ignore errors
  }
};

export const getStoredOnboardingCompleted = (): boolean => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED) === 'true';
    }
  } catch {
    // Ignore errors
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
  } catch {
    // Ignore errors
  }
};

export const clearStoredAuthSession = (): void => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
      window.localStorage.removeItem(STORAGE_KEYS.GUEST_MODE);
    }
  } catch {
    // Ignore errors
  }
};

export const getSafeStorageItem = (key: string): string | null => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch {
    // Ignore errors
  }
  return null;
};

export const setSafeStorageItem = (key: string, value: string): void => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // Ignore errors
  }
};

export const getSessionStorageItem = (key: string): string | null => {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      return window.sessionStorage.getItem(key);
    }
  } catch {
    // Ignore errors
  }
  return null;
};

export const setSessionStorageItem = (key: string, value: string): void => {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(key, value);
    }
  } catch {
    // Ignore errors
  }
};

