import { useState, useEffect } from 'react';
import axios from 'axios';
import { type WhatsAppGroup } from '../types';
import { useCallback } from 'react';

// Batch size for processing groups
const BATCH_SIZE = 50;
const CONCURRENT_REQUESTS = 10;
const REQUEST_DELAY = 20;

// Increased timeout duration (60 seconds)
const API_TIMEOUT = 60000;

// Debug flag for detailed logging
const DEBUG = true;

// Cache configuration
const cacheKey = 'whatsapp_groups_cache';
const cacheExpiry = 5 * 60 * 1000; // 5 minutes in milliseconds

function useWhatsAppGroups(loadImmediately = false, selectedAccount: { instance_id: string; token: string } | null = null) {
  const [whatsappGroups, setWhatsappGroups] = useState<WhatsAppGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ total: 0, loaded: 0 });
  const [isRefreshing, setIsRefreshing] = useState(true);
  const [fetchAttempts, setFetchAttempts] = useState(0);
  const [isFetching, setIsFetching] = useState(false);
  const [lastFetchedAccount, setLastFetchedAccount] = useState<string | null>(null);
  const [groupImages, setGroupImages] = useState<Map<string, string>>(new Map());
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set());

  // Check cache and return cached data if valid
  const getFromCache = () => {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const { data, timestamp, accountId } = JSON.parse(cached);
        
        const isExpired = Date.now() - timestamp >= cacheExpiry;
        const isSameAccount = accountId === selectedAccount?.instance_id;
        
        if (DEBUG) console.log('[useWhatsAppGroups] Cache check:', { 
          hasCache: true, 
          isExpired, 
          isSameAccount, 
          cachedGroups: data?.length || 0,
          cacheAge: Math.round((Date.now() - timestamp) / 1000) + 's'
        });
        
        if (!isExpired && isSameAccount) {
          if (DEBUG) console.log('[useWhatsAppGroups] Using cached WhatsApp groups data');
          return data;
        }
      } catch (error) {
        console.warn('Cache parsing failed:', error);
        localStorage.removeItem(cacheKey);
        if (DEBUG) console.log('[useWhatsAppGroups] Cache removed due to parsing error');
      }
    } else {
      if (DEBUG) console.log('[useWhatsAppGroups] No cache found for WhatsApp groups');
    }
    return null;
  };

  // Save data to cache
  const saveToCache = (data: WhatsAppGroup[]) => {
    try {
      if (DEBUG) console.log(`[useWhatsAppGroups] Saving ${data.length} WhatsApp groups to cache`);
      localStorage.setItem(cacheKey, JSON.stringify({
        data,
        timestamp: Date.now(),
        accountId: selectedAccount?.instance_id
      }));
    } catch (error) {
      console.warn('Failed to save to cache:', error);
    }
  };

  const fetchGroupInfo = async (id: string, instanceId: string, token: string): Promise<WhatsAppGroup | null> => {
    try {
      if (DEBUG) console.log(`[useWhatsAppGroups] Fetching info for group ${id.substring(0, 10)}...`);
      const response = await axios({
        method: 'GET',
        url: `https://api.ultramsg.com/${instanceId}/groups/group`, 
        params: { token, groupId: id },
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: API_TIMEOUT // Using increased timeout
      });
      
      if (response?.data) {
        const groupData = response.data;
        const groupName = groupData.name || groupData.subject;
        const participants = groupData?.groupMetadata?.participants;
        
        if (groupName) {
          if (DEBUG) console.log(`[useWhatsAppGroups] Group info fetched: ${groupName} (${participants?.length || 0} participants)`);
          return { id, name: groupName, participants: participants?.length || 0 };
        }
      }
      if (DEBUG) console.log(`[useWhatsAppGroups] No valid group info found for ${id}`);
      return null;
    } catch (error) {
      console.warn(`Failed to fetch group ${id}:`, error);
      return null;
    }
  };

  const fetchGroups = useCallback(async () => {
    if (!selectedAccount) {
      console.log('[useWhatsAppGroups] No WhatsApp account selected, skipping fetch');
      setWhatsappGroups([]);
      setIsLoading(false);
      return;
    }

    if (isFetching) {
      console.log('[useWhatsAppGroups] Already fetching groups, waiting for completion');
      return;
    }
    
    if (lastFetchedAccount === selectedAccount.instance_id && !isRefreshing && whatsappGroups.length > 0) {
      console.log(`[useWhatsAppGroups] Already fetched groups for ${selectedAccount.instance_id}, using existing ${whatsappGroups.length} groups`);
      setIsLoading(false);
      return;
    }
    
    setIsFetching(true);
    setIsRefreshing(true); 
    setError(null);
    setFetchAttempts(prev => prev + 1); 

    // Try to get from cache first if not explicitly refreshing
    if (!isRefreshing) {
      const cached = getFromCache();
      if (cached) {
        setWhatsappGroups(cached);
        setIsLoading(false);
        setIsRefreshing(false);
        setIsFetching(false);
        setLastFetchedAccount(selectedAccount.instance_id);
        if (DEBUG) console.log(`[useWhatsAppGroups] Using ${cached.length} groups from cache`);
        return;
      }
    }

    try {
      setIsLoading(true);

      // Fetch group IDs with increased timeout and retry mechanism
      const response = await axios({
        method: 'GET', 
        url: `https://api.ultramsg.com/${selectedAccount.instance_id}/groups/ids`,
        params: {
          token: selectedAccount.token,
          clear: true
        },
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        timeout: API_TIMEOUT // Using increased timeout
      });

      if (DEBUG) console.log('[useWhatsAppGroups] Processing response data from groups/ids API');
      let groupIds: string[] = [];
      if (typeof response.data === 'string') {
        groupIds = (response.data || '').split('\n').map((id: string) => id.trim()).filter((id: string) => id.length > 0);
      } else if (Array.isArray(response.data)) {
        groupIds = response.data.map(item => typeof item === 'string' ? item.trim() : item?.id?.trim()).filter(Boolean);
      } else if (typeof response.data === 'object' && response.data !== null) {
        // Handle cases where the data is an object with IDs as keys or in a property
        groupIds = Object.values(response.data).map((item: any) => typeof item === 'string' ? item.trim() : item?.id?.trim()).filter(Boolean);
      }


      if (DEBUG) console.log(`[useWhatsAppGroups] Found ${groupIds.length} group IDs`);
      
      if (groupIds.length === 0) {
        setWhatsappGroups([]);
        setProgress({ total: 0, loaded: 0 });
        setIsLoading(false);
        setIsRefreshing(false);
        setIsFetching(false);
        setLastFetchedAccount(selectedAccount.instance_id);
        return;
      }
      
      if (DEBUG) console.log(`[useWhatsAppGroups] Starting to fetch details for ${groupIds.length} groups`);
      let groups: WhatsAppGroup[] = [];
      setProgress({ total: groupIds.length, loaded: 0 });
      setWhatsappGroups([]); // Clear previous groups before fetching new ones

      const PRIORITY_COUNT = 10;
      const priorityIds = groupIds.slice(0, PRIORITY_COUNT);
      const remainingIds = groupIds.slice(PRIORITY_COUNT);

      if (priorityIds.length > 0) {
        if (DEBUG) console.log(`[useWhatsAppGroups] Fetching first ${priorityIds.length} groups with priority`);
        const priorityResults = await processBatchWithConcurrency(
          priorityIds,
          selectedAccount.instance_id,
          selectedAccount.token,
          CONCURRENT_REQUESTS
        );

        groups = [...priorityResults];
        setWhatsappGroups(prevGroups => {
            const updatedGroups = [...prevGroups];
            priorityResults.forEach(pr => {
                if (!updatedGroups.some(g => g.id === pr.id)) {
                    updatedGroups.push(pr);
                }
            });
            return updatedGroups;
        });
        setProgress(prev => ({ ...prev, total: groupIds.length, loaded: prev.loaded + priorityResults.length }));
        setIsLoading(false);

        if (DEBUG) console.log(`[useWhatsAppGroups] Priority groups loaded: ${groups.length}`);
      }

      if (remainingIds.length > 0) {
        if (DEBUG) console.log(`[useWhatsAppGroups] Fetching remaining ${remainingIds.length} groups`);
        setIsLoadingMore(true);

        for (let i = 0; i < remainingIds.length; i += BATCH_SIZE) {
          const batch = remainingIds.slice(i, i + BATCH_SIZE);
          if (DEBUG) console.log(`[useWhatsAppGroups] Processing remaining batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(remainingIds.length/BATCH_SIZE)}`);

          const batchResults = await processBatchWithConcurrency(
            batch,
            selectedAccount.instance_id,
            selectedAccount.token,
            CONCURRENT_REQUESTS
          );

          setWhatsappGroups(prevGroups => {
              const updatedGroups = [...prevGroups];
              batchResults.forEach(br => {
                  if (!updatedGroups.some(g => g.id === br.id)) {
                      updatedGroups.push(br);
                  }
              });
              return updatedGroups;
          });

          setProgress(prev => ({
            ...prev,
            loaded: prev.loaded + batchResults.length,
          }));

          if (i + BATCH_SIZE < remainingIds.length) {
            await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY));
          }
        }

        setIsLoadingMore(false);
      }

      if (DEBUG) console.log(`[useWhatsAppGroups] Completed fetching all groups. Total: ${groups.length}`);
      
      saveToCache(whatsappGroups);
      setLastFetchedAccount(selectedAccount.instance_id);
    } catch (error) {
      console.error('Error fetching groups:', error);
      if (DEBUG) console.log('[useWhatsAppGroups] Error details:', error);
      
      const cached = getFromCache();
      if (cached && cached.length > 0) {
        setWhatsappGroups(cached);
        if (DEBUG) console.log(`[useWhatsAppGroups] Using ${cached.length} groups from cache after error`);
        setError('حدث خطأ أثناء تحديث المجموعات. تم استخدام البيانات المخزنة مؤقتًا.');
      } else {
        if (DEBUG) console.log('[useWhatsAppGroups] No cache available after error');
        setError('فشل في تحميل مجموعات الواتساب. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.');
        setWhatsappGroups([]);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsFetching(false);
      if (DEBUG) console.log('[useWhatsAppGroups] Finished WhatsApp groups fetch process');
    }
  }, [selectedAccount, isFetching, lastFetchedAccount, isRefreshing, whatsappGroups.length]);

  const processBatchWithConcurrency = async (
    groupIds: string[],
    instanceId: string,
    token: string,
    concurrency: number = CONCURRENT_REQUESTS
  ): Promise<WhatsAppGroup[]> => {
    const results: WhatsAppGroup[] = [];
    const queue = [...groupIds];
    
    while(queue.length > 0) {
        const batch = queue.splice(0, concurrency);
        const batchPromises = batch.map(groupId => 
            fetchGroupInfoWithRetry(groupId, instanceId, token)
        );
        const chunkResults = await Promise.all(batchPromises);
        results.push(...chunkResults.filter(Boolean) as WhatsAppGroup[]);
    }
    
    return results;
  };

  const fetchGroupInfoWithRetry = async (
    groupId: string, 
    instanceId: string, 
    token: string, 
    retryCount = 0,
    maxRetries = 3 // Increased max retries
  ): Promise<WhatsAppGroup | null> => {
    try {
      return await fetchGroupInfo(groupId, instanceId, token);
    } catch (error) {
      if (retryCount < maxRetries) {
        const baseDelay = 2000; // Increased base delay
        const jitter = Math.random() * 500;
        const delay = baseDelay * Math.pow(2, retryCount) + jitter;
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchGroupInfoWithRetry(groupId, instanceId, token, retryCount + 1);
      }
      console.warn(`Failed to fetch group ${groupId} after retries:`, error);
      return null;
    }
  };

  const fetchGroupImage = async (groupId: string, instanceId: string, token: string): Promise<string | null> => {
    try {
      if (DEBUG) console.log(`[useWhatsAppGroups] Fetching image for group ${groupId.substring(0, 10)}...`);
      
      const response = await axios({
        method: 'GET',
        url: `https://api.ultramsg.com/${instanceId}/contacts/image`,
        params: { 
          token, 
          chatId: groupId 
        },
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        timeout: API_TIMEOUT // Using increased timeout
      });
      
      if (response.data?.success) {
        if (DEBUG) console.log(`[useWhatsAppGroups] Image fetched successfully for group ${groupId.substring(0, 10)}`);
        return response.data.success;
      }
      
      return null;
    } catch (error) {
      console.warn(`Failed to fetch image for group ${groupId}:`, error);
      return null;
    }
  };

  const loadGroupImages = useCallback(async (visibleGroups: WhatsAppGroup[], instanceId: string, token: string) => {
    if (!instanceId || !token || visibleGroups.length === 0) return;
    
    const validGroups = visibleGroups.filter(g => g && g.id);
    if (validGroups.length === 0) return;

    if (DEBUG) console.log(`[useWhatsAppGroups] Loading images for ${validGroups.length} visible groups`);
    
    const newLoadingImages = new Set<string>();
    
    for (const group of validGroups) {
      if (!group || !group.id) continue;
      
      if (groupImages.has(group.id) || loadingImages.has(group.id)) continue;
      
      newLoadingImages.add(group.id);
    }
    
    if (newLoadingImages.size > 0) {
      setLoadingImages(prev => new Set([...prev, ...newLoadingImages]));
      console.log(`[useWhatsAppGroups] Added ${newLoadingImages.size} groups to loading queue`);
      
      const batchSize = 5;
      const groupsToProcess = [...newLoadingImages];
      
      for (let i = 0; i < groupsToProcess.length; i += batchSize) {
        const batch = groupsToProcess.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (groupId) => {
          try {
            const group = visibleGroups.find(g => g.id === groupId);
            if (!group) return;

            if (DEBUG) console.log(`[useWhatsAppGroups] Fetching image for group: ${group.name}`);
            const imageUrl = await fetchGroupImage(groupId, instanceId, token);
            if (imageUrl) {
              setGroupImages(prev => new Map(prev).set(groupId, imageUrl));
            }
          } catch (error) {
            console.warn(`Failed to load image for group ${groupId}:`, error);
          } finally {
            setLoadingImages(prev => {
              const next = new Set(prev);
              next.delete(groupId);
              return next;
            });
          }
        }));
        
        if (i + batchSize < groupsToProcess.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
    }
  }, [groupImages, loadingImages]);

  useEffect(() => {
    if (selectedAccount) {
      if (DEBUG) console.log(`[useWhatsAppGroups] Initial fetch triggered for ${selectedAccount.instance_id}`);
      
      if (lastFetchedAccount !== selectedAccount.instance_id || whatsappGroups.length === 0) {
        if (DEBUG) console.log(`[useWhatsAppGroups] Need to fetch groups for ${selectedAccount.instance_id}`);
        setTimeout(fetchGroups, 100);
      } else {
        if (DEBUG) console.log(`[useWhatsAppGroups] Already have ${whatsappGroups.length} groups for ${selectedAccount.instance_id}`);
      }
    }
  }, [selectedAccount?.instance_id]);

  return {
    whatsappGroups,
    isLoading,
    isLoadingMore,
    error,
    groupImages,
    loadingImages,
    progress,
    isRefreshing,
    fetchGroups,
    loadGroupImages,
    totalGroups: progress.total > 0 ? progress.total : whatsappGroups.length
  };
}

export default useWhatsAppGroups;
