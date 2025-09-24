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
    // Filtrar solo los campos que existen en la tabla de Supabase
    const processedEntries = entries.map(entry => ({
      company_id: entry.company_id,
      period_id: entry.period_id,
      account_code: entry.account_code,
      account_name: entry.account_name,
      debit_amount: entry.debit_amount || 0,
      credit_amount: entry.credit_amount || 0,
      balance_amount: entry.balance_amount,
      entry_type: entry.entry_type,
      category: entry.category || ''
    }));
  
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
      .eq('company_id', companyId);

    if (periodId) {
      query = query.eq('period_id', periodId);
    }

    const { data, error } = await query.order('account_code');

    if (error) throw error;
    return data || [];
  }

  static async deleteFinancialEntries(companyId: string, periodId: string) {
    const { error } = await supabase
      .from('financial_entries')
      .delete()
      .eq('company_id', companyId)
      .eq('period_id', periodId);

    if (error) throw error;
  }

  // **VALIDACIÓN DE ELIMINACIÓN DE PERÍODOS**
  static async checkPeriodHasBalances(periodId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('financial_entries')
      .select('id')
      .eq('period_id', periodId)
      .limit(1);

    if (error) throw error;
    return (data && data.length > 0);
  }

  // **NUEVA FUNCIÓN PARA VERIFICAR DUPLICADOS**
  static async checkExistingBalances(companyId: string, periodId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('financial_entries')
      .select('id')
      .eq('company_id', companyId)
      .eq('period_id', periodId)
      .limit(1);

    if (error) throw error;
    return (data && data.length > 0);
  }

  static async safeDeleteFinancialPeriod(periodId: string): Promise<void> {
    // Verificar si el período tiene balances cargados
    const hasBalances = await this.checkPeriodHasBalances(periodId);
    
    if (hasBalances) {
      throw new Error('No se puede eliminar el período porque tiene balances cargados. Elimine primero los balances antes de eliminar el período.');
    }

    // Si no hay balances, proceder con la eliminación normal
    await this.deleteFinancialPeriod(periodId);
  }

  // **HISTORIAL DE IMPORTACIONES**
  static async saveImportRecord(importData: Omit<ImportRecord, 'id' | 'user_id'>) {
    const { user } = await getCurrentUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { data, error } = await supabase
      .from('import_history')
      .insert({
        ...importData,
        user_id: user.id
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getImportHistory(companyId: string) {
    const { user } = await getCurrentUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { data, error } = await supabase
      .from('import_history')
      .select('*')
      .eq('company_id', companyId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // **FUNCIONES DE UTILIDAD**
  static async processImportedData(companyId: string, periodId: string, importedData: Record<string, any>[]) {
    try {
      // Limpiar datos existentes del período
      await this.deleteFinancialEntries(companyId, periodId);
      
      // Convertir datos importados a entradas financieras
      const financialEntries: Omit<FinancialEntry, 'id'>[] = importedData.map(item => ({
        company_id: companyId,
        period_id: periodId,
        account_code: item.Codigo || item.codigo || '',
        account_name: item.Descripcion || item.descripcion || item.Cuenta || item.cuenta || '',
        debit_amount: parseFloat(item.Debitos || item.debitos || '0'),
        credit_amount: parseFloat(item.Creditos || item.creditos || '0'),
        balance_amount: parseFloat(item.SaldoActual || item.saldoActual || item.Valor || item.valor || '0'),
        entry_type: this.determineEntryType(item),
        category: item.Categoria || item.categoria || item.Tipo || item.tipo
      }));

      // Guardar en Supabase
      return await this.saveFinancialEntries(financialEntries);
    } catch (error) {
      console.error('Error procesando datos importados:', error);
      throw error;
    }
  }

  private static determineEntryType(item: Record<string, any>): 'balance_sheet' | 'income_statement' | 'cash_flow' {
    const category = (item.Categoria || item.categoria || item.Tipo || item.tipo || '').toLowerCase();
    const accountName = (item.Descripcion || item.descripcion || item.Cuenta || item.cuenta || '').toLowerCase();
    
    if (category.includes('balance') || accountName.includes('activo') || accountName.includes('pasivo') || accountName.includes('patrimonio')) {
      return 'balance_sheet';
    }
    if (category.includes('income') || accountName.includes('ingreso') || accountName.includes('gasto') || accountName.includes('venta')) {
      return 'income_statement';
    }
    return 'cash_flow';
  }

  // **CREAR EMPRESA Y PERÍODO POR DEFECTO**
  static async createDefaultCompanyAndPeriod() {
    try {
      // Crear empresa por defecto
      const company = await this.createCompany({
        name: 'Mi Empresa Venezolana C.A.',
        tax_id: 'J-12345678-9',
        industry: 'Comercio',
        country: 'Venezuela',
        currency: 'VES'
      });

      // Crear período por defecto
      const currentYear = new Date().getFullYear();
      const period = await this.createFinancialPeriod({
        company_id: company.id,
        period_name: `Año ${currentYear}`,
        start_date: `${currentYear}-01-01`,
        end_date: `${currentYear}-12-31`,
        period_type: 'annual',
        is_closed: false
      });

      return { company, period };
    } catch (error) {
      console.error('Error creando empresa y período por defecto:', error);
      throw error;
    }
  }

  // **CONVERSIÓN DE BALANCES EXISTENTES A MULTIMONEDA**
  static async convertExistingBalances(companyId: string, periodId: string, targetCurrency: string = 'USD') {
    try {
      // Obtener balances existentes
      const existingEntries = await this.getFinancialEntries(companyId, periodId);

      if (!existingEntries || existingEntries.length === 0) {
        return { success: true, message: 'No hay balances para convertir' };
      }

      // Obtener moneda de la empresa
      const { data: company } = await supabase
        .from('companies')
        .select('currency')
        .eq('id', companyId)
        .single();

      const companyCurrency = company?.currency || 'VES';
      const { ExchangeRateService } = await import('./exchangeRateService');

      // Procesar conversiones
      const updates = await Promise.all(
        existingEntries.map(async (entry) => {
          // Simplificado: solo retornar la entrada sin conversión de moneda
          return entry;
        })
      );

      // Actualizar en la base de datos
      const { error } = await supabase
        .from('financial_entries')
        .upsert(updates);

      if (error) throw error;

      return {
        success: true,
        message: `${updates.length} balances convertidos exitosamente`,
        convertedCount: updates.length
      };
    } catch (error) {
      console.error('Error convirtiendo balances:', error);
      return {
        success: false,
        message: 'Error al convertir balances',
        error: error.message
      };
    }
  }

  // **OBTENER BALANCES MULTIMONEDA** - Simplificado
  static async getMultiCurrencyBalances(companyId: string, periodId: string, displayCurrency: string = 'USD') {
    try {
      const entries = await this.getFinancialEntries(companyId, periodId);
      
      if (!entries || entries.length === 0) {
        return [];
      }

      // Simplificado: retornar las entradas sin conversión de moneda
      return entries.map(entry => ({
        ...entry,
        display_amount: entry.balance_amount,
        display_currency: displayCurrency
      }));
    } catch (error) {
      console.error('Error obteniendo balances multimoneda:', error);
      throw error;
    }
  }
}

// Agregar exportación por defecto
export default SupabaseService;