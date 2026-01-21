export interface Safe {
  id: string;
  name: string;
  balance_usd: number;
  balance_iqd: number;
  created_at: Date;
  updated_at: Date;
  unconfirmed_balance_usd?: number;
  unconfirmed_balance_iqd?: number;
  total_balance_usd?: number;
  total_balance_iqd?: number;
  is_main?: boolean;
  custodian_name?: string;
  custodian_image?: string;
}

export interface ResetHistory {
  id?: string;
  safe_id: string;
  safe_name: string;
  reset_type: 'usd' | 'iqd' | 'both';
  previous_balance_usd?: number | null;
  previous_balance_iqd?: number | null;
  target_safe_id?: string;
  target_safe_name?: string;
  reset_by: string;
  created_at: Date;
}

export interface UnconfirmedVoucher {
  id: string;
  safeId: string;
  safeName: string;
  amount: number;
  currency: 'USD' | 'IQD';
  type: 'receipt' | 'payment' | 'transfer';
  confirmation: boolean;
  createdAt: Date;
  isTransfer?: boolean;
  fromSafeId?: string;
  fromSafeName?: string;
  companyName?: string;
  section?: string;
}
