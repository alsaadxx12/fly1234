import React, { useState } from 'react';
import { type WhatsAppGroup } from '../types';
import axios from 'axios';

const MAX_CONCURRENT_MESSAGES = 5;
const DEFAULT_SEND_DELAY = 1500;
const REQUEST_TIMEOUT = 20000;

export default function useMessageSending() {
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState({ total: 0, sent: 0, current: '', failed: 0 });
  const [isPaused, setIsPaused] = useState(false);
  const [lastSentIndex, setLastSentIndex] = useState(-1);
  const [sendDelay, setSendDelay] = useState(DEFAULT_SEND_DELAY);
  
  const sendMessage = (options: {
    text: string | null;
    imageUrl: string | null;
    recipients: { id: string; name: string, phone?: string }[];
    recipientType: 'group' | 'contact';
    account: { instance_id: string; token: string };
  }): Promise<{ successfulRecipients: string[]; failedRecipients: string[] }> => {
    return new Promise(async (resolve, reject) => {
        const { text, imageUrl, recipients, recipientType, account } = options;

        if ((!text && !imageUrl) || recipients.length === 0) {
            reject(new Error('Message, recipients, and account are required.'));
            return;
        }

        setIsSending(true);
        setIsPaused(false);
        setSendProgress({ total: recipients.length, sent: 0, current: '', failed: 0 });
        setLastSentIndex(-1);

        const successfulRecipients: string[] = [];
        const failedRecipients: string[] = [];

        for (let i = 0; i < recipients.length; i++) {
            if (isPaused) {
                setLastSentIndex(i - 1);
                // Don't resolve or reject here, just stop sending
                return;
            }

            const recipient = recipients[i];
            const recipientIdentifier = recipientType === 'group' ? recipient.id : (recipient.phone || recipient.id);

            setSendProgress(prev => ({ ...prev, current: recipient.name, sent: i }));

            try {
                const baseUrl = `https://api.ultramsg.com/${account.instance_id}/messages`;
                const params: any = { token: account.token, to: recipientIdentifier, priority: "1" };

                if (imageUrl) {
                    params.image = imageUrl;
                    if (text) params.caption = text;
                    await axios.post(`${baseUrl}/image`, null, { params, timeout: REQUEST_TIMEOUT });
                } else if (text) {
                    params.body = text;
                    await axios.post(`${baseUrl}/chat`, null, { params, timeout: REQUEST_TIMEOUT });
                }
                successfulRecipients.push(recipient.name);
                setSendProgress(prev => ({ ...prev, sent: prev.sent + 1, current: recipient.name }));
            } catch (error) {
                console.error(`Failed to send to ${recipient.name}:`, error);
                failedRecipients.push(recipient.name);
                setSendProgress(prev => ({ ...prev, failed: (prev.failed || 0) + 1, current: recipient.name }));
            }

            if (i < recipients.length - 1 && !isPaused) {
                await new Promise(resolve => setTimeout(resolve, sendDelay));
            }
        }

        setSendProgress(prev => ({ ...prev, sent: prev.sent + prev.failed }));

        if (!isPaused) {
            setLastSentIndex(-1);
            setIsSending(false);
            resolve({ successfulRecipients, failedRecipients });
        }
    });
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  return {
    isSending,
    setIsSending,
    sendProgress,
    isPaused,
    sendDelay,
    setSendDelay,
    sendMessage,
    togglePause
  };
}
