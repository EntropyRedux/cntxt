import { describe, it, expect } from 'vitest';
import { AndroidRuntimeAdapter } from '../src/adapters/androidRuntimeAdapter';
import { dismissActiveCntxtOverlayPopover } from '../src/extensions/liveMarkdown/cntxtBlockOverlay';

describe('FG-24: Linux Desktop & Android Mobile v0.7.1 Port Verification', () => {
  it('AndroidRuntimeAdapter exposes functional localhost REST API gateway', () => {
    const adapter = new AndroidRuntimeAdapter();
    expect(adapter.gateway.isAvailable()).toBe(true);
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
});
