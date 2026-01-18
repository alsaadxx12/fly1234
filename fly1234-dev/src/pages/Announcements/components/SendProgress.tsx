import React from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../../../contexts/LanguageContext';
import { CheckCircle2, X, Users, Pause, Play, Clock, Zap, Loader2, Check, XCircle, AlertCircle, ArrowRight } from 'lucide-react';

type Props = {
  sendProgress?: { total: number; sent: number; current?: string; failed?: number };
  isPaused: boolean;
  sendDelay: number;
  setSendDelay: (delay: number) => void;
  successfulGroups: string[];
  failedGroups: string[];
  onPauseResume: () => void;
  onClose: () => void;
  isSending: boolean;
  className?: string;
};

const SendProgress: React.FC<Props> = ({
  sendProgress,
  isPaused,
  sendDelay,
  setSendDelay,
  successfulGroups,
  failedGroups,
  onPauseResume,
  onClose,
  isSending,
  className = ''
}) => {
  const { t } = useLanguage();
  const [showDetails, setShowDetails] = React.useState(false);
  
  const handlePauseResume = () => {
    onPauseResume();
  };

  const total = sendProgress?.total || 0;
  const sent = sendProgress?.sent || 0;
  const progressPercentage = total > 0 
    ? Math.round((sent / total) * 100) 
    : 0;

  // Calculate estimated time remaining
  const estimatedTimeRemaining = React.useMemo(() => {
    if (isPaused || sent === 0 || sent === total) {
      return null;
    }
    
    const remainingItems = total - sent;
    const secondsPerItem = sendDelay / 1000;
    const totalSeconds = remainingItems * secondsPerItem;
    
    if (totalSeconds < 60) {
      return `${Math.ceil(totalSeconds)} ثانية`;
    } else if (totalSeconds < 3600) {
      return `${Math.ceil(totalSeconds / 60)} دقيقة`;
    } else {
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.ceil((totalSeconds % 3600) / 60);
      return `${hours} ساعة و ${minutes} دقيقة`;
    }
  }, [sendProgress, sendDelay, isPaused, total, sent]);

  const isComplete = sent === total;

  const modalContent = (
    <div className={`fixed inset-0 bg-black/70 dark:bg-black/80 flex items-center justify-center backdrop-blur-sm transition-all duration-150 ${className} z-[99999]`} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-xl mx-4 border border-gray-100 dark:border-gray-700 transform transition-transform duration-150 overflow-hidden">
        {/* Header with gradient background */}
        <div className="relative p-6 bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-700 dark:to-emerald-700 text-white overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gray-50/10 rounded-full -mt-32 -mr-32 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-gray-50/5 rounded-full -mb-32 -ml-32 blur-3xl"></div>
          
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gray-50/20 backdrop-blur-sm rounded-xl shadow-inner">
                {isPaused ? (
                  <Pause className="w-8 h-8 text-white" />
                ) : (
                  <CheckCircle2 className="w-8 h-8 text-white" />
                )}
              </div>
              <div>
                <h3 className="text-2xl font-bold">{t('sendStatus')}</h3>
                <p className="text-white/80 mt-1">
                  {isPaused ? 'تم إيقاف الإرسال مؤقتًا' : isSending ? 'جاري إرسال الرسائل...' : 'اكتمل الإرسال'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-white/80 hover:bg-white/10 rounded-lg transition-colors"
              title="إغلاق"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        
        <div className="p-6 bg-gray-50 dark:bg-gray-800">
          <div className="space-y-4">
            {/* Progress */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-700 dark:text-gray-300 text-lg font-medium">{t('sendingProgress')}</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-right text-gray-900 dark:text-white">{sent}/{total}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">({progressPercentage}%)</span>
              </div>
            </div>
            
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-6 overflow-hidden shadow-inner">
              <div
                className={`h-6 rounded-full transition-all duration-300 ${
                  isPaused ? 'bg-yellow-500 dark:bg-yellow-600' : 'bg-green-600 dark:bg-green-500'
                }`}
                style={{ width: `${progressPercentage}%` }}
              >
                <div className="h-full w-full bg-gradient-to-r from-transparent via-white/20 to-transparent bg-[length:500px_100%] animate-shimmer"></div>
              </div>
            </div>

            {/* Estimated time remaining */}
            {estimatedTimeRemaining && !isComplete && (
              <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700 text-sm">
                <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span className="text-gray-700 dark:text-gray-300">
                  الوقت المتبقي: <span className="font-medium text-gray-900 dark:text-white">{estimatedTimeRemaining}</span>
                </span>
              </div>
            )}

            {/* Speed Control */}
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700">
              <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                <span>{t('sendSpeed')}</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="1000"
                  max="5000"
                  step="500"
                  value={sendDelay}
                  onChange={(e) => setSendDelay(Number(e.target.value))}
                  className="flex-1 h-3 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-green-600 dark:accent-green-500"
                />
                <span className="text-base text-gray-700 dark:text-gray-300 min-w-[80px] font-medium">
                  {(sendDelay / 1000).toFixed(1)} <span className="text-sm text-gray-500 dark:text-gray-400">{t('seconds')}</span>
                </span>
              </div>
              
              <div className="mt-2 flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>أسرع</span>
                <span>أبطأ</span>
              </div>
            </div>
            
            {/* Pause/Resume Button */}
            {!isComplete && (
              <button
                onClick={handlePauseResume}
                className={`w-full mt-6 px-4 py-3.5 rounded-xl text-white transition-all text-lg font-bold shadow-md min-h-[50px] flex items-center justify-center gap-2 ${
                  isPaused
                    ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-green-200 dark:shadow-green-900/20'
                    : 'bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 shadow-yellow-200 dark:shadow-yellow-900/20'
                }`}
              >
                {isPaused ? (
                   <>
                    <Play className="w-5 h-5" />
                    <span>{t('resume')}</span>
                   </>
                ) : (
                  <>
                    <Pause className="w-5 h-5" />
                    <span>{t('pause')}</span>
                  </>
                )}
              </button>
            )}

            {/* Status Summary */}
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className={`p-4 rounded-xl border ${
                successfulGroups.length > 0 
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800/50' 
                  : 'bg-gray-50 dark:bg-gray-700/50 border-gray-100 dark:border-gray-700'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-1.5 rounded-lg ${
                    successfulGroups.length > 0 
                      ? 'bg-green-100 dark:bg-green-800/50' 
                      : 'bg-gray-100 dark:bg-gray-600'
                  }`}>
                    <Check className={`w-4 h-4 ${
                      successfulGroups.length > 0 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-gray-500 dark:text-gray-400'
                    }`} />
                  </div>
                  <span className={`text-sm font-medium ${
                    successfulGroups.length > 0 
                      ? 'text-green-700 dark:text-green-400' 
                      : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {t('sentSuccessfully')}
                  </span>
                </div>
                <div className="text-2xl font-bold text-center py-2 text-green-700 dark:text-green-400">
                  {successfulGroups.length}
                </div>
              </div>
              
              <div className={`p-4 rounded-xl border ${
                failedGroups.length > 0 
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800/50' 
                  : 'bg-gray-50 dark:bg-gray-700/50 border-gray-100 dark:border-gray-700'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-1.5 rounded-lg ${
                    failedGroups.length > 0 
                      ? 'bg-red-100 dark:bg-red-800/50' 
                      : 'bg-gray-100 dark:bg-gray-600'
                  }`}>
                    <XCircle className={`w-4 h-4 ${
                      failedGroups.length > 0 
                        ? 'text-red-600 dark:text-red-400' 
                        : 'text-gray-500 dark:text-gray-400'
                    }`} />
                  </div>
                  <span className={`text-sm font-medium ${
                    failedGroups.length > 0 
                      ? 'text-red-700 dark:text-red-400' 
                      : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {t('sendFailed')}
                  </span>
                </div>
                <div className="text-2xl font-bold text-center py-2 text-red-700 dark:text-red-400">
                  {failedGroups.length}
                </div>
              </div>
            </div>
            
            {/* Show Details Button */}
            {(successfulGroups.length > 0 || failedGroups.length > 0) && (
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="w-full mt-4 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
              >
                {showDetails ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
                <ArrowRight className={`w-4 h-4 transition-transform duration-200 ${showDetails ? 'rotate-90' : ''}`} />
              </button>
            )}
            
            {/* Detailed Results */}
            {showDetails && (
              <div className="mt-4 space-y-4">
                {successfulGroups.length > 0 && (
                  <div>
                    <h4 className="text-green-600 dark:text-green-400 font-bold mb-2 text-base flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      {t('sentSuccessfully')} ({successfulGroups.length})
                    </h4>
                    <div className="max-h-48 overflow-y-auto bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-100 dark:border-green-800/50 scrollbar-thin scrollbar-thumb-green-200 dark:scrollbar-thumb-green-800">
                      <div className="space-y-1">
                        {successfulGroups.map((group, index) => (
                          <div key={index} className="text-sm text-green-700 dark:text-green-300 py-1.5 px-2 border-b border-green-100 dark:border-green-800/30 last:border-0 truncate rounded-md hover:bg-green-100/50 dark:hover:bg-green-800/30">{group}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {failedGroups.length > 0 && (
                  <div>
                    <h4 className="text-red-600 dark:text-red-400 font-bold mb-2 text-base flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      {t('sendFailed')} ({failedGroups.length})
                    </h4>
                    <div className="max-h-48 overflow-y-auto bg-red-50 dark:bg-red-900/20 rounded-lg p-3 border border-red-100 dark:border-red-800/50 scrollbar-thin scrollbar-thumb-red-200 dark:scrollbar-thumb-red-800">
                      <div className="space-y-1">
                        {failedGroups.map((group, index) => (
                          <div key={index} className="text-sm text-red-700 dark:text-red-300 py-1.5 px-2 border-b border-red-100 dark:border-red-800/30 last:border-0 truncate rounded-md hover:bg-red-100/50 dark:hover:bg-red-800/30">{group}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-end gap-3 p-6 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          {isComplete && (
            <button
              onClick={onClose}
              className="px-6 py-3.5 text-white bg-gradient-to-r from-green-600 to-green-700 dark:from-green-700 dark:to-green-800 rounded-xl hover:from-green-700 hover:to-green-800 dark:hover:from-green-600 dark:hover:to-green-700 transition-all shadow-md shadow-green-200 dark:shadow-green-900/20 hover:shadow-lg hover:shadow-green-300 dark:hover:shadow-green-900/30 active:scale-95 font-bold"
            >
              {t('done')}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

export default SendProgress;
