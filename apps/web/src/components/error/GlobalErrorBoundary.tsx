'use client';

import * as React from 'react';
import { ErrorReportDialog, type ErrorInfo } from './ErrorReportDialog';

interface GlobalErrorBoundaryProps {
  children: React.ReactNode;
}

interface GlobalErrorBoundaryState {
  hasError: boolean;
  errorInfo: ErrorInfo | null;
  showDialog: boolean;
}

function generateErrorId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `ERR-${timestamp}-${random}`.toUpperCase();
}

export class GlobalErrorBoundary extends React.Component<
  GlobalErrorBoundaryProps,
  GlobalErrorBoundaryState
> {
  constructor(props: GlobalErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorInfo: null,
      showDialog: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<GlobalErrorBoundaryState> {
    return {
      hasError: true,
      errorInfo: {
        error,
        errorId: generateErrorId(),
      },
      showDialog: true,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Update state with component stack
    this.setState((prevState) => ({
      errorInfo: prevState.errorInfo
        ? {
            ...prevState.errorInfo,
            errorInfo,
          }
        : {
            error,
            errorInfo,
            errorId: generateErrorId(),
          },
    }));

    // Log error to console for debugging
    console.error('GlobalErrorBoundary caught an error:', error);
    console.error('Component stack:', errorInfo.componentStack);
  }

  componentDidMount(): void {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection);

    // Handle global JS errors not caught by React
    window.addEventListener('error', this.handleGlobalError);
  }

  componentWillUnmount(): void {
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
    window.removeEventListener('error', this.handleGlobalError);
  }

  handleUnhandledRejection = (event: PromiseRejectionEvent): void => {
    const error = event.reason instanceof Error
      ? event.reason
      : new Error(String(event.reason) || 'Unhandled promise rejection');

    this.setState({
      hasError: true,
      errorInfo: {
        error,
        errorId: generateErrorId(),
      },
      showDialog: true,
    });

    console.error('Unhandled promise rejection:', error);
  };

  handleGlobalError = (event: ErrorEvent): void => {
    // Avoid duplicate handling - React will already catch component errors
    if (this.state.hasError) return;

    // Filter out benign browser warnings that are not real errors
    const benignErrors = [
      'ResizeObserver loop completed with undelivered notifications',
      'ResizeObserver loop limit exceeded',
    ];

    if (benignErrors.some(msg => event.message?.includes(msg))) {
      // These are harmless browser warnings, not real errors
      return;
    }

    const error = event.error instanceof Error
      ? event.error
      : new Error(event.message || 'An unexpected error occurred');

    this.setState({
      hasError: true,
      errorInfo: {
        error,
        errorId: generateErrorId(),
      },
      showDialog: true,
    });

    console.error('Global error:', error);
  };

  handleDialogOpenChange = (open: boolean): void => {
    this.setState({ showDialog: open });
  };

  handleRetry = (): void => {
    this.setState({
      hasError: false,
      errorInfo: null,
      showDialog: false,
    });
  };

  render(): React.ReactNode {
    const { children } = this.props;
    const { hasError, errorInfo, showDialog } = this.state;

    return (
      <>
        {hasError ? (
          // Render a fallback UI when there's an error
          <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <div className="max-w-md text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                <svg
                  className="h-8 w-8 text-destructive"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h1 className="mb-2 text-xl font-semibold text-foreground">
                Something went wrong
              </h1>
              <p className="mb-6 text-muted-foreground">
                An unexpected error has occurred. Please use the dialog to report this issue.
              </p>
              <button
                onClick={() => this.setState({ showDialog: true })}
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                Report Issue
              </button>
            </div>
          </div>
        ) : (
          children
        )}

        <ErrorReportDialog
          open={showDialog}
          onOpenChange={this.handleDialogOpenChange}
          errorInfo={errorInfo}
          onRetry={this.handleRetry}
        />
      </>
    );
  }
}

export default GlobalErrorBoundary;
