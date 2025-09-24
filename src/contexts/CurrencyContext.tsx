import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { ExchangeRateService } from '../lib/exchangeRateService';
import { Currency, ExchangeRates } from '../types/financials';
import { useDataContext } from './DataContext';

interface CurrencyContextType {
  selectedCurrency: Currency;
  exchangeRates: ExchangeRates | null;
  isLoading: boolean;
  error: string | null;
  setCurrency: (currency: Currency) => void;
  convertAmount: (amount: number, from: Currency, to: Currency, date?: string) => Promise<number>;
  formatCurrency: (amount: number, currency?: Currency) => string;
  getHistoricalRate: (from: Currency, to: Currency, date: string) => Promise<number | null>;
  loadExchangeRates: (customDate?: string, forceReload?: boolean) => Promise<void>;
  balanceDate?: string;
  setBalanceDate: (date: string) => void;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { filterDate } = useDataContext();
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>('VES');
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [balanceDate, setBalanceDate] = useState<string | undefined>();

  const setCurrency = (currency: Currency) => {
    setSelectedCurrency(currency);
  };

  const loadExchangeRates = useCallback(async (customDate?: string, forceReload = false) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Si es una recarga forzada, limpiar el caché primero
      if (forceReload) {
        console.log('🧹 CurrencyContext - Limpiando caché de tasas antes de recargar');
        setExchangeRates(null);
        // Pequeña pausa para asegurar que el estado se actualice
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Asegurar que las tasas históricas estén cargadas
      await ExchangeRateService.ensureHistoricalRatesLoaded();
      
      let dateToUse = customDate || balanceDate;
      if (!dateToUse) {
        // Si no hay fecha específica, intentar inferir del contexto de datos
        // Por ahora usar fecha actual como fallback, pero esto debería mejorarse
        dateToUse = new Date().toISOString().split('T')[0];
        console.log('⚠️ No hay fecha de balance específica, usando fecha actual:', dateToUse);
      }
      

      
      let vesToUsdRate = await ExchangeRateService.getRate('VES', 'USD', dateToUse);
      let vesToEurRate = await ExchangeRateService.getRate('VES', 'EUR', dateToUse);
      

      
      // Si no se encuentran tasas para la fecha específica, usar la fecha actual como fallback
      if (!vesToUsdRate || !vesToEurRate) {
        console.log('⚠️ No se encontraron tasas para la fecha específica, usando fecha actual como fallback');
        const currentDate = new Date().toISOString().split('T')[0];
        
        if (!vesToUsdRate) {
          vesToUsdRate = await ExchangeRateService.getRate('VES', 'USD', currentDate);
        }
        if (!vesToEurRate) {
          vesToEurRate = await ExchangeRateService.getRate('VES', 'EUR', currentDate);
        }
        
        // Si aún no hay tasas, usar valores por defecto
        if (!vesToUsdRate) {
          console.log('⚠️ Usando tasa USD por defecto');
          vesToUsdRate = 36.5; // Tasa por defecto
        }
        if (!vesToEurRate) {
          console.log('⚠️ Usando tasa EUR por defecto');
          vesToEurRate = 40.0; // Tasa por defecto
        }
      }
      


      // Las tasas del BCV son VES por USD/EUR (ej: 57.96 VES = 1 USD)
      // Para convertir VES->USD: dividimos VES por la tasa (VES / 57.96)
      // Para convertir USD->VES: multiplicamos USD por la tasa (USD * 57.96)
      const rates: ExchangeRates = {
        VES: { USD: vesToUsdRate || 1, EUR: vesToEurRate || 1 },
        USD: { VES: 1 / (vesToUsdRate || 1), EUR: 0 },
        EUR: { VES: 1 / (vesToEurRate || 1), USD: 0 },
      };
      
      if (vesToUsdRate && vesToEurRate) {
        rates.USD.EUR = vesToEurRate / vesToUsdRate;
        rates.EUR.USD = vesToUsdRate / vesToEurRate;
      }
      
      // Verificar que las tasas son válidas antes de configurarlas
      if (rates && rates.VES && rates.VES.USD) {
        setExchangeRates(rates);
        console.log('✅ CurrencyContext - Tasas configuradas correctamente:', {
          fecha: dateToUse,
          tasaVESUSD: rates.VES.USD,
          todasLasTasas: rates
        });
      } else {
        console.error('❌ CurrencyContext - Tasas inválidas recibidas:', rates);
        setExchangeRates(null);
      }
    } catch (err: any) {
      console.error("❌ CurrencyContext - Error cargando tasas de cambio:", err);
      setError(err.message || 'Error al cargar las tasas de cambio');
    } finally {
      setIsLoading(false);
    }
  }, [balanceDate]);

  // Carga inicial de tasas de cambio (solo una vez)
  useEffect(() => {
    loadExchangeRates();
  }, []); // Sin dependencias para evitar loops

  // Actualizar balanceDate cuando cambie filterDate del DataContext
  useEffect(() => {
    if (filterDate && filterDate !== balanceDate) {
      setBalanceDate(filterDate);
      // Cargar tasas para la nueva fecha
      loadExchangeRates(filterDate);
    }
  }, [filterDate, balanceDate]);



  const convertAmount = useCallback(async (amount: number, from: Currency, to: Currency, date?: string): Promise<number> => {
    if (from === to) return amount;
    
    try {
      // Si no se proporciona fecha, usar la fecha del balance
      const dateToUse = date || balanceDate;
      const conversion = await ExchangeRateService.convertCurrency(amount, from, to, dateToUse);
      return conversion ? conversion.convertedAmount : amount;
    } catch (err) {
      console.error(`Error converting ${amount} from ${from} to ${to}:`, err);
      return amount;
    }
  }, [balanceDate]);

  const formatCurrency = (amount: number, currency: Currency = selectedCurrency): string => {
    // Si la moneda es la misma que VES (moneda base), no convertir
    if (currency === 'VES') {
      return new Intl.NumberFormat('es-VE', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    }

    // Convertir de VES a la moneda seleccionada
    let convertedAmount = amount;
    if (exchangeRates && exchangeRates.VES && exchangeRates.VES[currency]) {
      const rate = exchangeRates.VES[currency];
      if (rate > 0) {
        // Si la tasa es menor a 1, significa que es USD/VES (ej: 0.017 USD por 1 VES)
        // Si la tasa es mayor a 1, significa que es VES/USD (ej: 58 VES por 1 USD)
        if (rate < 1) {
          // Tasa en formato USD/VES, multiplicamos para convertir VES a USD
          convertedAmount = amount * rate;

        } else {
          // Tasa en formato VES/USD, dividimos para convertir VES a USD
          convertedAmount = amount / rate;

        }
      } else {
        console.warn(`⚠️ Tasa de cambio no válida para VES → ${currency}: ${rate}`);
      }
    } else {
      console.warn(`⚠️ No hay tasas de cambio disponibles para VES → ${currency}`);
    }

    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(convertedAmount);
  };

  const getHistoricalRate = async (from: Currency, to: Currency, date: string): Promise<number | null> => {
    try {
      return await ExchangeRateService.getRate(from, to, date);
    } catch (err) {
      console.error(`Failed to get historical rate for ${from} to ${to} on ${date}:`, err);
      return null;
    }
  };

  const contextValue: CurrencyContextType = {
    selectedCurrency,
    exchangeRates,
    isLoading,
    error,
    setCurrency,
    convertAmount,
    formatCurrency,
    getHistoricalRate,
    loadExchangeRates,
    balanceDate,
    setBalanceDate,
  };

  return (
    <CurrencyContext.Provider value={contextValue}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = (): CurrencyContextType => {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};