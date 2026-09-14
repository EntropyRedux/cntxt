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

export function addDocumentListener(type: string, listener: (e: any) => void): () => void {
  if (typeof document === 'undefined') return () => { };
  document.addEventListener(type, listener);
  return () => {
    document.removeEventListener(type, listener);
  };
}

export function addWindowListener(
  type: string,
  listener: (e: any) => void,
  options?: boolean | AddEventListenerOptions
): () => void {
  if (typeof window === 'undefined') return () => { };
  window.addEventListener(type, listener, options);
  return () => {
    window.removeEventListener(type, listener, options as any);
  };
}

export function removeDocumentListener(type: string, listener: (e: any) => void): void {
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
  input.onchange = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event: any) => {
      callback(event.target.result as string, file.name);
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

    bridge.window.startDragging?.();
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
    // Regex fallback for non-DOM environments
    return dirtyHtml
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
      .replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '')
      .replace(/\s+on[a-zA-Z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      .replace(/href\s*=\s*["']?\s*(?:javascript|file|vbscript):[^"'>\s]*/gi, 'href="#"');
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(dirtyHtml, 'text/html');

    const FORBIDDEN_TAGS = ['script', 'iframe', 'object', 'embed', 'form', 'base'];
    FORBIDDEN_TAGS.forEach(tag => {
      const elements = doc.querySelectorAll(tag);
      elements.forEach(el => el.remove());
    });

    const allElements = doc.querySelectorAll('*');
    allElements.forEach(el => {
      // Strip event handlers (on*)
      const attrsToRemove: string[] = [];
      for (let i = 0; i < el.attributes.length; i++) {
        const attrName = el.attributes[i].name;
        if (attrName.toLowerCase().startsWith('on')) {
          attrsToRemove.push(attrName);
        }
      }
      attrsToRemove.forEach(attr => el.removeAttribute(attr));

      // Sanitize href
      if (el.hasAttribute('href')) {
        const href = (el.getAttribute('href') || '').trim();
        const lower = href.toLowerCase();
        if (
          lower.startsWith('javascript:') ||
          lower.startsWith('file:') ||
          lower.startsWith('vbscript:') ||
          lower.startsWith('data:')
        ) {
          el.setAttribute('href', '#');
        }
      }

      // Sanitize src
      if (el.hasAttribute('src')) {
        const src = (el.getAttribute('src') || '').trim();
        const lower = src.toLowerCase();
        if (
          lower.startsWith('javascript:') ||
          lower.startsWith('file:') ||
          lower.startsWith('vbscript:')
        ) {
          el.removeAttribute('src');
        }
      }
    });

    return doc.body.innerHTML;
  } catch {
    return escapeHtml(dirtyHtml);
  }
}


