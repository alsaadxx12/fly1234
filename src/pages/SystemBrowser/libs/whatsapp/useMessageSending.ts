import { useState, useCallback, useRef } from 'react';
import axios from 'axios';

interface SendProgress {
    sent: number;
    failed: number;
    current: string;
    total: number;
}

interface SendOptions {
    text: string;
    imageUrl: string | null;
    recipients: { id: string; name: string; phone: string }[];
    recipientType: 'group' | 'contact';
    account: { instance_id: string; token: string };
    delayMs: number;
    maxDelayMs?: number;
    useRandomDelay?: boolean;
    useSpinTax?: boolean;
}

export default function useMessageSending() {
    const [isSending, setIsSendingState] = useState(false);
    const [isPaused, setIsPausedState] = useState(false);
    const [sendProgress, setSendProgress] = useState<SendProgress>({ sent: 0, failed: 0, current: '', total: 0 });
    const [currentDelayMs, setCurrentDelayMsState] = useState(10000);

    // Refs to avoid stale closures in the loop
    const isSendingRef = useRef(false);
    const isPausedRef = useRef(false);
    const delayRef = useRef(10000);

    // Sync refs with state
    const setIsSending = (val: boolean) => {
        isSendingRef.current = val;
        setIsSendingState(val);
    };

    const setIsPaused = (val: boolean) => {
        isPausedRef.current = val;
        setIsPausedState(val);
    };

    const setCurrentDelayMs = (val: number) => {
        delayRef.current = val;
        setCurrentDelayMsState(val);
    };

    const togglePause = useCallback(() => {
        setIsPaused(!isPausedRef.current);
    }, []);

    // Spin-tax helper: {word1|word2} -> random selection
    const processSpinTax = (text: string) => {
        return text.replace(/\{([^{}]+)\}/g, (match, options) => {
            const choices = options.split('|');
            return choices[Math.floor(Math.random() * choices.length)];
        });
    };

    const sendSingleMessage = async (recipient: { phone: string, name: string }, text: string, imageUrl: string | null, account: { instance_id: string; token: string }) => {
        // ... (existing implementation)
        // Normalize instance ID
        const cleanId = account.instance_id.replace(/^instance/, '');
        const isHkAccount = account.instance_id.toLowerCase().includes('hk');

        const servers = isHkAccount
            ? ['hk.ultramsg.com', 'api.ultramsg.com']
            : ['api.ultramsg.com', 'hk.ultramsg.com'];

        let sent = false;
        for (const server of servers) {
            try {
                const baseUrl = `https://${server}/instance${cleanId}/messages`;
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
                    sent = true;
                    break;
                }
            } catch (error: any) {
                console.error(`Error sending via ${server} to ${recipient.name}:`, error.message);
            }
        }
        return sent;
    };

    const sendMessage = useCallback(async (options: SendOptions) => {
        const { text, imageUrl, recipients, account, delayMs, maxDelayMs, useRandomDelay, useSpinTax } = options;

        setIsSending(true);
        setIsPaused(false);
        setCurrentDelayMs(delayMs);
        setSendProgress({ sent: 0, failed: 0, current: 'بدء عملية الإرسال...', total: recipients.length });

        for (let i = 0; i < recipients.length; i++) {
            if (!isSendingRef.current) break;

            while (isPausedRef.current) {
                if (!isSendingRef.current) return;
                setSendProgress(prev => ({ ...prev, current: 'الإرسال متوقف مؤقتاً...' }));
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            const recipient = recipients[i];

            // Wait Delay
            let waitTime = delayRef.current;
            if (useRandomDelay && maxDelayMs) {
                // Random delay between min (delayMs) and max (maxDelayMs)
                waitTime = Math.floor(Math.random() * (maxDelayMs - delayMs + 1)) + delayMs;
            }

            setSendProgress(prev => ({ ...prev, current: `بانتظار الفاصل الزمني... (${recipient.name})` }));

            let remaining = waitTime;
            while (remaining > 0) {
                if (!isSendingRef.current) return;
                if (isPausedRef.current) break;
                const step = Math.min(1000, remaining);
                await new Promise(r => setTimeout(r, step));
                remaining -= step;
            }

            if (!isSendingRef.current) return;
            if (isPausedRef.current) { i--; continue; }

            setSendProgress(prev => ({ ...prev, current: `جاري الإرسال إلى ${recipient.name}...` }));

            // Process text with spin-tax if enabled
            const finalMessage = useSpinTax ? processSpinTax(text) : text;

            const success = await sendSingleMessage(recipient, finalMessage, imageUrl, account);

            if (success) {
                setSendProgress(prev => ({ ...prev, sent: prev.sent + 1, current: `تم الإرسال لـ ${recipient.name}` }));
            } else {
                setSendProgress(prev => ({ ...prev, failed: prev.failed + 1, current: `فشل لـ ${recipient.name}` }));
            }
        }

        setIsSending(false);
    }, []);

    return {
        isSending,
        setIsSending,
        sendMessage,
        sendSingleMessage,
        sendProgress,
        isPaused,
        togglePause,
        setCurrentDelayMs,
        currentDelayMs
    };
}
