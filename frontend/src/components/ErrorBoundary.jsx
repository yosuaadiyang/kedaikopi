import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-coffee-950 px-4">
          <div className="text-center max-w-md">
            <img src="/logo.png" alt="KedaiKopi" className="h-10 w-auto mx-auto mb-4 opacity-50" />
            <h1 className="text-4xl font-bold text-coffee-400 mb-3">Oops!</h1>
            <p className="text-coffee-300 mb-6">Terjadi kesalahan. Silakan refresh halaman.</p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary px-6 py-2"
            >
              Refresh Halaman
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
