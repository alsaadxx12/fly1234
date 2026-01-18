import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Ticket } from '../Tickets/types';

export function useAuditTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // صفحة التدقيق تعرض جميع التذاكر من كل الموظفين
    const ticketsQuery = query(
      collection(db, 'tickets'),
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
  }, []);

  return { tickets, loading };
}
