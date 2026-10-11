/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockAddNotification = vi.fn();
vi.mock('../src/store/notificationStore', () => ({
  useNotificationStore: {
    getState: () => ({
      addNotification: mockAddNotification,
    }),
  },
}));

import { STORAGE_KEYS } from '../src/adapters/storageKeys';
import {
  getStoredGuestMode,
  setStoredGuestMode,
  getStoredOnboardingCompleted,
  setStoredOnboardingCompleted,
  clearStoredAuthSession,
  getSafeStorageItem,
  setSafeStorageItem,
  getSessionStorageItem,
  setSessionStorageItem,
} from '../src/adapters/authStorageAdapter';

describe('authStorageAdapter', () => {
  let mockLocalStorage: { [key: string]: string };
  let mockSessionStorage: { [key: string]: string };

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage = {};
    mockSessionStorage = {};

    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => mockLocalStorage[key] ?? null),
        setItem: vi.fn((key: string, value: string) => { mockLocalStorage[key] = value; }),
        removeItem: vi.fn((key: string) => { delete mockLocalStorage[key]; }),
        clear: vi.fn(() => { mockLocalStorage = {}; }),
      },
      writable: true,
    });

    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: vi.fn((key: string) => mockSessionStorage[key] ?? null),
        setItem: vi.fn((key: string, value: string) => { mockSessionStorage[key] = value; }),
      },
      writable: true,
    });
  });

  describe('getStoredGuestMode', () => {
    it('returns true when stored as "true"', () => {
      mockLocalStorage[STORAGE_KEYS.GUEST_MODE] = 'true';
      expect(getStoredGuestMode()).toBe(true);
    });

    it('returns false when not stored', () => {
      expect(getStoredGuestMode()).toBe(false);
    });

    it('returns false when stored as non-true', () => {
      mockLocalStorage[STORAGE_KEYS.GUEST_MODE] = 'false';
      expect(getStoredGuestMode()).toBe(false);
    });

    it('notifies on error and returns false', () => {
      vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
        throw new Error('Storage unavailable');
      });
      expect(getStoredGuestMode()).toBe(false);
      expect(mockAddNotification).toHaveBeenCalledWith('Storage Warning', 'Failed to read guest mode preference.', 'warning');
    });
  });

  describe('setStoredGuestMode', () => {
    it('sets "true" when enabled', () => {
      setStoredGuestMode(true);
      expect(window.localStorage.setItem).toHaveBeenCalledWith(STORAGE_KEYS.GUEST_MODE, 'true');
    });

    it('removes key when disabled', () => {
      setStoredGuestMode(false);
      expect(window.localStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.GUEST_MODE);
    });

    it('notifies when setItem throws', () => {
      vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => { throw new Error('Quota exceeded'); });
      setStoredGuestMode(true);
      expect(mockAddNotification).toHaveBeenCalledWith('Storage Warning', 'Failed to save guest mode preference.', 'warning');
    });

    it('notifies when removeItem throws', () => {
      vi.spyOn(window.localStorage, 'removeItem').mockImplementation(() => { throw new Error('Storage error'); });
      setStoredGuestMode(false);
      expect(mockAddNotification).toHaveBeenCalledWith('Storage Warning', 'Failed to save guest mode preference.', 'warning');
    });
  });

  describe('getStoredOnboardingCompleted', () => {
    it('returns true when stored as "true"', () => {
      mockLocalStorage[STORAGE_KEYS.ONBOARDING_COMPLETED] = 'true';
      expect(getStoredOnboardingCompleted()).toBe(true);
    });

    it('returns false when not stored', () => {
      expect(getStoredOnboardingCompleted()).toBe(false);
    });

    it('notifies on error and returns false', () => {
      vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => { throw new Error('unavailable'); });
      expect(getStoredOnboardingCompleted()).toBe(false);
      expect(mockAddNotification).toHaveBeenCalledWith('Storage Warning', 'Failed to read onboarding state.', 'warning');
    });
  });

  describe('setStoredOnboardingCompleted', () => {
    it('sets "true" when completed', () => {
      setStoredOnboardingCompleted(true);
      expect(window.localStorage.setItem).toHaveBeenCalledWith(STORAGE_KEYS.ONBOARDING_COMPLETED, 'true');
    });

    it('removes key when not completed', () => {
      setStoredOnboardingCompleted(false);
      expect(window.localStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.ONBOARDING_COMPLETED);
    });

    it('notifies when setItem throws', () => {
      vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => { throw new Error('Quota exceeded'); });
      setStoredOnboardingCompleted(true);
      expect(mockAddNotification).toHaveBeenCalledWith('Storage Warning', 'Failed to save onboarding state.', 'warning');
    });
  });

  describe('clearStoredAuthSession', () => {
    it('removes AUTH_USER and GUEST_MODE keys', () => {
      mockLocalStorage[STORAGE_KEYS.AUTH_USER] = '{"user":"test"}';
      mockLocalStorage[STORAGE_KEYS.GUEST_MODE] = 'true';

      clearStoredAuthSession();

      expect(window.localStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.AUTH_USER);
      expect(window.localStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.GUEST_MODE);
    });

    it('notifies when localStorage throws', () => {
      vi.spyOn(window.localStorage, 'removeItem').mockImplementation(() => { throw new Error('Storage locked'); });
      clearStoredAuthSession();
      expect(mockAddNotification).toHaveBeenCalledWith('Storage Warning', 'Failed to clear local session data.', 'warning');
    });
  });

  describe('getSafeStorageItem', () => {
    it('returns stored value', () => {
      mockLocalStorage['mykey'] = 'myvalue';
      expect(getSafeStorageItem('mykey')).toBe('myvalue');
    });

    it('returns null for missing key', () => {
      expect(getSafeStorageItem('missing')).toBeNull();
    });

    it('notifies on error and returns null', () => {
      vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => { throw new Error('unreadable'); });
      expect(getSafeStorageItem('mykey')).toBeNull();
      expect(mockAddNotification).toHaveBeenCalledWith('Storage Warning', 'Failed to read storage key \"mykey\".', 'warning');
    });
  });

  describe('setSafeStorageItem', () => {
    it('sets value in localStorage', () => {
      setSafeStorageItem('mykey', 'myvalue');
      expect(window.localStorage.setItem).toHaveBeenCalledWith('mykey', 'myvalue');
    });

    it('notifies on error', () => {
      vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => { throw new Error('quota'); });
      setSafeStorageItem('mykey', 'myvalue');
      expect(mockAddNotification).toHaveBeenCalledWith('Storage Warning', 'Failed to persist storage key \"mykey\".', 'warning');
    });
  });

  describe('getSessionStorageItem', () => {
    it('returns stored value', () => {
      mockSessionStorage['skey'] = 'svalue';
      expect(getSessionStorageItem('skey')).toBe('svalue');
    });

    it('returns null for missing key', () => {
      expect(getSessionStorageItem('missing')).toBeNull();
    });

    it('notifies on error and returns null', () => {
      vi.spyOn(window.sessionStorage, 'getItem').mockImplementation(() => { throw new Error('err'); });
      expect(getSessionStorageItem('skey')).toBeNull();
      expect(mockAddNotification).toHaveBeenCalledWith('Storage Warning', 'Failed to read session key \"skey\".', 'warning');
    });
  });

  describe('setSessionStorageItem', () => {
    it('sets value in sessionStorage', () => {
      setSessionStorageItem('skey', 'svalue');
      expect(window.sessionStorage.setItem).toHaveBeenCalledWith('skey', 'svalue');
    });

    it('notifies on error', () => {
      vi.spyOn(window.sessionStorage, 'setItem').mockImplementation(() => { throw new Error('err'); });
      setSessionStorageItem('skey', 'svalue');
      expect(mockAddNotification).toHaveBeenCalledWith('Storage Warning', 'Failed to persist session key \"skey\".', 'warning');
    });
  });
});
