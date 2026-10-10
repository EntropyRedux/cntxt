# CNTXT

**A reimagining of ContextPad** — a cross-platform application (Desktop on Windows / Linux / macOS, Web, and Mobile for Android via Tauri v2) for structured writing, prompt engineering, and workflow automation.

**Status:** Production Ready (v0.5.6) — Tri-Platform Suite (Web SaaS + Native Desktop + Android Mobile), Host Command Bus & RPC Bridge (`window.CNTXT` via `postMessage`), Sandboxed Mini Panel Apps co-processor engine with path traversal guards & dirty tab mediation, Blueprint Prompt Archetypes (`build`, `brainstorm`, `adapt`) with 2-way editor tab sync, 14-token universal theme sync, and Authenticode-signed packages. See [CHANGELOG.md](CHANGELOG.md) for full details.

## Downloads (v0.5.6)

### Windows
| Package | Format | Architecture | Download Link | Verification / Signature |
|:---|:---:|:---:|:---:|:---:|
| **Standard Setup** | `.exe` (NSIS) | Windows x64 | [Download CNTXT_0.5.6_x64-setup.exe](https://github.com/EntropyRedux/cntxt/releases/download/v0.5.6/CNTXT_0.5.6_x64-setup.exe) | Signed (Authenticode SHA256 + RFC 3161) |
| **Enterprise Installer** | `.msi` (WiX) | Windows x64 | [Download CNTXT_0.5.6_x64_en-US.msi](https://github.com/EntropyRedux/cntxt/releases/download/v0.5.6/CNTXT_0.5.6_x64_en-US.msi) | Signed (Authenticode SHA256 + RFC 3161) |
| **Standalone Portable** | `.exe` (Portable) | Windows x64 | [Download CNTXT_0.5.6_portable.exe](https://github.com/EntropyRedux/cntxt/releases/download/v0.5.6/CNTXT_0.5.6_portable.exe) | Standalone (Zero-install executable) |

### Android
| Package | Format | Architecture | Download Link | Verification |
|:---|:---:|:---:|:---:|:---:|
| **Android Release APK** | `.apk` | Android (arm64-v8a) | [Download app-arm64-release.apk](https://github.com/EntropyRedux/cntxt/releases/download/v0.5.2/app-arm64-release.apk) | Signed with Release Keystore / Installable via ADB |

### Linux
| Package | Format | Architecture | Download Link | Verification |
|:---|:---:|:---:|:---:|:---:|
| **Debian Package** | `.deb` | amd64 | [Download CNTXT_0.5.1_amd64.deb](https://github.com/EntropyRedux/cntxt/releases/download/v0.5.2/CNTXT_0.5.1_amd64.deb) | Verified Debian package bundle |
| **Standalone Portable** | Binary | x64 | [Download cntxt-portable](https://github.com/EntropyRedux/cntxt/releases/download/v0.5.2/cntxt-portable) | Standalone binary |

## What It Is

CNTXT builds on the ContextPad concept with a clean, portable frontend architecture:

- **Panel Apps Engine** — turn any standalone HTML document into a persistent, sandboxed mini-app within CNTXT. Includes a 3-step creation wizard (`AppBuilderPanel`), dynamic app rail (`AppRail`), offline-readiness preflight scanner, dedicated data partitions, and full lifecycle management (reload, reset state, reveal, edit, remove, and delete).
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
 
- **Production Release (v0.5.1)**:
  - **Tri-Platform Suite Alignment**: Full production parity across Web SaaS (Vercel + Supabase), Native Desktop (Windows / macOS / Linux via Tauri v2), and Mobile (Android via Tauri Mobile cdylib runtime).
  - **Brand Redesign & Master Iconography**: Universal deployment of high-resolution centered transparent brand icon across all desktop formats (`.ico`, `.png`, `Square*`), Android mipmap launcher densities (`ic_launcher*`), iOS/macOS (`icon.icns`), and Web (`favicon`, `logo.png`).
  - **Large Document Truncation & Safety Interlock**: Threshold-driven selective TOC loading with read-only preview mode locking to eliminate accidental disk file overwrite, accompanied by 1-click full document restoration.
  - **Full Codebase Security & Re-Audit Remediation (22/22 Findings Resolved)**: Complete remediation of findings R-01..R-13 and D-01..D-09 across 5 verification gates; dynamic widget sinks routed through `sanitizePreviewHtml`; strict Web CSP; single-use window session tokens; tightened loopback OAuth security without wildcard CORS; observable `useNotificationStore` feedback across storage adapters; zero untyped `any`.
  - **Signed Windows Installer Packages**: Official Windows NSIS setup (`dist-installer/CNTXT_0.5.1_x64-setup.exe`), WiX MSI (`dist-installer/CNTXT_0.5.1_x64_en-US.msi`), and standalone zero-install executable (`dist-portable/CNTXT_0.5.1_portable.exe`), digitally signed with Authenticode SHA256 and RFC 3161 timestamps via `npm run package:sign`.
  - **Automated Test Coverage**: 399 unit tests passing across 40 suites via Vitest (`npm test`); 24 Playwright E2E tests green on cold server; 8 Rust security tests passing (`cargo test`).
  - **Platform Purity**: `npm run lint` scans 145 files with zero platform leaks outside authorized adapters and 100% canonical contract parity.
- **Living Context & Roadmap**:
  - Full living context and architecture logs: `generated-documents/context/living_context.md`.
  - Release history and change notes: [CHANGELOG.md](CHANGELOG.md).

## Related

- Original baseline: [ContextPad](https://github.com/EntropyRedux) (v1.11.x)
- [CHANGELOG.md](CHANGELOG.md) — release history and build tracking

---

**License:** GPL-3.0  
**Author:** entropy_redux
