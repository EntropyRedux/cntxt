# PANEL APPS: VISION DOCUMENT
Project: CNTXT (ContextPad)
Version: v0.2 (decisions incorporated)
Status: Draft (pre-implementation)
Date: 2026-10-09
Scope: Desktop first; Web and Android follow after stabilization

---

## 1. Vision

Panel Apps let users turn a standalone, self-contained HTML document into a persistent mini-app inside CNTXT. Each app gets a name and icon, appears on the left rail, and opens in the right panel. It runs like a page in a browser, with its own runtime and its own persistent state. CNTXT hosts and renders it.

The editor is offline-first, and so are panel apps by default. The user can always see whether an app is fully offline-ready or depends on the network. The design is extensible: HTML is the first runtime, and other compatible runtimes can be added later through a registry.

## 2. Goals and Non-Goals

**Goals (MVP)**
- Create an app from an existing file or open tab, or from an AI-generated blueprint/prompt.
- Builder panel to set name, icon (built-in icon pack), and configuration.
- Dynamic, scrollable rail icons; click opens the app in the right panel.
- Apps persist their own state across restarts.
- Each app is a single `.cntxt` file (markdown) that is its own source of truth.
- Clear "Offline-ready" vs "Needs network" distinction per app.
- Strong isolation from CNTXT internals (IPC, tokens, storage).
- Per-app origin isolation (subject to Phase 0 spike).

**Non-Goals (MVP)**
- App-to-CNTXT communication (deferred; channel stubbed only).
- Cloud sync of app runtime data (IndexedDB stays device-local).
- Web and Android support (after desktop is stable).
- Multi-file apps or relative assets.
- Automatic app splitting.

## 3. User Workflow

