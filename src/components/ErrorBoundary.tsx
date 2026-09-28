import React from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

// Without this, any uncaught error thrown during render anywhere in the
// tree (a bad array index, a null-check miss, a third-party SDK like
// Daily's video client throwing synchronously) unmounts the entire React
// app and leaves the visitor looking at a blank white page with no
// indication anything went wrong. This has already happened twice in this
// app's history for two unrelated reasons, so it is caught here instead:
// the rest of the site keeps working, and the failure is visible.
export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // Declared explicitly (rather than relying on inherited members) because
  // this project has no @types/react installed, so TypeScript resolves
  // React.Component's own generics as `any` and cannot infer `state`/`props`
  // from it.
  declare props: ErrorBoundaryProps;
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Unhandled error in the application:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl shadow-lg p-8 text-center space-y-4">
            <h1 className="font-sans font-black text-xl text-slate-900">Something went wrong</h1>
            <p className="text-sm text-slate-600">
              This section of the page hit an unexpected error. Reloading usually fixes it; if it
              keeps happening, please let us know what you were doing.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-bold transition"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
