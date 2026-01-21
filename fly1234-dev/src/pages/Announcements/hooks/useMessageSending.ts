import { useState } from 'react';
import axios from 'axios';

const REQUEST_TIMEOUT = 20000;

export default function useMessageSending() {
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState({ total: 0, sent: 0, current: '', failed: 0 });
  const [isPaused, setIsPaused] = useState(false);

  const sendMessage = async (options: {
    text: string | null;
    imageUrl: string | null;
    recipients: { id: string; name: string, phone?: string }[];
    recipientType: 'group' | 'contact';
    account: { instance_id: string; token: string };
    delayMs: number;
  }): Promise<{ successfulRecipients: string[]; failedRecipients: string[] }> => {
    const { text, imageUrl, recipients, recipientType, account, delayMs } = options;

    if ((!text && !imageUrl) || recipients.length === 0) {
      throw new Error('Message, recipients, and account are required.');
    }

    setIsSending(true);
    setIsPaused(false);
    setSendProgress({ total: recipients.length, sent: 0, current: '', failed: 0 });

    const successfulRecipients: string[] = [];
    const failedRecipients: string[] = [];

    const startTime = new Date().toLocaleTimeString();
    console.log(`[${startTime}] Starting precision broadcast. Interval: ${delayMs}ms`);

    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      const recipientIdentifier = recipientType === 'group' ? recipient.id : (recipient.phone || recipient.id);

      // Mandatory Pre-Send Delay: Even for the first recipient
      // This ensures the user sees the system "checking" and "waiting" immediately
      const waitStartTime = new Date().toLocaleTimeString();
      console.log(`[${waitStartTime}] Respecting Safety Interval: Waiting ${delayMs}ms before sending to ${recipient.name}...`);

      setSendProgress(prev => ({ ...prev, current: `Waiting... (${recipient.name})`, sent: i }));
      await new Promise(resolve => setTimeout(resolve, delayMs));

      const sendTime = new Date().toLocaleTimeString();
      console.log(`[${sendTime}] Dispatching message to ${recipient.name}`);
      setSendProgress(prev => ({ ...prev, current: `Sending to ${recipient.name}...` }));

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
        setSendProgress(prev => ({ ...prev, sent: i + 1, current: recipient.name }));
        console.log(`[${new Date().toLocaleTimeString()}] Success: Message delivered to ${recipient.name}`);
      } catch (error) {
        console.error(`[${new Date().toLocaleTimeString()}] Error sending to ${recipient.name}:`, error);
        failedRecipients.push(recipient.name);
        setSendProgress(prev => ({ ...prev, failed: (prev.failed || 0) + 1, current: recipient.name }));
      }
    }

    const finishTime = new Date().toLocaleTimeString();
    console.log(`[${finishTime}] Precision broadcast sequence completed.`);

    setIsSending(false);
    return { successfulRecipients, failedRecipients };
  };

  const togglePause = () => {
    setIsPaused(prev => !prev);
  };

  return {
    isSending,
    setIsSending,
    sendProgress,
    setSendProgress,
    isPaused,
    sendMessage,
    togglePause
  };
}
