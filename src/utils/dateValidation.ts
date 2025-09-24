import { FinancialPeriod } from '../lib/supabaseService';

interface ValidationResult {
  isValid: boolean;
  message: string;
  balanceDate?: string;
  periodStart?: string;
  periodEnd?: string;
  suggestedPeriods?: FinancialPeriod[];
}

/**
 * Extrae la fecha del balance desde los datos importados
 * Busca campos como: FechaPeriodo, Fecha, Date, etc.
 */
export function extractBalanceDate(data: any[]): Date | null {
  if (!data || data.length === 0) return null;
  
  // Buscar en el primer registro que tenga fecha
  for (const item of data.slice(0, 10)) { // Revisar los primeros 10 registros
    const dateFields = [
      'FechaPeriodo', 'fechaperiodo', 'FECHAPERIODO',
      'Fecha', 'fecha', 'FECHA',
      'Date', 'date', 'DATE',
      'FechaBalance', 'fechabalance', 'FECHABALANCE'
    ];
    
    for (const field of dateFields) {
      const dateValue = item[field];
      if (dateValue) {
        const parsedDate = parseDate(dateValue);
        if (parsedDate) return parsedDate;
      }
    }
  }
  
  return null;
}

/**
 * Parsea diferentes formatos de fecha
 */
function parseDate(dateStr: string): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  
  // Formato DD/MM/YYYY (como 31/01/2025)
  const ddmmyyyyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyyMatch) {
    const [, day, month, year] = ddmmyyyyMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) return date;
  }
  
  // Formato MM/DD/YYYY
  const mmddyyyyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mmddyyyyMatch) {
    const [, month, day, year] = mmddyyyyMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) return date;
  }
  
  // Formato YYYY-MM-DD
  const yyyymmddMatch = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (yyyymmddMatch) {
    const [, year, month, day] = yyyymmddMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) return date;
  }
  
  // Intentar parsing directo
  const directDate = new Date(dateStr);
  if (!isNaN(directDate.getTime())) return directDate;
  
  return null;
}

/**
 * Valida si la fecha del balance corresponde al período seleccionado
 */
export function validateBalancePeriod(
  balanceData: any[],
  selectedPeriod: FinancialPeriod | null,
  availablePeriods: FinancialPeriod[] = []
): ValidationResult {
  // Si no hay período seleccionado, no podemos validar
  if (!selectedPeriod) {
    return {
      isValid: false,
      message: 'No hay un período financiero seleccionado. Por favor, selecciona un período antes de importar el balance.'
    };
  }
  
  // Extraer fecha del balance
  const balanceDate = extractBalanceDate(balanceData);
  if (!balanceDate) {
    return {
      isValid: false,
      message: 'No se pudo extraer la fecha del balance. Verifica que el archivo contenga un campo de fecha válido (FechaPeriodo, Fecha, etc.).'
    };
  }
  
  // Parsear fechas del período
  const periodStart = new Date(selectedPeriod.start_date);
  const periodEnd = new Date(selectedPeriod.end_date);
  
  if (isNaN(periodStart.getTime()) || isNaN(periodEnd.getTime())) {
    return {
      isValid: false,
      message: 'Las fechas del período seleccionado no son válidas.',
      balanceDate: formatDate(balanceDate),
      periodStart: 'Fecha inválida',
      periodEnd: 'Fecha inválida'
    };
  }
  
  // Validar si la fecha del balance está dentro del período
  const isWithinPeriod = balanceDate >= periodStart && balanceDate <= periodEnd;
  
  if (isWithinPeriod) {
    return {
      isValid: true,
      message: `✅ La fecha del balance (${formatDate(balanceDate)}) corresponde al período seleccionado (${selectedPeriod.period_name}).`,
      balanceDate: formatDate(balanceDate),
      periodStart: formatDate(periodStart),
      periodEnd: formatDate(periodEnd)
    };
  } else {
    // Buscar períodos sugeridos
    const suggestedPeriods = suggestMatchingPeriods(balanceDate, availablePeriods);
    
    return {
      isValid: false,
      message: `⚠️ La fecha del balance (${formatDate(balanceDate)}) NO corresponde al período seleccionado "${selectedPeriod.period_name}" (${formatDate(periodStart)} - ${formatDate(periodEnd)}).\n\n¿Estás seguro de que quieres importar este balance?`,
      balanceDate: formatDate(balanceDate),
      periodStart: formatDate(periodStart),
      periodEnd: formatDate(periodEnd),
      suggestedPeriods
    };
  }
}

/**
 * Formatea una fecha para mostrar al usuario
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Sugiere períodos que podrían corresponder a la fecha del balance
 */
export function suggestMatchingPeriods(
  balanceDate: Date,
  availablePeriods: FinancialPeriod[]
): FinancialPeriod[] {
  return availablePeriods.filter(period => {
    const periodStart = new Date(period.start_date);
    const periodEnd = new Date(period.end_date);
    
    return balanceDate >= periodStart && balanceDate <= periodEnd;
  });
}