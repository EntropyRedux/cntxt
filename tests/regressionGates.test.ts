import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..');

function listSourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (!entry.includes('node_modules')) listSourceFiles(full, acc);
    } else if (/\.(ts|tsx)$/.test(entry) && !entry.includes('.test.')) {
      acc.push(full);
    }
  }
  return acc;
}

const SRC_FILES = listSourceFiles(join(ROOT, 'src'));

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf-8');
}

const PREVIEW_COMMANDS = [
  'start_preview_server',
  'stop_preview_server',
  'update_preview_content',
  'update_preview_settings',
];

describe('FG-08 regression gates', () => {
  it('no stale Axum preview-server invoke identifiers anywhere in src/', () => {
    for (const file of SRC_FILES) {
      const content = readFileSync(file, 'utf-8');
      for (const cmd of PREVIEW_COMMANDS) {
        expect({ file, hit: content.includes(cmd) }).toEqual({ file, hit: false });
      }
    }
  });

  it('no @tauri-apps/api import outside src/adapters/', () => {
    for (const file of SRC_FILES) {
      const normalized = file.replace(/\\/g, '/');
      if (normalized.includes('/src/adapters/')) continue;
      const content = readFileSync(file, 'utf-8');
      expect({ file, leaksTauri: /@tauri-apps\/api/.test(content) }).toEqual({ file, leaksTauri: false });
    }
  });

  it('mock barrel still exports the six quarantined payloads + mode flag', () => {
    const mocks = read('mocks/index.ts');
    for (const name of [
      'IS_PROTOTYPE_DEMO_MODE',
      'DEFAULT_TEMPLATES',
      'DEFAULT_ACTIONS',
      'DEFAULT_PINNED_TABS',
      'INITIAL_PROJECT_FILES',
      'DEFAULT_PINNED_ITEMS',
      'DEFAULT_OPENED_HISTORY',
    ]) {
      expect({ token: name, present: mocks.includes(name) }).toEqual({ token: name, present: true });
    }
  });

  it('mock barrel no longer defines WELCOME_DOCUMENT inline (TR-013)', () => {
    const mocks = read('mocks/index.ts');
    expect(mocks).not.toMatch(/export const WELCOME_DOCUMENT\s*=/);
    expect(mocks).not.toContain('Welcome to ContextPad');
  });

  it('preview E2E spec remains present as the pruning regression guard', () => {
    const spec = read('e2e/preview.spec.ts');
    expect(spec).toContain('sanitizePreviewHtml');
  });

  it('tauriRuntimeAdapter window command surface is unchanged (TR-018 unit-return guard)', () => {
    const adapter = read('src/adapters/tauriRuntimeAdapter.ts');
    for (const cmd of [
      'minimize_window',
      'maximize_window',
      'unmaximize_window',
      'close_window',
      'start_dragging',
      'new_window',
    ]) {
      expect({ cmd, invoked: adapter.includes(`'${cmd}'`) }).toEqual({ cmd, invoked: true });
    }
  });

  it('Cargo topology still matches the FG-08 contract', () => {
    const cargo = read('src-tauri/Cargo.toml');
    expect(cargo).toContain('crate-type = ["staticlib", "cdylib", "rlib"]');
    expect(cargo).not.toMatch(/^\s*axum\s*=/m);
    expect(cargo).not.toMatch(/tauri-plugin-deep-link/m);
    const desktopSection = cargo.includes(
      "cfg(not(any(target_os = \"android\", target_os = \"ios\")))"
    );
    expect(desktopSection).toBe(true);
  });

  it('window commands keep desktop bodies behind the mobile-exclusion cfg (TR-018 shape)', () => {
    const window = read('src-tauri/src/commands/window.rs');
    expect(window).toContain('#[cfg(not(any(target_os = "android", target_os = "ios")))]');
  });

  it('tauri.conf.json CSP permits sandboxed panel app execution while enforcing strict base directives (F8.1 / P-01)', () => {
    const tauriConf = JSON.parse(read('src-tauri/tauri.conf.json'));
    const csp = tauriConf.app?.security?.csp || '';
    expect(csp).toBeDefined();
    const scriptSrcMatch = csp.match(/script-src\s+([^;]+)/);
    expect(scriptSrcMatch).not.toBeNull();
    const scriptSrc = scriptSrcMatch![1];
    expect(scriptSrc).toContain("'unsafe-inline'");
    expect(scriptSrc).toContain("'unsafe-eval'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
  });

  it('zero new Function or eval calls in src/services/ (P-01)', () => {
    const serviceFiles = listSourceFiles(join(ROOT, 'src/services'));
    for (const file of serviceFiles) {
      const content = readFileSync(file, 'utf-8');
      const codeOnly = content.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
      expect({ file, hasNewFunction: /\bnew\s+Function\b/.test(codeOnly) }).toEqual({ file, hasNewFunction: false });
      expect({ file, hasEval: /\beval\s*\(/.test(codeOnly) }).toEqual({ file, hasEval: false });
    }
  });

  it('secrets.rs has zero plaintext fallback file writing (P-02)', () => {
    const secrets = read('src-tauri/src/commands/secrets.rs');
    expect(secrets).not.toContain('.secrets_fallback.json');
    expect(secrets).not.toContain('save_fallback');
    expect(secrets).not.toContain('load_fallback');
  });

  it('capabilities do not grant core:default or allow-create-webview-window (P-03)', () => {
    for (const capFile of ['src-tauri/capabilities/default.json', 'src-tauri/capabilities/extra-windows.json']) {
      const cap = JSON.parse(read(capFile));
      expect({ capFile, hasCoreDefault: cap.permissions.includes('core:default') }).toEqual({ capFile, hasCoreDefault: false });
      expect({ capFile, hasCreateWebview: cap.permissions.includes('core:webview:allow-create-webview-window') }).toEqual({ capFile, hasCreateWebview: false });
    }
  });

  it('read_dir_internal redacts .env files (P-04)', () => {
    const fileRs = read('src-tauri/src/commands/file.rs');
    expect(fileRs).not.toContain('file_name != ".env"');
    expect(fileRs).toContain('if file_name.starts_with(\'.\') && file_name != ".gitignore"');
  });

  it('Cargo.toml excludes devtools from default features and specifies release optimizations (P-05)', () => {
    const cargo = read('src-tauri/Cargo.toml');
    expect(cargo).toMatch(/default\s*=\s*\[\s*\]/);
    expect(cargo).toContain('codegen-units = 1');
    expect(cargo).toContain('lto = "thin"');
    expect(cargo).toContain('opt-level = 3');
    expect(cargo).toContain('strip = true');
  });
});