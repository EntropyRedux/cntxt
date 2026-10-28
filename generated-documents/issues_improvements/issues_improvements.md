# Issues
1. Activating a .cntxt document as active thread, no diference vs. it not activated
2. Conversation mode is still unstable, will preform more tests3
3. Code block issues, when in ordinary code blocks, click accuracy is reduced
4. When in a cntxt special block, selecting a section and adding a response/comment, typing text into the input field then scrolls on the mouse, the typed text resets, it appears scrlling also resets the input field, not a major issue but if fixing is trivial, fix
5. adding a response on a section > after entering, the viewport moves to the added response moving me away from the current section I am viewing
6. [PRIORITY] REST Gateway multi-window broadcast: when opening tabs or dispatching RPC via REST API (`/api/v1/tabs/open`), `app.emit` broadcasts to all open windows, causing tabs to duplicate across both the main window and secondary/popout windows instead of targeting only the main window.
# Improvements
1. Special table code block to create notion-like tables
2. When connecting via REST API, the connected agent/program must receive a response on what available controls and how to use it must be sent so the agent knows how to the feature
3. Conversation mode: user responses hidden in document by default, only appears if exported as .cntxt file(to follow)