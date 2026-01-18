export interface Debt {
  id: string;
  companyId: string;
  companyName: string;
  debtType: string;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  currency: 'USD' | 'IQD';
  dueDate: Date;
  status: 'active' | 'paid' | 'overdue';
  createdAt: Date;
  createdBy: string;
  createdById: string;
  updatedAt?: Date;
  updatedBy?: string;
  updatedById?: string;
  payments?: Payment[];
  notes?: string;
}

export interface Payment {
  id: string;
  debtId: string;
  amount: number;
  currency: 'USD' | 'IQD';
  paymentDate: Date;
  notes?: string;
  createdAt: Date;
  createdBy: string;
  createdById: string;
}

export interface Company {
  id: string;
  name: string;
  paymentType?: 'cash' | 'credit';
  phone?: string;
  website?: string;
  details?: string;
}

export interface DebtFormData {
  companyId: string;
  companyName: string;
  debtType: string;
  amount: string;
  currency: 'USD' | 'IQD';
  dueDate: Date;
  notes: string;
}

export interface PaymentFormData {
  amount: string;
  paymentDate: Date;
  notes: string;
}
