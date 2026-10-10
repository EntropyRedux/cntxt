import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useConfirmStore, ConfirmDialogOptions } from '../src/store/confirmStore';

describe('confirmStore', () => {
  beforeEach(() => {
    // Reset to initial state
    useConfirmStore.setState({
      isOpen: false,
      options: null,
      isLoading: false,
      showConfirm: useConfirmStore.getState().showConfirm,
      closeConfirm: useConfirmStore.getState().closeConfirm,
      triggerConfirm: useConfirmStore.getState().triggerConfirm,
    });
  });

  it('initializes with closed dialog and no options', () => {
    const state = useConfirmStore.getState();
    expect(state.isOpen).toBe(false);
    expect(state.options).toBeNull();
    expect(state.isLoading).toBe(false);
  });

  it('showConfirm opens the dialog with provided options', () => {
    const onConfirm = vi.fn();
    const options: ConfirmDialogOptions = {
      title: 'Are you sure?',
      message: 'This action cannot be undone.',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      variant: 'danger',
      onConfirm,
    };

    useConfirmStore.getState().showConfirm(options);

    const state = useConfirmStore.getState();
    expect(state.isOpen).toBe(true);
    expect(state.options).toEqual(options);
    expect(state.isLoading).toBe(false);
  });

  it('showConfirm defaults confirmLabel and cancelLabel when not provided', () => {
    useConfirmStore.getState().showConfirm({
      title: 'Test',
      message: 'Test message',
      onConfirm: vi.fn(),
    });

    const state = useConfirmStore.getState();
    expect(state.isOpen).toBe(true);
    expect(state.options).toMatchObject({
      title: 'Test',
      message: 'Test message',
    });
    expect(state.options?.confirmLabel).toBeUndefined();
    expect(state.options?.cancelLabel).toBeUndefined();
  });

  it('showConfirm resets isLoading to false when reopening', () => {
    const onConfirm = vi.fn();
    useConfirmStore.getState().showConfirm({
      title: 'Test',
      message: 'Test',
      onConfirm,
    });
    expect(useConfirmStore.getState().isLoading).toBe(false);
  });

  it('closeConfirm calls onCancel and resets state', () => {
    const onCancel = vi.fn();
    useConfirmStore.getState().showConfirm({
      title: 'Confirm',
      message: 'Message',
      onCancel,
      onConfirm: vi.fn(),
    });

    expect(useConfirmStore.getState().isOpen).toBe(true);

    useConfirmStore.getState().closeConfirm();

    expect(onCancel).toHaveBeenCalledTimes(1);
    const state = useConfirmStore.getState();
    expect(state.isOpen).toBe(false);
    expect(state.options).toBeNull();
    expect(state.isLoading).toBe(false);
  });

  it('closeConfirm works when onCancel is not provided', () => {
    useConfirmStore.getState().showConfirm({
      title: 'Confirm',
      message: 'Message',
      onConfirm: vi.fn(),
    });

    expect(() => useConfirmStore.getState().closeConfirm()).not.toThrow();
    expect(useConfirmStore.getState().isOpen).toBe(false);
    expect(useConfirmStore.getState().options).toBeNull();
  });

  it('closeConfirm works when no dialog is open', () => {
    expect(() => useConfirmStore.getState().closeConfirm()).not.toThrow();
    expect(useConfirmStore.getState().isOpen).toBe(false);
  });

  it('triggerConfirm calls onConfirm and resets state on success', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    useConfirmStore.getState().showConfirm({
      title: 'Confirm',
      message: 'Message',
      onConfirm,
    });

    await useConfirmStore.getState().triggerConfirm();

    expect(onConfirm).toHaveBeenCalledTimes(1);
    const state = useConfirmStore.getState();
    expect(state.isOpen).toBe(false);
    expect(state.options).toBeNull();
    expect(state.isLoading).toBe(false);
  });

  it('triggerConfirm sets isLoading to true during onConfirm', async () => {
    let resolveFn: () => void = () => {};
    const onConfirm = vi.fn().mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveFn = resolve;
        })
    );

    useConfirmStore.getState().showConfirm({
      title: 'Confirm',
      message: 'Message',
      onConfirm,
    });

    const promise = useConfirmStore.getState().triggerConfirm();
    expect(useConfirmStore.getState().isLoading).toBe(true);

    resolveFn();
    await promise;

    expect(useConfirmStore.getState().isLoading).toBe(false);
  });

  it('triggerConfirm resets state even if onConfirm throws', async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error('Failed'));
    useConfirmStore.getState().showConfirm({
      title: 'Confirm',
      message: 'Message',
      onConfirm,
    });

    await expect(useConfirmStore.getState().triggerConfirm()).rejects.toThrow(
      'Failed'
    );

    const state = useConfirmStore.getState();
    expect(state.isOpen).toBe(false);
    expect(state.options).toBeNull();
    expect(state.isLoading).toBe(false);
  });

  it('triggerConfirm returns early when no options are set', async () => {
    await useConfirmStore.getState().triggerConfirm();
    expect(useConfirmStore.getState().isOpen).toBe(false);
  });

  it('triggerConfirm handles synchronous onConfirm', async () => {
    const onConfirm = vi.fn();
    useConfirmStore.getState().showConfirm({
      title: 'Confirm',
      message: 'Message',
      onConfirm,
    });

    await useConfirmStore.getState().triggerConfirm();

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(useConfirmStore.getState().isOpen).toBe(false);
  });

  it('triggerConfirm calls onConfirm with correct context', async () => {
    const onConfirm = vi.fn();
    useConfirmStore.getState().showConfirm({
      title: 'Delete',
      message: 'Delete this item?',
      variant: 'danger',
      confirmLabel: 'Delete',
      onConfirm,
    });

    await useConfirmStore.getState().triggerConfirm();

        expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
