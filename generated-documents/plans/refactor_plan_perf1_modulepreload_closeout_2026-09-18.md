# Refactor Plan — PERF-1 Modulepreload Closeout (Prod Agent Execution)

- **Date:** 2026-09-18
- **Author:** Independent Auditor (Pass 1) — for Prod Agent execution
- **Source:** `generated-documents/audits/raw_findings_perf1_modulepreload_2026-09-18.md`
- **Parent plan (archived):** `generated-documents/plans/archives/refactor_plan_full_audit_remediation_2026-09-18.md`

---

## 1. Objective

Close the one remaining PERF-1 acceptance gate: **remove `codemirror-*.js` and `mermaid-*.js` from the boot entry's modulepreload/static-import graph**, so CodeMirror and Mermaid are fetched/executed ONLY when the lazy `Editor`/`LivePreview` chunks actually load.

## 2. Root Cause (confirmed by control experiment)

- `manualChunks` in `vite.config.ts:30-39` groups `@codemirror`/`@lezer` and `mermaid` into dedicated chunks.
- Rollup then absorbs the shared Vite `modulepreload` polyfill helper (`vite:modulepreload-polyfill`) into one of those manual chunks (observed: into `codemirror-*.js`).
- The boot entry chunk statically imports from `codemirror-*.js` to reach that helper, pulling both heavy chunks into the boot graph (4.8 MB raw / ≈1.4 MB gzip fetched+executed at startup).
- Control experiment (manualChunks removed) produced zero modulepreload links → mechanism confirmed as chunk-layout, not source imports.

## 3. Approved Fix (human-approved via decision prompt 2026-09-18)

Add to `vite.config.ts` build block:
```
modulePreload: { polyfill: false },
```
- Targets `chrome120 / firefox120 / safari17` (vite.config.ts:26) all natively support `rel=modulepreload`; the polyfill exists only for legacy browsers.
- Removing the injected helper breaks the entry→codemirror static edge so Vite emits no modulepreload links for the heavy manual chunks; they become pure lazy-import chunks.
- `vite.config.ts` was already edited in the worktree with one line (line 27: `modulePreload: { polyfill: false }`) — Prod Agent must verify, build, and commit it.

## 4. Execution Steps

1. **Verify the config edit**: `vite.config.ts:27` contains `modulePreload: { polyfill: false },`.
2. **Rebuild** (system RAM was critically low — 0.5 GB free; close other processes or set `NODE_OPTIONS=--max-old-space-size=4096` before building):
   `npm run build`
   - **Gate A:** `dist/index.html` contains NO `<link rel="modulepreload" ... codemirror-*.js>` and NO mermaid modulepreload line; only the entry script remains.
   - **Gate B:** `dist/assets/` no longer contains a giant `codemirror-*.js` chunk (>1 MB); Editor lazy chunk (`Editor-*.js`) still exists separately.
   - **Gate C:** katex chunk still single (`katex-*.js`, ~262 KB).
   - Record exact output.
3. **Regression gates:**
   - `npm run lint` → exit 0, 0 platform leaks
   - `npm test` → 126/126
   - `cargo check` → exit 0
   - `npm run test:e2e` → expect **19/21** (2 known pre-existing `editor.spec.ts:28,38` failures — do NOT treat as regression; they trace to `living_context.md:109` deferred defect)
4. **Correction of LCD metric drift** in `generated-documents/context/living_context.md`:
   - `:102` change `E2E Tests: 21/21 green` → `19/21 (2 known pre-existing failures: editor.spec.ts:28,38 — tracked LCM:109)`.
   - `:273` change `npm run build OK (0 warnings)` → `npm run build OK (modulepreload polyfill disabled; codemirror/mermaid verified excluded from boot links run)`. Remove the false "0 warnings" claim or qualify it with the real remaining warnings.
5. **Commit** (branch `feat/studio-ui-port`), co-authored as Prod Agent:
   - `vite.config.ts` (modulePreload polyfill fix)
   - Flush worktree edits already prepared: `VariableFloatingNavigator.tsx` (codemirror dispatch decoupling), `ActionEditorModal.tsx`, `ActionManager.tsx`, `slashCommands.ts` (static action imports), `VariableFillerModal.tsx`, `TemplateRowItem.tsx`, `templateVariables.ts`, `templateVariableService.ts`, `ShellFrame.tsx` (live-markdown error banner listener).
   - Message suggestion: `fix(build): kill boot modulepreload for codemirror/mermaid by disabling polyfill helper`
6. **Update LCD feature table** for TR-012: append resolution note that PERF-1 gate now PASSES (codemirror/mermaid excluded from boot links post-build).

## 5. Non-Goals / Prohibitions (Auditor-invoked)

- Do NOT remove `manualChunks` entries for codemirror/mermaid (would re-merge CodeMirror into the Editor chunk and regress chunk boundaries).
- Do NOT alter `build.target`; polyfill removal is safe only for the declared modern target matrix.
- Do NOT change any `@codemirror` exports or extension internals; the boot graph is already clean at source level.
- Do NOT treat the 2 E2E failures as new defects.

## 6. Verdict Criteria

| Gate | Pass condition |
|---|---|
| A | No codemirror/mermaid modulepreload links in `dist/index.html` |
| B | No >1 MB boot-reachable codemirror chunk in `dist/assets` |
| C | Single katex chunk preserved |
| D | lint 0 / vitest 126 / cargo 0 |
| E | LCD metric corrections committed |

All A–E green ⇒ PERF-1 mitigation **CLOSED**. Otherwise stop, report, and re-audit before committing.