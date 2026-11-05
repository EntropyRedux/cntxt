# Issues
1. Activating a .cntxt document as active thread, no diference vs. it not activated *(Deferred for Conversation Mode rework)*
2. Conversation mode is still unstable, will preform more tests3 *(Deferred for Conversation Mode rework)*
3. Code block issues, when in ordinary code blocks, click accuracy is reduced
4. ~~When in a cntxt special block, selecting a section and adding a response/comment, typing text into the input field then scrolls on the mouse, the typed text resets, it appears scrlling also resets the input field, not a major issue but if fixing is trivial, fix~~ — **[RESOLVED v0.7.5]** Preserved draft text buffer across virtual scroll sync passes.
5. ~~adding a response on a section > after entering, the viewport moves to the added response moving me away from the current section I am viewing~~ — **[RESOLVED v0.7.5]** Scroll DOM offset locked and CodeMirror `scrollIntoView: false` applied on submit.

# Improvements
1. Special table code block to create notion-like tables
2. When connecting via REST API, the connected agent/program must receive a response on what available controls and how to use it must be sent so the agent knows how to the feature
3. Conversation mode: user responses hidden in document by default, only appears if exported as .cntxt file(to follow) *(Deferred for Conversation Mode rework)*
4. When cntxt is connected to an agent, cntxt also sends a directive to the agent on how to use cntxt
5. gatway security, should REST api be converted to MCP?
6. ~~UNdo close current tab or closed tab history~~ — **[RESOLVED v0.7.5]** Implemented `reopenClosedTab()` with 10-item FIFO ring buffer, `Ctrl+Shift+T` hotkey, File menu item, tab context menu item, and 19 unit tests.
7. Ribbon bar can save files as saved bookmark(loads the file from file explorer as long as it is still in there - return error if not)
8. Add a view mode for templates and actions panel: can view like cards grids or detailed list(current)
9. ~~Title bar, menu bar, ribbon bar, side rail -> remove dividing lines/outlines so it looks more seamless and make them look like in one continuos container~~ — **[RESOLVED v0.7.5]** Removed interior dividing borders between Title Bar, Menu Bar, and Modular Ribbon. Subtle tokens applied to Activity Bar.
10. Size adjustable markdown formatting toolbar so no need for single row and multi rows switchers...
11. 
