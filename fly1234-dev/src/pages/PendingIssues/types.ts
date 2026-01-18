export type IssuePriority = 'high' | 'medium' | 'low' | 'open_transfer_pending';
export type IssueStatus = 'pending' | 'in_progress' | 'resolved';

export interface Issue {
  id: string;
  pnr: string[];
  title: string;
  description?: string;
  priority: IssuePriority;
  status: IssueStatus;
  issueDate: Date;
  createdAt: Date;
  createdBy: string;
  createdByName: string;
  companyId?: string;
  companyName?: string;
  phone?: string;
  assignedTo?: string;
  assignedToName?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolvedByName?: string;
  updatedAt?: Date;
  updatedBy?: string;
  updatedByName?: string;
}
