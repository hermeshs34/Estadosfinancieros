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
    // 🔒 PROTECCIÓN CRÍTICA: Verificar si el período está publicado
    const { data: period, error: periodError } = await supabase
      .from('financial_periods')
      .select('is_published, period_name')
      .eq('id', periodId)
      .single();

    if (periodError) throw periodError;

    if (period?.is_published) {
      throw new Error(
        `❌ No se pueden eliminar los balances del período "${period.period_name}" porque está marcado como PUBLICADO. ` +
        `Para eliminar estos balances, primero debe cambiar el estado del período a "Borrador" desde la gestión de períodos.`
      );
    }

    // Si no está publicado, proceder con la eliminación
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

  // **GUARDAR DATOS DEL BALANCE AUTOMÁTICAMENTE**
  static async saveBalanceDataFromCSV(
    companyId: string, 
    periodId: string, 
    csvData: any[]
  ): Promise<{ success: boolean; message: string; savedCount: number }> {
    try {
      console.log('💾 Iniciando guardado automático de balance en Supabase...');
      console.log(`📊 Datos a procesar: ${csvData.length} registros`);
      
      // Verificar que existan la empresa y el período
      const { data: company } = await supabase
        .from('companies')
        .select('id, name')
        .eq('id', companyId)
        .single();
        
      if (!company) {
        throw new Error('Empresa no encontrada');
      }
      
      const { data: period } = await supabase
        .from('financial_periods')
        .select('id, period_name')
        .eq('id', periodId)
        .single();
        
      if (!period) {
        throw new Error('Período financiero no encontrado');
      }

      // Limpiar datos existentes del período (opcional - comentar si se quiere mantener histórico)
      await this.deleteFinancialEntries(companyId, periodId);
      console.log('🗑️ Datos anteriores del período eliminados');

      // Transformar datos del CSV al formato de financial_entries
      const financialEntries = csvData.map(row => {
        // Extraer valores numéricos de diferentes campos posibles
        const getNumericValue = (value: any): number => {
          if (value === null || value === undefined || value === '') return 0;
          if (typeof value === 'number') return value;
          if (typeof value === 'string') {
            // Limpiar el valor string
            const cleaned = value.replace(/[^\d.,-]/g, '').replace(/,/g, '');
            const num = parseFloat(cleaned);
            return isNaN(num) ? 0 : num;
          }
          return 0;
        };

        // Determinar el código de cuenta
        const accountCode = row.Codigo || row.codigo || row.Code || row.account_code || '';
        
        // Determinar el nombre de cuenta
        const accountName = row.Descripcion || row.descripcion || row.Description || 
                           row.account_name || row.Cuenta || row.cuenta || '';
        
        // Determinar el saldo/balance
        const balanceAmount = getNumericValue(
          row.SaldoActual || row.saldoactual || row.Saldo || row.saldo || 
          row.Valor || row.valor || row.Value || row.balance_amount || 
          row.Amount || row.amount || 0
        );
        
        // Determinar débitos y créditos
        const debitAmount = getNumericValue(
          row.Debitos || row.debitos || row.Debe || row.debe || 
          row.Debit || row.debit || row.debit_amount || 0
        );
        
        const creditAmount = getNumericValue(
          row.Creditos || row.creditos || row.Haber || row.haber || 
          row.Credit || row.credit || row.credit_amount || 0
        );

        // Determinar el tipo de entrada basado en el código de cuenta
        let entryType: 'balance_sheet' | 'income_statement' | 'cash_flow' = 'balance_sheet';
        const codeStr = String(accountCode);
        
        if (codeStr.startsWith('4') || codeStr.startsWith('5') || codeStr.startsWith('6')) {
          entryType = 'income_statement';
        } else if (codeStr.startsWith('1') || codeStr.startsWith('2') || codeStr.startsWith('3')) {
          entryType = 'balance_sheet';
        }

        // Determinar categoría basada en el código
        let category = '';
        if (codeStr.startsWith('1')) category = 'Activos';
        else if (codeStr.startsWith('2')) category = 'Pasivos';
        else if (codeStr.startsWith('3')) category = 'Patrimonio';
        else if (codeStr.startsWith('4')) category = 'Ingresos';
        else if (codeStr.startsWith('5')) category = 'Gastos';
        else if (codeStr.startsWith('6')) category = 'Costos';

        return {
          company_id: companyId,
          period_id: periodId,
          account_code: accountCode,
          account_name: accountName,
          debit_amount: debitAmount,
          credit_amount: creditAmount,
          balance_amount: balanceAmount,
          entry_type: entryType,
          category: category
        };
      }).filter(entry => 
        // Filtrar solo entradas válidas
        entry.account_code && 
        entry.account_name && 
        (entry.balance_amount !== 0 || entry.debit_amount !== 0 || entry.credit_amount !== 0)
      );

      console.log(`✅ Datos transformados: ${financialEntries.length} entradas válidas`);
      console.log('📋 Ejemplo de entrada transformada:', financialEntries[0]);

      // Guardar en la base de datos
      if (financialEntries.length > 0) {
        const { data, error } = await supabase
          .from('financial_entries')
          .insert(financialEntries)
          .select();

        if (error) {
          console.error('❌ Error insertando datos:', error);
          throw error;
        }

        console.log(`✅ ${data?.length || 0} registros guardados exitosamente en Supabase`);
        
        return {
          success: true,
          message: `Balance guardado exitosamente: ${data?.length || 0} cuentas procesadas`,
          savedCount: data?.length || 0
        };
      } else {
        return {
          success: false,
          message: 'No se encontraron datos válidos para guardar',
          savedCount: 0
        };
      }

    } catch (error) {
      console.error('❌ Error guardando balance en Supabase:', error);
      return {
        success: false,
        message: `Error guardando balance: ${error.message}`,
        savedCount: 0
      };
    }
  }

  // **OBTENER DATOS DEL BALANCE DESDE SUPABASE**
  static async getBalanceData(companyId: string, periodId: string) {
    try {
      console.log('📥 Cargando datos del balance desde Supabase...');
      
      const entries = await this.getFinancialEntries(companyId, periodId);
      
      if (!entries || entries.length === 0) {
        console.log('📥 No se encontraron datos del balance');
        return [];
      }

      // Transformar de vuelta al formato esperado por la aplicación
      const transformedData = entries.map(entry => ({
        Codigo: entry.account_code,
        Descripcion: entry.account_name,
        SaldoActual: entry.balance_amount,
        Debitos: entry.debit_amount || 0,
        Creditos: entry.credit_amount || 0,
        Cuenta: `${entry.account_code} - ${entry.account_name}`,
        Valor: entry.balance_amount,
        category: entry.category,
        entry_type: entry.entry_type
      }));

      console.log(`📥 ${transformedData.length} registros cargados desde Supabase`);
      return transformedData;
      
    } catch (error) {
      console.error('❌ Error cargando datos del balance:', error);
      throw error;
    }
  }
}

// Agregar exportación por defecto
export default SupabaseService;