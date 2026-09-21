import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, LogOut } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetSession = () => {
    try {
      sessionStorage.clear();
      localStorage.removeItem('alhikmah_session_user');
      localStorage.removeItem('alhikmah_current_user');
    } catch (e) {
      console.error(e);
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-3xl p-6 shadow-2xl text-center space-y-5">
            <div className="w-16 h-16 bg-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto border border-rose-500/30">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                Terjadi Kendala Memuat Tampilan
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Aplikasi Raport Pondok Pesantren Modern Al-Hikmah mendeteksi kendala pada sesi peramban.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-700/60 text-left font-mono text-[11px] text-rose-300 max-h-28 overflow-y-auto">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <RefreshCw className="w-4 h-4" />
                Muat Ulang Halaman
              </button>
              <button
                type="button"
                onClick={this.handleResetSession}
                className="flex-1 py-2.5 px-4 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer border border-slate-600"
              >
                <LogOut className="w-4 h-4" />
                Reset Sesi & Login
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
