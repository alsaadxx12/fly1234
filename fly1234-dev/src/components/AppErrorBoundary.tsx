import { Component, ErrorInfo, ReactNode } from 'react';
import { RotateCcw, AlertTriangle } from 'lucide-react';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class AppErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    private handleReload = () => {
        window.location.reload();
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 font-['Tajawal'] text-white">
                    <div className="max-w-md w-full bg-slate-800/50 backdrop-blur-xl border border-white/10 rounded-[32px] p-8 text-center shadow-2xl">
                        <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle className="w-10 h-10 text-amber-500" />
                        </div>

                        <h1 className="text-2xl font-black mb-4">عذراً، حدث خطأ غير متوقع</h1>
                        <p className="text-slate-400 mb-8 leading-relaxed">
                            توقف التطبيق عن العمل بشكل مؤقت بسبب خطأ تقني. يرجى محاولة إعادة تحميل الصفحة.
                        </p>

                        <button
                            onClick={this.handleReload}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg shadow-blue-500/20"
                        >
                            <RotateCcw className="w-6 h-6" />
                            <span>إعادة تحميل التطبيق</span>
                        </button>

                        {process.env.NODE_ENV === 'development' && (
                            <div className="mt-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-left overflow-auto max-h-40">
                                <code className="text-xs text-red-400 whitespace-pre-wrap">
                                    {this.state.error?.toString()}
                                </code>
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default AppErrorBoundary;
