// Tipos de monedas soportadas
export type Currency = 
  | 'VES' // Bolívares Venezolanos
  | 'USD' // Dólares Estadounidenses
  | 'EUR' // Euros
  | 'GBP' // Libras Esterlinas
  | 'CAD' // Dólares Canadienses
  | 'AUD' // Dólares Australianos
  | 'JPY' // Yenes Japoneses
  | 'CHF' // Francos Suizos
  | 'CNY' // Yuan Chino
  | 'BRL' // Reales Brasileños
  | 'MXN' // Pesos Mexicanos
  | 'COP'; // Pesos Colombianos

// Interfaz para las tasas de cambio
export interface ExchangeRates {
  [fromCurrency: string]: {
    [toCurrency: string]: number;
  };
}

// Interfaz para datos financieros básicos
export interface FinancialData {
  amount: number;
  currency: Currency;
  date: string;
}

// Interfaz para conversión de monedas
export interface CurrencyConversion {
  amount: number;
  fromCurrency: Currency;
  toCurrency: Currency;
  rate: number;
  convertedAmount: number;
  conversionDate: string;
}

// Interfaz para tasas de cambio históricas
export interface HistoricalRate {
  date: string;
  rate: number;
  source: 'BCV' | 'MANUAL' | 'ECB' | 'API';
}

// Interfaz para información de moneda
export interface CurrencyInfo {
  code: Currency;
  name: string;
  symbol: string;
  flag: string;
  region: string;
}

// Constantes de monedas soportadas
export const SUPPORTED_CURRENCIES: Currency[] = [
  'VES', 'USD', 'EUR', 'GBP', 'CAD', 'AUD', 
  'JPY', 'CHF', 'CNY', 'BRL', 'MXN', 'COP'
];

// Información detallada de monedas
export const CURRENCY_INFO: Record<Currency, CurrencyInfo> = {
  VES: { code: 'VES', name: 'Bolívares Venezolanos', symbol: 'Bs.', flag: '🇻🇪', region: 'América' },
  USD: { code: 'USD', name: 'Dólares Estadounidenses', symbol: '$', flag: '🇺🇸', region: 'América' },
  EUR: { code: 'EUR', name: 'Euros', symbol: '€', flag: '🇪🇺', region: 'Europa' },
  GBP: { code: 'GBP', name: 'Libras Esterlinas', symbol: '£', flag: '🇬🇧', region: 'Europa' },
  CAD: { code: 'CAD', name: 'Dólares Canadienses', symbol: 'C$', flag: '🇨🇦', region: 'América' },
  AUD: { code: 'AUD', name: 'Dólares Australianos', symbol: 'A$', flag: '🇦🇺', region: 'Oceanía' },
  JPY: { code: 'JPY', name: 'Yenes Japoneses', symbol: '¥', flag: '🇯🇵', region: 'Asia' },
  CHF: { code: 'CHF', name: 'Francos Suizos', symbol: 'CHF', flag: '🇨🇭', region: 'Europa' },
  CNY: { code: 'CNY', name: 'Yuan Chino', symbol: '¥', flag: '🇨🇳', region: 'Asia' },
  BRL: { code: 'BRL', name: 'Reales Brasileños', symbol: 'R$', flag: '🇧🇷', region: 'América' },
  MXN: { code: 'MXN', name: 'Pesos Mexicanos', symbol: 'MX$', flag: '🇲🇽', region: 'América' },
  COP: { code: 'COP', name: 'Pesos Colombianos', symbol: 'COL$', flag: '🇨🇴', region: 'América' }
};