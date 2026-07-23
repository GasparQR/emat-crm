import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary] Uncaught error:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, () =>
          this.setState({ hasError: false, error: null })
        );
      }
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
          <div className="max-w-md text-center space-y-4">
            <p className="text-xl font-semibold text-slate-900">Algo salió mal</p>
            <p className="text-sm text-slate-500">
              {this.state.error?.message || "Error inesperado en la aplicación."}
            </p>
            <button
              type="button"
              className="text-sm text-blue-600 underline"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Intentar de nuevo
            </button>
            <span className="mx-2 text-slate-300">·</span>
            <button
              type="button"
              className="text-sm text-blue-600 underline"
              onClick={() => window.location.href = "/"}
            >
              Ir al inicio
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
