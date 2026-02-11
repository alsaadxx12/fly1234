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

    const sendSingleMessage = async (recipient: { phone: string, name: string }, text: string, imageUrl: string | null, account: { instance_id: string; token: string }) => {
        // Normalize instance ID
        const cleanId = account.instance_id.replace(/^instance/, '');
        const isHkAccount = account.instance_id.toLowerCase().includes('hk');

        // Try both servers if needed
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
        const { text, imageUrl, recipients, account, delayMs } = options;

        setIsSending(true);
        setIsPaused(false);
        setCurrentDelayMs(delayMs);
        setSendProgress({ sent: 0, failed: 0, current: 'بدء عملية الإرسال...', total: recipients.length });

        for (let i = 0; i < recipients.length; i++) {
            // Check if process was stopped
            if (!isSendingRef.current) break;

            // Check if paused
            while (isPausedRef.current) {
                if (!isSendingRef.current) return;
                setSendProgress(prev => ({ ...prev, current: 'الإرسال متوقف مؤقتاً...' }));
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            const recipient = recipients[i];

            // Mandatory pre-send delay
            setSendProgress(prev => ({ ...prev, current: `بانتظار الفاصل الزمني... (${recipient.name})` }));

            // Allow dynamic delay adjustment during the send loop using the ref
            let remainingDelay = delayRef.current;
            while (remainingDelay > 0) {
                if (!isSendingRef.current) return;
                if (isPausedRef.current) break; // Go back to pause loop

                const step = Math.min(1000, remainingDelay);
                await new Promise(resolve => setTimeout(resolve, step));
                remainingDelay -= step;
            }

            // Re-check after potential pause/stop during delay
            if (!isSendingRef.current) return;
            if (isPausedRef.current) {
                i--; // Repeat this recipient
                continue;
            }

            setSendProgress(prev => ({ ...prev, current: `جاري الإرسال إلى ${recipient.name}...` }));

            const success = await sendSingleMessage(recipient, text, imageUrl, account);

            if (success) {
                setSendProgress(prev => ({ ...prev, sent: prev.sent + 1, current: `تم الإرسال لـ ${recipient.name}` }));
            } else {
                setSendProgress(prev => ({ ...prev, failed: prev.failed + 1, current: `فشل لـ ${recipient.name}` }));
            }
        }

        setIsSending(false);
    }, [sendSingleMessage]); // No dependencies to avoid recreating the function and breaking the loop

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
