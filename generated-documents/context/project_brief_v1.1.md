# PROJECT BRIEF
Version: v1.1
Last Updated: 2026-09-14
Status: [x] Draft  [x] Audited  [x] Approved

━━━ VISION ━━━
What this app is:
ContextPad (CNTXT) is a cross-platform structured workspace designed for technical drafting, prompt engineering, markdown documentation, and workflow automation.

What problem it solves:
Modern AI workflows require structured, token-conscious prompt drafting, rapid variable substitution, dynamic calculations, and sandboxed script execution without leaving the editor or relying on fragmented browser tabs.

Who it is for:
Solo software developers, AI principal architects, prompt engineers, and technical writers needing a fast, keyboard-first or touch-optimized, distraction-free markdown workbench across desktop, web, and mobile environments.

━━━ PLATFORM & RUNTIME CONTEXT ━━━
Target Platform(s):
  - Desktop: Windows, macOS, Linux (via Tauri v2 + Rust)
  - Web: Interactive Web Prototype
  - Mobile: Android (via Tauri v2 Mobile runtime; future iOS expansion)
Production Tech Stack: React 19 + TypeScript + Vite 6 + Zustand 5 + CodeMirror 6 + Tailwind CSS v4 + Rust (Tauri v2)
UI Specification Tool: AI Studio (Visual & behavioral reference prototype)
Native Architecture Pattern:
  - React/Tauri Desktop & Mobile: Universal Visual Presenters (`src/components/`, `src/shell/`, `src/components/Mobile/`) + Headless Zustand Stores (`src/store/`) + Runtime Adapters (`src/adapters/`) + Native IPC Commands (Rust `src-tauri`).
  - Mobile Runtime Context: Touch-first UI ergonomics, mobile virtual keyboard Markdown accessory bar (`MobileAccessoryBar`), responsive collapsible drawers/bottom navigation (`MobileBottomNav`), and mobile file storage integration via Android Scoped Storage / Storage Access Framework (SAF).

━━━ GOALS ━━━
Primary (must achieve):
- Decoupled, pure UI presentation layer with zero platform leaks.
- Real-time LLM token and cost estimation across major model families (Gemini, Claude, GPT, DeepSeek).
- Live split and in-place Markdown rendering supporting Mermaid diagrams, KaTeX formulas, and data tables.
- Sandboxed JavaScript user action runner with safe editor APIs.
- Prompt template manager with variable substitution modals.
- Clean tab management with pinned workflows, autosave, and virtual workspace explorer.
- Mobile touch readiness: responsive layout adaptation, mobile virtual keyboard accessory toolbar (`MobileAccessoryBar`), and touch-friendly tap targets.

Secondary (nice to have):
- Customizable formatting ribbon bar.
- Code snippet playground with dynamic formulas (`{=FORMULA()}`).
- Multi-theme engine with light/dark contrast parity.
- Mobile bottom navigation bar for quick panel switching on phone screens.

━━━ EXPLICIT NON-GOALS ━━━
What this app will NOT do:
- Cloud-hosted SaaS backend or telemetry servers (desktop-first, local-first, privacy-focused).
- Direct un-sandboxed shell command execution inside editor actions.
- Proprietary lock-in file formats (all content is stored as standard plain text / markdown).

━━━ CORE FEATURES ━━━
Feature Group: FG-01: Core Workspace Shell & Document Tab Lifecycle
- Multi-tab document workspace with dirty state tracking, closing, and reordering.
- Split screen live preview with synced scrolling.
- Centralized Theme Engine with 10 built-in themes.
- Status bar with document statistics (characters, words, lines, selection ranges).
- Mobile Shell Support: Virtual keyboard Markdown accessory bar (`MobileAccessoryBar`), mobile bottom nav (`MobileBottomNav`), and touchscreen density optimizations (`uiDensity: 'touch'`).

Feature Group: FG-02: Sandboxed JavaScript Actions & In-Document Widgets
- Secure action runner with `api` helpers (toast, getSelection, replaceSelection, wrapSelection, evaluateFormula).
- Pre-packaged utility actions (JSON formatting, template extraction, table to CSV).
- Action creation and editing modal with visual formula catalog and live test runner.
- In-document interactive action buttons (`[[action:id]]` / `[[action:id|Label]]`).

Feature Group: FG-03: Templates & Dynamic Formulas
- Reusable prompt engineering templates with `{{variable:default}}` syntax.
- Variable filler modal for rapid parameter injection.
- Extensible formula parsing engine (`FormulaEngine`) supporting dynamic runtime registration, text formatting, math, date/time, and selection directives.

Feature Group: FG-04: Native File System & Workspace Explorer
- File tree navigator with folder expansion and file filtering.
- Native open file, save file, and open folder dialogs (desktop OS dialogs; Android Scoped Storage / SAF).
- Recent file history and pinned document quick access.

━━━ BACKGROUND PROCESSES ━━━
Every background process MUST have an independently controllable user-facing toggle by design.
PLACEMENT RULE: Toggles must live in the application Settings panel and be hidden by default unless unlocked under an "Experimental Settings" / "Advanced" master toggle.

- Process: Live Token Estimator
  Purpose: Continuous heuristic token calculation and cost estimation on keystrokes
  Toggle: [x] planned (Settings -> Experimental)  [x] implemented

- Process: Document Autosave Loop
  Purpose: Debounced automatic persistence of buffer edits to storage
  Toggle: [x] planned (Settings -> Experimental)  [x] implemented

- Process: Live Markdown DOM-Sync
  Purpose: Synchronizes raw editor buffer with live rendered view
  Toggle: [x] planned (Settings -> Experimental)  [x] implemented

━━━ ERROR HANDLING, VALIDATION & USER NOTIFICATIONS ━━━
Form & Input Validation Standard: Type guards and boundary validation schemas for all modal inputs. Inline accessible error messages and error border styling.
User Notification & Toast Strategy: Global `useNotificationStore` displaying non-blocking toast banners with success, warning, info, and actionable error states.
Crash Resilience & Error Boundaries: React Error Boundaries around Editor, Preview, and Sidebar panels to catch unhandled rendering exceptions without crashing the shell.

━━━ CANONICAL DATA CONTRACTS ━━━
Canonical Data Shapes Location: /contracts/data_shapes.ts & /generated-documents/context/contracts/data_shapes.ts (Option B Mirror Synchronized)
Target Native Translation:
- Tab -> Rust struct / TypeScript interface / Kotlin data class
- Action -> Rust struct / TypeScript interface / Kotlin data class
- Template -> Rust struct / TypeScript interface / Kotlin data class
- VirtualFile -> Rust struct / TypeScript interface / Kotlin data class
- DeviceProfile / SupportedPlatformOS -> Rust struct / TypeScript interface

━━━ SECURITY CONSIDERATIONS ━━━
- User action sandbox must prevent constructor chaining escapes to the global window or Tauri IPC.
- Desktop file reads and writes must be constrained to user-selected paths via native OS dialogs with path canonicalization (R-009).
- Mobile (Android) file operations must adhere to Android Scoped Storage and Storage Access Framework (SAF) URI constraints.
