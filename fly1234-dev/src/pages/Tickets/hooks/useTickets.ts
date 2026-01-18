import { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, where, Timestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotification } from '../../../contexts/NotificationContext';
import { Ticket, TicketType, Passenger } from '../types';

export function useTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, checkPermission } = useAuth();
  const { showNotification } = useNotification();

  useEffect(() => {
    if (!user) return;

    // فلترة التذاكر حسب الموظف الحالي فقط
    const ticketsQuery = query(
      collection(db, 'tickets'),
      where('createdBy', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(ticketsQuery, (snapshot) => {
      const ticketsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          pnr: data.pnr || '',
          passengers: data.passengers || [],
          type: data.type || 'entry',
          auditChecked: data.auditChecked || false,
          entryChecked: data.entryChecked || false,
          createdAt: data.createdAt?.toDate() || new Date(),
          createdBy: data.createdBy || '',
          notes: data.notes || '',
          route: data.route || '',
          beneficiary: data.beneficiary || '',
          source: data.source || '',
          entryDate: data.entryDate?.toDate(),
          issueDate: data.issueDate?.toDate(),
          currency: data.currency || 'IQD'
        } as Ticket;
      });

      setTickets(ticketsData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching tickets:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const addTicket = async (
    pnr: string,
    passengers: Passenger[],
    type: TicketType,
    notes?: string,
    additionalData?: {
      route?: string;
      beneficiary?: string;
      source?: string;
      currency?: string;
      entryDate?: Date;
      issueDate?: Date;
    }
  ) => {
    if (!user) throw new Error('User not authenticated');

    const ticketData = {
      pnr: pnr.trim().toUpperCase(),
      passengers: passengers,
      type: type,
      auditChecked: false,
      entryChecked: false,
      createdAt: Timestamp.now(),
      createdBy: user.uid,
      notes: notes || '',
      route: additionalData?.route || '',
      beneficiary: additionalData?.beneficiary || '',
      source: additionalData?.source || '',
      currency: additionalData?.currency || 'IQD',
      entryDate: additionalData?.entryDate ? Timestamp.fromDate(additionalData.entryDate) : null,
      issueDate: additionalData?.issueDate ? Timestamp.fromDate(additionalData.issueDate) : null
    };

    await addDoc(collection(db, 'tickets'), ticketData);
  };

  const updateTicket = async (ticketId: string, updates: Partial<Ticket>) => {
    if (!user) throw new Error('User not authenticated');

    // Find the ticket to check if it's audited
    const ticket = tickets.find(t => t.id === ticketId);

    // Allow update only if updating audit/entry check flags, or if ticket is not audited
    if (ticket && ticket.auditChecked && !updates.hasOwnProperty('auditChecked') && !updates.hasOwnProperty('entryChecked')) {
      throw new Error('لا يمكن تعديل تذكرة مدققة');
    }

    const ticketRef = doc(db, 'tickets', ticketId);
    const updateData: any = { ...updates };

    // Remove fields that shouldn't be updated directly
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.createdBy;

    await updateDoc(ticketRef, updateData);
  };

  const deleteTicket = async (ticketId: string) => {
    if (!user) throw new Error('User not authenticated');

    // Find the ticket to check if it's audited
    const ticket = tickets.find(t => t.id === ticketId);

    if (ticket && ticket.auditChecked) {
      throw new Error('لا يمكن حذف تذكرة مدققة');
    }

    await deleteDoc(doc(db, 'tickets', ticketId));
  };

  const toggleAuditCheck = async (ticketId: string, currentValue: boolean) => {
    // التحقق من صلاحية التدقيق
    if (!checkPermission('التذاكر', 'auditTransfer') && !checkPermission('tickets', 'auditTransfer')) {
      showNotification('error', 'ليس لديك صلاحية التدقيق');
      return;
    }
    await updateTicket(ticketId, { auditChecked: !currentValue });
  };

  const toggleEntryCheck = async (ticketId: string, currentValue: boolean) => {
    // التحقق من صلاحية الإدخال
    if (!checkPermission('التذاكر', 'auditEntry') && !checkPermission('tickets', 'auditEntry')) {
      showNotification('error', 'ليس لديك صلاحية الإدخال');
      return;
    }
    await updateTicket(ticketId, { entryChecked: !currentValue });
  };

  return {
    tickets,
    loading,
    addTicket,
    updateTicket,
    deleteTicket,
    toggleAuditCheck,
    toggleEntryCheck
  };
}
