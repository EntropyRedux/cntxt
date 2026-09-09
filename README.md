# CNTXT

**A reimagining of ContextPad** — a Tauri v2 desktop application for structured writing, prompt engineering, and workflow automation.

**Status:** Active development (v0.1.0) — not yet production-ready. See [CHANGELOG.md](CHANGELOG.md) and the audit notes below.

## What It Is

CNTXT builds on the ContextPad concept with a clean, portable frontend architecture:

- **Portability-first** — a typed `IRuntimeBridge` contract (`src/ui-contract/bridgeContract.ts`) is the *only* boundary between the UI and the platform (Tauri desktop, web, or mock). No component, store, or service touches `window`, `navigator`, `localStorage`, or `indexedDB` directly; all platform access lives in `src/adapters/`.
- **Modular shell architecture** — Classic / Prototype / Workbench shell modes with a typed design system (`src/design/`) and primitive component library (`src/primitives/`).
- **Tauri v2 desktop runtime** — native Rust commands for file operations (`rfd` dialogs), window management, keyring secrets, and a live preview server (`axum` + WebSocket).

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

## Current Status & Known Issues

- **Not production-ready.** A full audit (2026-09-08) identified critical issues to resolve before shipping:
  - **CRITICAL:** action-sandbox bypass (`new Function()`), ~357 MB gzipped bundle, zero automated tests.
  - **HIGH:** path-traversal validation flaw in Rust `validate_path`, CSP `unsafe-eval`, unused dependencies, no ESLint.
  - A reconciliation plan for porting the redesigned AI Studio frontend into this repo is in progress.
- **Roadmap:** see [CHANGELOG.md](CHANGELOG.md) for the pending work and release history.

## Related

- Original baseline: [ContextPad](https://github.com/EntropyRedux) (v1.11.x)
- [CHANGELOG.md](CHANGELOG.md) — release history and build tracking

---

**License:** GPL-3.0  
**Author:** entropy_redux