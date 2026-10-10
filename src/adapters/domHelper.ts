/**
 * DOM Helper for Adapter Layer
 * Quarantines direct DOM interactions (document, window, navigator) inside src/adapters/.
 */
import { useState, useEffect } from 'react';
import { IRuntimeBridge } from '../ui-contract/bridgeContract';

export function createElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  attributes?: Record<string, string | boolean | number | undefined>,
  children?: Array<HTMLElement | Text | string>
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tagName);

  if (attributes) {
    for (const [key, value] of Object.entries(attributes)) {
      if (value === undefined) continue;
      if (key === 'className' || key === 'class') {
        el.className = String(value);
      } else if (key === 'textContent') {
        el.textContent = String(value);
      } else if (key.startsWith('data-')) {
        el.setAttribute(key, String(value));
      } else if (typeof value === 'boolean') {
        if (value) el.setAttribute(key, '');
        else el.removeAttribute(key);
      } else {
        el.setAttribute(key, String(value));
      }
    }
  }

  if (children) {
    for (const child of children) {
      if (typeof child === 'string') {
        el.appendChild(document.createTextNode(child));
      } else {
        el.appendChild(child);
      }
    }
  }

  return el;
}

export function createTextNode(text: string): Text {
  return document.createTextNode(text);
}

export function getElementById(id: string): HTMLElement | null {
  return document.getElementById(id);
}

export function createCanvas(width?: number, height?: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  if (width) canvas.width = width;
  if (height) canvas.height = height;
  return canvas;
}

export function getBodyElement(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  return document.body;
}

export function appendToBody(element: HTMLElement): void {
  document.body.appendChild(element);
}

export function removeFromBody(element: HTMLElement): void {
  if (element.parentNode === document.body) {
    document.body.removeChild(element);
  }
}

export function getDocumentTheme(): string {
  if (typeof document === 'undefined') return 'contextpad-dark';
  return document.documentElement.getAttribute('data-theme') || 'contextpad-dark';
}

export function getCssCustomProperty(name: string, fallback: string = ''): string {
  if (typeof document === 'undefined') return fallback;
  const val = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return val || fallback;
}

export function isDarkTheme(): boolean {
  if (typeof document === 'undefined') return true;
  const themeType = document.documentElement.getAttribute('data-theme-type');
  if (themeType) return themeType === 'dark';
  const theme = document.documentElement.getAttribute('data-theme');
  if (!theme) return true;
  if (theme === 'google-material-3' || theme === 'parchment' || theme === 'github-light') return false;
  return !theme.includes('light');
}

export async function copyText(text: string, bridge?: IRuntimeBridge): Promise<boolean> {
  if (bridge?.clipboard) {
    try {
      const ok = await bridge.clipboard.writeText(text);
      if (ok) return true;
    } catch (err) {
      console.warn('[domHelper] bridge.clipboard.writeText failed:', err);
    }
  }
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('[domHelper] navigator.clipboard.writeText failed:', err);
      return false;
    }
  }
  console.warn('[domHelper] copyText failed: no supported clipboard provider');
  return false;
}

export function querySelector(selector: string): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  return document.querySelector(selector) as HTMLElement | null;
}

export function addDocumentListener(type: string, listener: (e: Event) => void): () => void {
  if (typeof document === 'undefined') return () => { };
  document.addEventListener(type, listener);
  return () => {
    document.removeEventListener(type, listener);
  };
}

export function addWindowListener(
  type: string,
  listener: (e: Event) => void,
  options?: boolean | AddEventListenerOptions
): () => void {
  if (typeof window === 'undefined') return () => { };
  window.addEventListener(type, listener, options);
  return () => {
    window.removeEventListener(type, listener, options);
  };
}

export function removeDocumentListener(type: string, listener: (e: Event) => void): void {
  if (typeof document !== 'undefined') {
    document.removeEventListener(type, listener);
  }
}

export function triggerFileDownload(filename: string, content: string, mimeType: string = 'application/json'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function triggerFileInput(accept: string, callback: (content: string, name: string) => void): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = accept;
  input.onchange = (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event: ProgressEvent<FileReader>) => {
      callback((event.target?.result as string) || '', file.name);
    };
    reader.readAsText(file);
  };
  input.click();
}

