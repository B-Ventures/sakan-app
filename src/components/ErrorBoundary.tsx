import React, { ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RefreshCw, Download, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
    console.error('Uncaught component error in production-ready stack:', error, errorInfo);
  }

  private handleDownloadCrashDump = () => {
    try {
      const dump = {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        error: this.state.error?.message || 'Unknown Error',
        stack: this.state.error?.stack || '',
        localStorageSnapshot: { ...localStorage },
        sessionStorageSnapshot: { ...sessionStorage },
      };

      const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `property_ledger_crash_dump_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Failed to generate local diagnostic dump file.');
    }
  };

  private handleEmergencyResetAndReload = () => {
    try {
      // Clear all active demo building caches and refresh state
      const targetKeys = Object.keys(localStorage).filter(
        key => key.startsWith('demo_') || key.startsWith('firebase:')
      );
      targetKeys.forEach(k => localStorage.removeItem(k));
      window.location.reload();
    } catch (e) {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 font-sans">
          <div className="w-full max-w-xl bg-slate-800 border-2 border-red-500/30 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-amber-500 to-indigo-500" />
            
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-3 bg-red-500/10 rounded-2xl border border-red-500/20 text-red-400">
                <ShieldAlert className="w-10 h-10 animate-bounce" />
              </div>
              
              <div className="space-y-1">
                <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
                  System Isolation & Resilience Trigger
                </h1>
                <p className="text-xs text-slate-400 max-w-md">
                  The active React environment intercepted an unexpected state or rendering crash. Your data remains protected by our schema layers.
                </p>
              </div>

              {/* Error Detail Display */}
              <div className="w-full text-left bg-slate-950/80 border border-slate-700/50 rounded-2xl p-4 font-mono text-[11px] text-slate-300 overflow-x-auto max-h-48 leading-relaxed selection:bg-slate-800">
                <div className="text-red-400 font-bold mb-1">
                  CRASH_REPORT_STACK: {this.state.error?.toString()}
                </div>
                {this.state.errorInfo?.componentStack && (
                  <pre className="text-slate-400 whitespace-pre-wrap leading-normal">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>

              {/* Recovery Directives */}
              <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="w-full py-2.5 bg-slate-700 hover:bg-slate-600 border border-slate-600 transition-colors text-white font-bold rounded-xl text-[11px] flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Soft Reload
                </button>

                <button
                  type="button"
                  onClick={this.handleDownloadCrashDump}
                  className="w-full py-2.5 bg-slate-700 hover:bg-slate-600 border border-slate-600 transition-colors text-white font-bold rounded-xl text-[11px] flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  Crash Dump
                </button>

                <button
                  type="button"
                  onClick={this.handleEmergencyResetAndReload}
                  className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Disaster Reset
                </button>
              </div>

              <div className="text-[10px] text-slate-500 pt-2 border-t border-slate-700/50 w-full flex justify-between items-center px-1">
                <span>Core Build Engine: React 19 SPA</span>
                <span className="font-mono bg-slate-900 px-1.5 py-0.5 rounded text-[9px]">Layer 12 & 13 Active</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
