"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/** Top-level error boundary — catches render errors in the component tree
 *  and shows a fallback UI instead of a blank white screen.
 *  Iteration 2: adds resilience to the dashboard layout. */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <span className="material-symbols-outlined text-3xl text-destructive">
                error
              </span>
            </div>
            <h1 className="text-lg font-semibold text-foreground">
              Something went wrong
            </h1>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              An unexpected error occurred. Please try refreshing the page.
            </p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="mt-6 rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
