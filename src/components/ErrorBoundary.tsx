import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Application ErrorBoundary:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      let parsedDetails = '';
      try {
        const parsed = JSON.parse(this.state.errorMessage);
        if (parsed && parsed.error) {
          parsedDetails = parsed.error;
        }
      } catch {
        parsedDetails = this.state.errorMessage;
      }

      return (
        <div
          dir="rtl"
          className="min-h-screen bg-slate-50 flex items-center justify-center p-6"
        >
          <div className="max-w-lg w-full bg-white border border-slate-200 rounded-xl p-8 text-center shadow-sm">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-50 text-red-700 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-2">
              حدث خطأ غير متوقع في النظام
            </h1>
            <p className="text-sm text-slate-600 mb-4 leading-relaxed">
              نعتذر عن هذا الخلل. يرجى إعادة تحميل الصفحة أو التحقق من صلاحيات الاتصال بقاعدة البيانات.
            </p>
            {parsedDetails && (
              <div className="mb-6 p-3 rounded-lg bg-slate-100 border border-slate-200 text-xs text-slate-700 font-mono-code text-left dir-ltr overflow-auto max-h-32">
                {parsedDetails}
              </div>
            )}
            <button
              onClick={this.handleReload}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0B1F3A] text-white text-sm font-semibold rounded-lg hover:bg-[#133159] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              إعادة تحميل النظام
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
