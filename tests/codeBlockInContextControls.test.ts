/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { codeBlockLockFilter } from '../src/extensions/codeBlockLockFilter';
import {
  CodeBlockHeaderWidget,
  mutateHeaderLineParams,
  closeActiveCodeBlockPopover,
} from '../src/extensions/liveMarkdown/widgets/codeBlockWidget';
import { useNotificationStore } from '../src/store/notificationStore';

describe('FG-27: In-Context Code Block Controls & Lock Guard', () => {
  beforeEach(() => {
    closeActiveCodeBlockPopover();
    useNotificationStore.getState().clearAll();
  });

  describe('1. codeBlockLockFilter', () => {
    it('blocks manual text insertion inside a locked=user code block', () => {
      const initialDoc = [
        'Line before block',
        '```python | locked=user',
        'def test():',
        '    return True',
        '```',
        'Line after block',
      ].join('\n');

      const state = EditorState.create({
        doc: initialDoc,
        extensions: [codeBlockLockFilter],
      });

      // Target position inside "def test():" (Line 3)
      const line3 = state.doc.line(3);
      const tr = state.update({
        changes: { from: line3.from, insert: '# Malicious edit\n' },
      });

      // Transaction should be completely rejected (empty changes, doc untouched)
      expect(tr.changes.empty).toBe(true);
      expect(tr.state.doc.toString()).toBe(initialDoc);
    });

    it('blocks manual text deletion that touches a locked=user code block', () => {
      const initialDoc = [
        'Line 1',
        '```python | locked=user',
        'code content',
        '```',
        'Line 5',
      ].join('\n');

      const state = EditorState.create({
        doc: initialDoc,
        extensions: [codeBlockLockFilter],
      });

      const line3 = state.doc.line(3);
      const tr = state.update({
        changes: { from: line3.from, to: line3.to },
      });

      expect(tr.changes.empty).toBe(true);
      expect(tr.state.doc.toString()).toBe(initialDoc);
    });

    it('allows edits completely outside the locked block', () => {
      const initialDoc = [
        'Line 1',
        '```python | locked=user',
        'code content',
        '```',
        'Line 5',
      ].join('\n');

      const state = EditorState.create({
        doc: initialDoc,
        extensions: [codeBlockLockFilter],
      });

      const line1 = state.doc.line(1);
      const tr = state.update({
        changes: { from: line1.to, insert: ' updated' },
      });

      expect(tr.changes.empty).toBe(false);
      expect(tr.state.doc.toString()).toContain('Line 1 updated');
      expect(tr.state.doc.toString()).toContain('code content');
    });

    it('allows governance update transactions on locked blocks', () => {
      const initialDoc = [
        '```python | locked=user',
        'code content',
        '```',
      ].join('\n');

      const state = EditorState.create({
        doc: initialDoc,
        extensions: [codeBlockLockFilter],
      });

      const line1 = state.doc.line(1);
      const tr = state.update({
        changes: { from: line1.from, to: line1.to, insert: '```python' },
        userEvent: 'cntxt.governance.update',
      });

      expect(tr.changes.empty).toBe(false);
      expect(tr.state.doc.line(1).text).toBe('```python');
    });

    it('allows normal typing inside an unlocked code block', () => {
      const initialDoc = [
        '```python',
        'code content',
        '```',
      ].join('\n');

      const state = EditorState.create({
        doc: initialDoc,
        extensions: [codeBlockLockFilter],
      });

      const line2 = state.doc.line(2);
      const tr = state.update({
        changes: { from: line2.to, insert: ' modified' },
      });

      expect(tr.changes.empty).toBe(false);
      expect(tr.state.doc.toString()).toContain('code content modified');
    });
  });

  describe('2. mutateHeaderLineParams', () => {
    it('locks an ordinary code block by adding | locked=user', () => {
      const initialDoc = '```python\nprint("hello")\n```';
      const view = new EditorView({
        state: EditorState.create({ doc: initialDoc }),
      });

      mutateHeaderLineParams(view, 1, (p) => ({ ...p, locked: 'user' }));

      expect(view.state.doc.line(1).text).toBe('```python | locked=user');
    });

    it('unlocks a code block and cleanly restores ordinary syntax without trailing pipe', () => {
      const initialDoc = '```python | locked=user\nprint("hello")\n```';
      const view = new EditorView({
        state: EditorState.create({ doc: initialDoc }),
      });

      mutateHeaderLineParams(view, 1, (p) => {
        const next = { ...p };
        delete next.locked;
        return next;
      });

      expect(view.state.doc.line(1).text).toBe('```python');
    });

    it('unlocks a rich container and keeps trailing pipe to preserve container mode', () => {
      const initialDoc = '~~~markdown | locked=user\n# Deliverable\n~~~';
      const view = new EditorView({
        state: EditorState.create({ doc: initialDoc }),
      });

      mutateHeaderLineParams(view, 1, (p) => {
        const next = { ...p };
        delete next.locked;
        return next;
      });

      expect(view.state.doc.line(1).text).toBe('~~~markdown |');
    });

    it('changes language / type when newType parameter is provided', () => {
      const initialDoc = '```python\nprint("hello")\n```';
      const view = new EditorView({
        state: EditorState.create({ doc: initialDoc }),
      });

      mutateHeaderLineParams(view, 1, (p) => p, 'typescript');

      expect(view.state.doc.line(1).text).toBe('```typescript');
    });
  });

  describe('3. CodeBlockHeaderWidget UI Presenter', () => {
    it('renders hover action buttons and 3-dot menu on ordinary code blocks', () => {
      const initialDoc = '```python\nprint("hello")\n```';
      const view = new EditorView({
        state: EditorState.create({ doc: initialDoc }),
      });

      const widget = new CodeBlockHeaderWidget('python', 'print("hello")', 0, 1, 3);
      const dom = widget.toDOM(view);

      expect(dom.classList.contains('cm-live-codeblock-header')).toBe(true);
      expect(dom.classList.contains('group')).toBe(true);
      expect(dom.classList.contains('relative')).toBe(true);

      // Lock button exists for ordinary block
      const lockBtn = dom.querySelector('.cm-cntxt-gov-pill') as HTMLElement;
      expect(lockBtn).not.toBeNull();
      expect(lockBtn.classList.contains('cm-codeblock-hover-action')).toBe(true);

      // Clear button exists
      const clearBtn = dom.querySelector('.cm-live-clear-code-btn') as HTMLElement;
      expect(clearBtn).not.toBeNull();

      // Copy button exists
      const copyBtn = dom.querySelector('.cm-live-copy-code-btn') as HTMLElement;
      expect(copyBtn).not.toBeNull();

      // 3-Dot menu button exists
      const menuBtn = dom.querySelector('.cm-codeblock-menu-btn') as HTMLElement;
      expect(menuBtn).not.toBeNull();
    });

    it('renders lock button with opacity-100 when block is locked', () => {
      const initialDoc = '```python | locked=user\nprint("hello")\n```';
      const view = new EditorView({
        state: EditorState.create({ doc: initialDoc }),
      });

      const widget = new CodeBlockHeaderWidget('python | locked=user', 'print("hello")', 0, 1, 3);
      const dom = widget.toDOM(view);

      const lockBtn = dom.querySelector('.cm-cntxt-pill-user') as HTMLElement;
      expect(lockBtn).not.toBeNull();
      expect(lockBtn.classList.contains('opacity-100')).toBe(true);

      const clearBtn = dom.querySelector('.cm-live-clear-code-btn') as HTMLElement;
      expect(clearBtn.classList.contains('opacity-50')).toBe(true);
    });

    it('clicking header does not trap cursor on opening fence line', () => {
      const initialDoc = '```python\nprint("hello")\n```';
      const view = new EditorView({
        state: EditorState.create({
          doc: initialDoc,
          selection: { anchor: 15 },
        }),
      });

      const widget = new CodeBlockHeaderWidget('python', 'print("hello")', 0, 1, 3, false);
      const dom = widget.toDOM(view);

      // Simulate clicking on the header background (not on buttons)
      dom.click();

      // Previously, clicking header forced cursor to anchor 0 (the opening fence).
      // Now, clicking header does not trap the cursor onto linePos (0).
      expect(view.state.selection.main.anchor).toBe(15);
    });
  });
});
