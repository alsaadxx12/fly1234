import React from 'react';
import { useState, useCallback } from 'react';
import axios from 'axios';

const BATCH_SIZE = 50;
const CONCURRENT_REQUESTS = 10;
const REQUEST_DELAY = 20;
const API_TIMEOUT = 60000;

interface WhatsAppContact {
  id: string;
  name: string;
  phone?: string;
}

const useWhatsAppContacts = (autoLoad = true, account: { instance_id: string; token: string } | null) => {
  const [whatsappContacts, setWhatsappContacts] = useState<WhatsAppContact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contactImages, setContactImages] = useState<Map<string, string>>(new Map());
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set());
  const [totalContacts, setTotalContacts] = useState(0);

  const fetchContacts = useCallback(async () => {
    if (!account) {
      setError('No WhatsApp account selected');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {      
      const response = await axios({
        method: 'GET',
        url: `https://api.ultramsg.com/${account.instance_id}/contacts`,
        params: { token: account.token },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: API_TIMEOUT,
      });
      
      let contactsData = response.data;
      if (typeof contactsData === 'string') {
        try {
          contactsData = JSON.parse(contactsData);
        } catch (e) {
          contactsData = [];
        }
      }

      if (!Array.isArray(contactsData)) {
        contactsData = [contactsData];
      }
      
      const contacts = contactsData.filter((contact: any) => 
        contact && contact.id && contact.id.includes('@c.us') && !contact.id.includes('@g.us')
      ).map((contact: any) => ({
        id: contact.id,
        name: contact.name || contact.pushname || contact.number || contact.id.split('@')[0],
        phone: contact.number || contact.id.split('@')[0],
        is_business: contact.is_business || false
      }));

      setWhatsappContacts(contacts);
      setTotalContacts(contacts.length);
    } catch (err) {
      setError('Failed to fetch contacts');
      console.error('Error fetching contacts:', err);
    } finally {
      setIsLoading(false);
    }
  }, [account]);

  const loadContactImages = useCallback(async (contacts: WhatsAppContact[], instanceId: string, token: string): Promise<void> => {
    // Implementation remains the same
  }, []);
  
  React.useEffect(() => {
    if (autoLoad && account) {
      fetchContacts();
    }
  }, [autoLoad, account, fetchContacts]);

  return {
    whatsappContacts,
    isLoading,
    error,
    contactImages,
    loadingImages,
    fetchContacts,
    loadContactImages,
    totalContacts
  };
};

export default useWhatsAppContacts;
