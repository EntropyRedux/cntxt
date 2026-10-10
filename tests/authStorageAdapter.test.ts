import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock notificationStore
const mockAddNotification = vi.fn();
vi.mock('../src/store/notificationStore', () => ({
  useNotificationStore: {
    getState: () => ({ addNotification: mockAddNotification }),
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
  beforeEach(() => {
    vi.clearAllMocks();
    // Clean localStorage/sessionStorage
    localStorage.clear();
    sessionStorage.clear();
    mockAddNotification.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getStoredGuestMode', () => {
    it('returns true when guest mode is stored as "true"', () => {
      localStorage.setItem(STORAGE_KEYS.GUEST_MODE, 'true');
      expect(getStoredGuestMode()).toBe(true);
    });

    it('returns false when guest mode is stored as anything else', () => {
      localStorage.setItem(STORAGE_KEYS.GUEST_MODE, 'false');
      expect(getStoredGuestMode()).toBe(false);
    });

    it('returns false when key is not present', () => {
      expect(getStoredGuestMode()).toBe(false);
    });

    it('returns false and notifies on localStorage error', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('Storage access denied');
      });
      const result = getStoredGuestMode();
      expect(result).toBe(false);
      expect(mockAddNotification).toHaveBeenCalledWith(
        'Storage Warning', 'Failed to read guest mode preference.', 'warning'
      );
    });
  });

  describe('setStoredGuestMode', () => {
    it('sets "true" when enabled', () => {
      setStoredGuestMode(true);
      expect(localStorage.getItem(STORAGE_KEYS.GUEST_MODE)).toBe('true');
    });

    it('removes key when disabled', () => {
      localStorage.setItem(STORAGE_KEYS.GUEST_MODE, 'true');
      setStoredGuestMode(false);
      expect(localStorage.getItem(STORAGE_KEYS.GUEST_MODE)).toBeNull();
    });

    it('notifies on localStorage error when setting', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Quota exceeded');
      });
      setStoredGuestMode(true);
      expect(mockAddNotification).toHaveBeenCalledWith(
        'Storage Warning', 'Failed to save guest mode preference.', 'warning'
      );
    });

    it('notifies on localStorage error when removing', () => {
      vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
        throw new Error('Access denied');
      });
      setStoredGuestMode(false);
      expect(mockAddNotification).toHaveBeenCalledWith(
        'Storage Warning', 'Failed to save guest mode preference.', 'warning'
      );
    });
  });

  describe('getStoredOnboardingCompleted', () => {
    it('returns true when onboarding completed is stored as "true"', () => {
      localStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, 'true');
      expect(getStoredOnboardingCompleted()).toBe(true);
    });

    it('returns false when key is absent', () => {
      expect(getStoredOnboardingCompleted()).toBe(false);
    });

    it('returns false and notifies on error', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('Corrupted');
      });
      const result = getStoredOnboardingCompleted();
      expect(result).toBe(false);
      expect(mockAddNotification).toHaveBeenCalledWith(
        'Storage Warning', 'Failed to read onboarding state.', 'warning'
      );
    });
  });

  describe('setStoredOnboardingCompleted', () => {
    it('sets "true" when completed is true', () => {
      setStoredOnboardingCompleted(true);
      expect(localStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED)).toBe('true');
    });

    it('removes key when completed is false', () => {
      localStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, 'true');
      setStoredOnboardingCompleted(false);
      expect(localStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED)).toBeNull();
    });

    it('notifies on error', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Failed');
      });
      setStoredOnboardingCompleted(true);
      expect(mockAddNotification).toHaveBeenCalledWith(
        'Storage Warning', 'Failed to save onboarding state.', 'warning'
      );
    });
  });

  describe('clearStoredAuthSession', () => {
    it('removes both AUTH_USER and GUEST_MODE keys', () => {
      localStorage.setItem(STORAGE_KEYS.AUTH_USER, 'user123');
      localStorage.setItem(STORAGE_KEYS.GUEST_MODE, 'true');
      localStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, 'true');

      clearStoredAuthSession();

      expect(localStorage.getItem(STORAGE_KEYS.AUTH_USER)).toBeNull();
      expect(localStorage.getItem(STORAGE_KEYS.GUEST_MODE)).toBeNull();
      // Other keys should remain
      expect(localStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED)).toBe('true');
    });

        it('notifies on error', () => {
      vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
        throw new Error('Permission blocked');
      });
      clearStoredAuthSession();
      expect(mockAddNotification).toHaveBeenCalledWith(
        'Storage Warning', 'Failed to clear local session data.', 'warning'
      );
    });
  });

  describe('getSafeStorageItem', () => {
    it('returns the stored value for a key', () => {
      localStorage.setItem('custom_key', 'custom_value');
      expect(getSafeStorageItem('custom_key')).toBe('custom_value');
    });

    it('returns null for a missing key', () => {
      expect(getSafeStorageItem('nonexistent')).toBeNull();
    });

    it('returns null and notifies on error', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('Blocked');
      });
      const result = getSafeStorageItem('some_key');
      expect(result).toBeNull();
      expect(mockAddNotification).toHaveBeenCalledWith(
        'Storage Warning', 'Failed to read storage key "some_key".', 'warning'
      );
    });
  });

  describe('setSafeStorageItem', () => {
    it('writes a value to localStorage', () => {
      setSafeStorageItem('my_key', 'my_value');
      expect(localStorage.getItem('my_key')).toBe('my_value');
    });

    it('notifies on error', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Quota');
      });
      setSafeStorageItem('my_key', 'my_value');
      expect(mockAddNotification).toHaveBeenCalledWith(
        'Storage Warning', 'Failed to persist storage key "my_key".', 'warning'
      );
    });
  });

  describe('getSessionStorageItem', () => {
    it('returns the stored session value', () => {
      sessionStorage.setItem('session_key', 'session_val');
      expect(getSessionStorageItem('session_key')).toBe('session_val');
    });

    it('returns null for missing session key', () => {
      expect(getSessionStorageItem('missing')).toBeNull();
    });

    it('returns null and notifies on error', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('Session blocked');
      });
      const result = getSessionStorageItem('sess_key');
      expect(result).toBeNull();
      expect(mockAddNotification).toHaveBeenCalledWith(
        'Storage Warning', 'Failed to read session key "sess_key".', 'warning'
      );
    });
  });

  describe('setSessionStorageItem', () => {
    it('writes a value to sessionStorage', () => {
      setSessionStorageItem('sess_key', 'sess_val');
      expect(sessionStorage.getItem('sess_key')).toBe('sess_val');
    });

    it('notifies on error', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Session full');
      });
      setSessionStorageItem('sess_key', 'sess_val');
      expect(mockAddNotification).toHaveBeenCalledWith(
        'Storage Warning', 'Failed to persist session key "sess_key".', 'warning'
      );
    });
  });
});