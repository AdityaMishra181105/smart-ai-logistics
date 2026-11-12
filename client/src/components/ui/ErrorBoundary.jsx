import React from 'react';
import { AlertOctagon, RefreshCw } from 'lucide-react';
import Button from './Button';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] bg-darkBg flex flex-col items-center justify-center p-6 text-customText border border-dashed border-customDanger/30 rounded-xl m-4">
          <div className="text-center space-y-2 mb-4">
            <div className="inline-flex items-center justify-center p-3 bg-customDanger/10 border border-customDanger/30 rounded-2xl text-customDanger">
              <AlertOctagon className="w-6 h-6 animate-pulse" />
            </div>
            <h3 className="text-sm font-bold tracking-tight text-customText">Component Rendering Interrupted</h3>
            <span className="text-[9px] text-customDanger font-extrabold uppercase tracking-widest font-mono">
              React Exception Caught
            </span>
          </div>

          <div className="w-full max-w-lg bg-darkCard border border-darkBorder rounded-lg p-4 shadow-xl space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] text-customMuted uppercase font-bold block">Error Description</span>
              <p className="text-[11px] text-customDanger font-mono font-semibold bg-customDanger/5 p-2 rounded border border-customDanger/20 leading-relaxed overflow-x-auto select-all text-left">
                {this.state.error?.toString()}
              </p>
            </div>

            {this.state.errorInfo && (
              <div className="space-y-1">
                <span className="text-[10px] text-customMuted uppercase font-bold block">Component Stack Trace</span>
                <pre className="text-[9px] text-customMuted font-mono bg-darkBgSecondary p-2 rounded border border-darkBorder/40 max-h-40 overflow-y-auto leading-normal whitespace-pre-wrap text-left">
                  {this.state.errorInfo.componentStack}
                </pre>
              </div>
            )}

            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              size="sm"
              className="w-full py-2 text-[10px] font-bold uppercase tracking-wider justify-center gap-1.5 border-customDanger/25 text-customDanger hover:bg-customDanger/5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reload Current Node</span>
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
