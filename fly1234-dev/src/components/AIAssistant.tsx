import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { MessageSquare, Send, Sparkles, X, Minimize2, Maximize2, Bot, User, Loader, Image as ImageIcon, Trash2, Globe, Database } from 'lucide-react';
import { getAIDataContext, formatDataForAI, AIDataContext } from '../lib/services/aiDataService';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface MessagePart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  image?: string;
  timestamp: Date;
}

interface AIAssistantProps {
  apiKey?: string;
}

export default function AIAssistant({ apiKey: initialApiKey }: AIAssistantProps) {
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [apiKey, setApiKey] = useState(initialApiKey);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'مرحباً! أنا مساعدك الذكي المتطور. يمكنني:\n• الإجابة على أسئلتك بذكاء\n• تحليل الصور والمستندات\n• البحث في الإنترنت\n• الوصول لبيانات السندات والصناديق والشركات والموظفين\n• تقديم تحليلات وتقارير مالية\n• تقديم استشارات متخصصة\n\nفعّل "الوصول للبيانات" لأتمكن من الإجابة عن أسئلتك المتعلقة ببيانات النظام!\n\nكيف يمكنني مساعدتك؟',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [enableWebSearch, setEnableWebSearch] = useState(false);
  const [enableDataAccess, setEnableDataAccess] = useState(false);
  const [dataContext, setDataContext] = useState<AIDataContext | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadApiKey = async () => {
      try {
        const settingsRef = doc(db, 'settings', 'ai');
        const settingsSnap = await getDoc(settingsRef);

        if (settingsSnap.exists()) {
          const data = settingsSnap.data();
          setApiKey(data.openai_api_key || '');
        }
      } catch (error) {
        console.error('Error loading AI API key:', error);
      }
    };

    loadApiKey();

    const settingsRef = doc(db, 'settings', 'ai');
    const unsubscribe = onSnapshot(settingsRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setApiKey(data.openai_api_key || '');
      }
    });

    const handleSettingsUpdate = () => {
      loadApiKey();
    };

    window.addEventListener('ai-settings-updated', handleSettingsUpdate);

    return () => {
      unsubscribe();
      window.removeEventListener('ai-settings-updated', handleSettingsUpdate);
    };
  }, []);

  useEffect(() => {
    if (initialApiKey) {
      setApiKey(initialApiKey);
    }
  }, [initialApiKey]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isMinimized && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen, isMinimized]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [inputMessage]);

  const loadDataContext = async () => {
    if (dataContext) return;

    setIsLoadingData(true);
    try {
      const data = await getAIDataContext();
      setDataContext(data);

      const infoMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `✅ تم الاتصال بالبيانات بنجاح!\n\n📊 البيانات المتاحة:\n• ${data.summary.totalVouchers} سند\n• ${data.summary.totalSafes} صندوق\n• ${data.summary.totalCompanies} شركة\n• ${data.summary.totalEmployees} موظف\n\n💰 الأرصدة:\n• ${data.summary.totalBalanceUSD.toLocaleString()} دولار\n• ${data.summary.totalBalanceIQD.toLocaleString()} دينار\n\nيمكنك الآن سؤالي عن أي شيء يتعلق بهذه البيانات!`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, infoMessage]);
    } catch (error) {
      console.error('Error loading data context:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: '❌ عذراً، حدث خطأ أثناء تحميل البيانات. يرجى المحاولة مرة أخرى.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (enableDataAccess && !dataContext) {
      loadDataContext();
    }
  }, [enableDataAccess]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) {
        alert('حجم الصورة يجب أن يكون أقل من 4 ميجابايت');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const searchWeb = async (query: string): Promise<string> => {
    try {
      const response = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`, {
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip'
        }
      });

      if (!response.ok) {
        return '';
      }

      const data = await response.json();
      const results = data.web?.results || [];

      if (results.length === 0) {
        return '';
      }

      let searchContext = 'نتائج البحث من الإنترنت:\n\n';
      results.slice(0, 3).forEach((result: any, index: number) => {
        searchContext += `${index + 1}. ${result.title}\n`;
        searchContext += `${result.description}\n`;
        searchContext += `المصدر: ${result.url}\n\n`;
      });

      return searchContext;
    } catch (error) {
      console.error('Web search error:', error);
      return '';
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() && !selectedImage) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage || 'قم بتحليل هذه الصورة',
      image: selectedImage || undefined,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    const currentImage = selectedImage;
    const currentEnableWebSearch = enableWebSearch;
    setSelectedImage(null);
    setIsTyping(true);

    try {
      const currentApiKey = apiKey || localStorage.getItem('ai_api_key') || localStorage.getItem('openai_api_key');

      if (!currentApiKey || currentApiKey.trim() === '') {
        setTimeout(() => {
          const response: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: 'عذراً، لم يتم تكوين مفتاح API للذكاء الصناعي. يرجى إضافة مفتاح Google Gemini API في الإعدادات.',
            timestamp: new Date()
          };
          setMessages(prev => [...prev, response]);
          setIsTyping(false);
        }, 1000);
        return;
      }

      let webSearchResults = '';
      if (currentEnableWebSearch && inputMessage) {
        webSearchResults = await searchWeb(inputMessage);
      }

      const conversationHistory = messages.slice(-8).map(m => {
        const parts: MessagePart[] = [];

        if (m.content) {
          parts.push({ text: m.content });
        }

        if (m.image) {
          const base64Data = m.image.split(',')[1];
          const mimeType = m.image.split(';')[0].split(':')[1];
          parts.push({
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          });
        }

        return {
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: parts
        };
      });

      let systemPrompt = `أنت مساعد ذكي متطور ومتخصص في:
- إدارة الأعمال والمحاسبة
- تحليل الصور والمستندات بدقة عالية
- استخراج البيانات من الفواتير والإيصالات
- تقديم استشارات تجارية ومالية
- الإجابة على الأسئلة بسرعة ودقة

قدم إجابات واضحة ومختصرة ومفيدة. استخدم العربية الفصيحة. كن دقيقاً في التحليل.${webSearchResults ? '\n\nلديك نتائج بحث من الإنترنت، استخدمها لتحسين إجابتك.' : ''}`;

      if (enableDataAccess && dataContext) {
        const formattedData = formatDataForAI(dataContext);
        systemPrompt += `\n\n## بيانات النظام المتاحة:\n${formattedData}\n\nاستخدم هذه البيانات للإجابة على أسئلة المستخدم عن السندات والصناديق والشركات والموظفين.`;
      }

      const currentMessageParts: MessagePart[] = [];

      let fullMessage = inputMessage || 'قم بتحليل هذه الصورة بالتفصيل';
      if (webSearchResults) {
        fullMessage = `${fullMessage}\n\n${webSearchResults}`;
      }

      currentMessageParts.push({ text: fullMessage });

      if (currentImage) {
        const base64Data = currentImage.split(',')[1];
        const mimeType = currentImage.split(';')[0].split(':')[1];
        currentMessageParts.push({
          inlineData: {
            mimeType: mimeType,
            data: base64Data
          }
        });
      }

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${currentApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            ...conversationHistory,
            {
              role: 'user',
              parts: currentMessageParts
            }
          ],
          systemInstruction: {
            role: 'user',
            parts: [{ text: systemPrompt }]
          },
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 3000,
            topP: 0.95,
            topK: 64,
            candidateCount: 1
          },
          safetySettings: [
            {
              category: 'HARM_CATEGORY_HARASSMENT',
              threshold: 'BLOCK_NONE'
            },
            {
              category: 'HARM_CATEGORY_HATE_SPEECH',
              threshold: 'BLOCK_NONE'
            },
            {
              category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
              threshold: 'BLOCK_NONE'
            },
            {
              category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
              threshold: 'BLOCK_NONE'
            }
          ]
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error:', response.status, errorData);

        let errorMsg = 'عذراً، حدث خطأ في الاتصال بخدمة الذكاء الصناعي.';

        if (response.status === 400) {
          errorMsg = 'خطأ: مفتاح API غير صحيح أو حدث خطأ في البيانات المرسلة. يرجى التحقق من المفتاح في الإعدادات.';
        } else if (response.status === 429) {
          errorMsg = 'تم تجاوز حد الاستخدام. يرجى الانتظار قليلاً والمحاولة مرة أخرى.';
        } else if (response.status === 500) {
          errorMsg = 'خطأ في خادم Google AI. يرجى المحاولة مرة أخرى بعد قليل.';
        }

        throw new Error(errorMsg);
      }

      const data = await response.json();
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.candidates?.[0]?.content?.parts?.[0]?.text || 'عذراً، لم أتمكن من الحصول على رد.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiResponse]);
    } catch (error: any) {
      console.error('Error calling AI:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: error.message || 'عذراً، حدث خطأ في الاتصال بخدمة الذكاء الصناعي. يرجى المحاولة مرة أخرى.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const clearChat = () => {
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: 'مرحباً! أنا مساعدك الذكي المتطور. يمكنني:\n• الإجابة على أسئلتك بذكاء\n• تحليل الصور والمستندات\n• البحث في الإنترنت\n• الوصول لبيانات السندات والصناديق والشركات والموظفين\n• تقديم تحليلات وتقارير مالية\n• تقديم استشارات متخصصة\n\nفعّل "الوصول للبيانات" لأتمكن من الإجابة عن أسئلتك المتعلقة ببيانات النظام!\n\nكيف يمكنني مساعدتك؟',
        timestamp: new Date()
      }
    ]);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 left-6 z-50 p-4 rounded-full shadow-lg ${
          theme === 'dark'
            ? 'bg-gradient-to-br from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700'
            : 'bg-gradient-to-br from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800'
        }`}
      >
        <Sparkles className="w-6 h-6 text-white" />
      </button>
    );
  }

  return (
    <div
      className={`fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-50 shadow-xl rounded-2xl overflow-hidden flex flex-col ${
        isMinimized ? 'w-72 sm:w-80 h-16' : 'w-[calc(100vw-2rem)] sm:w-[480px] md:w-[500px] h-[calc(100vh-5rem)] sm:h-[650px] md:h-[750px]'
      } ${
        theme === 'dark'
          ? 'bg-gray-900 border border-gray-800'
          : 'bg-white border border-gray-200'
      }`}
    >
      <div
        className={`flex items-center justify-between p-4 flex-shrink-0 ${
          theme === 'dark'
            ? 'bg-gradient-to-r from-slate-700 to-slate-800 border-b border-gray-800'
            : 'bg-gradient-to-r from-slate-600 to-slate-700 border-b border-gray-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              theme === 'dark' ? 'bg-white/10' : 'bg-white/20'
            }`}>
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
          </div>
          <div>
            <h3 className="text-white text-xl font-bold">المساعد الذكي</h3>
            <p className="text-sm text-white/80 font-semibold">Gemini 2.5 Flash</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={clearChat}
            className="p-2 rounded-lg hover:bg-white/10"
            title="مسح المحادثة"
          >
            <Trash2 className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-2 rounded-lg hover:bg-white/10"
          >
            {isMinimized ? (
              <Maximize2 className="w-4 h-4 text-white" />
            ) : (
              <Minimize2 className="w-4 h-4 text-white" />
            )}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-lg hover:bg-white/10"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          <div
            className={`flex-1 overflow-y-auto p-6 space-y-4 ${
              theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
            }`}
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                <div
                  className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${
                    message.role === 'user'
                      ? theme === 'dark'
                        ? 'bg-slate-700'
                        : 'bg-slate-600'
                      : theme === 'dark'
                      ? 'bg-gradient-to-br from-slate-700 to-slate-800'
                      : 'bg-gradient-to-br from-slate-600 to-slate-700'
                  }`}
                >
                  {message.role === 'user' ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Bot className="w-4 h-4 text-white" />
                  )}
                </div>
                <div
                  className={`flex-1 ${
                    message.role === 'user' ? 'text-right' : 'text-left'
                  }`}
                >
                  <div
                    className={`inline-block rounded-2xl px-4 py-3 max-w-[90%] ${
                      message.role === 'user'
                        ? theme === 'dark'
                          ? 'bg-slate-700 text-white'
                          : 'bg-slate-600 text-white'
                        : theme === 'dark'
                        ? 'bg-gray-800 text-gray-100'
                        : 'bg-white text-gray-800 shadow-sm'
                    }`}
                  >
                    {message.image && (
                      <img
                        src={message.image}
                        alt="Uploaded"
                        className="rounded-lg mb-2 max-w-full h-auto"
                      />
                    )}
                    <p className="text-lg whitespace-pre-wrap leading-relaxed font-bold">{message.content}</p>
                  </div>
                  <p
                    className={`text-sm mt-1.5 px-2 font-semibold ${
                      theme === 'dark' ? 'text-gray-600' : 'text-gray-500'
                    }`}
                  >
                    {formatTime(message.timestamp)}
                  </p>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-3">
                <div
                  className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${
                    theme === 'dark'
                      ? 'bg-gradient-to-br from-slate-700 to-slate-800'
                      : 'bg-gradient-to-br from-slate-600 to-slate-700'
                  }`}
                >
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div
                  className={`rounded-2xl px-5 py-3 ${
                    theme === 'dark'
                      ? 'bg-gray-800'
                      : 'bg-white shadow-sm'
                  }`}
                >
                  <div className="flex gap-1.5">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        theme === 'dark' ? 'bg-blue-400' : 'bg-blue-500'
                      }`}
                      style={{ animation: 'bounce 1.4s infinite ease-in-out' }}
                    />
                    <div
                      className={`w-2 h-2 rounded-full ${
                        theme === 'dark' ? 'bg-cyan-400' : 'bg-cyan-500'
                      }`}
                      style={{ animation: 'bounce 1.4s infinite ease-in-out 0.2s' }}
                    />
                    <div
                      className={`w-2 h-2 rounded-full ${
                        theme === 'dark' ? 'bg-blue-400' : 'bg-blue-500'
                      }`}
                      style={{ animation: 'bounce 1.4s infinite ease-in-out 0.4s' }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div
            className={`flex-shrink-0 border-t ${
              theme === 'dark'
                ? 'bg-gray-900 border-gray-800'
                : 'bg-white border-gray-200'
            }`}
          >
            {selectedImage && (
              <div className={`p-4 pb-3 border-b ${
                theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
              }`}>
                <div className="relative inline-block">
                  <img
                    src={selectedImage}
                    alt="Selected"
                    className="h-20 rounded-xl border-2 border-blue-500"
                  />
                  <button
                    onClick={() => setSelectedImage(null)}
                    className="absolute -top-2 -right-2 p-1.5 bg-red-500 rounded-full hover:bg-red-600 shadow-lg"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
                <p className={`text-sm mt-2 font-semibold ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  جاهز للإرسال
                </p>
              </div>
            )}

            <div className="p-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isTyping || !!selectedImage}
                className={`w-full mb-3 px-4 py-2.5 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 text-base font-bold ${
                  theme === 'dark'
                    ? 'border-gray-700 bg-gray-800/50 hover:bg-gray-800 hover:border-blue-600 text-gray-300'
                    : 'border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-blue-500 text-gray-600'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <ImageIcon className="w-4 h-4" />
                <span>{selectedImage ? 'تم اختيار صورة' : 'إرفاق صورة'}</span>
              </button>

              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <button
                  onClick={() => setEnableWebSearch(!enableWebSearch)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-base font-bold ${
                    enableWebSearch
                      ? theme === 'dark'
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-500 text-white'
                      : theme === 'dark'
                      ? 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Globe className="w-4 h-4" />
                  <span>{enableWebSearch ? 'البحث مفعّل' : 'بحث الويب'}</span>
                </button>

                <button
                  onClick={() => {
                    if (enableDataAccess) {
                      setDataContext(null);
                      setEnableDataAccess(false);
                    } else {
                      setEnableDataAccess(true);
                    }
                  }}
                  disabled={isLoadingData}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-base font-bold ${
                    enableDataAccess
                      ? theme === 'dark'
                        ? 'bg-green-600 text-white'
                        : 'bg-green-500 text-white'
                      : theme === 'dark'
                      ? 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isLoadingData ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <Database className="w-4 h-4" />
                  )}
                  <span>{enableDataAccess ? 'البيانات متصلة' : 'الوصول للبيانات'}</span>
                </button>

                {enableDataAccess && dataContext && (
                  <button
                    onClick={() => {
                      setDataContext(null);
                      loadDataContext();
                    }}
                    disabled={isLoadingData}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-base font-bold ${
                      theme === 'dark'
                        ? 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                    title="تحديث البيانات"
                  >
                    <Loader className={`w-4 h-4 ${isLoadingData ? 'animate-spin' : ''}`} />
                    <span>تحديث</span>
                  </button>
                )}
              </div>

              <div className="flex gap-2 items-end">
                <textarea
                  ref={textareaRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder={selectedImage ? 'سؤالك عن الصورة... (اختياري)' : 'اكتب رسالتك... (Shift+Enter للسطر الجديد)'}
                  rows={1}
                  className={`flex-1 px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 resize-none text-lg font-bold ${
                    theme === 'dark'
                      ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:ring-blue-500'
                      : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400 focus:ring-blue-400'
                  }`}
                  style={{ minHeight: '48px', maxHeight: '120px' }}
                />

                <button
                  onClick={handleSendMessage}
                  disabled={(!inputMessage.trim() && !selectedImage) || isTyping}
                  className={`p-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed ${
                    theme === 'dark'
                      ? 'bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700'
                      : 'bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800'
                  }`}
                >
                  {isTyping ? (
                    <Loader className="w-5 h-5 text-white" style={{ animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <Send className="w-5 h-5 text-white" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
