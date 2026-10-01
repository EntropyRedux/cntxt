export * from './storageKeys';
export * from './browserRuntimeAdapter';
export * from './tauriRuntimeAdapter';
export * from './runtimeBridge';
export * from './eventDispatcher';
export * from './domHelper';
export * from './supabaseClient';
export * from './authStorageAdapter';

/**
 * Clean mount node retriever to prevent document. reference in main.tsx
 */
export const getMountNode = (id: string = 'root'): HTMLElement | null => {
  if (typeof document !== 'undefined') {
    return document.getElementById(id);
  }
  return null;
};
