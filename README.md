# CNTXT

**A reimagining of ContextPad** — a cross-platform application (Desktop on Windows / Linux / macOS, Web, and Mobile for Android via Tauri v2) for structured writing, prompt engineering, and workflow automation.

**Status:** Production Ready (v0.3.2) — FG-08 Android APK native mobile runtime, dual-entry-point architecture, FG-07 Editor Resiliency, multi-tab state preservation, and power user tools complete. See [CHANGELOG.md](CHANGELOG.md) for full details.

## Downloads (v0.3.2)

| Package | Format | Platform / Architecture | Download Link | Verification / Signature |
|:---|:---:|:---:|:---:|:---:|
| **Standard Setup** | `.exe` (NSIS) | Windows x64 | [Download CNTXT_0.3.2_x64-setup.exe](https://github.com/EntropyRedux/cntxt/releases/download/v0.3.2/CNTXT_0.3.2_x64-setup.exe) | Signed (Authenticode SHA256 + RFC 3161) |
| **Enterprise Installer** | `.msi` (WiX) | Windows x64 | [Download CNTXT_0.3.2_x64_en-US.msi](https://github.com/EntropyRedux/cntxt/releases/download/v0.3.2/CNTXT_0.3.2_x64_en-US.msi) | Signed (Authenticode SHA256 + RFC 3161) |
| **Standalone Portable** | `.exe` (Portable) | Windows x64 | [Download CNTXT-portable.exe](https://github.com/EntropyRedux/cntxt/releases/download/v0.3.2/CNTXT-portable.exe) | Standalone (Zero-install executable) |
| **Android Release APK** | `.apk` | Android (arm64-v8a) | [Download app-arm64-release.apk](https://github.com/EntropyRedux/cntxt/releases/download/v0.3.2/app-arm64-release.apk) | Signed with Release Keystore / Installable via ADB |

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
- Rust toolchain (for the desktop app)

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
 
- **Production Release (v0.3.2)**:
  - **Android SAF Deep Traversal Fix**: Workspace Explorer now implements robust `DocumentsContract.buildChildDocumentsUriUsingTree` querying for infinitely deep subfolder traversal, bypassing Android's default 3-level limitation.
  - **Android APK Support (FG-08)**: Fully automated release APK packaging via `npm run package:android` (`scripts/build-android.ps1`), compiled with Rust JNI `cdylib` and Gradle, signed with release keystore (`app-arm64-release.apk`), and verified live via ADB on physical Android hardware.
  - **Signed Windows Installer Packages**: Official Windows NSIS installer (`dist-installer/CNTXT_0.3.0_x64-setup.exe`) and WiX MSI (`dist-installer/CNTXT_0.3.0_x64_en-US.msi`), signed with SHA256 Authenticode and DigiCert RFC 3161 timestamps via `npm run package:sign`. Standalone portable executable in `dist-portable/CNTXT-portable.exe`.
  - **Automated Test Coverage**: 272 unit tests passing across 27 suites via Vitest (`npm test`); 21 Playwright E2E tests green in headless Chromium (`npm run test:e2e`).
  - **Platform Purity**: `npm run lint` scans 119 files with zero platform leaks outside `src/adapters/` and 100% contract parity.
  - **Window Resize Remediation**: Synchronous dark WebView2 background (`#141417`), dark theme, and percentage sizing eliminating resize drag lag and white canvas artifacts.
  - **Per-Tab Undo/Redo & State Preservation**: Persistent single `EditorView` with isolated undo/redo history stacks and scroll offset caching across unlimited tab switches.
  - **Extended Markdown Syntax**: Full support for `***bold+italic***`, `==highlight==`, `~subscript~`, and `^superscript^` in both RAW and Rendered modes.
  - **Search-Unveil across Rendered Blocks**: Live search in tables, diagrams, and math blocks automatically unveils raw source markdown for instantaneous inline editing.
  - **Security Hardening**: Main-window command gating, path canonicalization, system root whitelisting, dangerous shell metacharacter sanitization, and sandboxed JS execution.
  - **Interactive Action System & Formulas**: Clickable in-document action buttons (`[[action:id]]`), extensible `FormulaEngine` registry with 50+ built-ins, and tri-state selection behavior (`auto`, `replace`, `insert`).
  - **Built-in Power User & Markdown Guides**: Interactive tutorials accessible directly from the Help menu with live action buttons and formula calculators.
- **Living Context & Roadmap**:
  - Full living context and architecture logs: `generated-documents/context/living_context.md`.
  - Release history and change notes: [CHANGELOG.md](CHANGELOG.md).

## Related

- Original baseline: [ContextPad](https://github.com/EntropyRedux) (v1.11.x)
- [CHANGELOG.md](CHANGELOG.md) — release history and build tracking

---

**License:** GPL-3.0  
**Author:** entropy_redux
