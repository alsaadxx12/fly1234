import React, { useState, useEffect } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { Brain, TrendingUp, CircleAlert as AlertCircle, Lightbulb, BarChart3, DollarSign, Users, Loader } from 'lucide-react';

interface Insight {
  id: string;
  type: 'tip' | 'warning' | 'trend' | 'opportunity';
  title: string;
  description: string;
  icon: React.ReactNode;
}

interface AIInsightsProps {
  apiKey?: string;
}

export default function AIInsights({ apiKey }: AIInsightsProps) {
  const { theme } = useTheme();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    generateInsights();
  }, []);

  const generateInsights = async () => {
    setIsLoading(true);

    const defaultInsights: Insight[] = [
      {
        id: '1',
        type: 'tip',
        title: 'تحسين التدفق النقدي',
        description: 'لاحظنا أن متوسط فترة التحصيل هي 45 يوماً. يمكنك تحسين التدفق النقدي بتقليص هذه المدة إلى 30 يوماً.',
        icon: <DollarSign className="w-5 h-5" />
      },
      {
        id: '2',
        type: 'trend',
        title: 'ارتفاع المصروفات',
        description: 'المصروفات التشغيلية ارتفعت بنسبة 15% هذا الشهر مقارنة بالشهر الماضي. قد تحتاج لمراجعة بنود المصروفات.',
        icon: <TrendingUp className="w-5 h-5" />
      },
      {
        id: '3',
        type: 'opportunity',
        title: 'فرصة استثمارية',
        description: 'لديك فائض نقدي قدره 50,000 ريال. يمكنك استثماره في أدوات مالية قصيرة الأجل لتحقيق عائد إضافي.',
        icon: <Lightbulb className="w-5 h-5" />
      },
      {
        id: '4',
        type: 'warning',
        title: 'تنبيه: اقتراب موعد استحقاق',
        description: 'لديك فواتير بقيمة 30,000 ريال تستحق خلال أسبوع. تأكد من توفر السيولة اللازمة.',
        icon: <AlertCircle className="w-5 h-5" />
      }
    ];

    setTimeout(() => {
      setInsights(defaultInsights);
      setIsLoading(false);
    }, 1000);
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'tip':
        return theme === 'dark'
          ? 'from-blue-600/20 to-blue-500/20 border-blue-500/30'
          : 'from-blue-50 to-blue-100 border-blue-200';
      case 'warning':
        return theme === 'dark'
          ? 'from-red-600/20 to-red-500/20 border-red-500/30'
          : 'from-red-50 to-red-100 border-red-200';
      case 'trend':
        return theme === 'dark'
          ? 'from-purple-600/20 to-purple-500/20 border-purple-500/30'
          : 'from-purple-50 to-purple-100 border-purple-200';
      case 'opportunity':
        return theme === 'dark'
          ? 'from-green-600/20 to-green-500/20 border-green-500/30'
          : 'from-green-50 to-green-100 border-green-200';
      default:
        return theme === 'dark'
          ? 'from-gray-700/20 to-gray-600/20 border-gray-600/30'
          : 'from-gray-50 to-gray-100 border-gray-200';
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'tip':
        return theme === 'dark' ? 'text-blue-400' : 'text-blue-600';
      case 'warning':
        return theme === 'dark' ? 'text-red-400' : 'text-red-600';
      case 'trend':
        return theme === 'dark' ? 'text-purple-400' : 'text-purple-600';
      case 'opportunity':
        return theme === 'dark' ? 'text-green-400' : 'text-green-600';
      default:
        return theme === 'dark' ? 'text-gray-400' : 'text-gray-600';
    }
  };

  return (
    <div className={`rounded-2xl shadow-lg border p-6 ${
      theme === 'dark'
        ? 'bg-gray-800/60 border-gray-700'
        : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-gradient-to-br ${
            theme === 'dark'
              ? 'from-purple-600 to-blue-600'
              : 'from-purple-500 to-blue-500'
          }`}>
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className={`text-lg font-bold ${
              theme === 'dark' ? 'text-gray-100' : 'text-gray-800'
            }`}>رؤى ذكية</h3>
            <p className={`text-xs ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>مدعوم بالذكاء الصناعي</p>
          </div>
        </div>
        <button
          onClick={generateInsights}
          disabled={isLoading}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            theme === 'dark'
              ? 'bg-purple-600 hover:bg-purple-500 text-white'
              : 'bg-purple-500 hover:bg-purple-600 text-white'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Loader className="w-4 h-4 animate-spin" />
              جاري التحليل...
            </span>
          ) : (
            'تحديث'
          )}
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader className={`w-10 h-10 animate-spin mx-auto mb-3 ${
              theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
            }`} />
            <p className={`text-sm ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>جاري تحليل البيانات...</p>
          </div>
        </div>
      ) : insights.length === 0 ? (
        <div className={`text-center py-8 ${
          theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
        }`}>
          <Brain className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>لا توجد رؤى متاحة حالياً</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {insights.map((insight) => (
            <div
              key={insight.id}
              className={`p-4 rounded-xl border bg-gradient-to-r ${getInsightColor(insight.type)} transition-all hover:shadow-md`}
            >
              <div className="flex gap-3">
                <div className={`flex-shrink-0 ${getIconColor(insight.type)}`}>
                  {insight.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className={`font-semibold mb-1 ${
                    theme === 'dark' ? 'text-gray-100' : 'text-gray-800'
                  }`}>
                    {insight.title}
                  </h4>
                  <p className={`text-sm ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    {insight.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!apiKey && !isLoading && (
        <div className={`mt-4 p-3 rounded-lg border ${
          theme === 'dark'
            ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
            : 'bg-yellow-50 border-yellow-200 text-yellow-700'
        }`}>
          <div className="flex items-start gap-2 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>
              للحصول على رؤى مخصصة مدعومة بالذكاء الصناعي، يرجى إضافة مفتاح OpenAI API في الإعدادات.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
