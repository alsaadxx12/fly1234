import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Loader2, Printer, AlertTriangle, Facebook, Instagram, Globe } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { numberToArabicWords } from '../utils/helpers';
import { QRCodeCanvas } from 'qrcode.react';

const PublicVoucher: React.FC = () => {
  const { voucherId } = useParams<{ voucherId: string }>();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(window.location.search);
  const convertToIQD = searchParams.get('convertToIQD') === 'true';

  const [voucherData, setVoucherData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { theme } = useTheme();
  const [showButtons, setShowButtons] = useState(true);

  useEffect(() => {
    const fetchVoucher = async () => {
      if (!voucherId) {
        setError('معرّف السند غير موجود');
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const voucherRef = doc(db, 'vouchers', voucherId);
        const voucherDoc = await getDoc(voucherRef);

        if (!voucherDoc.exists()) {
          setError('السند غير موجود أو تم حذفه');
        } else {
          const data = voucherDoc.data();
          const formattedData = {
            ...data,
            id: voucherDoc.id,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
          };
          setVoucherData(formattedData);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setError('حدث خطأ أثناء تحميل بيانات السند');
      } finally {
        setLoading(false);
      }
    };

    fetchVoucher();
  }, [voucherId]);

  useEffect(() => {
    const handleBeforePrint = () => setShowButtons(false);
    const handleAfterPrint = () => setShowButtons(true);

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);

    if (voucherData && !loading && !searchParams.get('noAutoPrint')) {
      const printTimeout = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(printTimeout);
    }

    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [voucherData, loading, searchParams]);

  const handlePrint = () => {
    window.print();
  };

  const getVoucherType = () => voucherData?.type === 'receipt' ? 'سند قبض' : 'سند صرف';

  const getRecipientLabel = () => {
    return voucherData.type === 'receipt' ? 'استلمنا من' : 'المبلغ المدفوع';
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatDay = (date: Date | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
  };


  const amountInWords = (amount: number, currency: string): string => {
    const cur = currency === 'IQD' ? 'دينار عراقي' : 'دولار أمريكي';
    try {
      if (amount === 0) return `فقط صفر ${cur} لا غير.`;
      return `فقط ${numberToArabicWords(Math.trunc(amount))} ${cur} لا غير.`;
    } catch (e) {
      return "خطأ في تحويل المبلغ";
    }
  };

  const logoUrl = "https://image.winudf.com/v2/image1/Y29tLmZseTRhbGwuYXBwX2ljb25fMTc0MTM3NDI5Ml8wODk/icon.webp?w=140&fakeurl=1&type=.webp";

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
        <p className="mt-4 text-gray-600">جاري تحميل السند...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-8 bg-gray-100">
        <AlertTriangle className="w-16 h-16 text-red-500" />
        <h2 className="mt-6 text-2xl font-bold text-gray-800">حدث خطأ</h2>
        <p className="mt-2 text-gray-600">{error}</p>
        <button
          onClick={() => navigate('/accounts')}
          className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
        >
          العودة إلى الحسابات
        </button>
      </div>
    );
  }

  if (!voucherData) return null;

  const urlRate = searchParams.get('rate');
  const exchangeRate = urlRate ? parseFloat(urlRate) : (voucherData.exchangeRate || 1);
  const originalAmount = voucherData.amount || 0;
  const displayAmount = convertToIQD ? originalAmount * exchangeRate : originalAmount;
  const displayCurrency = convertToIQD ? 'IQD' : voucherData.currency;
  const displayCurrencySymbol = displayCurrency === 'IQD' ? 'د.ع' : '$';
  const amountWordsText = amountInWords(displayAmount, displayCurrency);

  const displayGates = convertToIQD ? (voucherData.gates || 0) * exchangeRate : (voucherData.gates || 0);
  const displayInternal = convertToIQD ? (voucherData.internal || 0) * exchangeRate : (voucherData.internal || 0);
  const displayExternal = convertToIQD ? (voucherData.external || 0) * exchangeRate : (voucherData.external || 0);
  const displayFly = convertToIQD ? (voucherData.fly || 0) * exchangeRate : (voucherData.fly || 0);
  const distributionTotal = displayGates + displayInternal + displayExternal + displayFly;

  const distributionEntries = [
    { label: voucherData.gatesColumnLabel || 'جات', value: displayGates },
    { label: voucherData.internalColumnLabel || 'داخلي', value: displayInternal },
    { label: voucherData.externalColumnLabel || 'خارجي', value: displayExternal },
    { label: voucherData.flyColumnLabel || 'فلاي', value: displayFly },
  ].filter(entry => entry.value > 0);

  const hihelloLink = "https://hihello.com/p/207f5029-5db4-480e-abc9-c61c39b55a36";

  return (
    <div className={`min-h-screen p-4 sm:p-8 bg-gray-100`}>
      <div className="max-w-4xl mx-auto">
        {showButtons && (
          <div className="flex justify-center items-center gap-4 mb-6 no-print">
            <button
              onClick={() => navigate('/accounts')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300`}
            >
              العودة للحسابات
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              <Printer className="w-4 h-4" />
              طباعة
            </button>
          </div>
        )}
        <div className="a5-page-landscape printable-area">
          <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap');
            
            @media print {
              body, html {
                margin: 0;
                padding: 0;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .no-print {
                display: none !important;
              }
              .printable-area {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                margin: 0;
                padding: 0;
                box-shadow: none !important;
                border: none !important;
              }
              @page {
                size: A5 landscape;
                margin: 0;
              }
            }
            
            .a5-page-landscape {
              width: 210mm;
              height: 148mm;
              margin: auto;
              background: white;
              display: flex;
              flex-direction: column;
              box-shadow: 0 0 10px rgba(0,0,0,0.1);
              box-sizing: border-box;
            }
            .voucher-container {
              width: 100%;
              height: 100%;
              display: flex;
              flex-direction: column;
              border: 1.5px solid #4A0E6B;
              font-size: 10pt;
            }
            .header { display: flex; justify-content: space-between; align-items: center; padding: 8px 16px; border-bottom: 1.5px solid #4A0E6B; }
            .company-info { text-align: right; }
            .company-name { font-size: 14pt; font-weight: 800; color: #4A0E6B; }
            .logo-container { text-align: left; }
            .logo { height: 50px; width: auto; object-fit: contain; }
            .info-bar { display: flex; justify-content: space-between; align-items: center; padding: 6px 16px; }
            .info-bar-left { text-align: left; }
            .info-bar-right { text-align: right; }
            .info-bar-left div, .info-bar-right div { font-size: 8pt; font-weight: 700; color: #333; line-height: 1.4; }
            .voucher-title { text-align: center; flex-grow: 1; }
            .voucher-title h1 { margin: 0; font-size: 16pt; font-weight: 900; color: #F57C00; }
            .content { flex-grow: 1; padding: 8px 16px; }
            .content-table { width: 100%; border-collapse: collapse; }
            .content-table td { border: 1px solid #D1C4E9; padding: 2px 8px; font-weight: 700; font-size: 9pt; vertical-align: middle; }
            .label-ar { background-color: #F3E8FF; width: 25%; text-align: right; }
            .value-col { text-align: center; font-size: 10pt; width: 50%; }
            .label-en { background-color: #F3E8FF; width: 25%; text-align: left; }
            .distribution-section { margin-top: 8px; }
            .distribution-title { background-color: #F3E8FF; text-align: center; font-weight: 800; font-size: 9pt; padding: 2px; border: 1px solid #D1C4E9; }
            .distribution-row { display: flex; justify-content: space-around; padding: 2px 8px; border: 1px solid #D1C4E9; border-top: none; }
            .distribution-item { font-size: 9pt; font-weight: 700; }
            .signatures { display: flex; justify-content: space-between; align-items: flex-end; padding: 8px 16px 5px; }
            .signature-box { text-align: center; font-size: 8pt; font-weight: 700; border-top: 1px dashed #9ca3af; padding-top: 8px; width: 150px; }
            .qr-codes-container { display: flex; justify-content: center; align-items: center; gap: 40px; }
            .footer-bar { text-align: center; padding: 10px; background-color: #4A0E6B; color: white; font-size: 8pt; font-weight: 700; line-height: 1.2; height: 40px; box-sizing: border-box; }
          `}</style>
          <div className="voucher-container">
            <div className="header">
              <div className="company-info">
                <div className="company-name">شركة الروضتين للسفر والسياحة</div>
              </div>
              <div className="logo-container">
                <img src={logoUrl} alt="Logo" className="logo" />
              </div>
            </div>

            <div className="info-bar">
              <div className="info-bar-left">
                <div><strong>Receipt No:</strong> #{voucherData.invoiceNumber ?? 'N/A'}</div>
                {voucherData.currency === 'USD' && voucherData.amount && <div><strong>GN:</strong> {voucherData.amount}</div>}
              </div>
              <div className="voucher-title"><h1>{getVoucherType()}</h1></div>
              <div className="info-bar-right">
                <div><strong>Date:</strong> {formatDate(voucherData.createdAt)}</div>
                <div><strong>Day:</strong> {formatDay(voucherData.createdAt)}</div>
              </div>
            </div>

            <div className="content">
              <table className="content-table">
                <tbody>
                  <tr>
                    <td className="label-ar">{getRecipientLabel()}</td>
                    <td className="value-col">{voucherData.companyName ?? '-'}</td>
                    <td className="label-en">Received From</td>
                  </tr>
                  <tr>
                    <td className="label-ar">المبلغ المستلم</td>
                    <td className="value-col" dir="ltr">{displayAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {displayCurrencySymbol}</td>
                    <td className="label-en">Amount Received</td>
                  </tr>
                  <tr>
                    <td className="label-ar">المبلغ كتابة</td>
                    <td className="value-col">{amountWordsText}</td>
                    <td className="label-en">The amount is written</td>
                  </tr>
                  {voucherData.details && (
                    <tr>
                      <td className="label-ar">التفاصيل</td>
                      <td className="value-col">{voucherData.details}</td>
                      <td className="label-en">Details</td>
                    </tr>
                  )}
                </tbody>
              </table>

              {distributionTotal > 0 && (
                <div className="distribution-section">
                  <div className="distribution-title">تفاصيل التوزيع</div>
                  <div className="distribution-row">
                    {distributionEntries.map((entry, index) => (
                      <div key={index} className="distribution-item">{entry.label}: {entry.value.toLocaleString()} {displayCurrencySymbol}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="signatures">
              <div className="signature-box" style={{ textAlign: 'right' }}>
                <div>منظم الوصل: {voucherData.employeeName || 'شهد حيدر'}</div>
              </div>
              <div className="qr-codes-container">
                <div className="p-2 bg-white rounded-2xl overflow-hidden shadow-lg">
                  <QRCodeCanvas
                    value={hihelloLink}
                    size={70}
                    bgColor={"#ffffff"}
                    fgColor={"#000000"}
                    level={"H"}
                    includeMargin={false}
                    imageSettings={{
                      src: "https://image.winudf.com/v2/image1/Y29tLmZseTRhbGwuYXBwX2ljb25fMTc0MTM3NDI5Ml8wODk/icon.webp?w=140&fakeurl=1&type=.webp",
                      height: 20,
                      width: 20,
                      excavate: true,
                    }}
                  />
                </div>
              </div>
              <div className="signature-box" style={{ textAlign: 'left' }}>
                <div>توقيع المستلم</div>
              </div>
            </div>

            <footer className="footer-bar">
              9647730308111 - 964771800033 | كربلاء - شارع الإسكان - قرب مستشفى احمد الوائلي
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicVoucher;
