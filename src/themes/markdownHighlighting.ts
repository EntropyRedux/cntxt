import { Extension, Prec } from '@codemirror/state';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';

/**
 * ContextPad native Markdown syntax highlighting for RAW Mode.
 * Directly leverages CodeMirror's Lezer AST grammar tags without DOM replacement widgets,
 * ensuring 100% native typing responsiveness, zero cursor jumping, and pristine line stability.
 */
export function createMarkdownHighlighting(accentOverridesHeadings: boolean = true): Extension {
  const headingColor = accentOverridesHeadings ? 'var(--accent-primary, #007ACC)' : '#569CD6';

  const style = syntaxHighlighting(
    HighlightStyle.define([
      // Headings (styled purely by font-size and weight; markdown delimiters stay intact)
      { tag: tags.heading1, color: headingColor, fontWeight: 'bold', fontSize: '1.45em' },
      { tag: tags.heading2, color: headingColor, fontWeight: 'bold', fontSize: '1.25em' },
      { tag: tags.heading3, color: headingColor, fontWeight: 'bold', fontSize: '1.15em' },
      { tag: tags.heading4, color: headingColor, fontWeight: 'bold', fontSize: '1.05em' },
      { tag: tags.heading5, color: headingColor, fontWeight: 'bold' },
      { tag: tags.heading6, color: headingColor, fontWeight: 'bold' },

      // Emphasis & Formatting
      { tag: tags.emphasis, color: 'var(--text-secondary, #A1A1AA)', fontStyle: 'italic' },
      { tag: tags.strong, color: 'var(--text-primary, #EDEDED)', fontWeight: 'bold' },
      { tag: tags.strikethrough, color: 'var(--text-muted, #71717A)', textDecoration: 'line-through' },

      // Links & URLs
      { tag: tags.link, color: 'var(--text-accent, #38BDF8)' },
      { tag: tags.url, color: 'var(--text-accent, #38BDF8)' },

      // Inline code
      { tag: tags.monospace, color: 'var(--accent-primary, #007ACC)' },

      // Lists & Bullets
      { tag: tags.list, color: 'var(--accent-primary, #007ACC)', fontWeight: '600' },

      // Blockquotes
      { tag: tags.quote, color: 'var(--text-secondary, #A1A1AA)', fontStyle: 'italic' },
    ])
  );

  return Prec.high(style);
}
