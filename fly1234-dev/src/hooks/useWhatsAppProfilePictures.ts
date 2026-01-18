import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { getWhatsAppSettings, WhatsAppAccount } from '../lib/collections/whatsapp';
import { useAuth } from '../contexts/AuthContext';
import { normalizePhoneNumber } from '../utils/whatsappUtils';

interface ProfilePictureCache {
  [phone: string]: {
    url: string | null;
    timestamp: number;
  };
}

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export function useWhatsAppProfilePictures() {
  console.log('[WhatsApp Hook] ⚡ Hook initialized');

  const { currentUser } = useAuth();
  console.log('[WhatsApp Hook] Auth Context - currentUser:', currentUser?.uid || 'null');

  const [profilePictures, setProfilePictures] = useState<ProfilePictureCache>({});
  const [loading, setLoading] = useState<{ [phone: string]: boolean }>({});
  const [whatsappAccounts, setWhatsappAccounts] = useState<WhatsAppAccount[]>([]);
  const [activeAccount, setActiveAccount] = useState<WhatsAppAccount | null>(null);

  // Load WhatsApp accounts from Firebase
  useEffect(() => {
    const loadWhatsAppAccounts = async () => {
      console.log('[WhatsApp Hook] Current user:', currentUser?.uid || 'null');

      if (!currentUser?.uid) {
        console.warn('[WhatsApp Hook] No user logged in, cannot load WhatsApp accounts');
        return;
      }

      try {
        console.log('[WhatsApp Hook] Loading WhatsApp accounts for user:', currentUser.uid);
        const accounts = await getWhatsAppSettings(currentUser.uid);

        console.log('[WhatsApp Hook] WhatsApp accounts loaded:', accounts.length);
        console.log('[WhatsApp Hook] Accounts details:', accounts.map(acc => ({
          id: acc.id,
          name: acc.name,
          isActive: acc.isActive,
          is_active: acc.is_active,
          hasInstanceId: !!(acc.instanceId || acc.instance_id),
          hasToken: !!(acc.token || acc.apiKey)
        })));

        setWhatsappAccounts(accounts);

        // Find active account
        const active = accounts.find(acc => acc.isActive || acc.is_active);
        if (active) {
          console.log('[WhatsApp Hook] ✅ Active WhatsApp account found:', {
            id: active.id,
            name: active.name,
            instanceId: active.instanceId || active.instance_id,
            hasToken: !!(active.token || active.apiKey)
          });
          setActiveAccount(active);
        } else if (accounts.length > 0) {
          console.log('[WhatsApp Hook] ⚠️ No active account, using first account:', {
            id: accounts[0].id,
            name: accounts[0].name
          });
          setActiveAccount(accounts[0]);
        } else {
          console.warn('[WhatsApp Hook] ❌ No WhatsApp accounts configured');
          setActiveAccount(null);
        }
      } catch (error) {
        console.error('[WhatsApp Hook] Error loading WhatsApp accounts:', error);
        setActiveAccount(null);
      }
    };

    loadWhatsAppAccounts();
  }, [currentUser]);

  // Using shared normalizePhoneNumber from utils/whatsappUtils.ts

  const fetchProfilePicture = useCallback(async (phone: string) => {
    if (!phone) {
      console.log('[WhatsApp Hook] ❌ No phone provided');
      return null;
    }

    if (!activeAccount) {
      console.warn('[WhatsApp Hook] ❌ No active WhatsApp account - cannot fetch profile pictures');
      return null;
    }

    const originalPhone = phone;
    const normalizedPhone = normalizePhoneNumber(phone);

    if (originalPhone !== normalizedPhone) {
      console.log('[WhatsApp Hook] 📞 Phone normalized:', originalPhone, '→', normalizedPhone);
    } else {
      console.log('[WhatsApp Hook] 📞 Phone (already normalized):', normalizedPhone);
    }

    if (!normalizedPhone.startsWith('964') || normalizedPhone.length < 12) {
      console.log('[WhatsApp Hook] ❌ Invalid phone format:', normalizedPhone, 'Length:', normalizedPhone.length);
      return null;
    }

    // Check cache first
    const cached = profilePictures[normalizedPhone];
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('[WhatsApp Hook] ✅ Using cached profile picture for:', normalizedPhone);
      return cached.url;
    }

    // Check if already loading
    if (loading[normalizedPhone]) {
      console.log('[WhatsApp Hook] ⏳ Already loading profile for:', normalizedPhone);
      return null;
    }

    setLoading(prev => ({ ...prev, [normalizedPhone]: true }));

    try {
      const instanceId = activeAccount.instanceId || activeAccount.instance_id || '';
      const token = activeAccount.token || activeAccount.apiKey || '';

      if (!instanceId || !token) {
        console.error('[WhatsApp Hook] ❌ Active WhatsApp account missing instanceId or token');
        return null;
      }

      const cleanInstanceId = instanceId.startsWith('instance')
        ? instanceId.substring(8)
        : instanceId;

      const formData = new URLSearchParams();
      formData.append('token', token);
      formData.append('chatId', `${normalizedPhone}@c.us`);

      console.log('[WhatsApp Hook] 🔄 Fetching profile picture for:', normalizedPhone, 'using account:', activeAccount.name);
      console.log('[WhatsApp Hook] API URL:', `https://api.ultramsg.com/instance${cleanInstanceId}/contacts/profile-pic`);

      const response = await axios.post(
        `https://api.ultramsg.com/instance${cleanInstanceId}/contacts/profile-pic`,
        formData,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 10000,
        }
      );

      console.log('Profile picture API response:', response.data);

      let profileUrl = null;

      if (response.data) {
        // UltraMsg returns the profile pic URL directly in different formats
        if (typeof response.data === 'string') {
          profileUrl = response.data;
        } else if (typeof response.data === 'object') {
          profileUrl = response.data.url ||
                      response.data.profile_pic ||
                      response.data.profilePic ||
                      response.data.picture ||
                      response.data.image ||
                      null;
        }
      }

      console.log('Extracted profile URL:', profileUrl);

      setProfilePictures(prev => ({
        ...prev,
        [normalizedPhone]: {
          url: profileUrl,
          timestamp: Date.now(),
        },
      }));

      return profileUrl;
    } catch (error) {
      console.error('Error fetching profile picture:', error);

      setProfilePictures(prev => ({
        ...prev,
        [normalizedPhone]: {
          url: null,
          timestamp: Date.now(),
        },
      }));

      return null;
    } finally {
      setLoading(prev => ({ ...prev, [normalizedPhone]: false }));
    }
  }, [activeAccount, profilePictures, loading]);

  const getProfilePicture = useCallback((phone: string): string | null => {
    if (!phone) return null;

    const normalizedPhone = normalizePhoneNumber(phone);
    const cached = profilePictures[normalizedPhone];

    if (cached) {
      return cached.url;
    }

    // Trigger fetch if not in cache
    if (activeAccount && !loading[normalizedPhone]) {
      console.log('Triggering fetch for:', phone, '(normalized:', normalizedPhone, ')');
      fetchProfilePicture(phone);
    } else if (!activeAccount) {
      console.warn('No active WhatsApp account - cannot fetch profile pictures');
    }

    return null;
  }, [profilePictures, loading, activeAccount, fetchProfilePicture]);

  const prefetchProfilePictures = useCallback(async (phones: string[]) => {
    if (!activeAccount) {
      console.warn('[WhatsApp Hook] ❌ Cannot prefetch - no active WhatsApp account');
      return;
    }

    console.log('[WhatsApp Hook] 🔄 Prefetching profile pictures for', phones.length, 'contacts');

    const promises = phones.map(phone => {
      const normalizedPhone = normalizePhoneNumber(phone);
      const cached = profilePictures[normalizedPhone];

      // Only fetch if not cached or cache is old
      if (!cached || Date.now() - cached.timestamp >= CACHE_DURATION) {
        return fetchProfilePicture(phone);
      }
      return Promise.resolve(null);
    });

    const results = await Promise.allSettled(promises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    console.log('[WhatsApp Hook] ✅ Prefetch complete:', successful, 'of', phones.length, 'contacts processed');
  }, [activeAccount, profilePictures, fetchProfilePicture]);

  const isLoading = useCallback((phone: string): boolean => {
    const normalizedPhone = normalizePhoneNumber(phone);
    return loading[normalizedPhone] || false;
  }, [loading]);

  return {
    getProfilePicture,
    fetchProfilePicture,
    prefetchProfilePictures,
    isLoading,
    hasConfig: !!activeAccount,
    activeAccount,
    whatsappAccounts,
  };
}
