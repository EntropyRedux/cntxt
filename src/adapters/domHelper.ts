/**
 * DOM Helper for Adapter Layer
 * Quarantines direct DOM interactions (document, window, navigator) inside src/adapters/.
 */
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

export function isDarkTheme(): boolean {
  if (typeof document === 'undefined') return true;
  const theme = document.documentElement.getAttribute('data-theme');
  return !theme?.includes('light');
}

export async function copyText(text: string, bridge?: IRuntimeBridge): Promise<boolean> {
  if (bridge?.clipboard) {
    try {
      await bridge.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to adapter native
    }
  }
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

export function querySelector(selector: string): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  return document.querySelector(selector) as HTMLElement | null;
}

export function addDocumentListener(type: string, listener: (e: any) => void): () => void {
  if (typeof document === 'undefined') return () => {};
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
  if (typeof window === 'undefined') return () => {};
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

