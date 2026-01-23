import axios from 'axios';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';


export const normalizePhoneNumber = (phone: string): string => {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  if (!cleaned.startsWith('964')) {
    cleaned = '964' + cleaned;
  }
  return cleaned;
};

export const sendWhatsAppMessage = async (
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

export const sendWhatsAppImage = async (
  instanceId: string,
  token: string,
  to: string,
  imageDataUrl: string,
  caption?: string
) => {
  const url = `https://api.ultramsg.com/${instanceId}/messages/image`;

  const params = new URLSearchParams();
  params.append('token', token);
  params.append('to', to);
  params.append('image', imageDataUrl);
  if (caption) {
    params.append('caption', caption);
  }

  try {
    const response = await axios.post(url, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return response.data;
  } catch (error) {
    console.error('❌ Error sending WhatsApp image:', error);
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(`Server responded with ${error.response.status}: ${JSON.stringify(error.response.data)}`);
    }
    throw new Error('فشل إرسال الصورة.');
  }
};

export const sendWhatsAppDocument = async (
  instanceId: string,
  token: string,
  to: string,
  documentDataUrlOrUrl: string, // Can be base64 data URL or HTTP/HTTPS URL
  filename: string,
  caption?: string
) => {
  const url = `https://api.ultramsg.com/${instanceId}/messages/document`;

  const params = new URLSearchParams();
  params.append('token', token);
  params.append('to', to);
  params.append('document', documentDataUrlOrUrl); // Can be URL or base64
  params.append('filename', filename);
  if (caption) {
    params.append('caption', caption);
  }

  try {
    const response = await axios.post(url, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return response.data;
  } catch (error) {
    console.error('❌ Error sending WhatsApp document:', error);
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(`Server responded with ${error.response.status}: ${JSON.stringify(error.response.data)}`);
    }
    throw new Error('فشل إرسال الملف.');
  }
};


export const processMessageTemplate = (template: string, data: any): string => {
  let processed = template;

  // Handle standard placeholders
  for (const key in data) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    processed = processed.replace(regex, data[key] !== undefined && data[key] !== null ? data[key] : '');
  }

  // Handle conditional placeholders
  processed = processed.replace(/{{#if_usd}}(.*?){\{\/if_usd}}/gs, (_, content) => {
    return data.currency === 'USD' ? content : '';
  });

  const hasDistribution = data.gates > 0 || data.internal > 0 || data.external > 0 || data.fly > 0;
  processed = processed.replace(/{{#if_has_distribution}}(.*?){\{\/if_has_distribution}}/gs, (_, content) => {
    return hasDistribution ? content : '';
  });
  
  processed = processed.replace(/{{#if_has_gates}}(.*?){\{\/if_has_gates}}/gs, (_, content) => {
    return data.gates > 0 ? content : '';
  });
  
  processed = processed.replace(/{{#if_has_internal}}(.*?){\{\/if_has_internal}}/gs, (_, content) => {
    return data.internal > 0 ? content : '';
  });
  
  processed = processed.replace(/{{#if_has_external}}(.*?){\{\/if_has_external}}/gs, (_, content) => {
    return data.external > 0 ? content : '';
  });
  
  processed = processed.replace(/{{#if_has_fly}}(.*?){\{\/if_has_fly}}/gs, (_, content) => {
    return data.fly > 0 ? content : '';
  });

  return processed;
};
