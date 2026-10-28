import { describe, it, expect, vi } from 'vitest';
import { AndroidRuntimeAdapter } from '../src/adapters/androidRuntimeAdapter';
import { dismissActiveCntxtOverlayPopover } from '../src/extensions/liveMarkdown/cntxtBlockOverlay';
import { validateRestGatewayConfig } from '../src/contracts/boundarySchemas';

describe('FG-24: Linux Desktop & Android Mobile v0.7.1 Port Verification', () => {
  it('AndroidRuntimeAdapter exposes functional REST API gateway with LAN capability', () => {
    const adapter = new AndroidRuntimeAdapter();
    expect(adapter.gateway.isAvailable()).toBe(true);
    expect(typeof adapter.gateway.start).toBe('function');
    expect(typeof adapter.gateway.stop).toBe('function');
    expect(typeof adapter.gateway.getStatus).toBe('function');
  });

  it('Tauri/Android runtime adapter detects .cntxt extension as markdown', () => {
    const adapter = new AndroidRuntimeAdapter() as unknown as {
      detectLanguage: (filename: string) => string;
    };
    expect(adapter.detectLanguage('agent_thread.cntxt')).toBe('markdown');
    expect(adapter.detectLanguage('README.md')).toBe('markdown');
  });

  it('dismissActiveCntxtOverlayPopover returns false when no overlay popover is open', () => {
    expect(dismissActiveCntxtOverlayPopover()).toBe(false);
  });

  it('Android platform bridge exposes keep-awake and Wi-Fi lock interfaces', () => {
    const adapter = new AndroidRuntimeAdapter();
    expect(typeof adapter.platform.setKeepScreenOn).toBe('function');
    expect(typeof adapter.platform.setWifiLock).toBe('function');

    // Calling them without AndroidBridge present does not throw
    expect(() => adapter.platform.setKeepScreenOn?.(true)).not.toThrow();
    expect(() => adapter.platform.setWifiLock?.(true)).not.toThrow();
  });

  it('RestGatewayConfigSchema validates gateway configs with LAN and Wi-Fi IP fields', () => {
    const validConfig = {
      enabled: true,
      port: 9876,
      authToken: 'cntxt_sec_1234567890abcdef1234567890abcdef',
      allowLan: true,
      lanIp: '192.168.1.35',
    };

    const result = validateRestGatewayConfig(validConfig);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.allowLan).toBe(true);
      expect(result.data.lanIp).toBe('192.168.1.35');
    }
  });
});
