import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp, where, Timestamp, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import { Announcement } from '../types';

export default function useAnnouncements() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnnouncements = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const announcementsRef = collection(db, 'announcements');
      const q = query(
        announcementsRef,
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        setAnnouncements([]); 
        setIsLoading(false);
        return;
      }
      
      const announcementsData = snapshot.docs.map(doc => {
        const data = doc.data();
        const createdAt = data.createdAt instanceof Timestamp ? 
          data.createdAt.toDate() : 
          data.createdAt ? new Date(data.createdAt) : new Date();
          
        return {
          id: doc.id,
          title: data.title || 'إعلان بدون عنوان',
          message: data.message || undefined,
          imageUrl: data.imageUrl || undefined,
          date: createdAt.toLocaleDateString('en-GB'),
          sentTo: data.sentTo || 0,
          type: data.type || 'group',
          successRate: data.successRate || 100,
          createdAt: createdAt,
          successfulRecipients: data.sentToContacts || data.successfulRecipients || [],
          failedRecipients: data.failedContacts || data.failedRecipients || []
        } as Announcement;
      });
      
      setAnnouncements(announcementsData);
    } catch (error) {
      console.error('Error loading announcements:', error);
      setError('فشل في تحميل الإعلانات');
    } finally {
      setIsLoading(false);
    }
  };

  const saveAnnouncement = async (
    data: Omit<Announcement, 'id' | 'date' | 'createdAt'>
  ): Promise<Announcement> => {
    try {
      if (!user?.uid) throw new Error('User not authenticated');
      
      const successfulRecipients = data.successfulRecipients || [];
      const failedRecipients = data.failedRecipients || [];
      const totalSent = successfulRecipients.length + failedRecipients.length;

      const announcementData = {
        title: data.title,
        message: data.message || null,
        imageUrl: data.imageUrl || null, 
        sentTo: totalSent,
        type: data.type,
        successRate: totalSent > 0 ? (successfulRecipients.length / totalSent) * 100 : 100,
        createdAt: serverTimestamp(),
        createdBy: user.uid,
        createdByName: user.displayName || user.email || 'مستخدم',
        sentToContacts: successfulRecipients,
        failedContacts: failedRecipients,
        groupIds: data.groupIds || [],
        contactIds: data.contactIds || []
      };
      
      const docRef = await addDoc(collection(db, 'announcements'), announcementData);
      
      const newAnnouncement: Announcement = {
        id: docRef.id,
        ...data,
        sentTo: totalSent,
        date: new Date().toLocaleDateString('en-GB'),
        createdAt: new Date()
      };
      
      setAnnouncements(prev => [newAnnouncement, ...prev]);
      
      return newAnnouncement;
    } catch (error) {
      console.error('Error saving announcement:', error);
      throw new Error('فشل في حفظ الإعلان');
    }
  };

  const deleteAnnouncement = async (id: string): Promise<boolean> => {
    try {
      await deleteDoc(doc(db, 'announcements', id));
      
      setAnnouncements(prev => prev.filter(a => a.id !== id));
      
      return true;
    } catch (error) {
      console.error('Error deleting announcement:', error);
      return false;
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, [user?.uid]);

  return {
    announcements,
    isLoading,
    error,
    saveAnnouncement,
    deleteAnnouncement,
    refresh: loadAnnouncements
  };
}
