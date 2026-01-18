import React from 'react';
import { useGlobalModals } from '../contexts/GlobalModalsContext';
import GlobalChangeModal from './GlobalChangeModal';
import GlobalRefundModal from './GlobalRefundModal';
import { collection, addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

export default function GlobalModals() {
  const { isChangeModalOpen, closeChangeModal, isRefundModalOpen, closeRefundModal } = useGlobalModals();
  const { user } = useAuth();
  const { showNotification } = useNotification();

  const handleSaveChange = async (changeData: {
    pnr: string;
    source: string;
    beneficiary: string;
    sourceChangeAmount: number;
    beneficiaryChangeAmount: number;
    sourceCurrency: 'IQD' | 'USD';
    beneficiaryCurrency: 'IQD' | 'USD';
    changeDate: Date;
    entryDate: Date;
  }) => {
    try {
      if (!user?.uid) {
        throw new Error('User not authenticated');
      }

      const ticketData = {
        pnr: changeData.pnr,
        type: 'change',
        source: changeData.source,
        beneficiary: changeData.beneficiary,
        currency: changeData.sourceCurrency,
        issueDate: changeData.changeDate,
        entryDate: changeData.entryDate,
        passengers: [{
          name: '',
          purchasePrice: changeData.sourceChangeAmount,
          salePrice: changeData.beneficiaryChangeAmount
        }],
        route: '',
        notes: '',
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'tickets'), ticketData);
      showNotification('تم إضافة التغيير بنجاح', 'success');
      closeChangeModal();

      // Trigger refresh
      window.dispatchEvent(new CustomEvent('ticketsUpdated'));
    } catch (error) {
      console.error('Error saving change:', error);
      showNotification('فشل في إضافة التغيير', 'error');
      throw error;
    }
  };

  const handleSaveRefund = async (
    pnr: string,
    passengers: any[],
    type: 'refund',
    notes: string,
    additionalData: {
      route: string;
      beneficiary: string;
      source: string;
      currency: string;
      entryDate: Date;
      issueDate: Date;
    }
  ) => {
    try {
      if (!user?.uid) {
        throw new Error('User not authenticated');
      }

      const ticketData = {
        pnr,
        type,
        passengers,
        notes,
        ...additionalData,
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'tickets'), ticketData);
      showNotification('تم إضافة الرجوع بنجاح', 'success');
      closeRefundModal();

      // Trigger refresh
      window.dispatchEvent(new CustomEvent('ticketsUpdated'));
    } catch (error) {
      console.error('Error saving refund:', error);
      showNotification('فشل في إضافة الرجوع', 'error');
      throw error;
    }
  };

  return (
    <>
      <GlobalChangeModal
        isOpen={isChangeModalOpen}
        onClose={closeChangeModal}
        onSave={handleSaveChange}
      />

      <GlobalRefundModal
        isOpen={isRefundModalOpen}
        onClose={closeRefundModal}
        onSave={handleSaveRefund}
      />
    </>
  );
}
