import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { createFinancialAnalysis, FinancialInsights } from '../lib/financialAnalysis';
import SupabaseService, { Company, FinancialPeriod } from '../lib/supabaseService';
import { CompanyWithRole } from '../types';
import UserService from '../lib/userService';
import { useAuth } from '../components/auth/AuthProvider';

interface ImportedDataItem {
  [key: string]: any;
  month?: number;
  year?: number;
  date?: string;
}

interface ImportHistory {
  id: string;
  fileName: string;
  fileType: string;
  importDate: Date;
  timestamp: number;
  recordCount: number;
  status: 'success' | 'error';
  errorMessage?: string;
  companyId?: string;
  periodId?: string;
  isDefinitive?: boolean;
}

interface DataContextType {
  importedData: ImportedDataItem[];
  setImportedData: (data: ImportedDataItem[]) => void;
  importHistory: ImportHistory[];
  addImportRecord: (record: Omit<ImportHistory, 'id' | 'importDate' | 'timestamp' | 'companyId' | 'periodId'>) => void;
  deleteImportRecord: (recordId: string) => void;
  selectedMonth: number | null;
  selectedYear: number | null;
  availableMonths: number[];
  availableYears: number[];
  filterDate: string | null;
  setDateFilter: (month: number | null, year: number | null) => void;
  filteredData: ImportedDataItem[];
  financialMetrics: any[];
  balanceSheetData: any;
  incomeStatementData: any;
  cashFlowData: any[];
  financialAnalysis: FinancialInsights | null;
  processFinancialData: () => void;
  processFinancialDataWithData: (data: ImportedDataItem[]) => void;
  clearAllData: () => void;
  clearBalanceData: () => void;
  deleteBalances: () => Promise<void>;
  restoreExampleData: () => void;
  // Arquitectura multicompañía
  userCompanies: CompanyWithRole[];
  selectedCompany: CompanyWithRole | null;
  selectedPeriod: FinancialPeriod | null;
  financialPeriods: FinancialPeriod[];
  loadUserCompanies: () => Promise<void>;
  createCompany: (companyData: Omit<Company, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<Company>;
  setSelectedCompany: (company: CompanyWithRole | null) => void;
  switchCompany: (company: CompanyWithRole) => Promise<void>;
  // Compatibilidad con código existente
  companies: Company[];
  loadCompanies: () => Promise<void>;
  loadFinancialPeriods: (companyId: string) => Promise<void>;
  createFinancialPeriod: (periodData: Omit<FinancialPeriod, 'id' | 'created_at' | 'updated_at'>) => Promise<FinancialPeriod>;
  updateFinancialPeriod: (periodId: string, periodData: Partial<FinancialPeriod>) => Promise<void>;
  deleteFinancialPeriod: (periodId: string) => Promise<void>;
  setSelectedPeriod: (period: FinancialPeriod | null) => void;
  togglePeriodPublishedStatus: (periodId: string, isPublished: boolean) => Promise<void>;
  saveDataToSupabase: () => Promise<void>;
  loadDataFromSupabase: (companyId?: string, periodId?: string) => Promise<void>;
  saveDataToStorage: () => void;
  loadDataFromStorage: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useDataContext = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useDataContext must be used within a DataProvider');
  }
  return context;
};

interface DataProviderProps {
  children: ReactNode;
}

const STORAGE_KEYS = {
  IMPORTED_DATA: 'financial_app_imported_data',
  IMPORT_HISTORY: 'financial_app_import_history',
  FINANCIAL_METRICS: 'financial_app_financial_metrics',
  BALANCE_SHEET: 'financial_app_balance_sheet',
  INCOME_STATEMENT: 'financial_app_income_statement',
  CASH_FLOW: 'financial_app_cash_flow',
  FINANCIAL_ANALYSIS: 'financial_app_financial_analysis',
  SELECTED_COMPANY: 'financial_app_selected_company',
  SELECTED_PERIOD: 'financial_app_selected_period'
};

