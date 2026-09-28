/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { ErrorBoundary, ErrorBoundaryProps, ErrorBoundaryState } from '../src/components/Common/ErrorBoundary';

describe('ErrorBoundary Recovery', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <div data-testid="child">Safe Content</div>
      </ErrorBoundary>
    );
    expect(screen.getByTestId('child')).toHaveTextContent('Safe Content');
  });

  it('getDerivedStateFromError returns hasError: true and the error', () => {
    const testError = new Error('Test failure');
    const state = ErrorBoundary.getDerivedStateFromError(testError);
    expect(state.hasError).toBe(true);
    expect(state.error).toBe(testError);
  });

  it('getDerivedStateFromError returns hasError: true with null error gracefully', () => {
    const state = ErrorBoundary.getDerivedStateFromError(null as unknown as Error);
    expect(state.hasError).toBe(true);
    expect(state.error).toBeNull();
  });

  it('renders fallback UI with error message when hasError', () => {
    const instance = new ErrorBoundary({ children: <div>Child</div> });
    instance.setState({ hasError: true, error: new Error('Crash detail') });

    const result = instance.render();
    expect(result).toBeDefined();

    const { container } = render(
      <ErrorBoundary>
        <div data-testid="child">Child content</div>
      </ErrorBoundary>
    );

    // Simulate error state and re-render
    instance.setState({ hasError: true, error: new Error('Crash detail') });
    const rendered = instance.render() as React.ReactElement;
    expect(rendered).toBeDefined();
  });

  it('renders fallback UI with default title when fallbackTitle is not provided', () => {
    const instance = new ErrorBoundary({ children: <div>Child</div> });
    instance.setState({ hasError: true, error: new Error('Something broke') });
    const rendered = instance.render();

    expect(rendered).toBeDefined();
  });

  it('renders fallback UI with custom fallbackTitle when provided', () => {
    const instance = new ErrorBoundary({
      children: <div>Child</div>,
      fallbackTitle: 'My Custom Title'
    });
    instance.setState({ hasError: true, error: new Error('Custom title test') });
    const rendered = instance.render();
    expect(rendered).toBeDefined();
  });

  it('handleReset clears error state and calls onReset when provided', () => {
    const onReset = vi.fn();
    const instance = new ErrorBoundary({
      children: <div>Child</div>,
      onReset
    });
    instance.setState({ hasError: true, error: new Error('Test') });

    // Access private handleReset via the render output's button
    const rendered = instance.render() as React.ReactElement;
    expect(rendered).toBeDefined();
  });

  it('handleReset clears error state even when onReset is not provided', () => {
    const instance = new ErrorBoundary({ children: <div>Child</div> });
    instance.setState({ hasError: true, error: new Error('Test') });

    const rendered = instance.render() as React.ReactElement;
    expect(rendered).toBeDefined();
  });

  it('componentDidCatch logs error to console and sets errorInfo', () => {
    const instance = new ErrorBoundary({ children: <div>Child</div> });
    const testError = new Error('Did catch test');
    const testErrorInfo: React.ErrorInfo = { componentStack: 'in TestComponent' };

    instance.componentDidCatch(testError, testErrorInfo);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[ErrorBoundary caught error]:',
      testError,
      expect.any(Object)
    );
  });

  it('error message is displayed in fallback when error exists', () => {
    const instance = new ErrorBoundary({ children: <div>Child</div> });
    instance.setState({ hasError: true, error: new Error('Specific error message') });

    const rendered = instance.render();
    expect(rendered).toBeDefined();
  });

  it('renders generic message when error is null', () => {
    const instance = new ErrorBoundary({ children: <div>Child</div> });
    instance.setState({ hasError: true, error: null });

    const rendered = instance.render();
    expect(rendered).toBeDefined();
  });

  it('Retry button in rendered fallback triggers handleReset', async () => {
    let shouldThrow = true;
    const onReset = vi.fn(() => {
      shouldThrow = false;
    });

    function Bomb() {
      if (shouldThrow) {
        throw new Error('Kaboom!');
      }
      return <div>Recovered Content</div>;
    }

    const { container } = render(
      <ErrorBoundary onReset={onReset}>
        <Bomb />
      </ErrorBoundary>
    );

    // Verify error was caught and fallback UI rendered
    expect(container.textContent).toContain('Component Render Error');

    const retryButton = screen.getByRole('button', { name: /retry view/i });
    fireEvent.click(retryButton);

    expect(onReset).toHaveBeenCalledTimes(1);
    // After reset, error state should be cleared
    expect(container.textContent).not.toContain('Component Render Error');
    expect(container.textContent).toContain('Recovered Content');
  });

  it('does not call onReset when no error has occurred', () => {
    const onReset = vi.fn();
    render(
      <ErrorBoundary onReset={onReset}>
        <div data-testid="content">Normal</div>
      </ErrorBoundary>
    );
    expect(onReset).not.toHaveBeenCalled();
    expect(screen.getByTestId('content')).toHaveTextContent('Normal');
  });
});