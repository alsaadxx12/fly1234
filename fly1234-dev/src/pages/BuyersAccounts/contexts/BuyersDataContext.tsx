import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useNotification } from '../../../contexts/NotificationContext';
import { subscribeToBuyersSettings } from '../../../lib/services/buyersSettingsService';

interface BuyersDataContextType {
    buyers: any[];
    isFetchingInBg: boolean;
    totalResults: number;
    fetchedCount: number;
    syncLogs: string[];
    startBgFetch: () => Promise<void>;
    setBuyers: React.Dispatch<React.SetStateAction<any[]>>;
    error: string | null;
    settings: { endpoint: string; token: string };
}

const BuyersDataContext = createContext<BuyersDataContextType | undefined>(undefined);

const FN_URL = "https://us-central1-my-acc-3ee97.cloudfunctions.net/usersProxy";

export const BuyersDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { showNotification } = useNotification();
    const [buyers, setBuyers] = useState<any[]>([]);
    const [isFetchingInBg, setIsFetchingInBg] = useState(false);
    const [totalResults, setTotalResults] = useState(0);
    const [fetchedCount, setFetchedCount] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [syncLogs, setSyncLogs] = useState<string[]>([]);
    const [settings, setSettings] = useState({
        endpoint: 'https://accounts.fly4all.com/api/finance/buyers',
        token: '1cdtzai1n5ksohsq83rogqb56970de4f7e55ed8767115'
    });
    const fetchRef = useRef(false);

    // Sync Settings with Firestore internally
    useEffect(() => {
        console.log("[BuyersData] Context Provider Mounted. Current buyers length:", buyers.length);
        const unsubscribe = subscribeToBuyersSettings((newSettings) => {
            if (newSettings) {
                setSettings(prev => ({
                    endpoint: newSettings.endpoint || prev.endpoint,
                    token: newSettings.token || prev.token
                }));
            }
        });
        return () => {
            console.log("[BuyersData] Context Provider Unmounting.");
            unsubscribe();
        };
    }, []);

    const startBgFetch = useCallback(async () => {
        if (isFetchingInBg || !settings.token) return;

        setIsFetchingInBg(true);
        setError(null);
        setSyncLogs([]);
        console.log("[BuyersData] Starting background sync process...");

        const MAX_RETRIES = 3;
        const perpage = 1000;
        let page = 1;
        const allItems: any[] = [];
        let total = 0;

        try {
            while (true) {
                let retryCount = 0;
                let success = false;
                let result: any = null;

                while (retryCount < MAX_RETRIES && !success) {
                    try {
                        const response = await fetch(FN_URL, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                endpoint: settings.endpoint,
                                token: settings.token,
                                method: "POST",
                                params: {
                                    "pagination[page]": page,
                                    "pagination[perpage]": perpage,
                                    "sort": "id:asc"
                                },
                                body: {}
                            })
                        });

                        result = await response.json();
                        if (result.ok) {
                            success = true;
                        } else {
                            throw new Error(result.error || `HTTP ${response.status}`);
                        }
                    } catch (e: any) {
                        retryCount++;
                        if (retryCount >= MAX_RETRIES) throw e;
                        setSyncLogs(prev => [...prev, `محاولة ${retryCount}/${MAX_RETRIES} للصفحة ${page}`]);
                        await new Promise(resolve => setTimeout(resolve, 1500 * retryCount));
                    }
                }

                const items = result.data?.data || result.data || [];
                total = result.data?.total || result.data?.meta?.pagination?.total || result.data?.meta?.total || total;

                if (items.length === 0) break;

                allItems.push(...items);

                // Map-based de-duplication
                const uniq = new Map<string, any>();
                allItems.forEach(x => { if (x && x.id) uniq.set(String(x.id), x); });
                const finalBatch = Array.from(uniq.values());

                setBuyers([...finalBatch]);
                setFetchedCount(finalBatch.length);
                if (total) setTotalResults(total);

                if (items.length < perpage) break;
                page++;
            }

            setSyncLogs(prev => [...prev, `اكتملت المزامنة: ${allItems.length} سجل`]);
            showNotification('success', 'اكتمل التزامن', `تمت مزامنة ${allItems.length} حساب بنجاح`);

        } catch (err: any) {
            console.error("[BuyersData] Fetch error:", err);
            setError(`فشل المزامنة: ${err.message}`);
            showNotification('error', 'خطأ في التزامن', err.message);
        } finally {
            setIsFetchingInBg(false);
        }
    }, [settings.endpoint, settings.token, isFetchingInBg, showNotification]);

    useEffect(() => {
        if (!fetchRef.current && settings.token && buyers.length === 0) {
            console.log("[BuyersData] Auto-starting fetch as list is empty.");
            fetchRef.current = true;
            startBgFetch();
        }
    }, [settings.token, startBgFetch, buyers.length]);

    return (
        <BuyersDataContext.Provider value={{
            buyers,
            isFetchingInBg,
            totalResults,
            fetchedCount,
            syncLogs,
            startBgFetch,
            setBuyers,
            error,
            settings
        }}>
            {children}
        </BuyersDataContext.Provider>
    );
};

export const useBuyersData = () => {
    const context = useContext(BuyersDataContext);
    if (context === undefined) {
        throw new Error('useBuyersData must be used within a BuyersDataProvider');
    }
    return context;
};
