# Issues (Completed in v0.3.3)
- [x] 1. Adding custom markdown formatting buttons not functional (Resolved)
- [x] 2. CTRL+S or File > Save Document returns an error 'Could not write to file path' (Resolved)
- [x] 3. *Italic* or _italic_ italicizing text does not actually italicize them unless inside inline code (Resolved)
- [x] 4. External web link implementation / links not actually working properly (Resolved: Ctrl+Click and context menu open in system browser)
- [x] 5. Action Scripts Panel > Collapse/Expand all categories button > only affects the 'General' category (Resolved)

# Improvements (Completed in v0.3.4)
- [x] 1. When browsing a folder on the file explorer, at the very end of the file lists, add a + New file button, so that the user can create new file on any folder or subfolder inside their chosen workspace.
- [x] 2. Reduce the editor padding options to: 12px, 24px, 36px.
- [x] 3. Add 'insert' variable (`fmt_variable` / `{{variable}}`) in the markdown quick formatting bar and modular ribbon.
- [x] 4. Add variable extractions (extract answered variables, extract rows with variables, extract rows without variables, select text > extract).
- [x] 5. Export as `${filename}_blueprint.cntxt`.
- [x] 6. Fine tune text color syntax highlighting and variable tokens.
- [x] 7. Increase the size of the popup modal for filling up document variables (`VariableFillerModal.tsx` expanded to `max-w-5xl` 88vh).
- [x] 8. Document outline > quick append section input allowing text to append on selected heading or toggle top/bottom of document.
- [x] 10. When opening documents especially large documents (>100KB), a modal prompts the user with TOC outline checklist to truncate or open full document.
- [x] 11. Document outline panel split into two: top section is the TOC/symbols, bottom section is a chat-like quick append input field.