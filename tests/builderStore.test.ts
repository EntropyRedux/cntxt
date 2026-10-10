import { describe, it, expect, beforeEach } from 'vitest';
import { useBuilderStore } from '../src/features/panelApps/state/builderStore';

describe('builderStore', () => {
  beforeEach(() => {
    useBuilderStore.setState({
      isOpen: false,
      step: 'source',
      source: null,
      html: null,
      sourceNote: null,
      createdFrom: 'tab',
      details: {
        name: '',
        icon: 'Layers',
        description: '',
        network: 'offline',
        panelWidth: 480,
      },
      isCreating: false,
      start: useBuilderStore.getState().start,
      setSource: useBuilderStore.getState().setSource,
      setDetails: useBuilderStore.getState().setDetails,
      setStep: useBuilderStore.getState().setStep,
      setIsCreating: useBuilderStore.getState().setIsCreating,
      reset: useBuilderStore.getState().reset,
      close: useBuilderStore.getState().close,
        });
  });

  it('initializes as closed with source step', () => {
    const state = useBuilderStore.getState();
    expect(state.isOpen).toBe(false);
    expect(state.step).toBe('source');
    expect(state.source).toBeNull();
    expect(state.html).toBeNull();
    expect(state.sourceNote).toBeNull();
    expect(state.createdFrom).toBe('tab');
    expect(state.isCreating).toBe(false);
  });

  it('initializes details with defaults', () => {
    const { details } = useBuilderStore.getState();
    expect(details.name).toBe('');
    expect(details.icon).toBe('Layers');
    expect(details.description).toBe('');
    expect(details.network).toBe('offline');
    expect(details.panelWidth).toBe(480);
  });

  it('start opens with tab preload and advances to details step', () => {
    useBuilderStore.getState().start({
      kind: 'tab',
      docId: 'doc1',
      name: 'calculator.js',
      content: '<div>calc</div>',
    });
    const state = useBuilderStore.getState();
    expect(state.isOpen).toBe(true);
    expect(state.step).toBe('details');
    expect(state.source).toEqual({
      kind: 'tab', docId: 'doc1', name: 'calculator.js', content: '<div>calc</div>',
    });
    expect(state.html).toBe('<div>calc</div>');
    expect(state.sourceNote).toBeNull();
    expect(state.createdFrom).toBe('tab');
    expect(state.details.name).toBe('calculator');
  });

  it('start opens with file preload', () => {
    useBuilderStore.getState().start({
      kind: 'file',
      path: '/home/user/app.html',
      name: 'my-app.html',
      content: '<html></html>',
    });
    const state = useBuilderStore.getState();
    expect(state.isOpen).toBe(true);
    expect(state.createdFrom).toBe('file');
    expect(state.details.name).toBe('my-app');
  });

    it('start falls back to "My App" when filename is empty after extension removal', () => {
    useBuilderStore.getState().start({
      kind: 'tab', docId: 'd1', name: '.js', content: '<div></div>',
    });
    expect(useBuilderStore.getState().details.name).toBe('My App');
  });

  it('start without preload stays on source step', () => {
    useBuilderStore.getState().start();
    const state = useBuilderStore.getState();
    expect(state.isOpen).toBe(true);
    expect(state.step).toBe('source');
    expect(state.source).toBeNull();
    expect(state.html).toBeNull();
        expect(state.details.name).toBe('');
  });

  it('setSource sets source, html, and note', () => {
    const source = {
      kind: 'file' as const, path: '/app/main.html', name: 'main.html', content: '<p>hi</p>',
    };
    useBuilderStore.getState().setSource(source, '<p>hi</p>', 'A note');
    const state = useBuilderStore.getState();
    expect(state.source).toEqual(source);
    expect(state.html).toBe('<p>hi</p>');
    expect(state.sourceNote).toBe('A note');
    expect(state.createdFrom).toBe('file');
  });

  it('setSource defaults note to null', () => {
    const source = {
      kind: 'tab' as const, docId: 'd1', name: 'test.js', content: 'x',
    };
    useBuilderStore.getState().setSource(source, 'x');
    expect(useBuilderStore.getState().sourceNote).toBeNull();
  });

  it('setSource preserves existing name when set', () => {
    useBuilderStore.getState().start();
    useBuilderStore.getState().setDetails({ name: 'Custom' });
    useBuilderStore.getState().setSource(
      { kind: 'tab', docId: 'd1', name: 'file.ts', content: 'c' }, 'c'
    );
    expect(useBuilderStore.getState().details.name).toBe('Custom');
  });


  it('setDetails updates partial fields', () => {
    useBuilderStore.getState().setDetails({ name: 'App1' });
    expect(useBuilderStore.getState().details.name).toBe('App1');
    useBuilderStore.getState().setDetails({ panelWidth: 600 });
    expect(useBuilderStore.getState().details.panelWidth).toBe(600);
    expect(useBuilderStore.getState().details.name).toBe('App1');
  });

  it('setStep updates current step', () => {
    useBuilderStore.getState().setStep('details');
    expect(useBuilderStore.getState().step).toBe('details');
    useBuilderStore.getState().setStep('review');
    expect(useBuilderStore.getState().step).toBe('review');
    useBuilderStore.getState().setStep('source');
    expect(useBuilderStore.getState().step).toBe('source');
  });

  it('setIsCreating toggles flag', () => {
    useBuilderStore.getState().setIsCreating(true);
    expect(useBuilderStore.getState().isCreating).toBe(true);
    useBuilderStore.getState().setIsCreating(false);
    expect(useBuilderStore.getState().isCreating).toBe(false);
  });

  it('reset returns to initial state', () => {
    useBuilderStore.getState().start({
      kind: 'file', path: '/a.html', name: 'a.html', content: '<div></div>',
    });
    useBuilderStore.getState().setDetails({ name: 'Custom', panelWidth: 800 });
    useBuilderStore.getState().reset();
    const state = useBuilderStore.getState();
    expect(state.isOpen).toBe(false);
    expect(state.step).toBe('source');
    expect(state.source).toBeNull();
    expect(state.details.name).toBe('');
    expect(state.details.panelWidth).toBe(480);
    expect(state.isCreating).toBe(false);
  });

  it('close hides without resetting other state', () => {
    useBuilderStore.getState().start({
      kind: 'file', path: '/a.html', name: 'a.html', content: '<div></div>',
    });
    useBuilderStore.getState().setDetails({ name: 'My App' });
    useBuilderStore.getState().close();
    const state = useBuilderStore.getState();
    expect(state.isOpen).toBe(false);
    expect(state.step).toBe('details');
    expect(state.details.name).toBe('My App');
  });
});


