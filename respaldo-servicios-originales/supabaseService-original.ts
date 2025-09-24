// RESPALDO ORIGINAL DE SUPABASESERVICE - ANTES DE MULTICOMPAÑÍA
// Fecha de respaldo: 2025-09-22
// Este archivo contiene la implementación original antes de los cambios de multicompañía

import { supabase } from './supabase';
import { getCurrentUser } from './supabase';

// Interfaces para los tipos de datos
interface Company {
  id?: string;
  name: string;
  tax_id: string;
  industry?: string;
  country?: string;
  currency?: string;
  user_id: string;
}

interface FinancialPeriod {
  id?: string;
  company_id: string;
  period_name: string;
  start_date: string;
  end_date: string;
  period_type: 'monthly' | 'quarterly' | 'annual';
  is_closed: boolean;
  is_published?: boolean; // NUEVO: Campo para marcar como publicado/definitivo
}

interface FinancialEntry {
  id?: string;
  company_id: string;
  period_id: string;
  account_code: string;
  account_name: string;
  debit_amount?: number;
  credit_amount?: number;
  balance_amount: number;
  entry_type: 'balance_sheet' | 'income_statement' | 'cash_flow';
  category?: string;
  // NUEVOS CAMPOS PARA MULTIMONEDA
  original_currency?: string; // Moneda original del registro (VES, USD, EUR)
  original_amount?: number; // Monto en moneda original
  display_currency?: string; // Moneda de presentación/visualización
  converted_amount?: number; // Monto convertido a moneda de presentación
  exchange_rate?: number; // Tasa de cambio aplicada
  exchange_rate_date?: string; // Fecha de la tasa de cambio
  conversion_source?: 'BCV' | 'MANUAL' | 'ECB'; // Fuente de la tasa de cambio
}

interface ImportRecord {
  id?: string;
  company_id: string;
  file_name: string;
  file_type: string;
  record_count: number;
  import_status: 'success' | 'error';
  error_message?: string;
  user_id: string;
}

// Clase principal del servicio
export class SupabaseService {
  
