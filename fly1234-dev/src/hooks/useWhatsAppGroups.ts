import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';

interface WhatsAppGroup {
    id: string;
    name: string;
}

export default function useWhatsAppGroups(autoFetch = true, account?: { instance_id: string; token: string } | null) {
    const [whatsappGroups, setWhatsappGroups] = useState<WhatsAppGroup[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchGroups = useCallback(async () => {
        if (!account?.instance_id || !account?.token) return;

        setIsLoading(true);
        setError(null);

        try {
            const response = await axios.get(`https://api.ultramsg.com/${account.instance_id}/groups`, {
                params: {
                    token: account.token
                }
            });

            if (Array.isArray(response.data)) {
                const formattedGroups = response.data.map((g: any) => ({
                    id: g.id,
                    name: g.name || g.id
                }));
                setWhatsappGroups(formattedGroups);
            } else if (response.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
                // Some versions return groups object
                const groupsArray = Object.values(response.data).map((g: any) => ({
                    id: g.id,
                    name: g.name || g.id
                }));
                setWhatsappGroups(groupsArray);
            } else {
                setWhatsappGroups([]);
            }
        } catch (err: any) {
            console.error('Error fetching WhatsApp groups:', err);
            setError(err.message || 'فشل جلب المجموعات');
        } finally {
            setIsLoading(false);
        }
    }, [account]);

    useEffect(() => {
        if (autoFetch && account) {
            fetchGroups();
        }
    }, [autoFetch, account, fetchGroups]);

    return {
        whatsappGroups,
        isLoading,
        error,
        fetchGroups
    };
}