export const DataProvider: React.FC<DataProviderProps> = ({ children }) => {
  const { user, loading } = useAuth();
  
  const [preventAutoReload, setPreventAutoReload] = useState(false);
  
  const [importedData, setImportedDataState] = useState<ImportedDataItem[]>([]);
  const [importHistory, setImportHistory] = useState<ImportHistory[]>([]);
  const [financialMetrics, setFinancialMetrics] = useState<any[]>([]);
  const [balanceSheetData, setBalanceSheetData] = useState<any>(null);
  const [incomeStatementData, setIncomeStatementData] = useState<any>(null);
  const [cashFlowData, setCashFlowData] = useState<any[]>([]);
  const [financialAnalysis, setFinancialAnalysis] = useState<FinancialInsights | null>(null);
  
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [filterDate, setFilterDate] = useState<string | null>(null);
  
  // Log cuando filterDate cambie
  useEffect(() => {
    console.log('🎯 DataContext - filterDate actualizado a:', filterDate);
  }, [filterDate]);
  const [availableMonths, setAvailableMonths] = useState<number[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [filteredData, setFilteredData] = useState<ImportedDataItem[]>([]);

  // Estados para arquitectura multicompañía
  const [userCompanies, setUserCompanies] = useState<CompanyWithRole[]>([]);
  const [selectedCompany, setSelectedCompanyState] = useState<CompanyWithRole | null>(null);
  const [selectedPeriod, setSelectedPeriodState] = useState<FinancialPeriod | null>(null);
  const [financialPeriods, setFinancialPeriods] = useState<FinancialPeriod[]>([]);
  
  // Estados para compatibilidad con código existente
  const [companies, setCompanies] = useState<Company[]>([]);

  const updateAvailableDates = useCallback((data: ImportedDataItem[]) => {
    const years = new Set<number>();
    const months = new Set<number>();
    
    // Agregar años y meses de los datos existentes
    data.forEach(item => {
      if (item.year) years.add(item.year);
      if (item.month) months.add(item.month);
    });
    
    // Asegurar que siempre estén disponibles 2024, 2025 y 2026
    const currentYear = new Date().getFullYear();
    years.add(currentYear - 1); // Año anterior
    years.add(currentYear);     // Año actual
    years.add(currentYear + 1); // Año siguiente
    years.add(2025);            // Asegurar 2025 específicamente
    
    // Asegurar que todos los meses estén disponibles (1-12)
    for (let month = 1; month <= 12; month++) {
      months.add(month);
    }
    
    console.log('📅 Años disponibles:', Array.from(years).sort((a, b) => b - a));
    console.log('📅 Meses disponibles:', Array.from(months).sort((a, b) => a - b));
    
    setAvailableYears(Array.from(years).sort((a, b) => b - a));
    setAvailableMonths(Array.from(months).sort((a, b) => a - b));
  }, []);

  const setImportedData = useCallback((data: ImportedDataItem[]) => {
    setImportedDataState(data);
    updateAvailableDates(data);
  }, [updateAvailableDates]);
  
  // Función para extraer datos del estado de resultados desde el CSV
  const extractIncomeStatementData = useCallback((data: ImportedDataItem[]) => {
    const incomeStatement = {
      revenue: 0,
      costOfGoodsSold: 0,
      grossProfit: 0,
      operatingExpenses: 0,
      operatingIncome: 0,
      interestExpense: 0,
      totalExpenses: 0,
      netIncome: 0
    };

    console.log('🔍 Procesando', data.length, 'elementos para Estado de Resultados');
    let revenueItems = [];
    let costItems = [];
    let expenseItems = [];
    let interestItems = [];
    
    data.forEach((item) => {
      const description = (item.Descripcion || item.descripcion || item.Description || item.Cuenta || item.cuenta || item['Descripción'] || '').toLowerCase();
      const codigo = item.Codigo || item.codigo || item.Code || item['Código'] || '';
      
      let value = 0;
      // Función helper para convertir valores a número
      const parseValue = (val: any): number => {
        if (val === null || val === undefined || val === '') return 0;
        if (typeof val === 'number') return val;
        if (typeof val === 'string') {
          return parseFloat(val.replace(/[^\d.,-]/g, '').replace(',', '.')) || 0;
        }
        return 0;
      };
      
      // Buscar múltiples formatos de columnas de saldo
      if (item.SaldoActual !== undefined) value = parseValue(item.SaldoActual);
      else if (item.saldoactual !== undefined) value = parseValue(item.saldoactual);
      else if (item.Saldo !== undefined) value = parseValue(item.Saldo);
      else if (item.Valor !== undefined) value = parseValue(item.Valor);
      else if (item.Value !== undefined) value = parseValue(item.Value);
      else if (item['Saldo Actual'] !== undefined) value = parseValue(item['Saldo Actual']);
      
      if (value !== 0) {
        const codigoStr = codigo.toString();
        
        // INGRESOS (Códigos 4xxx)
        if (codigoStr.startsWith('4') || description.includes('venta') || description.includes('ingreso')) {
          incomeStatement.revenue += value;
          revenueItems.push({ codigo: codigoStr, description, value });
        }
        // COSTO DE VENTAS (Códigos 501-xxx)
        else if (codigoStr.startsWith('501') || description.includes('costo') && description.includes('venta')) {
          incomeStatement.costOfGoodsSold += value;
          costItems.push({ codigo: codigoStr, description, value });
        }
        // GASTOS FINANCIEROS (Códigos 53xx o descripciones específicas)
        else if (codigoStr.startsWith('53') || description.includes('financiero') || description.includes('interes') || description.includes('interés')) {
          incomeStatement.interestExpense += value;
          interestItems.push({ codigo: codigoStr, description, value });
        }
        // GASTOS OPERATIVOS (Códigos 5xxx)
        else if (codigoStr.startsWith('5') || description.includes('gasto') || description.includes('operativo')) {
          incomeStatement.operatingExpenses += value;
          expenseItems.push({ codigo: codigoStr, description, value });
        }
      }
    });
    
    console.log('💰 INGRESOS encontrados:', revenueItems.length, 'items');
    revenueItems.forEach(item => console.log('  -', item.codigo, item.description, item.value));
    
    console.log('💸 COSTOS encontrados:', costItems.length, 'items');
    costItems.forEach(item => console.log('  -', item.codigo, item.description, item.value));
    
    console.log('💳 GASTOS OPERATIVOS encontrados:', expenseItems.length, 'items');
    expenseItems.forEach(item => console.log('  -', item.codigo, item.description, item.value));
    
    console.log('🏦 GASTOS FINANCIEROS encontrados:', interestItems.length, 'items');
    interestItems.forEach(item => console.log('  -', item.codigo, item.description, item.value));
    
    // Calcular derivados
    incomeStatement.grossProfit = incomeStatement.revenue - incomeStatement.costOfGoodsSold;
    incomeStatement.operatingIncome = incomeStatement.grossProfit - incomeStatement.operatingExpenses;
    incomeStatement.totalExpenses = incomeStatement.costOfGoodsSold + incomeStatement.operatingExpenses + incomeStatement.interestExpense;
    incomeStatement.netIncome = incomeStatement.revenue - incomeStatement.totalExpenses;
    

    console.log('💰 Operating Income:', incomeStatement.operatingIncome);
    console.log('💰 Interest Expense:', incomeStatement.interestExpense);
    console.log('💰 Net Income:', incomeStatement.netIncome);
    
    return incomeStatement;
  }, []);

  const extractCashFlowData = useCallback((data: ImportedDataItem[]) => {
    const cashFlow = {
      operating: [],
      investing: [],
      financing: []
    };

    data.forEach((item) => {
      const description = (item.Descripcion || item.descripcion || item.Description || item.Cuenta || item.cuenta || item['Descripción'] || '').toLowerCase();
      const codigo = item.Codigo || item.codigo || item.Code || item['Código'] || '';
      
      let value = 0;
      // Función helper para convertir valores a número
      const parseValue = (val: any): number => {
        if (val === null || val === undefined || val === '') return 0;
        if (typeof val === 'number') return val;
        if (typeof val === 'string') {
          return parseFloat(val.replace(/[^\d.,-]/g, '').replace(',', '.')) || 0;
        }
        return 0;
      };
      
      // Buscar múltiples formatos de columnas de saldo
      if (item.SaldoActual !== undefined) value = parseValue(item.SaldoActual);
      else if (item.saldoactual !== undefined) value = parseValue(item.saldoactual);
      else if (item.Saldo !== undefined) value = parseValue(item.Saldo);
      else if (item.Valor !== undefined) value = parseValue(item.Valor);
      else if (item.Value !== undefined) value = parseValue(item.Value);
      else if (item['Saldo Actual'] !== undefined) value = parseValue(item['Saldo Actual']);
      
      if (value !== 0) {
        const codigoStr = codigo.toString();
        const originalDescription = item.Descripcion || item.descripcion || item.Description || item.Cuenta || item.cuenta || item['Descripción'] || '';
        
        // ACTIVIDADES OPERATIVAS
        if (
          // Ingresos por ventas
          codigoStr.startsWith('4') || description.includes('venta') || description.includes('ingreso') ||
          // Gastos operativos
          codigoStr.startsWith('5') || description.includes('gasto') || description.includes('operativo') ||
          // Cuentas por cobrar/pagar
          description.includes('cuenta') && (description.includes('cobrar') || description.includes('pagar')) ||
          description.includes('proveedor') || description.includes('cliente') ||
          // Inventarios
          description.includes('inventario') || description.includes('mercancia')
        ) {
          cashFlow.operating.push({
             account: originalDescription,
             code: codigo,
             value: value
           });
        }
        // ACTIVIDADES DE INVERSIÓN
        else if (
          // Activos fijos
          codigoStr.startsWith('202') || codigoStr.startsWith('12') ||
          description.includes('propiedad') || description.includes('planta') || description.includes('equipo') ||
          description.includes('inmueble') || description.includes('maquinaria') || description.includes('vehiculo') ||
          description.includes('inversion') || description.includes('inversión')
        ) {
          cashFlow.investing.push({
             account: originalDescription,
             code: codigo,
             value: value
           });
        }
        // ACTIVIDADES DE FINANCIAMIENTO
        else if (
          // Deudas y préstamos
          description.includes('prestamo') || description.includes('préstamo') || description.includes('credito') || description.includes('crédito') ||
          description.includes('deuda') || description.includes('hipoteca') ||
          // Capital y patrimonio
          description.includes('capital') || description.includes('patrimonio') || description.includes('reserva') ||
          description.includes('utilidad') && (description.includes('retenida') || description.includes('acumulada')) ||
          // Códigos específicos de financiamiento
          codigoStr.startsWith('302') || codigoStr.startsWith('22') || codigoStr.startsWith('401') || codigoStr.startsWith('3')
        ) {
          cashFlow.financing.push({
             account: originalDescription,
             code: codigo,
             value: value
           });
        }
      }
    });
    

    
    // Debug: Mostrar totales calculados
    const operatingTotal = cashFlow.operating.reduce((sum, item) => sum + item.value, 0);
    const investingTotal = cashFlow.investing.reduce((sum, item) => sum + item.value, 0);
    const financingTotal = cashFlow.financing.reduce((sum, item) => sum + item.value, 0);
    
    console.log('💰 Totales de Flujo de Caja:', {
      operativo: operatingTotal,
      inversion: investingTotal,
      financiamiento: financingTotal,
      total: operatingTotal + investingTotal + financingTotal
    });
    
    return cashFlow;
  }, []);

  // Función para extraer datos del balance sheet desde el CSV
  const extractBalanceSheetData = useCallback((data: ImportedDataItem[]) => {
    console.log('🔍 Iniciando extracción de datos del balance sheet con', data.length, 'registros');
    
    const balanceSheet = {
      currentAssets: 0,
      nonCurrentAssets: 0,
      totalAssets: 0,
      currentLiabilities: 0,
      longTermDebt: 0,
      totalLiabilities: 0,
      totalEquity: 0,
      accountsReceivable: 0,
      inventory: 0,
      fixedAssets: 0,
      intangibleAssets: 0,
      totalCurrentAssets: 0,
      totalNonCurrentAssets: 0,
      accountsPayable: 0,
      shortTermDebt: 0,
      totalCurrentLiabilities: 0,
      totalNonCurrentLiabilities: 0,
      equity: 0,
      retainedEarnings: 0,
      // Campos adicionales para compatibilidad con financialAnalysis
      activosCorrientes: 0,
      pasivosCorrientes: 0,
      inventarios: 0,
      efectivo: 0,
      activosTotal: 0,
      patrimonio: 0
    };

    data.forEach((item) => {
      const description = (item.Descripcion || item.descripcion || item.Description || item.Cuenta || item.cuenta || item['Descripción'] || '').toLowerCase();
      const codigo = item.Codigo || item.codigo || item.Code || item['Código'] || '';
      
      let value = 0;
      // Función helper para convertir valores a número
      const parseValue = (val: any): number => {
        if (val === null || val === undefined || val === '') return 0;
        if (typeof val === 'number') return val;
        if (typeof val === 'string') {
          return parseFloat(val.replace(/[^\d.,-]/g, '').replace(',', '.')) || 0;
        }
        return 0;
      };
      
      // Buscar múltiples formatos de columnas de saldo
      if (item.SaldoActual !== undefined) value = parseValue(item.SaldoActual);
      else if (item.saldoactual !== undefined) value = parseValue(item.saldoactual);
      else if (item.Saldo !== undefined) value = parseValue(item.Saldo);
      else if (item.Valor !== undefined) value = parseValue(item.Valor);
      else if (item.Value !== undefined) value = parseValue(item.Value);
      else if (item['Saldo Actual'] !== undefined) value = parseValue(item['Saldo Actual']);
      else if (item.SaldoDeudor !== undefined) value = parseValue(item.SaldoDeudor);
      else if (item.SaldoAcreedor !== undefined) value = -parseValue(item.SaldoAcreedor);
      else if (item.Debe !== undefined && item.Haber !== undefined) {
        value = parseValue(item.Debe) - parseValue(item.Haber);
      }
      
      if (value !== 0) {
        const codigoStr = codigo.toString();
        console.log('📋 Procesando cuenta:', { codigo: codigoStr, descripcion: description, valor: value });
        
        // EFECTIVO Y BANCOS - Empresas de seguros
        if (
          // Excluir cuentas de patrimonio que no son efectivo
          !codigoStr.startsWith('317-') &&
          (
            // Disponible (Seguros) - NUEVA CUENTA IDENTIFICADA
            codigoStr.startsWith('201-01') || codigoStr.startsWith('2.201.01') ||
            // Efectivos depositados en bancos - NUEVA CUENTA IDENTIFICADA  
            codigoStr.startsWith('202-01') ||
            // Bancos e inversiones en el extranjero
            codigoStr.startsWith('203-06') ||
            // Disponible y caja chica
            codigoStr.startsWith('203-11') ||
            // Cuentas tradicionales
            codigoStr.startsWith('1101') || codigoStr.startsWith('1.101') ||
            // Por descripción (solo para cuentas que no sean de patrimonio)
            (description.includes('caja') || description.includes('banco') || description.includes('efectivo') ||
            description.includes('disponible') || description.includes('DEPOSITOS A LA VISTA') ||
            description.includes('DISPONIBLE') || description.includes('CAJA CHICA') ||
            description.includes('INVERSIONES EN EL EXTRANJERO') || description.includes('BANCOS') ||
            description.includes('DEPÓSITOS A PLAZO FIJO') || description.includes('MONEDA NACIONAL') ||
            description.includes('MONEDA EXTRANJERA'))
          )
        ) {
          console.log('💰 Clasificando como Efectivo y Bancos:', codigoStr, description, 'Valor:', value);
          balanceSheet.efectivo += value;
          balanceSheet.cash += value;
          balanceSheet.currentAssets += value;
          balanceSheet.totalCurrentAssets += value;
          balanceSheet.activosCorrientes += value;
        }
        // CUENTAS POR COBRAR - Empresas de seguros
        else if (
          codigoStr.startsWith('201-02') || codigoStr.startsWith('1102') || codigoStr.startsWith('1.102') ||
          codigoStr.startsWith('205-') || // Cuentas deudoras por reaseguros
          description.includes('cuenta') && description.includes('cobrar') ||
          description.includes('cliente') || description.includes('deudor') ||
          description.includes('REASEGUROS') || description.includes('INTERMEDIARIOS') ||
          description.includes('RETROCESIONARIOS')
        ) {
          console.log('📄 Clasificando como Cuentas por Cobrar:', codigoStr, description);
          balanceSheet.accountsReceivable += value;
          balanceSheet.currentAssets += value;
          balanceSheet.totalCurrentAssets += value;
          balanceSheet.activosCorrientes += value;
        }
        // INVENTARIOS
        else if (
          codigoStr.startsWith('201-03') || codigoStr.startsWith('1103') || codigoStr.startsWith('1.103') ||
          description.includes('inventario') || description.includes('mercancia') || description.includes('existencia')
        ) {
          console.log('📦 Clasificando como Inventario:', codigoStr, description);
          balanceSheet.inventory += value;
          balanceSheet.inventarios += value;
          balanceSheet.currentAssets += value;
          balanceSheet.totalCurrentAssets += value;
          balanceSheet.activosCorrientes += value;
        }
        // OTROS ACTIVOS CORRIENTES
        else if (
          // Formato venezolano - EXCLUIR códigos ya clasificados
          (codigoStr.startsWith('201') && !codigoStr.startsWith('201-01') && !codigoStr.startsWith('201-02') && !codigoStr.startsWith('201-03')) ||
          // Formato internacional - EXCLUIR códigos ya clasificados  
          (codigoStr.startsWith('11') && !codigoStr.startsWith('1101') && !codigoStr.startsWith('1102') && !codigoStr.startsWith('1103')) ||
          (codigoStr.startsWith('1.1') && !codigoStr.startsWith('1.101') && !codigoStr.startsWith('1.102') && !codigoStr.startsWith('1.103')) ||
          // Por descripción
          description.includes('cuenta corriente')
        ) {
          console.log('💼 Clasificando como Otros Activos Corrientes:', codigoStr, description, 'Valor:', value);
          balanceSheet.currentAssets += value;
          balanceSheet.totalCurrentAssets += value;
          balanceSheet.activosCorrientes += value;
        }
        // ACTIVOS NO CORRIENTES
        else if (
          codigoStr.startsWith('202') || codigoStr.startsWith('12') || codigoStr.startsWith('1.2') ||
          description.includes('propiedad') || description.includes('planta') || description.includes('equipo') ||
          description.includes('inmueble') || description.includes('maquinaria') || description.includes('vehiculo') ||
          description.includes('mobiliario') || description.includes('edificio')
        ) {
          console.log('🏢 Clasificando como Activo No Corriente:', codigoStr);
          balanceSheet.fixedAssets += value;
          balanceSheet.nonCurrentAssets += value;
          balanceSheet.totalNonCurrentAssets += value;
        }
        // Activos intangibles
        else if (
          codigoStr.startsWith('203') || codigoStr.startsWith('13') || codigoStr.startsWith('1.3') ||
          description.includes('intangible') || description.includes('patente') || description.includes('marca') ||
          description.includes('software') || description.includes('licencia')
        ) {
          console.log('💡 Clasificando como Activo Intangible:', codigoStr);
          balanceSheet.intangibleAssets += value;
          balanceSheet.nonCurrentAssets += value;
          balanceSheet.totalNonCurrentAssets += value;
        }
        // PASIVOS CORRIENTES
        else if (
          codigoStr.startsWith('301') || codigoStr.startsWith('302-') || codigoStr.startsWith('21') || codigoStr.startsWith('2.1') ||
          description.includes('cuenta') && description.includes('pagar') ||
          description.includes('proveedor') || description.includes('acreedor') ||
          description.includes('nomina') || description.includes('nómina') || description.includes('salario') ||
          description.includes('GASTOS DE ADQUISICION') || description.includes('COMISIONES') ||
          description.includes('IMPUESTOS') || description.includes('PARTICIPACION DE CEDENTES')
        ) {
          console.log('💳 Clasificando como Pasivo Corriente:', codigoStr, description, 'Valor:', value);
          
          // Cuentas por pagar
          if (
            codigoStr.startsWith('301-01') || codigoStr.startsWith('2101') ||
            description.includes('proveedor') || (description.includes('cuenta') && description.includes('pagar'))
          ) {
            balanceSheet.accountsPayable += Math.abs(value);
          }
          
          balanceSheet.currentLiabilities += Math.abs(value);
          balanceSheet.totalCurrentLiabilities += Math.abs(value);
          balanceSheet.pasivosCorrientes += Math.abs(value);
        }
        // Deuda a corto plazo
        else if (
          codigoStr.startsWith('301-02') || codigoStr.startsWith('2102') ||
          description.includes('prestamo') && description.includes('corto') ||
          description.includes('credito') && description.includes('corto')
        ) {
          console.log('💰 Clasificando como Deuda Corto Plazo:', codigoStr);
          balanceSheet.shortTermDebt += Math.abs(value);
          balanceSheet.currentLiabilities += Math.abs(value);
          balanceSheet.totalCurrentLiabilities += Math.abs(value);
          balanceSheet.pasivosCorrientes += Math.abs(value);
        }
        // PASIVOS NO CORRIENTES - Solo para deudas a largo plazo reales
        else if (
          codigoStr.startsWith('22') || codigoStr.startsWith('2.2') ||
          codigoStr.startsWith('304-') || // Reservas Técnicas (seguros)
          codigoStr.startsWith('402-') || // Códigos específicos para seguros
          description.includes('prestamo') && description.includes('largo') ||
          description.includes('credito') && description.includes('largo') ||
          description.includes('hipoteca') || description.includes('deuda') && description.includes('largo') ||
          description.includes('RESERVAS TECNICAS') || description.includes('PROVISIONES') ||
          description.includes('OBLIGACIONES LABORALES')
        ) {
          console.log('🏦 Clasificando como Pasivo No Corriente:', codigoStr, description, 'Valor:', value);
          balanceSheet.longTermDebt += Math.abs(value);
          balanceSheet.totalNonCurrentLiabilities += Math.abs(value);
        }
        // PATRIMONIO - EXCLUIR cuentas 304- que ya se clasificaron como Pasivos No Corrientes
        else if (
          (codigoStr.startsWith('401') || (codigoStr.startsWith('3') && !codigoStr.startsWith('304-'))) ||
          description.includes('capital') || description.includes('patrimonio') ||
          description.includes('reserva') || description.includes('utilidad') ||
          description.includes('superavit') || description.includes('superávit')
        ) {
          console.log('🏛️ Clasificando como Patrimonio:', codigoStr);
          
          // Utilidades retenidas
          if (
            description.includes('utilidad') && (description.includes('retenida') || description.includes('acumulada')) ||
            description.includes('resultado') && description.includes('ejercicio')
          ) {
            balanceSheet.retainedEarnings += value;
          } else {
            balanceSheet.equity += value;
          }
          
          balanceSheet.totalEquity += value;
          balanceSheet.patrimonio += value;
        }
      }
    });
    
    // Calcular totales
    balanceSheet.totalAssets = balanceSheet.currentAssets + balanceSheet.nonCurrentAssets;
    balanceSheet.totalLiabilities = balanceSheet.currentLiabilities + balanceSheet.longTermDebt + balanceSheet.totalNonCurrentLiabilities;
    balanceSheet.activosTotal = balanceSheet.totalAssets;
    
    console.log('📊 Balance Sheet calculado:', {
      'Activos Corrientes': balanceSheet.currentAssets,
      'Activos No Corrientes': balanceSheet.nonCurrentAssets,
      'Total Activos': balanceSheet.totalAssets,
      'Pasivos Corrientes': balanceSheet.currentLiabilities,
      'Pasivos No Corrientes': balanceSheet.longTermDebt + balanceSheet.totalNonCurrentLiabilities,
      'Total Pasivos': balanceSheet.totalLiabilities,
      'Patrimonio': balanceSheet.totalEquity,
      'Efectivo': balanceSheet.efectivo,
      'Inventarios': balanceSheet.inventory
    });
    
    return balanceSheet;
  }, []);

  const processFinancialDataWithData = useCallback((data: ImportedDataItem[]) => {
    console.log('🔄 Procesando datos financieros con', data.length, 'registros');
    
    try {
      const balanceSheet = extractBalanceSheetData(data);
      const incomeStatement = extractIncomeStatementData(data);
      const cashFlow = extractCashFlowData(data);
      
      setBalanceSheetData(balanceSheet);
      setIncomeStatementData(incomeStatement);
      setCashFlowData(cashFlow);
      
      // Crear análisis financiero
      const analysis = createFinancialAnalysis(data, balanceSheet, incomeStatement);
      
      setFinancialAnalysis(analysis);
      
      // Generar métricas financieras para el dashboard
      const metrics = [];
      
      if (balanceSheet) {
        if (balanceSheet.totalAssets > 0) {
          metrics.push({
            name: 'Activos Totales',
            value: balanceSheet.totalAssets,
            type: 'currency',
            icon: 'BarChart3',
            color: 'blue'
          });
        }
        
        if (balanceSheet.totalLiabilities > 0) {
          metrics.push({
            name: 'Pasivos Totales',
            value: balanceSheet.totalLiabilities,
            type: 'currency',
            icon: 'TrendingUp',
            color: 'orange'
          });
        }
        
        if (balanceSheet.totalEquity !== undefined && balanceSheet.totalEquity !== null) {
          metrics.push({
            name: 'Patrimonio Total',
            value: balanceSheet.totalEquity,
            type: 'currency',
            icon: 'DollarSign',
            color: 'purple'
          });
        }
      }
      
      if (incomeStatement) {
        if (incomeStatement.revenue > 0) {
          metrics.push({
            name: 'Ingresos Totales',
            value: incomeStatement.revenue,
            type: 'currency',
            icon: 'TrendingUp',
            color: 'green'
          });
        }
        
        if (incomeStatement.netIncome !== 0) {
          metrics.push({
            name: 'Utilidad Neta',
            value: incomeStatement.netIncome,
            type: 'currency',
            icon: incomeStatement.netIncome >= 0 ? 'TrendingUp' : 'TrendingDown',
            color: incomeStatement.netIncome >= 0 ? 'green' : 'red'
          });
        }
      }
      
      // Si no hay métricas específicas, mostrar métricas básicas
      if (metrics.length === 0) {
        metrics.push(
          {
            name: 'Registros Importados',
            value: data.length,
            type: 'number',
            icon: 'FileText',
            color: 'blue'
          },
          {
            name: 'Campos de Datos',
            value: data.length > 0 ? Object.keys(data[0]).length : 0,
            type: 'number',
            icon: 'TrendingUp',
            color: 'green'
          }
        );
      }
      
      setFinancialMetrics(metrics);
      
      // Los datos se guardarán automáticamente por el useEffect
      
      console.log('✅ Procesamiento de datos financieros completado');
      console.log('📊 Métricas generadas:', metrics);
    } catch (error) {
      console.error('❌ Error procesando datos financieros:', error);
    }
  }, [extractBalanceSheetData, extractIncomeStatementData, extractCashFlowData]);

  const processFinancialData = useCallback(() => {
    if (importedData.length > 0) {
      processFinancialDataWithData(importedData);
    }
  }, [importedData, processFinancialDataWithData]);

  const addDateFieldsToData = useCallback((data: ImportedDataItem[]): ImportedDataItem[] => {
    return data.map(item => {
      // Si ya tiene campos de fecha, mantenerlos
      if (item.month && item.year) {
        return item;
      }
      
      // Intentar extraer fecha de diferentes campos
      let dateStr = item.Fecha || item.fecha || item.Date || item.date || '';
      
      // Si no hay campo de fecha explícito, usar fecha actual
      if (!dateStr) {
        const now = new Date();
        return {
          ...item,
          month: now.getMonth() + 1,
          year: now.getFullYear(),
          date: now.toISOString().split('T')[0]
        };
      }
      
      // Parsear la fecha
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        // Si no se puede parsear, usar fecha actual
        const now = new Date();
        return {
          ...item,
          month: now.getMonth() + 1,
          year: now.getFullYear(),
          date: now.toISOString().split('T')[0]
        };
      }
      
      return {
        ...item,
        month: date.getMonth() + 1,
        year: date.getFullYear(),
        date: date.toISOString().split('T')[0]
      };
    });
  }, []);

  const setImportedDataWithProcessing = useCallback((data: ImportedDataItem[]) => {
    console.log('📥 setImportedData llamado con', data.length, 'registros');
    
    // Agregar campos de fecha si no existen
    const dataWithDates = addDateFieldsToData(data);
    
    // Actualizar el estado
    setImportedDataState(dataWithDates);
    updateAvailableDates(dataWithDates);
    
    // Procesar datos financieros automáticamente
    processFinancialDataWithData(dataWithDates);
    
    // Los datos se guardarán automáticamente por el useEffect
    
    console.log('✅ setImportedData completado');
  }, [addDateFieldsToData, updateAvailableDates, processFinancialDataWithData]);



  const setDateFilter = useCallback((month: number | null, year: number | null) => {
    console.log('🎯 setDateFilter llamado con:', { month, year });
    
    setSelectedMonth(month);
    setSelectedYear(year);
    
    // Crear string de filtro
    let newFilterDate = null;
    if (month && year) {
      newFilterDate = `${year}-${month.toString().padStart(2, '0')}`;
    } else if (year) {
      newFilterDate = year.toString();
    }
    
    console.log('🎯 Nuevo filterDate:', newFilterDate);
    setFilterDate(newFilterDate);
  }, []);

  // Efecto para filtrar datos cuando cambian los filtros
  useEffect(() => {
    console.log('🔍 Filtrando datos. filterDate:', filterDate, 'importedData.length:', importedData.length);
    
    if (!filterDate) {
      console.log('🔍 Sin filtro, mostrando todos los datos');
      setFilteredData(importedData);
      return;
    }
    
    const filtered = importedData.filter(item => {
      // Si filterDate es solo año (4 dígitos)
      if (filterDate.length === 4) {
        const year = parseInt(filterDate);
        return item.year === year;
      }
      
      // Si filterDate es año-mes (formato YYYY-MM)
      if (filterDate.includes('-')) {
        const [year, month] = filterDate.split('-').map(Number);
        return item.year === year && item.month === month;
      }
      
      return true;
    });
    
    console.log('🔍 Datos filtrados:', filtered.length, 'de', importedData.length);
    setFilteredData(filtered);
  }, [filterDate, importedData]);

  const addImportRecord = useCallback((record: Omit<ImportHistory, 'id' | 'importDate' | 'timestamp' | 'companyId' | 'periodId'>) => {
    const newRecord: ImportHistory = {
      ...record,
      id: Date.now().toString(),
      importDate: new Date(),
      timestamp: Date.now(),
      companyId: selectedCompany?.id || undefined,
      periodId: selectedPeriod?.id || undefined
    };
    
    setImportHistory(prev => [newRecord, ...prev]);
  }, [selectedCompany, selectedPeriod]);

  const deleteImportRecord = useCallback((recordId: string) => {
    setImportHistory(prev => prev.filter(record => record.id !== recordId));
  }, []);

  const clearAllData = useCallback(() => {
    setImportedDataState([]);
    setImportHistory([]);
    setFinancialMetrics([]);
    setBalanceSheetData(null);
    setIncomeStatementData(null);
    setCashFlowData([]);
    setFinancialAnalysis(null);
    setFilteredData([]);
    setSelectedMonth(null);
    setSelectedYear(null);
    setFilterDate(null);
    
    // Limpiar localStorage
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    
    console.log('🗑️ Todos los datos han sido eliminados');
  }, []);

  const clearBalanceData = useCallback(() => {
    setImportedDataState([]);
    setBalanceSheetData(null);
    setIncomeStatementData(null);
    setCashFlowData([]);
    setFinancialAnalysis(null);
    setFilteredData([]);
    
    // Limpiar solo los datos del balance en localStorage
    localStorage.removeItem(STORAGE_KEYS.IMPORTED_DATA);
    localStorage.removeItem(STORAGE_KEYS.BALANCE_SHEET);
    localStorage.removeItem(STORAGE_KEYS.INCOME_STATEMENT);
    localStorage.removeItem(STORAGE_KEYS.CASH_FLOW);
    localStorage.removeItem(STORAGE_KEYS.FINANCIAL_ANALYSIS);
    
    console.log('🗑️ Datos del balance eliminados');
  }, []);

  const deleteBalances = useCallback(async () => {
    try {
      if (!selectedCompany || !selectedPeriod) {
        console.log('⚠️ No hay empresa o período seleccionado para eliminar');
        return;
      }
      
      await SupabaseService.deleteBalanceData(selectedCompany.id, selectedPeriod.id);
      
      // Limpiar datos locales
      clearBalanceData();
      
      console.log('✅ Balances eliminados de Supabase y localStorage');
    } catch (error) {
      console.error('❌ Error eliminando balances:', error);
      throw error;
    }
  }, [selectedCompany, selectedPeriod, clearBalanceData]);

  const restoreExampleData = useCallback(() => {
    const exampleData = [
      {
        Codigo: '201-01-001',
        Descripcion: 'Caja General',
        SaldoActual: 50000,
        month: 1,
        year: 2025,
        date: '2025-01-31'
      },
      {
        Codigo: '201-01-002',
        Descripcion: 'Banco Nacional',
        SaldoActual: 250000,
        month: 1,
        year: 2025,
        date: '2025-01-31'
      },
      {
        Codigo: '201-02-001',
        Descripcion: 'Cuentas por Cobrar Clientes',
        SaldoActual: 180000,
        month: 1,
        year: 2025,
        date: '2025-01-31'
      },
      {
        Codigo: '201-03-001',
        Descripcion: 'Inventario de Mercancías',
        SaldoActual: 320000,
        month: 1,
        year: 2025,
        date: '2025-01-31'
      },
      {
        Codigo: '202-01-001',
        Descripcion: 'Edificios',
        SaldoActual: 800000,
        month: 1,
        year: 2025,
        date: '2025-01-31'
      },
      {
        Codigo: '202-02-001',
        Descripcion: 'Maquinaria y Equipos',
        SaldoActual: 450000,
        month: 1,
        year: 2025,
        date: '2025-01-31'
      },
      {
        Codigo: '301-01-001',
        Descripcion: 'Cuentas por Pagar Proveedores',
        SaldoActual: -120000,
        month: 1,
        year: 2025,
        date: '2025-01-31'
      },
      {
        Codigo: '301-02-001',
        Descripcion: 'Préstamos Bancarios Corto Plazo',
        SaldoActual: -80000,
        month: 1,
        year: 2025,
        date: '2025-01-31'
      },
      {
        Codigo: '302-01-001',
        Descripcion: 'Préstamos Bancarios Largo Plazo',
        SaldoActual: -300000,
        month: 1,
        year: 2025,
        date: '2025-01-31'
      },
      {
        Codigo: '401-01-001',
        Descripcion: 'Capital Social',
        SaldoActual: -500000,
        month: 1,
        year: 2025,
        date: '2025-01-31'
      },
      {
        Codigo: '401-02-001',
        Descripcion: 'Utilidades Retenidas',
        SaldoActual: -550000,
        month: 1,
        year: 2025,
        date: '2025-01-31'
      },
      {
        Codigo: '4-01-001',
        Descripcion: 'Ingresos por Ventas',
        SaldoActual: 1200000,
        month: 1,
        year: 2025,
        date: '2025-01-31'
      },
      {
        Codigo: '501-01-001',
        Descripcion: 'Costo de Ventas',
        SaldoActual: 720000,
        month: 1,
        year: 2025,
        date: '2025-01-31'
      },
      {
        Codigo: '5-02-001',
        Descripcion: 'Gastos de Administración',
        SaldoActual: 180000,
        month: 1,
        year: 2025,
        date: '2025-01-31'
      },
      {
        Codigo: '5-03-001',
        Descripcion: 'Gastos de Ventas',
        SaldoActual: 120000,
        month: 1,
        year: 2025,
        date: '2025-01-31'
      },
      {
        Codigo: '53-01-001',
        Descripcion: 'Gastos Financieros',
        SaldoActual: 45000,
        month: 1,
        year: 2025,
        date: '2025-01-31'
      }
    ];
    
    setImportedDataWithProcessing(exampleData);
    console.log('✅ Datos de ejemplo restaurados');
  }, [setImportedDataWithProcessing]);

  // Funciones para arquitectura multicompañía
  const loadUserCompanies = useCallback(async () => {
    if (!user) {
      console.log('⚠️ No hay usuario autenticado');
      return;
    }
    
    try {
      console.log('🏢 Cargando empresas del usuario:', user.id);
      const companies = await UserService.getUserCompanies(user.id);
      console.log('🏢 Empresas cargadas:', companies.length);
      setUserCompanies(companies);
      
      // Si no hay empresa seleccionada y hay empresas disponibles, seleccionar la primera
      if (!selectedCompany && companies.length > 0) {
        const firstCompany = companies[0];
        console.log('🏢 Seleccionando primera empresa:', firstCompany.name);
        setSelectedCompanyState(firstCompany);
        localStorage.setItem(STORAGE_KEYS.SELECTED_COMPANY, JSON.stringify(firstCompany));
      }
    } catch (error) {
      console.error('❌ Error cargando empresas del usuario:', error);
    }
  }, [user, selectedCompany]);

  const createCompany = useCallback(async (companyData: Omit<Company, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) {
      throw new Error('Usuario no autenticado');
    }
    
    try {
      console.log('🏢 Creando nueva empresa:', companyData.name);
      const newCompany = await UserService.createCompany(user.id, companyData);
      console.log('✅ Empresa creada:', newCompany.id);
      
      // Recargar la lista de empresas
      await loadUserCompanies();
      
      return newCompany;
    } catch (error) {
      console.error('❌ Error creando empresa:', error);
      throw error;
    }
  }, [user, loadUserCompanies]);

  const setSelectedCompany = useCallback((company: CompanyWithRole | null) => {
    console.log('🏢 Cambiando empresa seleccionada:', company?.name || 'ninguna');
    setSelectedCompanyState(company);
    
    if (company) {
      localStorage.setItem(STORAGE_KEYS.SELECTED_COMPANY, JSON.stringify(company));
    } else {
      localStorage.removeItem(STORAGE_KEYS.SELECTED_COMPANY);
    }
    
    // Limpiar período seleccionado al cambiar de empresa
    setSelectedPeriodState(null);
    localStorage.removeItem(STORAGE_KEYS.SELECTED_PERIOD);
    setFinancialPeriods([]);
  }, []);

  const switchCompany = useCallback(async (company: CompanyWithRole) => {
    try {
      console.log('🔄 Cambiando a empresa:', company.name);
      
      // Cambiar empresa seleccionada
      setSelectedCompany(company);
      
      // Cargar períodos financieros de la nueva empresa
      await loadFinancialPeriods(company.id);
      
      // Limpiar datos actuales
      setImportedDataState([]);
      setBalanceSheetData(null);
      setIncomeStatementData(null);
      setCashFlowData([]);
      setFinancialAnalysis(null);
      setFilteredData([]);
      
      console.log('✅ Cambio de empresa completado');
    } catch (error) {
      console.error('❌ Error cambiando de empresa:', error);
      throw error;
    }
  }, [setSelectedCompany]);

  // Funciones de compatibilidad con código existente
  const loadCompanies = useCallback(async () => {
    try {
      console.log('🏢 DataContext - Cargando empresas del usuario');
      const allCompanies = await SupabaseService.getUserCompanies();
      console.log('🏢 DataContext - Empresas cargadas:', allCompanies.length);
      setCompanies(allCompanies);
    } catch (error) {
      console.error('❌ Error cargando empresas:', error);
    }
  }, []);

  const loadFinancialPeriods = useCallback(async (companyId: string) => {
    try {
      console.log('📅 Cargando períodos financieros para empresa:', companyId);
      const periods = await SupabaseService.getFinancialPeriods(companyId);
      console.log('📅 Períodos cargados:', periods.length);
      setFinancialPeriods(periods);
      
      // Si no hay período seleccionado y hay períodos disponibles, seleccionar el más reciente
      if (!selectedPeriod && periods.length > 0) {
        const latestPeriod = periods.sort((a, b) => 
          new Date(b.end_date).getTime() - new Date(a.end_date).getTime()
        )[0];
        console.log('📅 Seleccionando período más reciente:', latestPeriod.name);
        setSelectedPeriodState(latestPeriod);
        localStorage.setItem(STORAGE_KEYS.SELECTED_PERIOD, JSON.stringify(latestPeriod));
      }
    } catch (error) {
      console.error('❌ Error cargando períodos financieros:', error);
    }
  }, [selectedPeriod]);

  const createFinancialPeriod = useCallback(async (periodData: Omit<FinancialPeriod, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      console.log('📅 Creando nuevo período financiero:', periodData.name);
      const newPeriod = await SupabaseService.createFinancialPeriod(periodData);
      console.log('✅ Período creado:', newPeriod.id);
      
      // Recargar períodos si es para la empresa seleccionada
      if (selectedCompany && periodData.company_id === selectedCompany.id) {
        await loadFinancialPeriods(selectedCompany.id);
      }
      
      return newPeriod;
    } catch (error) {
      console.error('❌ Error creando período financiero:', error);
      throw error;
    }
  }, [selectedCompany, loadFinancialPeriods]);

  const updateFinancialPeriod = useCallback(async (periodId: string, periodData: Partial<FinancialPeriod>) => {
    try {
      console.log('📅 Actualizando período financiero:', periodId);
      await SupabaseService.updateFinancialPeriod(periodId, periodData);
      console.log('✅ Período actualizado');
      
      // Recargar períodos si hay empresa seleccionada
      if (selectedCompany) {
        await loadFinancialPeriods(selectedCompany.id);
      }
    } catch (error) {
      console.error('❌ Error actualizando período financiero:', error);
      throw error;
    }
  }, [selectedCompany, loadFinancialPeriods]);

  const deleteFinancialPeriod = useCallback(async (periodId: string) => {
    try {
      console.log('📅 Eliminando período financiero:', periodId);
      await SupabaseService.deleteFinancialPeriod(periodId);
      console.log('✅ Período eliminado');
      
      // Si el período eliminado era el seleccionado, limpiar selección
      if (selectedPeriod && selectedPeriod.id === periodId) {
        setSelectedPeriodState(null);
        localStorage.removeItem(STORAGE_KEYS.SELECTED_PERIOD);
      }
      
      // Recargar períodos si hay empresa seleccionada
      if (selectedCompany) {
        await loadFinancialPeriods(selectedCompany.id);
      }
    } catch (error) {
      console.error('❌ Error eliminando período financiero:', error);
      throw error;
    }
  }, [selectedPeriod, selectedCompany, loadFinancialPeriods]);

  const setSelectedPeriod = useCallback((period: FinancialPeriod | null) => {
    console.log('📅 Cambiando período seleccionado:', period?.name || 'ninguno');
    setSelectedPeriodState(period);
    
    if (period) {
      localStorage.setItem(STORAGE_KEYS.SELECTED_PERIOD, JSON.stringify(period));
    } else {
      localStorage.removeItem(STORAGE_KEYS.SELECTED_PERIOD);
    }
  }, []);

  const togglePeriodPublishedStatus = useCallback(async (periodId: string, isPublished: boolean) => {
    try {
      console.log('📅 Cambiando estado de publicación del período:', periodId, 'a:', isPublished);
      await SupabaseService.updateFinancialPeriod(periodId, { is_published: isPublished });
      console.log('✅ Estado de publicación actualizado');
      
      // Recargar períodos si hay empresa seleccionada
      if (selectedCompany) {
        await loadFinancialPeriods(selectedCompany.id);
      }
    } catch (error) {
      console.error('❌ Error cambiando estado de publicación:', error);
      throw error;
    }
  }, [selectedCompany, loadFinancialPeriods]);

  const saveDataToSupabase = useCallback(async () => {
    if (!selectedCompany || !selectedPeriod) {
      console.log('⚠️ No hay empresa o período seleccionado para guardar');
      return;
    }
    
    if (importedData.length === 0) {
      console.log('⚠️ No hay datos para guardar');
      return;
    }
    
    try {
      console.log('💾 Guardando datos en Supabase...');
      await SupabaseService.saveBalanceData(
        selectedCompany.id,
        selectedPeriod.id,
        importedData,
        balanceSheetData,
        incomeStatementData,
        cashFlowData
      );
      console.log('✅ Datos guardados en Supabase');
    } catch (error) {
      console.error('❌ Error guardando datos en Supabase:', error);
      throw error;
    }
  }, [selectedCompany, selectedPeriod, importedData, balanceSheetData, incomeStatementData, cashFlowData]);

  const loadDataFromSupabase = useCallback(async (companyId?: string, periodId?: string) => {
    const targetCompanyId = companyId || selectedCompany?.id;
    const targetPeriodId = periodId || selectedPeriod?.id;
    
    if (!targetCompanyId || !targetPeriodId) {
      console.log('⚠️ No hay empresa o período especificado para cargar');
      return;
    }
    
    try {
      console.log('📥 Cargando datos desde Supabase...');
      const data = await SupabaseService.getBalanceData(targetCompanyId, targetPeriodId);
      
      if (data && data.length > 0) {
        console.log('📥 Datos cargados desde Supabase:', data.length, 'registros');
        setImportedDataWithProcessing(data);
      } else {
        console.log('📥 No se encontraron datos en Supabase');
      }
    } catch (error) {
      console.error('❌ Error cargando datos desde Supabase:', error);
      throw error;
    }
  }, [selectedCompany, selectedPeriod, setImportedDataWithProcessing]);

  const saveDataToStorage = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.IMPORTED_DATA, JSON.stringify(importedData));
      localStorage.setItem(STORAGE_KEYS.IMPORT_HISTORY, JSON.stringify(importHistory));
      localStorage.setItem(STORAGE_KEYS.FINANCIAL_METRICS, JSON.stringify(financialMetrics));
      localStorage.setItem(STORAGE_KEYS.BALANCE_SHEET, JSON.stringify(balanceSheetData));
      localStorage.setItem(STORAGE_KEYS.INCOME_STATEMENT, JSON.stringify(incomeStatementData));
      localStorage.setItem(STORAGE_KEYS.CASH_FLOW, JSON.stringify(cashFlowData));
      localStorage.setItem(STORAGE_KEYS.FINANCIAL_ANALYSIS, JSON.stringify(financialAnalysis));
      
      // Guardar empresa y período seleccionados
      if (selectedCompany) {
        localStorage.setItem(STORAGE_KEYS.SELECTED_COMPANY, JSON.stringify(selectedCompany));
      }
      if (selectedPeriod) {
        localStorage.setItem(STORAGE_KEYS.SELECTED_PERIOD, JSON.stringify(selectedPeriod));
      }
      
      console.log('💾 Datos guardados en localStorage:', {
        importedData: importedData.length,
        company: selectedCompany?.name,
        period: selectedPeriod?.period_name
      });
    } catch (error) {
      console.error("Error guardando datos en localStorage:", error);
    }
  }, [importedData, importHistory, financialMetrics, balanceSheetData, incomeStatementData, cashFlowData, financialAnalysis, selectedCompany, selectedPeriod]);

  const loadDataFromStorage = useCallback(() => {
    try {
      console.log('📂 Cargando datos desde localStorage...');
      
      const savedImportedData = localStorage.getItem(STORAGE_KEYS.IMPORTED_DATA);
      const savedImportHistory = localStorage.getItem(STORAGE_KEYS.IMPORT_HISTORY);
      const savedFinancialMetrics = localStorage.getItem(STORAGE_KEYS.FINANCIAL_METRICS);
      const savedBalanceSheet = localStorage.getItem(STORAGE_KEYS.BALANCE_SHEET);
      const savedIncomeStatement = localStorage.getItem(STORAGE_KEYS.INCOME_STATEMENT);
      const savedCashFlow = localStorage.getItem(STORAGE_KEYS.CASH_FLOW);
      const savedFinancialAnalysis = localStorage.getItem(STORAGE_KEYS.FINANCIAL_ANALYSIS);
      const savedSelectedCompany = localStorage.getItem(STORAGE_KEYS.SELECTED_COMPANY);
      const savedSelectedPeriod = localStorage.getItem(STORAGE_KEYS.SELECTED_PERIOD);

      // Cargar empresa y período primero
      if (savedSelectedCompany) {
        const company = JSON.parse(savedSelectedCompany);
        setSelectedCompanyState(company);
        console.log('🏢 Empresa cargada:', company.name);
      }
      
      if (savedSelectedPeriod) {
        const period = JSON.parse(savedSelectedPeriod);
        setSelectedPeriodState(period);
        console.log('📅 Período cargado:', period.period_name);
      }

      // Cargar datos financieros
      if (savedImportedData) {
        const parsedData = JSON.parse(savedImportedData);
        setImportedDataState(parsedData);
        updateAvailableDates(parsedData);
        console.log('📊 Datos importados cargados:', parsedData.length, 'registros');
      }
      
      if (savedImportHistory) {
        setImportHistory(JSON.parse(savedImportHistory));
        console.log('📋 Historial de importación cargado');
      }
      
      if (savedFinancialMetrics) {
        setFinancialMetrics(JSON.parse(savedFinancialMetrics));
        console.log('📈 Métricas financieras cargadas');
      }
      
      if (savedBalanceSheet) {
        const balanceData = JSON.parse(savedBalanceSheet);
        setBalanceSheetData(balanceData);
        console.log('💰 Balance general cargado:', balanceData && typeof balanceData === 'object' ? Object.keys(balanceData).length : 0, 'cuentas');
      }
      
      if (savedIncomeStatement) {
        setIncomeStatementData(JSON.parse(savedIncomeStatement));
        console.log('💼 Estado de resultados cargado');
      }
      
      if (savedCashFlow) {
        setCashFlowData(JSON.parse(savedCashFlow));
        console.log('💸 Flujo de efectivo cargado');
      }
      
      if (savedFinancialAnalysis) {
        setFinancialAnalysis(JSON.parse(savedFinancialAnalysis));
        console.log('🔍 Análisis financiero cargado');
      }
      
      console.log('✅ Carga desde localStorage completada');
    } catch (error) {
      console.error("❌ Error cargando datos desde localStorage:", error);
    }
  }, [updateAvailableDates]);

  const validateDataConsistency = useCallback(() => {
    if (!balanceSheetData) {
      console.warn('⚠️ No hay datos de balance sheet para validar');
      return;
    }
    
    const { totalAssets, totalLiabilities, totalEquity } = balanceSheetData;
    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
    const isBalanced = Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.01; // Tolerancia para decimales
    
    console.log('🔍 Validación de consistencia de datos:', {
      totalAssets,
      totalLiabilities,
      totalEquity,
      totalLiabilitiesAndEquity,
      difference: totalAssets - totalLiabilitiesAndEquity,
      isBalanced,
      status: isBalanced ? '✅ ECUACIÓN CONTABLE CORRECTA' : '❌ ECUACIÓN CONTABLE INCORRECTA'
    });
    
    if (!isBalanced) {
      console.error('❌ Error en la ecuación contable: Activos ≠ Pasivos + Patrimonio');
    }
    
    return isBalanced;
  }, [balanceSheetData]);

  // Efectos para cargar datos al inicializar
  useEffect(() => {
    if (!loading && user) {
      loadUserCompanies();
    }
  }, [user, loading, loadUserCompanies]);

  useEffect(() => {
    if (selectedCompany) {
      loadFinancialPeriods(selectedCompany.id);
    }
  }, [selectedCompany, loadFinancialPeriods]);

  useEffect(() => {
    if (!preventAutoReload && selectedCompany && selectedPeriod) {
      loadDataFromSupabase();
    }
  }, [selectedCompany, selectedPeriod, loadDataFromSupabase, preventAutoReload]);

  useEffect(() => {
    loadDataFromStorage();
  }, [loadDataFromStorage]);

  // Guardar datos cuando cambien los estados importantes
  useEffect(() => {
    if (importedData.length > 0 || Object.keys(balanceSheetData || {}).length > 0) {
      const timeoutId = setTimeout(() => {
        saveDataToStorage();
        console.log('💾 Datos guardados automáticamente por cambio de estado');
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [importedData, balanceSheetData, incomeStatementData, cashFlowData, financialAnalysis, selectedCompany, selectedPeriod, saveDataToStorage]);

  const value = {
    importedData,
    setImportedData: setImportedDataWithProcessing,
    importHistory,
    addImportRecord,
    deleteImportRecord,
    selectedMonth,
    selectedYear,
    availableMonths,
    availableYears,
    filterDate,
    setDateFilter,
    filteredData,
    financialMetrics,
    balanceSheetData,
    incomeStatementData,
    cashFlowData,
    financialAnalysis,
    processFinancialData,
    processFinancialDataWithData,
    clearAllData,
    clearBalanceData,
    deleteBalances,
    restoreExampleData,
    // Arquitectura multicompañía
    userCompanies,
    selectedCompany,
    selectedPeriod,
    financialPeriods,
    loadUserCompanies,
    createCompany,
    setSelectedCompany,
    switchCompany,
    // Compatibilidad con código existente
    companies,
    loadCompanies,
    loadFinancialPeriods,
    createFinancialPeriod,
    updateFinancialPeriod,
    deleteFinancialPeriod,
    setSelectedPeriod,
    togglePeriodPublishedStatus,
    saveDataToSupabase,
    loadDataFromSupabase,
    saveDataToStorage,
    loadDataFromStorage,
    validateDataConsistency,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};