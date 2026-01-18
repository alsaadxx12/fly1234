export interface Balance {
  id: string;
  sourceId: string;
  sourceName: string;
  sourceImage?: string;
  amount: number;
  currency: 'IQD' | 'USD' | 'AED';
  type: 'airline' | 'supplier';
  notes?: string;
  lastUpdated: Date;
  createdAt: Date;
  lastUpdatedBy?: {
    email: string;
    name: string;
  };
  limits?: {
    red: number;
    yellow: number;
    green: number;
  };
  isAutoSync?: boolean;
  apiSource?: string;
}
