import React, { createContext, useContext, useState, ReactNode } from 'react';

interface GlobalModalsContextType {
  // Change Modal
  isChangeModalOpen: boolean;
  openChangeModal: () => void;
  closeChangeModal: () => void;

  // Refund Modal
  isRefundModalOpen: boolean;
  openRefundModal: () => void;
  closeRefundModal: () => void;
}

const GlobalModalsContext = createContext<GlobalModalsContextType | undefined>(undefined);

export function GlobalModalsProvider({ children }: { children: ReactNode }) {
  const [isChangeModalOpen, setIsChangeModalOpen] = useState(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);

  const openChangeModal = () => setIsChangeModalOpen(true);
  const closeChangeModal = () => setIsChangeModalOpen(false);

  const openRefundModal = () => setIsRefundModalOpen(true);
  const closeRefundModal = () => setIsRefundModalOpen(false);

  return (
    <GlobalModalsContext.Provider
      value={{
        isChangeModalOpen,
        openChangeModal,
        closeChangeModal,
        isRefundModalOpen,
        openRefundModal,
        closeRefundModal,
      }}
    >
      {children}
    </GlobalModalsContext.Provider>
  );
}

export function useGlobalModals() {
  const context = useContext(GlobalModalsContext);
  if (context === undefined) {
    throw new Error('useGlobalModals must be used within a GlobalModalsProvider');
  }
  return context;
}
