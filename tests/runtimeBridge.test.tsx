import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
/** @vitest-environment jsdom */
import React from 'react';
import { renderHook } from '@testing-library/react';

// ---- Mock adapter constructors ----
const mockBrowserInstance = { platform: 'browser' };
const mockTauriInstance = { platform: 'tauri' };
const mockAndroidInstance = { platform: 'android' };

function MockBrowserRuntimeAdapter(this: any) { Object.assign(this, mockBrowserInstance); }
function MockTauriRuntimeAdapter(this: any) { Object.assign(this, mockTauriInstance); }
function MockAndroidRuntimeAdapter(this: any) { Object.assign(this, mockAndroidInstance); }

MockBrowserRuntimeAdapter.prototype = Object.create({});
MockTauriRuntimeAdapter.prototype = Object.create({});
MockAndroidRuntimeAdapter.prototype = Object.create({});

vi.mock('../src/adapters/browserRuntimeAdapter', () => ({
  BrowserRuntimeAdapter: MockBrowserRuntimeAdapter,
}));
vi.mock('../src/adapters/tauriRuntimeAdapter', () => ({
  TauriRuntimeAdapter: MockTauriRuntimeAdapter,
}));
vi.mock('../src/adapters/androidRuntimeAdapter', () => ({
  AndroidRuntimeAdapter: MockAndroidRuntimeAdapter,
}));

import { getRuntimeBridge, RuntimeBridgeProvider, useRuntimeBridge, _resetGlobalBridge } from '../src/adapters/runtimeBridge';

// ---- Helper to reset global window state ----
function setWindowFlag(flag: string, value: any) {
  Object.defineProperty(window, flag, value === UNDEFINED ? { value: undefined, configurable: true } : { value, configurable: true });
}

const UNDEFINED = Symbol('undefined');

describe('runtimeBridge', () => {
  let originalWindowPropertyDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    vi.resetModules();
    _resetGlobalBridge();
  });

  afterEach(() => {
    _resetGlobalBridge();
    // Clean up window flags
    setWindowFlag('AndroidBridge', UNDEFINED);
    setWindowFlag('isTauri', UNDEFINED);
    setWindowFlag('__TAURI_INTERNALS__', UNDEFINED);
    setWindowFlag('__TAURI__', UNDEFINED);
  });

  describe('isTauriRuntime', () => {
    it('detects __TAURI_INTERNALS__ as Tauri', () => {
      setWindowFlag('__TAURI_INTERNALS__', {});
      const bridge = getRuntimeBridge();
      expect(bridge.platform).toBe('tauri');
    });

    it('detects window.isTauri as Tauri', () => {
      setWindowFlag('isTauri', true);
      const bridge = getRuntimeBridge();
      expect(bridge.platform).toBe('tauri');
    });

    it('detects window.__TAURI__ as Tauri', () => {
      setWindowFlag('__TAURI__', {});
      const bridge = getRuntimeBridge();
      expect(bridge.platform).toBe('tauri');
    });
  });

  describe('getRuntimeBridge', () => {
    it('returns BrowserRuntimeAdapter by default', () => {
      const bridge = getRuntimeBridge();
      expect(bridge.platform).toBe('browser');
    });

    it('returns AndroidRuntimeAdapter when window.AndroidBridge is present', () => {
      setWindowFlag('AndroidBridge', {});
      const bridge = getRuntimeBridge();
      expect(bridge.platform).toBe('android');
    });

    it('returns TauriRuntimeAdapter when __TAURI_INTERNALS__ is present', () => {
      setWindowFlag('__TAURI_INTERNALS__', {});
      const bridge = getRuntimeBridge();
      expect(bridge.platform).toBe('tauri');
    });

    it('caches the bridge instance (returns same reference)', () => {
      const bridge1 = getRuntimeBridge();
      setWindowFlag('AndroidBridge', {});
      const bridge2 = getRuntimeBridge();
      // The cached instance persists even after flag change
      expect(bridge1).toBe(bridge2);
    });
  });

  describe('RuntimeBridgeProvider', () => {
    it('provides custom bridge when provided', () => {
      const customBridge = { platform: 'custom' } as any;
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        React.createElement(RuntimeBridgeProvider, { bridge: customBridge }, children)
      );

      const { result } = renderHook(() => useRuntimeBridge(), { wrapper });
      expect(result.current).toBe(customBridge);
    });

    it('falls back to getRuntimeBridge when no custom bridge provided', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        React.createElement(RuntimeBridgeProvider, {}, children)
      );

      const { result } = renderHook(() => useRuntimeBridge(), { wrapper });
      expect(result.current.platform).toBe('browser');
    });
  });

  describe('useRuntimeBridge', () => {
    it('returns bridge from context when within provider', () => {
      const customBridge = { platform: 'from-context' } as any;
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        React.createElement(RuntimeBridgeProvider, { bridge: customBridge }, children)
      );

      const { result } = renderHook(() => useRuntimeBridge(), { wrapper });
      expect(result.current).toBe(customBridge);
    });

    it('falls back to getRuntimeBridge when outside provider', () => {
      setWindowFlag('AndroidBridge', {});
      const { result } = renderHook(() => useRuntimeBridge());
      expect(result.current.platform).toBe('android');
    });
  });
});