export function execUndo(): void {
  if (typeof document !== 'undefined') {
    document.execCommand('undo');
  }
}

export function execRedo(): void {
  if (typeof document !== 'undefined') {
    document.execCommand('redo');
  }
}

export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return ('ontouchstart' in window) || (typeof navigator !== 'undefined' && (navigator.maxTouchPoints || 0) > 0);
}

export function getSelectionText(): string {
  if (typeof window === 'undefined' || !window.getSelection) return '';
  return window.getSelection()?.toString() || '';
}

export function getWindowWidth(): number {
  return typeof window !== 'undefined' ? window.innerWidth : 1200;
}

export function useWindowDimensions(): { width: number; height: number } {
  const [dimensions, setDimensions] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  }));

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return dimensions;
}

/**
 * Hook for desktop window dragging.
 * Allows elements to initiate native window drag on mousedown,
 * ignoring interactive elements (buttons, inputs, dropdowns).
 */
export function useWindowDrag(bridge: IRuntimeBridge) {
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag on left mouse button
    if (e.button !== 0) return;

    // Don't drag if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'BUTTON' ||
      target.tagName === 'INPUT' ||
      target.tagName === 'A' ||
      target.tagName === 'SELECT' ||
      target.tagName === 'TEXTAREA' ||
      target.closest('button') ||
      target.closest('input') ||
      target.closest('a') ||
      target.closest('select') ||
      target.closest('textarea') ||
      target.closest('[data-no-drag]')
    ) {
      return;
    }

    (async () => { try { bridge.window.startDragging?.(); } catch (e) { console.warn("[domHelper] startDragging failed:", e); } })();
  };

  return { handleMouseDown };
}

/**
 * Escape HTML special characters for safe attribute and text interpolation.
 */
export function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Retrieve current window text selection without unmediated direct window reach in presenters.
 */
export function getCurrentSelectionText(): string {
  if (typeof window === 'undefined') return '';
  return window.getSelection()?.toString() || '';
}

/**
 * Sanitize Markdown preview HTML, stripping executable tags, inline event handlers,
 * and dangerous URI schemes (including file:, javascript:, vbscript:).
 */
