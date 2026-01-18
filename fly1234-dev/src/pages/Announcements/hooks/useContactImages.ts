import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';

// Enhanced configuration
const BATCH_SIZE = 8; // Number of images to load in parallel
const RETRY_ATTEMPTS = 2; // Number of retry attempts for failed image loads
const RETRY_DELAY = 1000; // Delay between retries in ms
const BATCH_DELAY = 200; // Delay between batches for faster loading
const IMAGE_CACHE_KEY = 'whatsapp_contact_images'; // Local storage cache key
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const IMAGE_QUALITY = 'high'; // Can be 'low', 'medium', or 'high'

interface ContactImageCache {
  images: Record<string, string>;
  timestamp: number;
}

export default function useContactImages() {
  const [contactImages, setContactImages] = useState<Map<string, string>>(new Map());
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set());
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState({ total: 0, loaded: 0, failed: 0 });

  // Load cached images on mount
  useEffect(() => {
    loadCachedImages();
  }, []);

  // Save images to cache when contactImages changes
  useEffect(() => {
    if (contactImages.size > 0) {
      saveImagesToCache();
    }
  }, [contactImages]);

  // Load images from cache
  const loadCachedImages = useCallback(() => {
    try {
      const cachedData = localStorage.getItem(IMAGE_CACHE_KEY);
      if (!cachedData) return;

      const { images, timestamp } = JSON.parse(cachedData) as ContactImageCache;
      
      // Check if cache is expired
      if (Date.now() - timestamp > CACHE_EXPIRY) {
        localStorage.removeItem(IMAGE_CACHE_KEY);
        return;
      }

      // Convert object to Map
      const imageMap = new Map(Object.entries(images));
      setContactImages(imageMap);
      console.log(`Loaded ${imageMap.size} contact images from cache`);
    } catch (error) {
      console.error('Error loading cached images:', error);
      localStorage.removeItem(IMAGE_CACHE_KEY);
    }
  }, []);

  // Save images to cache
  const saveImagesToCache = useCallback(() => {
    try {
      // Convert Map to object for storage
      const imagesObject: Record<string, string> = {};
      contactImages.forEach((url, id) => {
        imagesObject[id] = url;
      });

      const cacheData: ContactImageCache = {
        images: imagesObject,
        timestamp: Date.now()
      };

      localStorage.setItem(IMAGE_CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error saving images to cache:', error);
    }
  }, [contactImages]);

  // Fetch a single contact image with retries
  const fetchContactImage = useCallback(async (
    contactId: string, 
    instanceId: string, 
    token: string, 
    retryCount = 0
  ): Promise<string | null> => {
    try {
      // Skip if already loaded or currently loading
      if (contactImages.has(contactId) || loadingImages.has(contactId)) {
        return contactImages.get(contactId) || null;
      }
      
      // Skip invalid contact IDs
      if (!contactId || !contactId.includes('@c.us')) {
        console.log(`Skipping invalid contact ID: ${contactId}`);
        return null;
      }

      // Add to loading set
      setLoadingImages(prev => new Set([...prev, contactId]));

      const response = await axios({
        method: 'GET',
        url: `https://api.ultramsg.com/${instanceId}/contacts/image`,
        params: { 
          token,
          chatId: contactId,
          quality: IMAGE_QUALITY
        },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 10000 // 10 second timeout
      });

      if (response.data?.success) {
        // Update images map
        setContactImages(prev => {
          const next = new Map(prev);
          next.set(contactId, response.data.success);
          return next;
        });

        // Update progress
        setProgress(prev => ({
          ...prev,
          loaded: prev.loaded + 1
        }));

        return response.data.success;
      }
      
      throw new Error('No image URL in response');
    } catch (error) {
      // Retry logic
      if (retryCount < RETRY_ATTEMPTS) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return fetchContactImage(contactId, instanceId, token, retryCount + 1);
      }

      // Mark as failed after all retries
      setFailedImages(prev => new Set([...prev, contactId]));
      setProgress(prev => ({
        ...prev,
        failed: prev.failed + 1
      }));
      
      console.warn(`Failed to fetch image for contact ${contactId}:`, error);
      return null;
    } finally {
      // Remove from loading set
      setLoadingImages(prev => {
        const next = new Set(prev);
        next.delete(contactId);
        return next;
      });
    }
  }, [contactImages, loadingImages]);

  // Load images for a batch of contacts
  const loadContactImages = useCallback(async (
    contacts: Array<{id: string; name?: string; phone?: string}>,
    instanceId: string,
    token: string
  ) => {
    if (!instanceId || !token || !contacts || !Array.isArray(contacts) || contacts.length === 0) {
      console.log('Invalid parameters for loadContactImages', { 
        hasInstanceId: !!instanceId, 
        hasToken: !!token, 
        contactsLength: contacts?.length || 0 
      });
      return;
    }

    // Reset progress
    setProgress(prev => ({
      total: contacts.length,
      loaded: prev.loaded,
      failed: prev.failed
    }));

    // Filter contacts that need images loaded
    const contactsToProcess = contacts.filter(contact => contact && typeof contact === 'object' && contact.id &&
      !contactImages.has(contact.id) && 
      !loadingImages.has(contact.id) &&
      !failedImages.has(contact.id)
    );

    if (contactsToProcess.length === 0) return;
    
    console.log(`Loading images for ${contactsToProcess.length} contacts`);

    // Process in batches
    for (let i = 0; i < contactsToProcess.length; i += BATCH_SIZE) {
      const batch = contactsToProcess.slice(i, i + BATCH_SIZE);

      // Log batch progress
      console.log(`Processing image batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(contactsToProcess.length/BATCH_SIZE)}, size: ${batch.length}`);
      
      // Process batch in parallel
      await Promise.all(
        batch.map(contact => fetchContactImage(contact.id, instanceId, token))
      );
      
      // Update progress after each batch
      setProgress(prev => ({
        ...prev,
        loaded: prev.loaded + batch.filter(contact => contactImages.has(contact.id)).length,
        failed: prev.failed + batch.filter(contact => failedImages.has(contact.id)).length
      }));
      
      // Add delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < contactsToProcess.length) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
      }
    }
  }, [contactImages, loadingImages, failedImages, fetchContactImage]);

  // Clear failed images to allow retrying
  const clearFailedImages = useCallback(() => {
    setFailedImages(new Set());
  }, []);

  // Clear all image data
  const clearAllImages = useCallback(() => {
    setContactImages(new Map());
    setLoadingImages(new Set());
    setFailedImages(new Set());
    setProgress({ total: 0, loaded: 0, failed: 0 });
    localStorage.removeItem(IMAGE_CACHE_KEY);
  }, []);

  return {
    contactImages,
    loadingImages,
    failedImages,
    progress,
    loadContactImages,
    fetchContactImage,
    clearFailedImages,
    clearAllImages
  };
}