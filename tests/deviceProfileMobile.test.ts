import { describe, it, expect, vi, afterEach } from 'vitest';
import { BrowserRuntimeAdapter } from '../src/adapters/browserRuntimeAdapter';
import { useSettingsStore } from '../src/store/settingsStore';

function stubEnv(opts: { userAgent: string; platform: string; touch?: boolean; width?: number }) {
  const fakeWindow = {
    innerWidth: opts.width ?? 1280,
    ...(opts.touch ? { ontouchstart: null } : {}),
  };
  const fakeNavigator = {
    userAgent: opts.userAgent,
    platform: opts.platform,
    maxTouchPoints: opts.touch ? 5 : 0,
  };
  vi.stubGlobal('window', fakeWindow as any);
  vi.stubGlobal('navigator', fakeNavigator as any);
  vi.stubGlobal('document', undefined as any);
}

const PIXEL_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 Chrome/153 Mobile Safari/537.36';
const DESKTOP_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/153 Safari/537.36';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('DeviceProfile mobile detection (browser adapter decision table)', () => {
  it('classifies an Android UA as android + mobile', () => {
    stubEnv({ userAgent: PIXEL_UA, platform: 'Linux armv8l', touch: true, width: 412 });
    const p = new BrowserRuntimeAdapter().platform;
    expect(p.os).toBe('android');
    expect(p.isMobile).toBe(true);
  });

  it('classifies a desktop Windows UA as windows + not mobile', () => {
    stubEnv({ userAgent: DESKTOP_UA, platform: 'Win32', touch: false, width: 1920 });
    const p = new BrowserRuntimeAdapter().platform;
    expect(p.os).toBe('windows');
    expect(p.isMobile).toBe(false);
  });

  it('classifies a touch device under 768px as mobile (narrow-tablet fallback)', () => {
    stubEnv({ userAgent: 'GenericBrowser/1.0', platform: 'Linux x86_64', touch: true, width: 700 });
    const p = new BrowserRuntimeAdapter().platform;
    expect(p.isTouch).toBe(true);
    expect(p.isMobile).toBe(true);
  });

  it('does not classify a touch device at or above 768px as mobile (tablet + keyboard)', () => {
    stubEnv({ userAgent: 'GenericBrowser/1.0', platform: 'Linux x86_64', touch: true, width: 1024 });
    const p = new BrowserRuntimeAdapter().platform;
    expect(p.isTouch).toBe(true);
    expect(p.isMobile).toBe(false);
  });

  it('classifies macOS by platform string', () => {
    stubEnv({ userAgent: DESKTOP_UA, platform: 'MacIntel', touch: false });
    const p = new BrowserRuntimeAdapter().platform;
    expect(p.os).toBe('macos');
    expect(p.isMac).toBe(true);
  });

  it('classifies iOS UAs (iphone/ipad/ipod) as ios + mobile', () => {
    stubEnv({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1', platform: 'iPhone', touch: true, width: 390 });
    const p = new BrowserRuntimeAdapter().platform;
    expect(p.os).toBe('ios');
    expect(p.isMobile).toBe(true);
  });

  it('web fallback applies when no platform signature matches (browser adapter)', () => {
    stubEnv({ userAgent: 'MysteryAgent/9.0', platform: 'UnknownOS/1', touch: false });
    const p = new BrowserRuntimeAdapter().platform;
    expect(p.os).toBe('web');
  });

  it('tauri adapter falls back to windows while browser falls back to web (documented divergence)', async () => {
    // Verified from source: identical ua/platform chains except the terminal default.
    const browserSrc = await import('fs').then(fs => fs.readFileSync('src/adapters/browserRuntimeAdapter.ts', 'utf-8'));
    const tauriSrc = await import('fs').then(fs => fs.readFileSync('src/adapters/tauriRuntimeAdapter.ts', 'utf-8'));
    expect(browserSrc).toContain("return 'web';");
    expect(tauriSrc).toContain("return 'windows';");
  });

  it('exposes the shared platform surface (os, isTouch, isMac, isMobile)', () => {
    stubEnv({ userAgent: DESKTOP_UA, platform: 'Win32', touch: false });
    const p = new BrowserRuntimeAdapter().platform as unknown as Record<string, unknown>;
    for (const key of ['os', 'isTouch', 'isMac', 'isMobile']) {
      expect(p).toHaveProperty(key);
    }
  });

  it('DeviceProfile user-facing flags live in settings (showMobileAccessoryBar, touchOptimized)', () => {
    const s = useSettingsStore.getState();
    expect(typeof s.settings.showMobileAccessoryBar).toBe('boolean');
    expect(typeof s.settings.touchOptimized).toBe('boolean');
  });
});