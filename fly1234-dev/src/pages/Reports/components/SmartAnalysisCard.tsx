import React, { useState, useEffect } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { Sparkles, Languages, Loader2 } from 'lucide-react';
import { ReportDataExtractor } from '../services/reportExtractorService';

interface SmartAnalysisCardProps {
  onDataExtracted: (data: any, translation: string) => void;
  translatedText: string;
  inputText: string;
  onInputChange: (value: string) => void;
}

const SmartAnalysisCard: React.FC<SmartAnalysisCardProps> = ({ onDataExtracted, translatedText, inputText, onInputChange }) => {
  const { theme } = useTheme();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [debouncedInput, setDebouncedInput] = useState('');

  // Debounce effect to trigger analysis after user stops typing
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedInput(inputText);
    }, 1500); // 1.5 second delay

    return () => {
      clearTimeout(handler);
    };
  }, [inputText]);

  // Effect to trigger analysis when debounced input changes
  useEffect(() => {
    if (debouncedInput) {
      handleAnalyze(debouncedInput);
    } else {
      onDataExtracted(null, '');
    }
  }, [debouncedInput]);

  const handleAnalyze = async (text: string) => {
    if (!text.trim()) return;

    setIsAnalyzing(true);
    
    try {
      const { extractedData, translatedText } = await ReportDataExtractor.extractAndTranslate(text);
      onDataExtracted(extractedData, translatedText);
    } catch (error) {
      console.error("AI analysis failed:", error);
      const errorMessage = `فشل التحليل: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`;
      onDataExtracted(null, errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className={`rounded-2xl border p-6 ${theme === 'dark' ? 'bg-gray-800/60 border-gray-700' : 'bg-white border-gray-200'}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-500" />
          التحليل الذكي
        </h3>
        {isAnalyzing && <Loader2 className="w-5 h-5 text-purple-500 animate-spin" />}
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            الصق نص التبليغ هنا (فارسي، إنجليزي...)
          </label>
          <textarea
            value={inputText}
            onChange={(e) => onInputChange(e.target.value)}
            rows={5}
            className={`w-full p-3 border rounded-lg text-sm font-mono ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-800'}`}
            placeholder="GHEYRE GHABELE ESTERDAD..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
            <Languages className="w-4 h-4" />
            الترجمة (تلقائية)
          </label>
          <textarea
            value={translatedText}
            readOnly
            rows={3}
            className={`w-full p-3 border rounded-lg text-sm ${theme === 'dark' ? 'bg-gray-900 border-gray-700 text-gray-300' : 'bg-gray-100 border-gray-200 text-gray-600'}`}
            placeholder="الترجمة ستظهر هنا بعد التحليل..."
          />
        </div>
      </div>
    </div>
  );
};

export default SmartAnalysisCard;
