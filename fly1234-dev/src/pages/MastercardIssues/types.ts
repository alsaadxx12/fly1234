export type IssuePriority = 'high' | 'medium' | 'low';
export type IssueStatus = 'pending' | 'in_progress' | 'resolved';

export interface MastercardIssue {
  id: string;
  title: string;
  description?: string;
  priority: IssuePriority;
  status: IssueStatus;
  issueDate: Date;
  createdAt: Date;
  createdBy: string;
  createdByName: string;
  assignedTo?: string;
  assignedToName?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolvedByName?: string;
  updatedAt?: Date;
  updatedBy?: string;
  updatedByName?: string;
  refundAmount?: number;
  refundCurrency?: 'USD' | 'IQD';
  refundMethod?: 'mastercard' | 'balance';
  transferType?: 'زين كاش' | 'ماستر كارد';
  transactionImageURLs?: string[];
  mastercardAccountNumber?: string;
  cardholderName?: string;
  customerEmail?: string;
  customerUsername?: string;
}
