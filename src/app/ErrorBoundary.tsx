// Top-level crash guard. Deliberately does NOT depend on react-i18next (a
// crash could originate anywhere, including i18n init) — the fallback text
// is hardcoded in both languages so it's readable no matter what broke.
// Progress is genuinely safe: every mutation (gamification/store.ts) writes
// straight to localStorage synchronously, so a render-time crash afterward
// can't lose it.

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('CodeTrek crashed:', error, info.componentStack);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="crash-screen">
          <span className="crash-screen__icon" aria-hidden="true">
            🤖💤
          </span>
          <h1>Oops! Something went wrong. / Опа! Нещо се обърка.</h1>
          <p>
            Your progress is saved — try reloading the page.
            <br />
            Твоят напредък е запазен — опитай да презаредиш страницата.
          </p>
          <button type="button" className="btn btn-primary" onClick={this.handleReload}>
            Reload / Презареди
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
