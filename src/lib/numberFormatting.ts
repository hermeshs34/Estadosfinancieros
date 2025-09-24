/**
 * Utilidades para formateo de números financieros
 * Proporciona funciones consistentes para mostrar números con separadores y formato apropiado
 */

/**
 * Formatea un número con separadores de miles usando el formato español
 * @param value - El número a formatear
 * @param decimals - Número de decimales a mostrar (por defecto 2)
 * @returns Número formateado con separadores
 */
export const formatNumber = (value: number, decimals: number = 2): string => {
  if (isNaN(value) || !isFinite(value)) {
    return '0,00';
  }
  
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: true // Asegurar que se usen separadores de miles
  }).format(value);
};

/**
 * Formatea un porcentaje con separadores de miles y símbolo %
 * @param value - El valor del porcentaje (decimal, ej: 0.15 para 15%)
 * @param decimals - Número de decimales a mostrar (por defecto 1)
 * @returns Porcentaje formateado con separadores
 */
export const formatPercentage = (value: number, decimals: number = 1): string => {
  if (isNaN(value) || !isFinite(value)) {
    return '0,0%';
  }
  
  // Multiplicar por 100 para convertir decimal a porcentaje
  const percentage = value * 100;
  
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: true // Asegurar que se usen separadores de miles
  }).format(percentage) + '%';
};

/**
 * Formatea un valor que ya está en porcentaje con separadores de miles y símbolo %
 * @param value - El valor del porcentaje (ya en porcentaje, ej: 15.5 para 15.5%)
 * @param decimals - Número de decimales a mostrar (por defecto 1)
 * @returns Porcentaje formateado con separadores
 */
export const formatPercentageValue = (value: number, decimals: number = 1): string => {
  if (isNaN(value) || !isFinite(value)) {
    return '0,0%';
  }
  
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: true // Asegurar que se usen separadores de miles
  }).format(value) + '%';
};

/**
 * Formatea un ratio financiero con separadores de miles
 * @param value - El valor del ratio
 * @param decimals - Número de decimales a mostrar (por defecto 2)
 * @returns Ratio formateado con separadores
 */
export const formatRatio = (value: number, decimals: number = 2): string => {
  if (isNaN(value) || !isFinite(value)) {
    return '0,00';
  }
  
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
};

/**
 * Formatea una cantidad monetaria con separadores de miles
 * @param value - El valor monetario
 * @param currency - Código de moneda (por defecto 'COP' para pesos colombianos)
 * @param showSymbol - Si mostrar el símbolo de moneda (por defecto false)
 * @returns Cantidad formateada con separadores
 */
export const formatCurrency = (value: number, currency: string = 'COP', showSymbol: boolean = false): string => {
  if (isNaN(value) || !isFinite(value)) {
    return showSymbol ? '$0,00' : '0,00';
  }
  
  if (showSymbol) {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  } else {
    return new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }
};

/**
 * Formatea números grandes con sufijos (K, M, B)
 * @param value - El número a formatear
 * @param decimals - Número de decimales a mostrar (por defecto 1)
 * @returns Número formateado con sufijo apropiado
 */
export const formatCompactNumber = (value: number, decimals: number = 1): string => {
  if (isNaN(value) || !isFinite(value)) {
    return '0';
  }
  
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  
  if (absValue >= 1e9) {
    return sign + formatNumber(absValue / 1e9, decimals) + 'B';
  } else if (absValue >= 1e6) {
    return sign + formatNumber(absValue / 1e6, decimals) + 'M';
  } else if (absValue >= 1e3) {
    return sign + formatNumber(absValue / 1e3, decimals) + 'K';
  } else {
    return sign + formatNumber(absValue, decimals);
  }
};

/**
 * Formatea un número para mostrar en tablas con ancho fijo
 * Usa formato compacto para números muy grandes
 * @param value - El número a formatear
 * @param maxLength - Longitud máxima del string resultante
 * @returns Número formateado optimizado para tablas
 */
export const formatTableNumber = (value: number, maxLength: number = 12): string => {
  if (isNaN(value) || !isFinite(value)) {
    return '0,00';
  }
  
  const formatted = formatNumber(value);
  
  if (formatted.length <= maxLength) {
    return formatted;
  }
  
  // Si es muy largo, usar formato compacto
  return formatCompactNumber(value);
};