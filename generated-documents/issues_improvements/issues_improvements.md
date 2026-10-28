# Issues
1. Activating a .cntxt document as active thread, no diference vs. it not activated
2. Conversation mode is still unstable, will preform more tests
3. [RESOLVED 2026-10-28] Code block issues, click accuracy reduced & header margin:
   - Root Cause A: `CodeBlockHeaderWidget.eq()` was checking `this.codeContent === other.codeContent`, forcing CodeMirror to destroy and recreate the header widget DOM on every single keystroke typed inside the code block. This caused DOM thrashing and cursor focus jumping.
   - Root Cause B: Moving vertical margins into child widget (`.cm-live-codeblock-header { margin-top: 8px }`) pushed the header down inside the container, exposing an empty band of container background above the header.
   - Fix: Stabilized `CodeBlockHeaderWidget.eq()` without `codeContent` comparison, implemented `updateDOM()` to prevent DOM thrashing, set `.cm-live-codeblock-header { margin-top: 0 !important }` so the header sits flush at the container top, and restored outer spacing cleanly on the container wrapper `.cm-live-codeblock-start { margin-top: 8px !important }` and `.cm-live-codeblock-end { margin-bottom: 8px !important }`.
4. When in a cntxt special block, selecting a section and adding a response/comment, typing text into the input field then scrolls on the mouse, the typed text resets, it appears scrlling also resets the input field, not a major issue but if fixing is trivial, fix
5. adding a response on a section > after entering, the viewport moves to the added response moving me away from the current section I am viewing
6. [RESOLVED 2026-10-28] REST Gateway multi-window broadcast: when opening tabs or dispatching RPC via REST API (`/api/v1/tabs/open`), `app.emit` broadcasts to all open windows, causing tabs to duplicate across both the main window and secondary/popout windows instead of targeting only the main window. Resolved via `app.emit_to("main", ...)` and `getCurrentWindow().label === 'main'`.
7. [RESOLVED 2026-10-28] Consecutive `---` dashes on new lines buggy:
   - Root Cause: `liveMarkdown.ts` matched `/^(\-{3,}|\*{3,}|_{3,})\s*$/` and immediately replaced the line from `line.from` to `line.to` with `HrWidget` even while the cursor was active on that line (`isLineActive === true`). The non-editable widget trapped the cursor, causing subsequent dashes, backspaces, and Enter keystrokes to fail.
   - Fix: Added `if (hrMatch && !isLineActive)` so the line remains raw editable text while typing and cleanly transforms into `HrWidget` when the cursor moves away.
# Improvements
1. Special table code block to create notion-like tables
2. When connecting via REST API, the connected agent/program must receive a response on what available controls and how to use it must be sent so the agent knows how to the feature
3. Conversation mode: user responses hidden in document by default, only appears if exported as .cntxt file(to follow)