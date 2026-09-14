# CNTXT

**A reimagining of ContextPad** — a cross-platform application (Desktop, Web, and Mobile for Android via Tauri v2) for structured writing, prompt engineering, and workflow automation.

**Status:** Active development (v0.2.0) — full-codebase security remediation complete. See [CHANGELOG.md](CHANGELOG.md) and the audit notes below.

## What It Is

CNTXT builds on the ContextPad concept with a clean, portable frontend architecture:

- **Portability-first** — a typed `IRuntimeBridge` contract (`src/ui-contract/bridgeContract.ts`) is the *only* boundary between the UI and the platform (Tauri desktop, Android mobile, web, or mock). No component, store, or service touches `window`, `navigator`, `localStorage`, or `indexedDB` directly; all platform access lives in `src/adapters/`.
- **Modular shell architecture** — Classic / Prototype / Workbench shell modes with a typed design system (`src/design/`), primitive component library (`src/primitives/`), and touch-friendly mobile accessory toolbar (`MobileAccessoryBar`).
- **Tauri v2 runtime** — native Rust commands for file operations (`rfd` dialogs on desktop, Scoped Storage plugins on mobile), window management, keyring secrets, and a live preview server (`axum` + WebSocket).

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

> **Not in this repo:** `contextpad_replica_ai-studio/` (the AI Studio UI/UX design source) and
> `generated_documents/` (audit/reconciliation working papers) are intentionally excluded.
> The AI Studio build is the frontend design source and is ported into this repo via the
> typed bridge contract.

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

- **Under Active Development (v0.2.0)**:
  - **Automated Test Coverage**: 120 unit tests passing across 14 suites via Vitest (`npm test`).
  - **Platform Purity**: `npm run lint` scans 113 files with zero platform leaks outside `src/adapters/`.
  - **Security Hardening**: Rust commands gated to the `main` window; path canonicalization and canonical system root whitelisting; dangerous shell injection eliminated in `open_external`; sandbox prototype-pollution defenses active.
  - **Interactive Action System**: In-document action buttons (`[[action:id]]`), extensible `FormulaEngine` registry with 50+ built-ins, and tri-state selection behavior (`auto`, `replace`, `insert`).
  - **Open Extensibility**: Runtime `SlashCommandRegistry` (`registerCommand` / `unregisterCommand` / metadata catalog) replaces the hardcoded static slash-command list.
- **Living Context & Roadmap**:
  - Full living context and architecture logs: `generated-documents/context/living_context.md`.
  - Release history and change notes: [CHANGELOG.md](CHANGELOG.md).

## Related

- Original baseline: [ContextPad](https://github.com/EntropyRedux) (v1.11.x)
- [CHANGELOG.md](CHANGELOG.md) — release history and build tracking

---

**License:** GPL-3.0  
**Author:** entropy_redux