export function sanitizePreviewHtml(dirtyHtml: string): string {
  if (!dirtyHtml) return '';

  if (typeof DOMParser === 'undefined') {
    // Regex fallback for non-DOM / headless testing environments
    return dirtyHtml
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
      .replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '')
      .replace(/\s+on[a-zA-Z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^>\s&]+)/gi, '')
      .replace(/(?:href|xlink:href|formaction)\s*=\s*["']?\s*(?:javascript|file|vbscript|data):[^"'>\s]*/gi, 'href="#"')
      .replace(/(?:src|srcset)\s*=\s*["']?\s*(?:javascript|file|vbscript|data):[^"'>\s]*/gi, '')
      .replace(/\bstyle\s*=\s*["'][^"']*(?:position|z-index|top|bottom|left|right)[^"']*["']/gi, '');
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(dirtyHtml, 'text/html');

    const FORBIDDEN_TAGS = ['script', 'style', 'iframe', 'object', 'embed', 'form', 'base'];
    FORBIDDEN_TAGS.forEach(tag => {
      const elements = doc.querySelectorAll(tag);
      elements.forEach(el => el.remove());
    });

    const allElements = doc.querySelectorAll('*');
    allElements.forEach(el => {
      // 1. Strip event handlers (on*)
      const attrsToRemove: string[] = [];
      for (let i = 0; i < el.attributes.length; i++) {
        const attrName = el.attributes[i].name;
        if (attrName.toLowerCase().startsWith('on')) {
          attrsToRemove.push(attrName);
        }
      }
      attrsToRemove.forEach(attr => el.removeAttribute(attr));

      // 2. Sanitize href, formaction, and SVG xlink:href (H-02)
      ['href', 'formaction', 'xlink:href'].forEach(attr => {
        if (el.hasAttribute(attr)) {
          const val = (el.getAttribute(attr) || '').trim();
          const lower = val.toLowerCase();
          if (
            lower.startsWith('javascript:') ||
            lower.startsWith('file:') ||
            lower.startsWith('vbscript:') ||
            lower.startsWith('data:')
          ) {
            el.setAttribute(attr, '#');
          }
        }
      });

      // 3. Sanitize src and srcset
      ['src', 'srcset'].forEach(attr => {
        if (el.hasAttribute(attr)) {
          const src = (el.getAttribute(attr) || '').trim();
          const lower = src.toLowerCase();
          if (
            lower.startsWith('javascript:') ||
            lower.startsWith('file:') ||
            lower.startsWith('vbscript:') ||
            lower.startsWith('data:')
          ) {
            el.removeAttribute(attr);
          }
        }
      });

      // 4. Sanitize inline style attributes (C-03 UI-redressing & clickjacking prevention)
      if (el.hasAttribute('style')) {
        const style = el.getAttribute('style') || '';

        // Only genuine inline math spans created by the parser can retain non-stacking layout styles
        // Non-span elements (like arbitrary <div> with user class="katex") are NEVER KaTeX
        const isVerifiedMathSpan =
          el.tagName.toLowerCase() === 'span' &&
          (el.hasAttribute('data-cntxt-math') ||
            el.closest('[data-cntxt-math]') !== null ||
            el.closest('span.cm-table-math') !== null);

        // ALWAYS unconditionally strip fixed/sticky positioning and z-index from ALL elements without exception
        let sanitizedStyle = style.replace(
          /(?:^|;)\s*(?:position\s*:\s*fixed|position\s*:\s*sticky|z-index)\s*:[^;]*/gi,
          ''
        );

        if (!isVerifiedMathSpan) {
          // Arbitrary user elements are completely prohibited from using any positioning properties
          sanitizedStyle = sanitizedStyle.replace(
            /(?:^|;)\s*(?:position|z-index|top|bottom|left|right)\s*:[^;]*/gi,
            ''
          );
        }

        sanitizedStyle = sanitizedStyle.trim().replace(/^;+/, '');
        if (sanitizedStyle) {
          el.setAttribute('style', sanitizedStyle);
        } else {
          el.removeAttribute('style');
        }
      }
    });

    return doc.body.innerHTML;
  } catch {
    return escapeHtml(dirtyHtml);
  }
}



/**
 * WebView2 Resize Stability Fix
 *
 * On Windows with decorations:false, the Win32 window frame can grow while
 * WebView2's CSS viewport stays locked at the initial size, causing a blank
 * strip on the right/bottom of the window.
 *
 * Installs a resize listener that briefly sets explicit pixel dimensions on the
 * root element then clears them, forcing WebView2 to re-measure the viewport
 * and reflow the layout. Call once from main.tsx after mounting React.
 *
 * @returns Cleanup function that removes the listeners.
 */
export function installViewportResizeStabilizer(rootId = 'root'): () => void {
  if (typeof window === 'undefined') return () => {};

  const sync = () => {
    const root = document.getElementById(rootId);
    if (!root) return;
    root.style.width = window.innerWidth + 'px';
    root.style.height = window.innerHeight + 'px';
    requestAnimationFrame(() => {
      root.style.width = '';
      root.style.height = '';
    });
  };

  window.addEventListener('resize', sync, { passive: true });

  let vpUnlisten: (() => void) | undefined;
  if (typeof visualViewport !== 'undefined' && visualViewport) {
    visualViewport.addEventListener('resize', sync, { passive: true });
    vpUnlisten = () => (visualViewport as VisualViewport).removeEventListener('resize', sync);
  }

  return () => {
    window.removeEventListener('resize', sync);
    vpUnlisten?.();
  };
}

export function getRootComputedStyleProperty(property: string): string {
  if (typeof window === 'undefined' || typeof document === 'undefined') return '';
  const themeEl = document.querySelector('[data-theme]') || document.documentElement;
  return getComputedStyle(themeEl).getPropertyValue(property).trim();
}

export function getRootAttribute(attr: string): string {
  if (typeof document === 'undefined') return '';
  const themeEl = document.querySelector(`[${attr}]`) || document.documentElement;
  return themeEl.getAttribute(attr) || '';
}

