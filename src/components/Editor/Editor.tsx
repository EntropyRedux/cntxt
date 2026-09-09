import React, { useEffect, useRef } from 'react';
import { EditorState, Extension, Compartment } from '@codemirror/state';
import { EditorView, keymap, highlightActiveLineGutter, highlightActiveLine } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { bracketMatching, foldGutter, foldKeymap, indentOnInput } from '@codemirror/language';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';

import { markdown } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { json } from '@codemirror/lang-json';

import { useTabStore } from '../../store/tabStore';
import { useSettingsStore } from '../../store/settingsStore';
import { getEditorThemeExtension } from '../../themes';
import { slashCommandExtension } from '../../extensions/slashCommands';
import { templateVariablesExtension } from '../../extensions/templateVariables';
import { inlineFormulasExtension } from '../../extensions/inlineFormulas';
import { liveMarkdownExtension } from '../../extensions/liveMarkdown';
import { lineCounterSelectionExtension } from '../../extensions/lineNumberSelection';
import { imageDropPasteExtension } from '../../extensions/imageDropPasteExtension';
import { SupportedLanguage } from '../../types';
import { editorRegistry } from '../../services/editor/editorRegistry';
import { useRuntimeBridge } from '../../adapters';

interface EditorProps {
  tabId: string;
  content: string;
  language: SupportedLanguage;
}

export const Editor: React.FC<EditorProps> = ({ tabId, content, language }) => {
  const bridge = useRuntimeBridge();
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const liveMarkdownCompartmentRef = useRef<Compartment>(new Compartment());
  const updatingFromStoreRef = useRef(false);
  const isFirstRenderRef = useRef(true);

  const { updateTabContent, updateTabMetadata } = useTabStore();
  const { settings } = useSettingsStore();

  const getLanguageExtension = (lang: SupportedLanguage): Extension => {
    switch (lang) {
      case 'javascript':
      case 'typescript':
        return javascript({ typescript: true });
      case 'python':
        return python();
      case 'json':
        return json();
      case 'markdown':
      default:
        return markdown({ codeLanguages: languages });
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const isRenderedMode = (settings.editorMode || 'rendered') === 'rendered';

    // Build extension stack
    const extensions: Extension[] = [
      settings.showLineNumbers ? lineCounterSelectionExtension() : [],
      highlightActiveLineGutter(),
      highlightActiveLine(),
      history(),
      settings.enableFoldGutter ? foldGutter() : [],
      indentOnInput(),
      settings.enableBracketMatching ? bracketMatching() : [],
      closeBrackets(),
      highlightSelectionMatches(),
      EditorView.lineWrapping,

      // Keymaps
      keymap.of([
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...searchKeymap,
        ...historyKeymap,
        ...foldKeymap,
        indentWithTab
      ]),

      // Language support
      getLanguageExtension(language),

      // Theme
      getEditorThemeExtension(settings.theme),

      // ContextPad Custom Extensions
      slashCommandExtension(),
      templateVariablesExtension(),
      inlineFormulasExtension(),
      imageDropPasteExtension(),
      liveMarkdownCompartmentRef.current.of(
        liveMarkdownExtension(isRenderedMode && (language === 'markdown' || language === 'text'), bridge)
      ),

      // Custom font size and line height styling
      EditorView.theme({
        '&': {
          fontSize: `${settings.fontSize}px`,
          height: '100%'
        },
        '.cm-scroller': {
          fontFamily: settings.fontFamily,
          lineHeight: '1.6',
          padding: '10px 14px'
        }
      }),

      // Update listener
      EditorView.updateListener.of((update) => {
        if (update.docChanged && !updatingFromStoreRef.current) {
          const newDoc = update.state.doc.toString();
          updateTabContent(tabId, newDoc);
        }

        if (update.selectionSet || update.docChanged) {
          const mainSel = update.state.selection.main;
          const pos = mainSel.head;
          const line = update.state.doc.lineAt(pos);
          updateTabMetadata(tabId, {
            cursorLine: line.number,
            cursorCol: pos - line.from + 1,
            cursorOffset: pos,
            selectionFrom: mainSel.from,
            selectionTo: mainSel.to
          });
        }
      })
    ];

    const state = EditorState.create({
      doc: content,
      extensions
    });

    const view = new EditorView({
      state,
      parent: containerRef.current
    });

    viewRef.current = view;
    editorRegistry.register(tabId, view);

    return () => {
      editorRegistry.unregister(tabId);
      view.destroy();
      viewRef.current = null;
      isFirstRenderRef.current = true;
    };
  }, [tabId, language, settings.theme, settings.fontSize, settings.showLineNumbers]);

  // Dynamically reconfigure live markdown mode without recreating editor
  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }
    const view = viewRef.current;
    if (!view) return;
    const isRenderedMode = (settings.editorMode || 'rendered') === 'rendered';
    const effect = liveMarkdownCompartmentRef.current.reconfigure(
      liveMarkdownExtension(isRenderedMode && (language === 'markdown' || language === 'text'), bridge)
    );
    if ((view as any).updating) {
      queueMicrotask(() => {
        if (viewRef.current) {
          viewRef.current.dispatch({ effects: effect });
        }
      });
    } else {
      view.dispatch({ effects: effect });
    }
  }, [settings.editorMode, language]);

  // Keep editor content synchronized with external updates without losing cursor
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const syncContent = () => {
      const activeView = viewRef.current;
      if (!activeView) return;
      const currentDoc = activeView.state.doc.toString();
      if (content !== currentDoc) {
        updatingFromStoreRef.current = true;
        activeView.dispatch({
          changes: {
            from: 0,
            to: currentDoc.length,
            insert: content
          }
        });
        updatingFromStoreRef.current = false;
      }
    };

    if ((view as any).updating) {
      queueMicrotask(syncContent);
    } else {
      syncContent();
    }
  }, [content]);

  return (
    <div className="w-full h-full relative overflow-hidden bg-[var(--editor-bg)] flex flex-col">
      {/* Main CodeMirror Canvas */}
      <div 
        ref={containerRef} 
        className="w-full h-full flex-1 overflow-hidden" 
      />
    </div>
  );
};
