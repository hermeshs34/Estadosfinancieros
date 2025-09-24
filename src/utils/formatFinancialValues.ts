import { DisplayScale, scaleFactors, scaleSuffixes } from '../components/ScaleSelector';

/**
 * Formatea un valor financiero aplicando la escala seleccionada
 */
export const formatFinancialValue = (
  value: number,
  currency: string = 'USD',
  scale: DisplayScale = 'millions',
  decimals: number = 2
): string => {
  if (value === 0) return `${currency} 0`;
  if (isNaN(value) || !isFinite(value)) return `${currency} --`;

  const scaledValue = value / scaleFactors[scale];
  const suffix = scaleSuffixes[scale];
  
  // Formatear con separadores de miles y decimales apropiados
  const formattedNumber = scaledValue.toLocaleString('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });

  return `${currency} ${formattedNumber}${suffix ? ` ${suffix}` : ''}`;
};

/**
 * Formatea un valor sin moneda, solo con la escala
 */
export const formatScaledNumber = (
  value: number,
  scale: DisplayScale = 'millions',
  decimals: number = 2
): string => {
  if (value === 0) return '0';
  if (isNaN(value) || !isFinite(value)) return '--';

  const scaledValue = value / scaleFactors[scale];
  const suffix = scaleSuffixes[scale];
  
  const formattedNumber = scaledValue.toLocaleString('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });

  return `${formattedNumber}${suffix ? ` ${suffix}` : ''}`;
};

/**
 * Detecta automáticamente la mejor escala para un valor
 */
export const detectOptimalScale = (value: number): DisplayScale => {
  const absValue = Math.abs(value);
  
  if (absValue >= 1_000_000_000_000) return 'billions'; // Trillones
  if (absValue >= 1_000_000_000) return 'billions';     // Miles de millones
  if (absValue >= 1_000_000) return 'millions';         // Millones
  if (absValue >= 1_000) return 'thousands';            // Miles
  return 'real';                                        // Valores reales
};

/**
 * Formatea un valor con escala automática
 */
export const formatWithAutoScale = (
  value: number,
  currency: string = 'USD',
  decimals: number = 2
): string => {
  const optimalScale = detectOptimalScale(value);
  return formatFinancialValue(value, currency, optimalScale, decimals);
};

/**
 * Formatea un porcentaje
 */
export const formatPercentage = (
  value: number,
  decimals: number = 2
): string => {
  if (isNaN(value) || !isFinite(value)) return '--';
  
  return `${value.toLocaleString('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })}%`;
};

/**
 * Obtiene la etiqueta descriptiva de la escala actual
 */
export const getScaleDescription = (scale: DisplayScale): string => {
  const descriptions: Record<DisplayScale, string> = {
    real: 'Valores exactos sin escala',
    thousands: 'Valores en miles (K)',
    millions: 'Valores en millones (M)',
    billions: 'Valores en miles de millones (B)'
  };
  
  return descriptions[scale];
};

/**
 * Verifica si un valor es considerado "astronómico" (muy grande)
 */
export const isAstronomicalValue = (value: number): boolean => {
  return Math.abs(value) > 1_000_000_000; // Mayor a mil millones
};

/**
 * Genera una advertencia para valores astronómicos
 */
export const getAstronomicalWarning = (value: number, currency: string): string | null => {
  if (!isAstronomicalValue(value)) return null;
  
  return `⚠️ Valor muy alto detectado (${formatWithAutoScale(value, currency)}). ` +
         `Esto puede deberse a la hiperinflación venezolana. ` +
         `Considera usar una escala diferente para mejor visualización.`;
};

/**
 * Convierte un valor de una escala a otra
 */
export const convertBetweenScales = (
  value: number,
  fromScale: DisplayScale,
  toScale: DisplayScale
): number => {
  // Primero convertir a valor real
  const realValue = value * scaleFactors[fromScale];
  // Luego convertir a la escala destino
  return realValue / scaleFactors[toScale];
};

/**
 * Formatea un rango de valores (min - max)
 */
export const formatValueRange = (
  minValue: number,
  maxValue: number,
  currency: string = 'USD',
  scale: DisplayScale = 'millions'
): string => {
  const formattedMin = formatFinancialValue(minValue, '', scale);
  const formattedMax = formatFinancialValue(maxValue, '', scale);
  
  return `${currency} ${formattedMin} - ${formattedMax}`;
};

/**
 * Calcula y formatea la variación entre dos valores
 */
export const formatVariation = (
  currentValue: number,
  previousValue: number,
  showPercentage: boolean = true
): { formatted: string; isPositive: boolean; percentage?: number } => {
  if (previousValue === 0) {
    return {
      formatted: 'N/A',
      isPositive: currentValue >= 0
    };
  }
  
  const difference = currentValue - previousValue;
  const percentage = (difference / Math.abs(previousValue)) * 100;
  const isPositive = difference >= 0;
  
  let formatted = formatWithAutoScale(Math.abs(difference));
  
  if (showPercentage) {
    formatted += ` (${formatPercentage(Math.abs(percentage))})`;
  }
  
  return {
    formatted: `${isPositive ? '+' : '-'}${formatted}`,
    isPositive,
    percentage: Math.abs(percentage)
  };
};