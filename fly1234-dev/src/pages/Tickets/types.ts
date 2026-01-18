export type PassengerType = 'adult' | 'child' | 'infant';

export interface Passenger {
  id: string;
  name: string;
  passportNumber: string;
  passengerType: PassengerType;
  purchasePrice: number;
  salePrice: number;
  ticketNumber?: string;
}

export interface Ticket {
  id: string;
  pnr: string;
  passengers: Passenger[];
  type: 'entry' | 'refund' | 'change';
  auditChecked: boolean;
  entryChecked: boolean;
  createdAt: Date;
  createdBy: string;
  notes?: string;
  entryDate?: Date;
  issueDate?: Date;
  route?: string;
  beneficiary?: string;
  source?: string;
  currency?: string;
  hasRefund?: boolean;
  refundedPassengers?: string[];
  lastRefundAt?: Date;
}

export type TicketType = 'entry' | 'refund' | 'change';

export interface TicketFilters {
  searchTerm: string;
  showAuditChecked: boolean;
  showAuditUnchecked: boolean;
  showEntryChecked: boolean;
  showEntryUnchecked: boolean;
  dateFrom?: string;
  dateTo?: string;
  currency?: 'all' | 'IQD' | 'USD';
}