  // **GESTIÓN DE EMPRESAS**
  static async createCompany(companyData: Omit<Company, 'id' | 'user_id'>) {
    const { user } = await getCurrentUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { data, error } = await supabase
      .from('companies')
      .insert({
        ...companyData,
        user_id: user.id
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getUserCompanies() {
    const { user } = await getCurrentUser();
    if (!user) throw new Error('Usuario no autenticado');

    // Primero obtener el company_id del usuario
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (userError) {
      console.error('Error obteniendo company_id del usuario:', userError);
      throw userError;
    }

    if (!userData?.company_id) {
      console.log('Usuario no tiene company_id asignado');
      return [];
    }

    // Obtener la empresa asociada al usuario
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', userData.company_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error obteniendo empresa:', error);
      throw error;
    }
    
    console.log('✅ SupabaseService.getUserCompanies - Empresas encontradas:', data?.length || 0);
    return data || [];
  }

  static async updateCompany(companyId: string, updates: Partial<Company>) {
    const { user } = await getCurrentUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { data, error } = await supabase
      .from('companies')
      .update(updates)
      .eq('id', companyId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // **GESTIÓN DE PERÍODOS FINANCIEROS**
  static async createFinancialPeriod(periodData: Omit<FinancialPeriod, 'id'>) {
    const { data, error } = await supabase
      .from('financial_periods')
      .insert(periodData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getCompanyPeriods(companyId: string) {
    const user = await getCurrentUser();
    if (!user) throw new Error('Usuario no autenticado');
  
    const { data, error } = await supabase
      .from('financial_periods')
      .select('*')
      .eq('company_id', companyId)
      .order('start_date', { ascending: false });
  
    if (error) throw new Error(`Error fetching periods: ${error.message}`);
    return data || [];
  }
  
  // Agregar alias para compatibilidad
  static async getFinancialPeriods(companyId: string) {
    return this.getCompanyPeriods(companyId);
  }
  // Agregar las nuevas funciones aquí, dentro de la clase
  static async updateFinancialPeriod(periodId: string, periodData: Partial<FinancialPeriod>): Promise<void> {
    const { error } = await supabase
      .from('financial_periods')
      .update(periodData)
      .eq('id', periodId);

    if (error) {
      throw new Error(`Error updating financial period: ${error.message}`);
    }
  }

  static async deleteFinancialPeriod(periodId: string): Promise<void> {
    // Primero eliminar los datos financieros asociados
    const { error: dataError } = await supabase
      .from('financial_entries')
      .delete()
      .eq('period_id', periodId);
  
    if (dataError) {
      throw new Error(`Error deleting financial data: ${dataError.message}`);
    }
  
    // Luego eliminar el período
    const { error: periodError } = await supabase
      .from('financial_periods')
      .delete()
      .eq('id', periodId);
  
    if (periodError) {
      throw new Error(`Error deleting financial period: ${periodError.message}`);
    }
  }

  // **PERSISTENCIA DE DATOS FINANCIEROS**
  static async saveFinancialEntries(entries: Omit<FinancialEntry, 'id'>[]) {
    // Procesar entradas con conversión de moneda
    const processedEntries = await Promise.all(
      entries.map(async (entry) => {
        // Si no hay moneda original especificada, usar la de la empresa
        if (!entry.original_currency) {
          const { data: company } = await supabase
            .from('companies')
            .select('currency')
            .eq('id', entry.company_id)
            .single();
          
          entry.original_currency = company?.currency || 'VES';
        }

        // Si no hay moneda de visualización, usar la original
        if (!entry.display_currency) {
          entry.display_currency = entry.original_currency;
        }

        // Si las monedas son iguales, no necesita conversión
        if (entry.original_currency === entry.display_currency) {
          entry.converted_amount = entry.balance_amount;
          entry.exchange_rate = 1;
          entry.exchange_rate_date = new Date().toISOString().split('T')[0];
          entry.conversion_source = 'MANUAL';
        } else {
          // Aquí se implementaría la lógica de conversión
          // Por ahora, mantener el valor original
          entry.converted_amount = entry.balance_amount;
          entry.exchange_rate = 1;
          entry.exchange_rate_date = new Date().toISOString().split('T')[0];
          entry.conversion_source = 'MANUAL';
        }

        return entry;
      })
    );

    const { data, error } = await supabase
      .from('financial_entries')
      .insert(processedEntries)
      .select();

    if (error) throw error;
    return data;
  }

  static async getFinancialEntries(companyId: string, periodId?: string) {
    let query = supabase
      .from('financial_entries')
      .select('*')
      .eq('company_id', companyId)
      .order('account_code');

    if (periodId) {
      query = query.eq('period_id', periodId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  static async updateFinancialEntry(entryId: string, updates: Partial<FinancialEntry>) {
    const { data, error } = await supabase
      .from('financial_entries')
      .update(updates)
      .eq('id', entryId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteFinancialEntry(entryId: string) {
    const { error } = await supabase
      .from('financial_entries')
      .delete()
      .eq('id', entryId);

    if (error) throw error;
  }

  // **GESTIÓN DE IMPORTACIONES**
  static async createImportRecord(importData: Omit<ImportRecord, 'id'>) {
    const { data, error } = await supabase
      .from('import_records')
      .insert(importData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getImportHistory(companyId: string) {
    const { data, error } = await supabase
      .from('import_records')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // **ANÁLISIS Y REPORTES**
  static async getBalanceSheet(companyId: string, periodId: string) {
    const { data, error } = await supabase
      .from('financial_entries')
      .select('*')
      .eq('company_id', companyId)
      .eq('period_id', periodId)
      .eq('entry_type', 'balance_sheet')
      .order('account_code');

    if (error) throw error;
    return data || [];
  }

  static async getIncomeStatement(companyId: string, periodId: string) {
    const { data, error } = await supabase
      .from('financial_entries')
      .select('*')
      .eq('company_id', companyId)
      .eq('period_id', periodId)
      .eq('entry_type', 'income_statement')
      .order('account_code');

    if (error) throw error;
    return data || [];
  }

  static async getCashFlow(companyId: string, periodId: string) {
    const { data, error } = await supabase
      .from('financial_entries')
      .select('*')
      .eq('company_id', companyId)
      .eq('period_id', periodId)
      .eq('entry_type', 'cash_flow')
      .order('account_code');

    if (error) throw error;
    return data || [];
  }

  // **UTILIDADES**
  static async getCompanyStats(companyId: string) {
    const [periods, entries, imports] = await Promise.all([
      this.getCompanyPeriods(companyId),
      this.getFinancialEntries(companyId),
      this.getImportHistory(companyId)
    ]);

    return {
      totalPeriods: periods.length,
      totalEntries: entries.length,
      totalImports: imports.length,
      lastImport: imports[0]?.created_at || null,
      activePeriods: periods.filter(p => !p.is_closed).length
    };
  }

  // **BÚSQUEDA Y FILTROS**
  static async searchEntries(companyId: string, searchTerm: string, filters?: {
    periodId?: string;
    entryType?: string;
    category?: string;
  }) {
    let query = supabase
      .from('financial_entries')
      .select('*')
      .eq('company_id', companyId);

    // Aplicar filtros
    if (filters?.periodId) {
      query = query.eq('period_id', filters.periodId);
    }
    if (filters?.entryType) {
      query = query.eq('entry_type', filters.entryType);
    }
    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    // Búsqueda por término
    if (searchTerm) {
      query = query.or(`account_name.ilike.%${searchTerm}%,account_code.ilike.%${searchTerm}%`);
    }

    const { data, error } = await query.order('account_code');
    if (error) throw error;
    return data || [];
  }

  // **VALIDACIONES**
  static async validatePeriodData(companyId: string, periodId: string) {
    const entries = await this.getFinancialEntries(companyId, periodId);
    
    const validation = {
      totalEntries: entries.length,
      balanceSheetEntries: entries.filter(e => e.entry_type === 'balance_sheet').length,
      incomeStatementEntries: entries.filter(e => e.entry_type === 'income_statement').length,
      cashFlowEntries: entries.filter(e => e.entry_type === 'cash_flow').length,
      totalDebits: entries.reduce((sum, e) => sum + (e.debit_amount || 0), 0),
      totalCredits: entries.reduce((sum, e) => sum + (e.credit_amount || 0), 0),
      isBalanced: false
    };

    validation.isBalanced = Math.abs(validation.totalDebits - validation.totalCredits) < 0.01;
    
    return validation;
  }

  // **EXPORTACIÓN DE DATOS**
  static async exportCompanyData(companyId: string, format: 'json' | 'csv' = 'json') {
    const [company, periods, entries] = await Promise.all([
      supabase.from('companies').select('*').eq('id', companyId).single(),
      this.getCompanyPeriods(companyId),
      this.getFinancialEntries(companyId)
    ]);

    const exportData = {
      company: company.data,
      periods,
      entries,
      exportDate: new Date().toISOString(),
      totalRecords: entries.length
    };

    if (format === 'json') {
      return JSON.stringify(exportData, null, 2);
    }
    
    // Para CSV, convertir solo las entradas financieras
    const csvHeaders = Object.keys(entries[0] || {}).join(',');
    const csvRows = entries.map(entry => 
      Object.values(entry).map(value => 
        typeof value === 'string' ? `"${value}"` : value
      ).join(',')
    );
    
    return [csvHeaders, ...csvRows].join('\n');
  }

  // **CONFIGURACIÓN DE EMPRESA**
  static async updateCompanySettings(companyId: string, settings: {
    currency?: string;
    fiscal_year_start?: string;
    accounting_method?: 'accrual' | 'cash';
    reporting_currency?: string;
  }) {
    const { data, error } = await supabase
      .from('companies')
      .update(settings)
      .eq('id', companyId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // **GESTIÓN DE MONEDAS Y CONVERSIÓN**
  static async getExchangeRates(baseCurrency: string, targetCurrency: string, date?: string) {
    // Esta función se conectaría a una API de tasas de cambio
    // Por ahora, devolver una tasa fija para desarrollo
    const mockRates: Record<string, Record<string, number>> = {
      'VES': { 'USD': 0.027, 'EUR': 0.025 },
      'USD': { 'VES': 37.0, 'EUR': 0.92 },
      'EUR': { 'VES': 40.2, 'USD': 1.09 }
    };

    return {
      base: baseCurrency,
      target: targetCurrency,
      rate: mockRates[baseCurrency]?.[targetCurrency] || 1,
      date: date || new Date().toISOString().split('T')[0],
      source: 'MOCK'
    };
  }

  static async convertAmount(amount: number, fromCurrency: string, toCurrency: string, date?: string) {
    if (fromCurrency === toCurrency) {
      return { convertedAmount: amount, rate: 1, date: date || new Date().toISOString().split('T')[0] };
    }

    const rateData = await this.getExchangeRates(fromCurrency, toCurrency, date);
    const convertedAmount = amount * rateData.rate;

    return {
      convertedAmount,
      rate: rateData.rate,
      date: rateData.date
    };
  }

  // **BACKUP Y RESTAURACIÓN**
  static async createBackup(companyId: string) {
    const backupData = await this.exportCompanyData(companyId, 'json');
    
    const { data, error } = await supabase
      .from('backups')
      .insert({
        company_id: companyId,
        backup_data: backupData,
        backup_type: 'manual',
        created_by: (await getCurrentUser()).user?.id
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getBackups(companyId: string) {
    const { data, error } = await supabase
      .from('backups')
      .select('id, backup_type, created_at, created_by')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }
}

export default SupabaseService;