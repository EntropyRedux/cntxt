import { Compartment } from '@codemirror/state';

/**
 * Module-level singleton Compartments for CodeMirror 6.
 *
 * In CodeMirror 6, Compartments are matched strictly by object reference equality (`===`).
 * Defining them as module-level singletons guarantees that their identity remains
 * invariant across all tabs, all EditorState instances, and the entire application lifecycle.
 * This eliminates Compartment mismatch exceptions and configuration dropouts when
 * swapping states via `view.setState(cachedState)`.
 */
export const languageCompartment = new Compartment();
export const themeCompartment = new Compartment();
export const fontThemeCompartment = new Compartment();
export const base64FoldCompartment = new Compartment();
export const templateVariablesCompartment = new Compartment();
export const inlineFormulasCompartment = new Compartment();
export const markdownHighlightingCompartment = new Compartment();
export const liveMarkdownCompartment = new Compartment();
export const guttersCompartment = new Compartment();
export const bracketMatchingCompartment = new Compartment();
export const layoutCompartment = new Compartment();
export const wordWrapCompartment = new Compartment();
