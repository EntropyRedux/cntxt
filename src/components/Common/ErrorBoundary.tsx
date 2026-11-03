import React from 'react';
import { recordDiagnostic } from '../../services/diagnosticLogger';

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Universal React Error Boundary
 * Catches unhandled rendering exceptions in child trees (CodeMirror, KaTeX, Mermaid, Markdown)
 * and renders an accessible fallback card with a manual recovery action.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
    recordDiagnostic('error', 'ErrorBoundary', error.message, {
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
    this.setState({ errorInfo });
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="flex flex-col items-center justify-center p-6 m-4 rounded-lg border text-center select-none shadow-lg"
          style={{
            backgroundColor: 'var(--card-bg, #1e1e24)',
            borderColor: 'var(--card-border, #33333f)',
            color: 'var(--text-primary, #ffffff)',
          }}
        >
          <div
            className="w-12 h-12 mb-3 rounded-full flex items-center justify-center text-xl"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              color: 'var(--status-error, #ef4444)',
            }}
          >
            ⚠️
          </div>

          <h3 className="text-base font-semibold mb-1">
            {this.props.fallbackTitle || 'Component Render Error'}
          </h3>

          <p
            className="text-xs mb-4 max-w-md line-clamp-3 font-mono"
            style={{ color: 'var(--text-muted, #888899)' }}
          >
            {this.state.error?.message || 'An unexpected rendering error occurred.'}
          </p>

          <button
            type="button"
            onClick={this.handleReset}
            className="px-4 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer"
            style={{
              backgroundColor: 'var(--accent-primary, #007acc)',
              color: '#ffffff',
            }}
          >
            Retry View
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
