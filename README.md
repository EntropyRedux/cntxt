# CNTXT

**A reimagining of ContextPad** — a cross-platform application (Desktop on Windows / Linux / macOS, Web, and Mobile for Android via Tauri v2) for structured writing, prompt engineering, and workflow automation.

**Status:** Production Ready (v0.3.9) — FG-09 Large Document Truncation & Mobile UI Ergonomics, FG-08 Android APK native mobile runtime, dual-entry-point architecture, FG-07 Editor Resiliency, multi-tab state preservation, and power user tools complete. See [CHANGELOG.md](CHANGELOG.md) for full details.

## Downloads (v0.3.9)

### Windows
| Package | Format | Architecture | Download Link | Verification / Signature |
|:---|:---:|:---:|:---:|:---:|
| **Standard Setup** | `.exe` (NSIS) | Windows x64 | [Download CNTXT_0.3.9_x64-setup.exe](https://github.com/EntropyRedux/cntxt/releases/download/v0.3.9/CNTXT_0.3.9_x64-setup.exe) | Signed (Authenticode SHA256 + RFC 3161) |
| **Enterprise Installer** | `.msi` (WiX) | Windows x64 | [Download CNTXT_0.3.9_x64_en-US.msi](https://github.com/EntropyRedux/cntxt/releases/download/v0.3.9/CNTXT_0.3.9_x64_en-US.msi) | Signed (Authenticode SHA256 + RFC 3161) |
| **Standalone Portable** | `.exe` (Portable) | Windows x64 | [Download CNTXT_0.3.9_portable.exe](https://github.com/EntropyRedux/cntxt/releases/download/v0.3.9/CNTXT_0.3.9_portable.exe) | Standalone (Zero-install executable) |

### Android
| Package | Format | Architecture | Download Link | Verification |
|:---|:---:|:---:|:---:|:---:|
| **Android Release APK** | `.apk` | Android (arm64-v8a) | [Download app-arm64-release.apk](https://github.com/EntropyRedux/cntxt/releases/download/v0.3.2/app-arm64-release.apk) | Signed with Release Keystore / Installable via ADB |

### Linux
| Package | Format | Architecture | Download Link | Verification |
|:---|:---:|:---:|:---:|:---:|
| **Debian Package** | `.deb` | amd64 | [Download CNTXT_0.3.0_amd64.deb](https://github.com/EntropyRedux/cntxt/releases/download/v0.3.0/CNTXT_0.3.0_amd64.deb) | SHA256: `d9921c3873cafbc3a5a611d274d2c2f6c1e70535154b462efb1c401c59ca6016` |
| **Standalone Portable** | Binary | x64 | [Download cntxt-portable](https://github.com/EntropyRedux/cntxt/releases/download/v0.3.0/cntxt-portable) | SHA256: `6cef65f7909299e8f54b183783fff18443268889a6e480f3c26bde8c90ddf1ff` |

## What It Is

CNTXT builds on the ContextPad concept with a clean, portable frontend architecture:

- **Portability-first** — a typed `IRuntimeBridge` contract (`src/ui-contract/bridgeContract.ts`) is the *only* boundary between the UI and the platform (Tauri desktop, Android mobile, web, or mock). No component, store, or service touches `window`, `navigator`, `localStorage`, or `indexedDB` directly; all platform access lives in `src/adapters/`.
- **Modular shell architecture** — Classic / Prototype / Workbench shell modes with a typed design system (`src/design/`), primitive component library (`src/primitives/`), and touch-friendly mobile accessory toolbar (`MobileAccessoryBar`).
- **Tauri v2 runtime** — native Rust commands for file operations (`rfd` dialogs on desktop, Scoped Storage plugins on mobile), window management, sandboxed keyring/storage secrets, and client-side LivePreview with synchronized scrolling and markdown decoration rendering.
- **Native Android APK** — compiled with Rust JNI cdylib (`libcntxt_lib.so`), Kotlin `MainActivity` with edge-to-edge safe area handling, and native Android back-button handshake for priority overlay dismissal.

## Repository Layout

```text
CNTXT/
├── src/                    # Frontend (React 19 + TypeScript + Tailwind 4 + Zustand)
│   ├── adapters/           # Runtime bridge adapters (browser, mock, Tauri)
│   ├── ui-contract/        # Pure TypeScript contracts (zero native imports)
│   ├── design/             # Design system tokens (colors, spacing, typography)
│   ├── primitives/         # Atomic UI components (Button, Panel, Card, ...)
│   ├── shell/              # Shell frames (ShellFrame, Classic/Prototype/Workbench)
│   ├── components/         # Domain components (Editor, Sidebar, Modals, ...)
│   ├── store/              # Zustand state stores
│   ├── services/           # Business logic (formula parser, token estimator, sandbox)
│   └── extensions/         # CodeMirror 6 extensions
├── src-tauri/              # Rust backend (Tauri v2)
│   ├── capabilities/       # Tauri permission capabilities
│   └── src/commands/       # Native IPC commands (file, window, secrets)
├── index.html
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+
- Rust toolchain (for desktop builds)
- Linux libraries (Debian/Ubuntu/Mint):
  ```bash
  sudo apt install -y libssl-dev libgtk-3-dev libwebkit2gtk-4.1-dev libdbus-1-dev libx11-dev
  ```

### Frontend (web)
```bash
npm install
npm run dev        # Vite dev server
npm run build      # Production build
npm run preview    # Preview production bundle
npm run lint       # TypeScript typecheck + platform-leak scan
```

### Desktop (Tauri)
```bash
npm run tauri:dev      # Run with Tauri desktop shell
npm run tauri:build    # Production build + platform bundles
```

## Architecture Rules

The codebase enforces a strict platform boundary. A regression guard
(`scripts/check-platform-leaks.mjs`) runs as part of `npm run lint` and scans
`src/` (excluding `src/adapters/`) for forbidden tokens (`localStorage`,
`navigator.`, `window.open`, `document.`, `indexedDB`), failing the build if any
are found.

- Only `src/adapters/` may import platform APIs.
- `src/ui-contract/` and `src/design/` are pure type/value modules — no runtime imports.
- Stores are persistence-agnostic; all persistence flows through `bridge.storage`.
- Components use `bridge.clipboard` / `bridge.window` — never `navigator.clipboard` or `window.open` directly.

## Current Status & Verification
 
- **Production Release (v0.3.9)**:
  - **Large Document Truncation & TOC Chunk Loading**: Intercepts large files exceeding configurable thresholds (`enableLargeDocDetection`, default 500KB / 10,000 lines; 150KB / 2,500 lines in touch mode) with an interactive table-of-contents checklist to load individual sections or the entire file safely.
  - **Modernized Adaptive Variable Filler Modal**: Dual-mode layout featuring desktop 50/50 split and mobile full-screen segmented sheet (`[ Form ]` / `[ Preview ]`), dynamic `window.visualViewport` sizing to clear software keyboards, sticky `< Prev` / `Next >` navigation strip with required count, and auto-growing textareas.
  - **Granular Variable Extraction Operations**: 4 built-in action presets under `EXTRACTION` category: `Extract Answered Variables` (Markdown summary table), `Extract Rows With Variables` (filtered rows), `Extract Rows Without Variables` (static boilerplate), and `Selection: Extract Variables` (checklist).
  - **Draggable & Edge-Anchored Variable Navigator FAB**: Original canvas-level floating navigator upgraded with zero-latency 120fps direct drag transforms, jitter-free hover, and magnetic horizontal edge-snapping (12px left/right margins) within the editor canvas. Single-tap to jump to next variable, double-tap to open form filler.
  - **Signed Windows Installer Packages**: Official Windows NSIS setup (`dist-installer/CNTXT_0.3.9_x64-setup.exe`), WiX MSI (`dist-installer/CNTXT_0.3.9_x64_en-US.msi`), and standalone zero-install executable (`dist-portable/CNTXT_0.3.9_portable.exe`), digitally signed with Authenticode SHA256 and RFC 3161 timestamps via `npm run package:sign`.
  - **Automated Test Coverage**: 341 unit tests passing across 36 suites via Vitest (`npm test`); 21 Playwright E2E tests green in headless Chromium (`npm run test:e2e`).
  - **Platform Purity**: `npm run lint` scans 121 files with zero platform leaks outside `src/adapters/` and 100% canonical contract parity.
- **Living Context & Roadmap**:
  - Full living context and architecture logs: `generated-documents/context/living_context.md`.
  - Release history and change notes: [CHANGELOG.md](CHANGELOG.md).

## Related

- Original baseline: [ContextPad](https://github.com/EntropyRedux) (v1.11.x)
- [CHANGELOG.md](CHANGELOG.md) — release history and build tracking

---

**License:** GPL-3.0  
**Author:** entropy_redux
