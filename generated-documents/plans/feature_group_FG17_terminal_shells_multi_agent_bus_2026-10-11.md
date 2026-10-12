# FEATURE GROUP DEFINITION: FG-17 TERMINAL SHELLS & MULTI-AGENT BUS
Version: v1.0
Date: 2026-10-11
Author: Prod Agent
Target Platform: Desktop (Tauri v2 + Rust std::process/PTY), Web (Virtual Replay/Relay), Android (Safe disabled state)
Status: [x] Completed / Verified (589/589 Vitest passing, 9/9 Rust security tests passing)

---

## 1. Executive Summary & Scope

Feature Group 17 transforms CNTXT into an Agent Operating Canvas by introducing:
1. **Native Rust PTY Engine** in `src-tauri` using `portable-pty` on Desktop (`cfg(not(any(target_os = "android", target_os = "ios")))`).
2. **Tri-Platform Terminal Bridge Contract** (`ITerminalBridge` under `IRuntimeBridge`).
3. **The `.cntxt` Multi-Session Terminal Bus Format** (YAML manifest + JSON state transcript block).
4. **Headless State & Ring-Buffer Engine** (`terminalStore.ts`) preventing memory leaks during continuous stdout streaming.
5. **Universal Pure Presenters** (`TerminalView.tsx`, ANSI rendering, channel switcher, input prompt).
6. **Host Command Bus & Mini Panel App RPC Expansion** (`window.CNTXT.terminal.*`).
7. **Experimental Settings Gate** in `SettingsPanel.tsx` (`enableTerminalBus`).

---

## 2. Invariants & 9 Pillars Adherence

* **Pillar 1 (Production Ship Readiness & Mock Quarantine)**: Initial collections initialize empty `[]`. Simulated replay for Web/tests is quarantined.
* **Pillar 2 (Universal Presenter Purity)**: Zero `invoke()` or direct IPC in `TerminalView.tsx`. All interactions go through `useRuntimeBridge().terminal`.
* **Pillar 3 (Code Quality & Lifecycle)**: Strict typing, zero `any`, unregistering Tauri event listeners on unmount.
* **Pillar 4 (Modularity & Extensibility)**: Clean separation of Rust commands, Bridge adapter, Zustand store, and UI presenter.
* **Pillar 7 (Background Processes & Toggles)**: Process streaming and listeners gated behind Settings -> Experimental -> `enableTerminalBus` (disabled by default).
* **Pillar 8 (Deep Security & Sandboxing)**: Ephemeral session token authorization, root path canonicalization, command validation.
* **Pillar 9 (Validation & User Notifications)**: Zod boundary validation for RPC and spawn payloads, toast notifications for process lifecycle and failures.

---

## 3. Phased Implementation Roadmap

* **Phase 1: Canonical Contracts & Schemas**
  - Update `contracts/data_shapes.ts` and sync with `generated-documents/context/contracts/data_shapes.ts`.
  - Update `src/contracts/boundarySchemas.ts` with Zod validators.
* **Phase 2: Native Rust PTY Engine (`src-tauri`)**
  - Add `portable-pty` to desktop dependencies in `Cargo.toml`.
  - Create `src-tauri/src/commands/pty.rs` with token validation, session map, and streaming.
  - Wire commands in `src-tauri/src/lib.rs`.
* **Phase 3: Runtime Bridge & Headless Store**
  - Update `src/ui-contract/bridgeContract.ts` with `ITerminalBridge`.
  - Implement `tauriRuntimeAdapter.ts`, `browserRuntimeAdapter.ts`, and `androidRuntimeAdapter.ts`.
  - Create `src/stores/terminalStore.ts` with ring-buffer management.
* **Phase 4: Universal Terminal Presenter**
  - Create `src/components/Terminal/TerminalView.tsx` with ANSI parsing and theme token styling.
  - Wire terminal tab type into editor tab routing.
* **Phase 5: `.cntxt` Document Bus Persistence**
  - Extend format serializer/parser in `src/features/panelApps/format/cntxtApp.ts` or dedicated bus parser.
* **Phase 6: Host Command Bus Integration**
  - Expand `src/features/panelApps/rpc/hostCommandBus.ts` and `clientSdk.ts` with `terminal` domain.
* **Phase 7: Settings Gating & Verification Gates**
  - Add `enableTerminalBus` toggle to `SettingsPanel.tsx`.
  - Verify unit tests, linting, and build.
