import { describe, it, expect, beforeEach } from 'vitest';
import { useImageModalStore } from '../src/store/imageModalStore';

describe('ImageModalStore', () => {
  // Reset store before each test
  beforeEach(() => {
    useImageModalStore.setState({ isOpen: false });
  });

  it('initializes with isOpen false', () => {
    expect(useImageModalStore.getState().isOpen).toBe(false);
  });

  it('opens modal when openImageModal is called', () => {
    const store = useImageModalStore.getState();
    store.openImageModal();
    expect(useImageModalStore.getState().isOpen).toBe(true);
  });

  it('closes modal when closeImageModal is called', () => {
    // First open it
    useImageModalStore.getState().openImageModal();
    expect(useImageModalStore.getState().isOpen).toBe(true);
    
    // Then close it
    const store = useImageModalStore.getState();
    store.closeImageModal();
    expect(useImageModalStore.getState().isOpen).toBe(false);
  });

  it('toggle behavior works correctly', () => {
    const store = useImageModalStore.getState();
    
    // Start closed
    expect(useImageModalStore.getState().isOpen).toBe(false);
    
    // Open
    store.openImageModal();
    expect(useImageModalStore.getState().isOpen).toBe(true);
    
    // Close
    store.closeImageModal();
    expect(useImageModalStore.getState().isOpen).toBe(false);
    
    // Open again
    store.openImageModal();
    expect(useImageModalStore.getState().isOpen).toBe(true);
  });
});