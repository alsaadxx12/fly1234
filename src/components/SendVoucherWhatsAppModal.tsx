import { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { X, MessageCircle, Send, Loader2, Check, AlertTriangle, Image as ImageIcon } from 'lucide-react';
import { generateVoucherHTML } from '../pages/Accounts/components/PrintTemplate';
import { sendWhatsAppImage, processMessageTemplate } from '../utils/whatsappUtils';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import useAccountSettings from '../pages/Accounts/hooks/useAccountSettings';
import { usePrintSettings } from '../hooks/usePrintSettings';
import html2canvas from 'html2canvas';
import axios from 'axios';

interface SendVoucherWhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  voucherData: any;
  selectedAccount: any;
  convertToIQD: boolean;
}

export default function SendVoucherWhatsAppModal({
  isOpen,
  onClose,
  voucherData,
  selectedAccount,
  convertToIQD
}: SendVoucherWhatsAppModalProps) {
  const [sendMode, setSendMode] = useState<'pdf' | 'text' | 'both'>('pdf');
  const [isSending, setIsSending] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [messageTemplate, setMessageTemplate] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const { settings: columnSettings } = useAccountSettings();
  const { settings: printSettings } = usePrintSettings();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const loadAndProcessTemplate = async () => {
    if (!voucherData) return;

    try {
      const voucherWithLabels = {
        ...voucherData,
        convertToIQD,
        gatesColumnLabel: printSettings.gatesColumnLabel || columnSettings.gatesColumnLabel,
        internalColumnLabel: printSettings.internalColumnLabel || columnSettings.internalColumnLabel,
        externalColumnLabel: printSettings.externalColumnLabel || columnSettings.externalColumnLabel,
        flyColumnLabel: printSettings.flyColumnLabel || columnSettings.flyColumnLabel
      };
      const html = await generateVoucherHTML(voucherWithLabels, printSettings);
      setPreviewHtml(html);

      const templatesRef = doc(db, 'whatsapp_templates', 'global');
      const templatesDoc = await getDoc(templatesRef);

      let template = '';
      if (templatesDoc.exists()) {
        const templates = templatesDoc.data();
        const isCompany = voucherData.entityType === 'company' || !voucherData.isClient;

        if (voucherData.type === 'receipt') {
          template = isCompany ? templates.receiptVoucher : templates.receiptVoucherClient;
        } else if (voucherData.type === 'payment') {
          template = isCompany ? templates.paymentVoucher : templates.paymentVoucherClient;
        }
      }

      if (!template) {
        template = `السلام عليكم،\n\nنود إعلامكم بأنه تم ${voucherData.type === 'receipt' ? 'استلام' : 'دفع'} مبلغ ${voucherData.amount?.toLocaleString()} ${voucherData.currency === 'USD' ? 'دولار' : 'دينار'}\n\nرقم الفاتورة: ${voucherData.invoiceNumber}\n${voucherData.companyName ? `الشركة: ${voucherData.companyName}` : ''}\n\nشكراً لتعاملكم معنا`;
      }

      const processedTemplate = processMessageTemplate(template, voucherData);
      setMessageTemplate(processedTemplate);

    } catch (error) {
      console.error('Error loading and processing template:', error);
      setError('فشل في تحميل قالب الرسالة أو إنشاء المعاينة.');
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadAndProcessTemplate();
    }
  }, [isOpen, voucherData, printSettings, convertToIQD]);

  const performSend = async () => {
    if (!selectedAccount) {
      setError('لم يتم العثور على حساب واتساب نشط');
      return;
    }

    const recipient = voucherData.whatsAppGroupId || voucherData.phone;
    if (!recipient) {
      setError('لا يوجد رقم هاتف أو مجموعة واتساب للإرسال');
      return;
    }

    setIsSending(true);
    setError(null);
    setSuccess(null);

    try {
      let textSent = false;
      let imageSent = false;

      if (sendMode === 'text' || sendMode === 'both') {
        const textResult = await sendWhatsAppMessage(selectedAccount.instance_id, selectedAccount.token, recipient, messageTemplate);
        if (textResult?.sent) textSent = true;
      }

      if (sendMode === 'pdf' || sendMode === 'both') {
        if (!iframeRef.current?.contentWindow?.document.body) {
          throw new Error('فشل في الوصول لمحتوى المعاينة');
        }

        const canvas = await html2canvas(iframeRef.current.contentWindow.document.body, {
          scale: 2,
          useCORS: true,
        });

        const imageDataUrl = canvas.toDataURL('image/png');

        const imageResult = await sendWhatsAppImage(
          selectedAccount.instance_id,
          selectedAccount.token,
          recipient,
          imageDataUrl,
          sendMode === 'both' ? messageTemplate : `سند ${voucherData.type === 'receipt' ? 'قبض' : 'دفع'} #${voucherData.invoiceNumber}`
        );
        if (imageResult?.sent) imageSent = true;
      }

      if (textSent || imageSent) {
        let successMessage = 'تم الإرسال بنجاح!';
        if (textSent && imageSent) {
          successMessage = 'تم إرسال الرسالة والصورة بنجاح.';
        } else if (textSent) {
          successMessage = 'تم إرسال الرسالة النصية بنجاح.';
        } else if (imageSent) {
          successMessage = 'تم إرسال الصورة بنجاح.';
        }
        setSuccess(successMessage);
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        throw new Error('فشل إرسال الرسالة.');
      }
    } catch (err) {
      console.error('Error sending WhatsApp:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('فشل في إرسال الرسالة');
      }
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999] backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gradient-to-br dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col overflow-hidden transform animate-in zoom-in-95 duration-300">
        <div className="p-5 bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 dark:from-green-700 dark:via-emerald-700 dark:to-teal-700 text-white relative overflow-hidden flex-shrink-0">
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl shadow-lg ring-2 ring-white/30">
                <MessageCircle className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold tracking-tight">إرسال عبر واتساب</h3>
                <p className="text-sm text-green-100 mt-1">إرسال سند {voucherData?.type === 'receipt' ? 'قبض' : 'دفع'} #{voucherData?.invoiceNumber}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-white/80 hover:bg-white/20 rounded-xl transition-all hover:rotate-90 duration-300">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex flex-col items-center gap-6">
            <div className="w-full max-w-lg mx-auto">
              {error && (
                <div className="mb-4 p-3 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 text-red-700 dark:text-red-300 rounded-xl flex items-center gap-3 border-2 border-red-200 dark:border-red-700 text-sm shadow-sm">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium">{error}</span>
                </div>
              )}
              {success && (
                <div className="mb-4 p-3 bg-gradient-to-r from-green-50 to-emerald-100 dark:from-green-900/30 dark:to-emerald-800/30 text-green-700 dark:text-green-300 rounded-xl flex items-center gap-3 border-2 border-green-200 dark:border-green-700 text-sm shadow-sm">
                  <Check className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium">{success}</span>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">نوع الإرسال</label>
                  <div className="grid grid-cols-3 gap-3">
                    <button onClick={() => setSendMode('text')} className={`px-4 py-3 rounded-lg border-2 transition-all flex flex-col items-center justify-center gap-2 ${sendMode === 'text' ? 'border-green-500 bg-green-50 dark:bg-green-900/30' : 'border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600'}`}>
                      <MessageCircle className={`w-6 h-6 ${sendMode === 'text' ? 'text-green-600' : 'text-gray-400'}`} />
                      <span className={`text-sm font-bold ${sendMode === 'text' ? 'text-green-700 dark:text-green-300' : 'text-gray-600 dark:text-gray-400'}`}>نص فقط</span>
                    </button>
                    <button onClick={() => setSendMode('pdf')} className={`px-4 py-3 rounded-lg border-2 transition-all flex flex-col items-center justify-center gap-2 ${sendMode === 'pdf' ? 'border-green-500 bg-green-50 dark:bg-green-900/30' : 'border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600'}`}>
                      <ImageIcon className={`w-6 h-6 ${sendMode === 'pdf' ? 'text-green-600' : 'text-gray-400'}`} />
                      <span className={`text-sm font-bold ${sendMode === 'pdf' ? 'text-green-700 dark:text-green-300' : 'text-gray-600 dark:text-gray-400'}`}>صورة</span>
                    </button>
                    <button onClick={() => setSendMode('both')} className={`px-4 py-3 rounded-lg border-2 transition-all flex flex-col items-center justify-center gap-2 ${sendMode === 'both' ? 'border-green-500 bg-green-50 dark:bg-green-900/30' : 'border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600'}`}>
                      <div className="flex items-center justify-center gap-1.5">
                        <MessageCircle className={`w-5 h-5 ${sendMode === 'both' ? 'text-green-600' : 'text-gray-400'}`} />
                        <ImageIcon className={`w-5 h-5 ${sendMode === 'both' ? 'text-green-600' : 'text-gray-400'}`} />
                      </div>
                      <span className={`text-sm font-bold ${sendMode === 'both' ? 'text-green-700 dark:text-green-300' : 'text-gray-600 dark:text-gray-400'}`}>كلاهما</span>
                    </button>
                  </div>
                </div>

                {(sendMode === 'text' || sendMode === 'both') && (
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">نص الرسالة</label>
                    <textarea
                      value={messageTemplate}
                      readOnly
                      className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm resize-none"
                      rows={4}
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 mt-6">
                <button onClick={onClose} disabled={isSending} className="px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-200 shadow-sm hover:shadow border-2 border-gray-200 dark:border-gray-600 disabled:opacity-50">
                  إلغاء
                </button>
                <button onClick={performSend} disabled={isSending} className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 min-w-[140px] justify-center">
                  {isSending ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /><span>جاري الإرسال...</span></>
                  ) : (
                    <><Send className="w-5 h-5" /><span>إرسال</span></>
                  )}
                </button>
              </div>
            </div>
            <iframe
              ref={iframeRef}
              srcDoc={previewHtml}
              className="border-none rounded-md shadow-lg bg-white"
              title="Voucher Preview"
              style={{
                width: '210mm',
                height: '148mm',
                transform: 'scale(0.85)',
                transformOrigin: 'top center',
                flexShrink: 0
              }}
              scrolling="no"
            />
          </div>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
}

const sendWhatsAppMessage = async (
  instanceId: string,
  token: string,
  to: string,
  body: string
) => {
  const url = `https://api.ultramsg.com/${instanceId}/messages/chat`;
  const params = new URLSearchParams();
  params.append('token', token);
  params.append('to', to);
  params.append('body', body);

  try {
    const response = await axios.post(url, params);
    return response.data;
  } catch (error) {
    console.error('WhatsApp API Error:', error);
    throw error;
  }
};
