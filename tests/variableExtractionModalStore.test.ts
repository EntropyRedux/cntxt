import { describe, it, expect, beforeEach } from 'vitest';
import { useVariableExtractionModalStore } from '../src/store/variableExtractionModalStore';

describe('variableExtractionModalStore', () => {
  beforeEach(() => {
    useVariableExtractionModalStore.setState({
      isOpen: false,
      openExtractionModal: useVariableExtractionModalStore.getState().openExtractionModal,
      closeExtractionModal: useVariableExtractionModalStore.getState().closeExtractionModal,
    });
  });

  it('initializes with modal closed', () => {
    expect(useVariableExtractionModalStore.getState().isOpen).toBe(false);
  });

  it('openExtractionModal opens the modal', () => {
    useVariableExtractionModalStore.getState().openExtractionModal();
    expect(useVariableExtractionModalStore.getState().isOpen).toBe(true);
  });

  it('openExtractionModal can be called multiple times without issue', () => {
    useVariableExtractionModalStore.getState().openExtractionModal();
    expect(useVariableExtractionModalStore.getState().isOpen).toBe(true);

    useVariableExtractionModalStore.getState().openExtractionModal();
    expect(useVariableExtractionModalStore.getState().isOpen).toBe(true);
  });

  it('closeExtractionModal closes the modal', () => {
    useVariableExtractionModalStore.getState().openExtractionModal();
    expect(useVariableExtractionModalStore.getState().isOpen).toBe(true);

    useVariableExtractionModalStore.getState().closeExtractionModal();
    expect(useVariableExtractionModalStore.getState().isOpen).toBe(false);
  });

  it('closeExtractionModal can be called when already closed without error', () => {
    useVariableExtractionModalStore.getState().closeExtractionModal();
    expect(useVariableExtractionModalStore.getState().isOpen).toBe(false);
  });

  it('supports open/close cycle repeatedly', () => {
    for (let i = 0; i < 3; i++) {
      useVariableExtractionModalStore.getState().openExtractionModal();
      expect(useVariableExtractionModalStore.getState().isOpen).toBe(true);
      useVariableExtractionModalStore.getState().closeExtractionModal();
      expect(useVariableExtractionModalStore.getState().isOpen).toBe(false);
    }
  });
});
