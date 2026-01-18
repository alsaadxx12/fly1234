export interface VisaEntry {
  id: string;
  name: string;
  passportNumber: string;
  visaType: string;
  source: string;
  beneficiary: string;
  salePrice: number;
  purchasePrice: number;
  notes: string;
  bk: string;
  createdAt: Date;
  createdBy: string;
  createdByName?: string;
  entryChecked?: boolean;
  auditChecked?: boolean;
}

export interface VisaType {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
}
