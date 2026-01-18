import React from 'react';
import QRCode from "qrcode";

type VoucherType = 'receipt' | 'payment';

type VoucherData = {
  type: VoucherType;
  invoiceNumber?: string | number;
  createdAt?: Date | string | number;
  companyName?: string;
  amount?: number;
  currency?: 'IQD' | 'USD' | string;
  details?: string;
  employeeName?: string;
  gates?: number;
  internal?: number;
  external?: number;
  fly?: number;
  phone?: string;
  GN?: string;
  convertToIQD?: boolean;
  exchangeRate?: number;
  websiteQrCode?: string;
  facebookQrCode?: string;
  instagramQrCode?: string;
  hihelloQrCode?: string;
  gatesColumnLabel?: string;
  internalColumnLabel?: string;
  externalColumnLabel?: string;
  flyColumnLabel?: string;
};

type TemplateSettings = {
  primaryColor: string;
  textColor: string;
  logoUrl: string;
  footerAddress: string;
};

const numberToArabicWords = (num: number): string => {
  if (num === 0) return "صفر";
  const units = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة"];
  const teens = ["عشرة", "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر", "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر"];
  const tens = ["", "عشرة", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
  const hundreds = ["", "مائة", "مئتان", "ثلاثمائة", "أربعمائة", "خمسمائة", "ستمائة", "سبعمائة", "ثمانمائة", "تسعمائة"];
  
  const convert = (n: number): string => {
    if (n < 10) return units[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) return units[n % 10] + (n % 10 > 0 ? " و" : "") + tens[Math.floor(n / 10)];
    if (n < 1000) return hundreds[Math.floor(n / 100)] + (n % 100 > 0 ? " و" + convert(n % 100) : "");
    return "";
  };

  const parts = [];
  const billions = Math.floor(num / 1000000000);
  const millions = Math.floor((num % 1000000000) / 1000000);
  const thousands = Math.floor((num % 1000000) / 1000);
  const remainder = num % 1000;

  if (billions > 0) {
    parts.push(convert(billions) + " مليار");
  }
  if (millions > 0) {
    parts.push(convert(millions) + " مليون");
  }
  if (thousands > 0) {
    parts.push(convert(thousands) + " ألف");
  }
  if (remainder > 0) {
    parts.push(convert(remainder));
  }

  return parts.join(" و ");
};

export async function generateVoucherHTML(
  voucherData: VoucherData,
  templateSettings: TemplateSettings
): Promise<string> {
  
  const { 
    primaryColor = '#4A0E6B', 
    textColor = '#111827', 
    logoUrl = "https://image.winudf.com/v2/image1/Y29tLmZseTRhbGwuYXBwX2ljb25fMTc0MTM3NDI5Ml8wODk/icon.webp?w=140&fakeurl=1&type=.webp",
    footerAddress = '9647730308111 - 964771800033 | كربلاء - شارع الإسكان - قرب مستشفى احمد الوائلي'
  } = templateSettings;

  const formatDate = (date: Date | string | number | undefined) => {
    if (!date) return new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatDay = (date: Date | string | number | undefined) => {
    if (!date) return new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleDateString('en-US', { weekday: 'long' });
  };

  const getVoucherType = () => {
    return voucherData.type === 'receipt' ? 'سند قبض' : 'سند صرف';
  };

  const getRecipientLabel = () => {
    return voucherData.type === 'receipt' ? 'استلمنا من السيد/ السادة:' : 'ادفعوا إلى السيد/ السادة:';
  };

  const getAmountInWords = (amount: number, currency: string): string => {
    const cur = currency === 'IQD' ? 'دينار عراقي' : 'دولار أمريكي';
    try {
      return `فقط ${numberToArabicWords(Math.trunc(amount))} ${cur} لا غير.`;
    } catch (e) {
      return "خطأ في تحويل المبلغ";
    }
  };

  const exchangeRate = voucherData.exchangeRate || 1;
  const originalAmount = voucherData.amount || 0;
  const displayAmount = voucherData.convertToIQD ? originalAmount * exchangeRate : originalAmount;
  const displayCurrency = voucherData.convertToIQD ? 'IQD' : voucherData.currency;
  const displayCurrencySymbol = displayCurrency === 'IQD' ? 'د.ع' : '$';
  const amountWordsText = getAmountInWords(displayAmount, displayCurrency || 'IQD');
  
  const hihelloLink = "https://hihello.com/p/207f5029-5db4-480e-abc9-c61c39b55a36";

  const qrCodeDataUrl = await QRCode.toDataURL(hihelloLink, {
    errorCorrectionLevel: 'H',
    margin: 1,
    width: 60,
    color: {
      dark: '#000000',
      light: '#ffffff'
    }
  });

  const displayGates = voucherData.convertToIQD ? (voucherData.gates || 0) * exchangeRate : (voucherData.gates || 0);
  const displayInternal = voucherData.convertToIQD ? (voucherData.internal || 0) * exchangeRate : (voucherData.internal || 0);
  const displayExternal = voucherData.convertToIQD ? (voucherData.external || 0) * exchangeRate : (voucherData.external || 0);
  const displayFly = voucherData.convertToIQD ? (voucherData.fly || 0) * exchangeRate : (voucherData.fly || 0);
  const distributionTotal = displayGates + displayInternal + displayExternal + displayFly;
  
  const distributionEntries = [
    { label: voucherData.gatesColumnLabel || 'جات', value: displayGates },
    { label: voucherData.internalColumnLabel || 'داخلي', value: displayInternal },
    { label: voucherData.externalColumnLabel || 'خارجي', value: displayExternal },
    { label: voucherData.flyColumnLabel || 'فلاي', value: displayFly },
  ].filter(entry => entry.value > 0);


  return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <title>${getVoucherType()} #${voucherData.invoiceNumber || '000'}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap');
        
        @page {
          size: A5 landscape;
          margin: 0;
        }
        
        body {
          font-family: 'Tajawal', sans-serif;
          margin: 0;
          padding: 0;
          background-color: #ffffff;
          font-size: 10pt;
          color: ${textColor};
          -webkit-print-color-adjust: exact;
        }
        
        .voucher-container {
          width: 210mm;
          height: 148mm;
          box-sizing: border-box;
          padding: 15px;
          display: flex;
          flex-direction: column;
          border: 1.5px solid ${primaryColor};
          overflow: hidden;
        }

        .header { display: flex; justify-content: space-between; align-items: center; padding: 8px 16px; border-bottom: 1.5px solid ${primaryColor}; flex-shrink: 0; }
        .company-info { text-align: right; }
        .company-name { font-size: 14pt; font-weight: 800; color: ${primaryColor}; }
        .logo-container { text-align: left; }
        .logo { height: 50px; width: auto; object-fit: contain; }
        .info-bar { display: flex; justify-content: space-between; align-items: center; padding: 6px 16px; flex-shrink: 0;}
        .info-bar-left { text-align: left; }
        .info-bar-right { text-align: right; }
        .info-bar-left div, .info-bar-right div { font-size: 8pt; font-weight: 700; color: ${textColor}; line-height: 1.4; }
        .voucher-title { text-align: center; flex-grow: 1; }
        .voucher-title h1 { margin: 0; font-size: 16pt; font-weight: 900; color: #F57C00; }
        .content { flex-grow: 1; padding: 8px 16px; }
        .content-table { width: 100%; border-collapse: collapse; }
        .content-table td { border: 1px solid #D1C4E9; padding: 4px 8px; font-weight: 700; font-size: 10.5pt; vertical-align: middle; }
        .label-ar { background-color: #F3E8FF; width: 25%; text-align: right; }
        .value-col { text-align: center; font-size: 11.5pt; width: 50%; }
        .label-en { background-color: #F3E8FF; width: 25%; text-align: left; }
        .distribution-section { margin-top: 8px; }
        .distribution-title { background-color: #F3E8FF; text-align: center; font-weight: 800; font-size: 9pt; padding: 2px; border: 1px solid #D1C4E9; }
        .distribution-row { display: flex; justify-content: space-around; padding: 2px 8px; border: 1px solid #D1C4E9; border-top: none; }
        .distribution-item { font-size: 9pt; font-weight: 700; }
        .signatures { display: flex; justify-content: space-between; align-items: flex-end; padding: 8px 16px 5px; flex-shrink: 0; }
        .signature-box { text-align: center; font-size: 8pt; font-weight: 700; border-top: 1px dashed #9ca3af; padding-top: 8px; width: 150px; }
        .qr-codes-container { display: flex; justify-content: center; align-items: center; gap: 40px; }
        .footer-bar { text-align: center; padding: 10px; background-color: ${primaryColor}; color: white; font-size: 8pt; font-weight: 700; line-height: 1.2; height: 40px; box-sizing: border-box; flex-shrink: 0; }
      </style>
    </head>
    <body>
      <div class="voucher-container">
        <div class="header">
          <div class="company-info">
            <div class="company-name">شركة الروضتين للسفر والسياحة</div>
          </div>
          <div class="logo-container">
            <img src="${logoUrl}" alt="Logo" class="logo">
          </div>
        </div>
        
        <div class="info-bar">
           <div class="info-bar-left">
            <div><strong>Receipt No:</strong> #${voucherData.invoiceNumber ?? 'N/A'}</div>
            ${voucherData.convertToIQD && voucherData.currency === 'USD' && voucherData.amount ? `<div><strong>GN:</strong> ${voucherData.amount}</div>` : ''}
          </div>
          <div class="voucher-title"><h1>${getVoucherType()}</h1></div>
          <div class="info-bar-right">
            <div><strong>Date:</strong> ${formatDate(voucherData.createdAt)}</div>
            <div><strong>Day:</strong> ${formatDay(voucherData.createdAt)}</div>
          </div>
        </div>
        
        <div class="content">
          <table class="content-table">
            <tbody>
              <tr>
                <td class="label-ar">${getRecipientLabel()}</td>
                <td class="value-col">${voucherData.companyName || '-'}</td>
                <td class="label-en">Received From</td>
              </tr>
              <tr>
                <td class="label-ar">المبلغ المستلم</td>
                <td class="value-col" dir="ltr">${displayAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${displayCurrencySymbol}</td>
                <td class="label-en">Amount Received</td>
              </tr>
              <tr>
                <td class="label-ar">المبلغ كتابة</td>
                <td class="value-col">${amountWordsText}</td>
                <td class="label-en">The amount is written</td>
              </tr>
              ${voucherData.phone ? `
                <tr>
                  <td class="label-ar">رقم الهاتف</td>
                  <td class="value-col" dir="ltr">${voucherData.phone}</td>
                  <td class="label-en">Phone Number</td>
                </tr>
              ` : ''}
              ${voucherData.details ? `
                <tr>
                  <td class="label-ar">التفاصيل</td>
                  <td class="value-col">${voucherData.details}</td>
                  <td class="label-en">Details</td>
                </tr>
              ` : ''}
            </tbody>
          </table>

          ${distributionTotal > 0 ? `
            <div class="distribution-section">
              <div class="distribution-title">تفاصيل التوزيع</div>
              <div class="distribution-row">
              ${distributionEntries.map((entry) => `
                <div class="distribution-item">${entry.label}: ${entry.value.toLocaleString()} ${displayCurrencySymbol}</div>
              `).join('')}
              </div>
            </div>
          ` : ''}
        </div>

        <div class="signatures">
           <div class="signature-box" style="text-align: right;">
            <div>منظم الوصل: ${voucherData.employeeName || 'شهد حيدر'}</div>
          </div>
           <div class="qr-codes-container">
              <div class="qr-item">
                <img src="${qrCodeDataUrl}" alt="QR Code"/>
              </div>
            </div>
          <div class="signature-box" style="text-align: left;">
            <div>توقيع المستلم</div>
          </div>
        </div>
        
        <footer class="footer-bar">
          ${footerAddress}
        </footer>
      </div>
    </body>
    </html>
  `;
}