1. **Entry points:** rail "App Builder" button, and tab header context menu > "Set as panel app" (preloads the builder with that tab).
2. **Choose source:**
   - **A. Existing file or tab:** pick an HTML file or open tab.
   - **B. Blueprint/prompt:** answer build questions or pick a prompt template (from the app's templates or a separate file), copy the prompt to any AI, then paste or import the result.
3. **Configure:** name, icon, description, panel width, network mode.
4. **Pre-flight check:** warnings plus the Offline-ready / Needs network badge.
5. **Create:** a new `.cntxt` file is generated, the rail icon is added, and the app opens.
6. **Use and iterate:** edit the `.cntxt` in the normal editor; save triggers reload.
7. **Manage:** rename, change icon, reload, export/import data, delete.

## 4. Core Concepts

### 4.1 The `.cntxt` app file (single source of truth)
- Creating an app generates a new `.cntxt` file, which is markdown.
- The original document becomes irrelevant to the app once created. It is never modified, and there is no link back: no `appSourceOf`, no re-fork.
- No separate sidecar. The `.cntxt` file carries everything:
  - **Frontmatter:** the manifest (validated with Zod).
  - **Body:** the HTML inside a fenced code block.
- **Extraction rule:** the host takes the first `html` fence in the body.
- **Fence collisions:** if the HTML contains backtick runs (for example in script strings), the generator uses a fence longer than the longest backtick run found in the HTML.
- The protocol handler parses the frontmatter and fence and serves only the extracted HTML. Parse or validation failure shows the error overlay.
- Users can edit the file in the normal editor. Plain text, no lock-in.

### 4.2 Manifest (frontmatter)
Defined in `contracts/data_shapes.ts`, validated with Zod.

| Field | Purpose |
|---|---|
| `id` | Stable app ID (drives origin and storage) |
| `name` | Display name |
| `icon` | Icon-pack key (strictly validated) |
| `description` | Optional |
| `runtime` | `'html'` (extensible) |
| `network` | `'offline' | 'cdn'` (see 4.4) |
| `panelWidth` | Default right-panel width |
| `createdFrom` | `'file' | 'tab' | 'prompt'` |
| `schemaVersion` | For migrations |

### 4.3 Runtime registry (extensibility)
`AppRuntime` interface: `id`, `languages[]`, `mount(container, source, manifest)`, `dispose()`. HTML is the first implementation. Future candidates: Markdown plus widgets, AST action scripts.

### 4.4 Offline-first and network mode
- The pre-flight scans the HTML for external references (`src`, `href`, `@import`, `fetch`).
  - None found: badge **Offline-ready**.
  - Any found: badge **Needs network**, with the references listed.
- Manifest `network` field:
  - `offline` (default): CSP blocks all external loads (`connect-src 'none'`, no external scripts).
  - `cdn`: external script loading allowed, but only when the user is logged in.
- The login gate is a product decision, not a security boundary. CDN scripts still run in the isolated app origin either way. The app origin never sees the CNTXT session.
- The host passes the network flag to the protocol handler at mount time, and the handler picks the CSP. Login or logout takes effect on the next mount or reload.
- The badge reflects the static scan only. It does not claim runtime connectivity.

### 4.5 GitHub sync
- Logging in enables syncing `.cntxt` app files to GitHub, using the existing Personal GitHub library flow. Apps are plain markdown, so no special handling is needed.
- App runtime data (IndexedDB) remains device-local. This must be stated in the builder.

## 5. Architecture

### 5.1 Layers
- **Presenters (pure UI):** builder panel, rail items, app panel container. Props and callbacks only.
- **Contract:** manifest schema plus `IAppHost` inside `IRuntimeBridge`.
- **Adapter (desktop first):** protocol handler and app mounting.

### 5.2 IAppHost
```ts
mount(appId, container)
unmount(appId)
clearData(appId)
```
Desktop implements it first. Web and Android later implement it against the same acceptance criteria.

### 5.3 Desktop hosting
- Custom protocol serving the extracted HTML by `appId`, rendered in an iframe in the right panel.
- **Per-app origin** so apps cannot read each other's storage. Fallback (only if the spike fails on any OS): shared origin plus a storage-namespacing shim and a trust note.
- App gets real origin storage (`localStorage`, IndexedDB).
- Apps must NOT reach Tauri IPC, `get_session_token`, or CNTXT storage.
- Per-app response headers, with CSP chosen from `network`.
- Size limits enforced at both builder and protocol handler (see section 8).
- `postMessage` channel scaffolded in the wrapper (unused in MVP) for future CNTXT-to-app communication.

## 6. Key Decisions

| # | Decision | Resolution |
|---|---|---|
| 1 | Hosting (desktop) | Custom protocol + iframe |
| 2 | Origin isolation | Per-app origin; conditional on Phase 0 spike on Windows, macOS, Linux; shared-origin fallback |
| 3 | Source of truth | Single `.cntxt` file (frontmatter manifest + html fence); no sidecar |
| 4 | Link to original | None; one-time copy, original irrelevant |
| 5 | Data cleanup on delete | Spike per-origin wipe; prefix shim as fallback; disclose any residue |
| 6 | Reload | On save plus manual reload (live reload opt-in later) |
| 7 | Network | Offline first; `cdn` mode login-gated; badge from static scan |
| 8 | Rail overflow | No cap; rail scrolls |
| 9 | Large apps | Warn, show size contributors, offer "split with AI" prompt; no automatic split |

## 7. Builder Panel Design

### Flow A: Existing file or tab
- Pick source > name > icon > config > Create (generates the `.cntxt`).
- **Pre-flight checks (warn, do not block, except hard size limit):**
  - External URLs (drives the badge).
  - Size over soft/hard limits, with a list of the largest contributors (base64 images, inlined libraries, data blobs).
  - Missing doctype or `<meta viewport>`.
  - Use of `parent` or `top` (unavailable from the sandboxed frame).
- Live preview once the host exists; placeholder before then.

### Flow B: Blueprint / prompt
- **Questions:** purpose, inputs and outputs, data to persist, layout and panel width, theme (light/dark parity), optional template.
- **Template:** pick from existing templates or a separate file; it merges with the answers into one prompt, not two competing prompts.
- **Generated prompt hard-codes runtime constraints:**
  - Single self-contained HTML file.
  - No CDN or network calls (unless the user opts into `cdn`).
  - Persist via `localStorage`/IndexedDB.
  - No Tauri or parent-window APIs.
  - Size limit.
  - Reply with one code block only.
- **Close the loop:** "Paste AI result" or "Import from file" feeds into Flow A's pre-flight and `.cntxt` generation.

### Large apps: "split with AI"
- No automatic splitting, because a single HTML file usually shares state and functions across scripts.
- First show what makes the app large; this often removes the need to split.
- Otherwise offer a generated prompt (reusing Flow B's generator) telling an AI to divide the app into two self-contained apps. Results come back through the normal import path.

### Shared
- Save builder drafts so closing mid-flow loses nothing.
- Icons from the existing icon pack only. New icons can be added later; not an MVP concern.

## 8. Size Limits

- Two thresholds, checked in bytes, kept as single constants in one config:
  - **Soft limit:** pre-flight warns "large app, may be slow".
  - **Hard limit:** builder blocks creation, and the protocol handler refuses to serve larger content.
- Initial placeholders (about 512 KB soft, about 2 MB hard) are heuristics, not measurements.
- Base64 content inflates size by about 33%.
- **Basis for the real values (Phase 0 measurement):** load test HTML at 0.5, 1, 2 and 5 MB; record WebView time-to-render and CodeMirror editor lag on the slowest target. Also align the soft limit with the existing large-document handling threshold. Set the limits from those numbers.

## 9. Security Model

- Separate per-app origin; no shared storage with CNTXT.
- No IPC capability or session token reachable from the app origin; covered by a Rust test in the existing security suite.
- Serve only the extracted HTML of the stored `.cntxt`, keyed by `appId`; no path traversal, no arbitrary file serving.
- Restrictive CSP by default (`offline`); `cdn` relaxes only script loading, and only when logged in.
- Do not reuse `sanitizePreviewHtml`; isolation is the boundary, not sanitization.
- Visible error overlay for broken or crashing apps and for `.cntxt` parse failures (Pillar 9: no silent failures).

## 10. State and Data Lifecycle

- App state persists in the app's own storage on its origin.
- Device-local only; GitHub sync covers the `.cntxt` file, not runtime data.
- Storage can be evicted by the OS or WebView; provide export/import of app data.
- Delete app = remove the `.cntxt`, the rail entry, and wipe storage (completeness depends on the spike; disclose any residue).

## 11. Rail and Navigation

- Dynamic rail icons, one per app; the rail scrolls, with no cap.
- Click opens the app in the right panel; width from the manifest.
- Mobile (later): bottom nav cannot fit many apps, so it needs an overflow or launcher pattern. `onHardwareBack` should close the app panel first.

## 12. Implementation Plan

**Order:** manifest and `.cntxt` format > builder UI > stub host > real host. Spikes run in parallel because they decide manifest fields.

**Phase 0: Spikes**
- Per-app origin on Windows, macOS and Linux.
- Per-origin storage wipe.
- IPC isolation proof (Rust test).
- Size load test (0.5, 1, 2, 5 MB) to set limits.

**Phase 1: Contract and format**
- Manifest schema and Zod validators.
- `.cntxt` generator (frontmatter + dynamic-length fence) and parser (first `html` fence).

**Phase 2: Builder UI**
- Flow A first: file/tab, name, icon, config, pre-flight with badge, create.
- Tab context menu entry, drafts, scrollable dynamic rail icons.
- Flow B after: questions, templates, prompt generator, paste/import, split-with-AI prompt.

**Phase 3: Host**
- `IAppHost` in `IRuntimeBridge`; stub for wiring first.
- Protocol handler, per-app origin, CSP by `network`, size enforcement, error overlay, reload on save.

**Phase 4: Harden**
- Vitest: manifest, `.cntxt` parse/generate (including fence collisions), pre-flight scan.
- Rust: path traversal, headers, IPC isolation, size refusal.
- Playwright: create > open > persist > restart > data survives.
- Update `project_brief` invariants and the living context document.

**Later:** web port (separate sandbox origin), Android port (spike `WebViewAssetLoader` or request interception first), app-to-CNTXT messaging, additional runtimes.

## 13. Acceptance Criteria (MVP, desktop)

- User can create an app from a file, a tab, or a pasted AI result.
- A new `.cntxt` file is generated; the original is unchanged and unlinked.
- `.cntxt` with HTML containing triple backticks still parses correctly.
- App appears on the scrollable rail and opens in the right panel.
- App state survives restart.
- Each app has its own origin and cannot read another app's storage.
- App cannot call IPC, read the session token, or access CNTXT storage (tested).
- Offline-ready / Needs network badge is shown and matches the static scan.
- `cdn` apps load external scripts only when logged in.
- Oversized apps trigger soft warnings and hard blocking, with contributors listed.
- Broken apps and bad `.cntxt` files show an error overlay, not a blank panel.
- Deleting an app removes its file and rail entry, with storage cleanup status disclosed.

## 14. Open Questions

1. Does per-app origin pass the Phase 0 spike on all three desktop OSes?
2. Final soft and hard size limits (from Phase 0 measurements).
3. Does per-origin storage wipe work, or is the prefix shim needed?
4. Should live-reload-while-typing be offered post-MVP?

### Resolved
- Icons: use the existing pack; adding icons is not an MVP concern.
- Rail: scrolls, no cap.
- Network: offline first; `cdn` mode login-gated.
- Source of truth: single `.cntxt` file; original irrelevant; no re-fork.
- Large apps: warn and offer split-with-AI prompt; no auto-split.
