export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole; // Rol en el contexto de la empresa actual
  is_active: boolean;
  phone?: string;
  last_login?: string;
  created_at: string;
  // Campos adicionales de la relación multicompañía
  is_owner?: boolean;
  joined_at?: string;
}

export type UserRole = 'admin' | 'senior_analyst' | 'junior_analyst' | 'read_only';

export interface UserPermission {
  id: string;
  name: string;
  description: string;
  module: string;
}

export interface RolePermission {
  role: UserRole;
  permissions: string[];
}

export interface CreateUserRequest {
  email: string;
  full_name: string;
  role: UserRole;
  company_id: string;
  phone?: string;
  password: string;
}

export interface UpdateUserRequest {
  full_name?: string;
  role?: UserRole;
  is_active?: boolean;
  phone?: string;
  is_owner?: boolean;
}

// Nuevas interfaces para arquitectura multicompañía
export interface UserCompany {
  id: string;
  user_id: string;
  company_id: string;
  role: UserRole;
  is_active: boolean;
  is_owner: boolean;
  joined_at: string;
  invited_by?: string;
  created_at: string;
}

export interface CompanyWithRole extends Company {
  role: UserRole;
  is_owner: boolean;
  joined_at: string;
  user_company_id: string;
}

export interface UserWithCompanyInfo extends User {
  companies: CompanyWithRole[];
  current_company?: CompanyWithRole;
}

export interface Company {
  id: string;
  name: string;
  tax_id: string;
  country: string;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface FinancialPeriod {
  id: string;
  company_id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_closed: boolean;
  created_at: string;
}

export interface Account {
  id: string;
  company_id: string;
  code: string;
  name: string;
  account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  account_subtype: string;
  parent_account_id?: string;
  level: number;
  is_active: boolean;
}

export interface FinancialEntry {
  id: string;
  company_id: string;
  period_id: string;
  account_id: string;
  amount: number;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface FinancialRatio {
  name: string;
  category: 'liquidity' | 'profitability' | 'leverage' | 'efficiency';
  value: number;
  formula: string;
  interpretation: 'good' | 'warning' | 'critical';
  benchmark?: number;
}

export interface DashboardMetrics {
  revenue: number;
  revenueGrowth: number;
  netIncome: number;
  netIncomeGrowth: number;
  totalAssets: number;
  totalLiabilities: number;
  equity: number;
  currentRatio: number;
  quickRatio: number;
  debtToEquity: number;
  roa: number;
  roe: number;
}