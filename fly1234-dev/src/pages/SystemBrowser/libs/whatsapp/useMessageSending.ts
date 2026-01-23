import { useState, useCallback } from 'react';
import axios from 'axios';

interface SendProgress {
    sent: number;
    failed: number;
    current: string;
}

interface SendOptions {
    text: string;
    imageUrl: string | null;
    recipients: { id: string; name: string; phone: string }[];
    recipientType: 'group' | 'contact';
    account: { instance_id: string; token: string };
    delayMs: number;
}

export default function useMessageSending() {
    const [isSending, setIsSending] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [sendProgress, setSendProgress] = useState<SendProgress>({ sent: 0, failed: 0, current: '' });

    const togglePause = useCallback(() => {
        setIsPaused(prev => !prev);
    }, []);

    const sendMessage = useCallback(async (options: SendOptions) => {
        const { text, imageUrl, recipients, account, delayMs } = options;
        setIsSending(true);
        setIsPaused(false);
        setSendProgress({ sent: 0, failed: 0, current: '' });

        const baseUrl = `https://api.ultramsg.com/${account.instance_id}/messages`;

        for (let i = 0; i < recipients.length; i++) {
            // Check if paused
            while (true) {
                if (!isSending) return; // Stopped
                if (!isPaused) break;
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            const recipient = recipients[i];

            // Mandatory pre-send delay
            setSendProgress(prev => ({ ...prev, current: `بانتظار الفاصل الزمني... (${recipient.name})` }));
            await new Promise(resolve => setTimeout(resolve, delayMs));

            setSendProgress(prev => ({ ...prev, current: `جاري الإرسال إلى ${recipient.name}...` }));

            try {
                const endpoint = imageUrl ? `${baseUrl}/image` : `${baseUrl}/chat`;
                const payload: any = {
                    token: account.token,
                    to: recipient.phone,
                };

                if (imageUrl) {
                    payload.image = imageUrl;
                    payload.caption = text;
                } else {
                    payload.body = text;
                }

                const response = await axios.post(endpoint, payload);

                if (response.data.sent === 'true' || response.data.sent === true) {
                    setSendProgress(prev => ({ ...prev, sent: prev.sent + 1, current: `تم الإرسال لـ ${recipient.name}` }));
                } else {
                    throw new Error(response.data.message || 'فشل الإرسال');
                }
            } catch (error: any) {
                console.error(`Error sending to ${recipient.name}:`, error);
                setSendProgress(prev => ({ ...prev, failed: prev.failed + 1, current: `فشل لـ ${recipient.name}` }));
            }
        }

        setIsSending(false);
    }, [isPaused, isSending]);

    return {
        isSending,
        setIsSending,
        sendMessage,
        sendProgress,
        isPaused,
        togglePause
    };
}
