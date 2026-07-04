export interface User {
  id?: string;
  email: string;
  username?: string;
  full_name?: string;
  phone?: string;
  profile_image?: string;
  banner_image?: string;
  role?: string;
  theme_preference?: 'light' | 'dark';
  created_at?: string;
}

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  type: 'credit' | 'debit';
  category: string;
  description?: string;
  payment_method?: string;
}

export interface DateFilterState {
  type: string;
  startDate: string | null;
  endDate: string | null;
}

export interface KPIData {
  current: number | string;
  change_percent?: number;
}

export interface KPIs {
  total_credits?: KPIData;
  total_debits?: KPIData;
  net_balance?: KPIData;
  total_transactions?: KPIData;
  available_balance?: number;
  highest_expense_category?: { current: string };
  average_monthly_expense?: KPIData;
}

export interface TransactionFiltersState {
  type: string;
  category: string;
  payment_method: string;
}

export interface ChartDataPoint {
  [key: string]: string | number;
}
