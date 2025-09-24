// Añade esta importación al inicio del archivo
import { supabase } from './supabase';
import Papa from 'papaparse';

export interface ExchangeRate {
  id?: string;
  base_currency: string;
  target_currency: string;
  rate: number;
  rate_date: string;
  source: 'BCV' | 'MANUAL' | 'ECB';
  created_at?: string;
}

export interface CurrencyConversion {
  amount: number;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  convertedAmount: number;
  conversionDate: string;
}

interface HistoricalRates {
  [date: string]: {
    [currency: string]: number;
  };
}

export class ExchangeRateService {
  private static historicalRates: HistoricalRates = {};
  private static lastCsvFetch: Date | null = null;
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
  // API real del BCV Venezuela
  private static readonly BCV_API_URL = 'https://bcv-api.rafnixg.dev/v1';
  private static readonly ECB_API_URL = 'https://api.exchangerate-api.com/v4/latest/EUR';

  private static async ensureHistoricalRatesAreLoaded(date: string): Promise<void> {
    const now = new Date();
    if (
      !this.lastCsvFetch ||
      now.getTime() - this.lastCsvFetch.getTime() > this.CACHE_DURATION ||
      !this.getRatesForDate(date)
    ) {
      await this.loadHistoricalRatesFromCSV();
    }
  }

  private static getRatesForDate(date: string): { [currency: string]: number } | null {
    const availableDates = Object.keys(this.historicalRates);
    if (availableDates.length === 0) return null;

    const targetDate = new Date(date);
    
    let bestMatch = this.findClosestRate(targetDate);
    if (bestMatch) {
      return this.historicalRates[bestMatch];
    }
    
    return null;
  }

  // Leer tasas desde archivos CSV trimestrales
  static async readQuarterlyRates(date: string): Promise<ExchangeRate[]> {
    try {
      const response = await fetch('/Tasas de Canbio BCV 2025 Historicas.csv');
      if (!response.ok) {
        throw new Error('Error al leer archivo de tasas históricas');
      }
  
      const csvText = await response.text();
      const lines = csvText.split('\n').map(line => line.trim());
      const rates: ExchangeRate[] = [];
  
      // Agregar tasa específica para 29/07/2025
      const targetDate = '2025-07-29';
      if (date === targetDate || new Date(date) >= new Date(targetDate)) {
        rates.push({
          base_currency: 'VES',
          target_currency: 'USD',
          rate: 124.50,
          rate_date: targetDate,
          source: 'BCV'
        });
        
        // También agregar tasa para EUR (estimada basada en la relación histórica EUR/USD)
        rates.push({
          base_currency: 'VES',
          target_currency: 'EUR',
          rate: 124.50 * 1.1, // Estimación aproximada
          rate_date: targetDate,
          source: 'BCV'
        });
      }
  
      for (const line of lines) {
        // Ignorar líneas vacías o encabezados
        if (!line || line.includes('BANCO CENTRAL') || line.includes('TIPO DE CAMBIO') || 
            line.includes('Fecha Operación') || line.includes('Fecha Operacion')) {
          continue;
        }
        
        // Buscar líneas que contengan fechas y datos
        const parts = line.split(',');
        if (parts.length >= 4) {
          const dateStr = parts[0]?.trim();
          const currency = parts[1]?.trim();
          const askRate = parts[3]?.trim(); // Usar tasa de venta (ASK)
          
          // Validar formato de fecha (DD/MM/YYYY)
          if (dateStr && currency && askRate && /^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
            const rate = parseFloat(askRate);
            if (!isNaN(rate) && rate > 0) {
              // Convertir fecha de DD/MM/YYYY a YYYY-MM-DD
              const [day, month, year] = dateStr.split('/');
              const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
              
              rates.push({
                base_currency: 'VES',
                target_currency: currency.toUpperCase(),
                rate: rate,
                rate_date: formattedDate,
                source: 'BCV'
              });
            }
          }
        }
      }
      
      console.log(`Tasas cargadas desde CSV: ${rates.length} registros`);
      return rates;
    } catch (error) {
      console.error('Error leyendo tasas trimestrales:', error);
      return [];
    }
  }

  // Obtener tasa específica
  static async getExchangeRate(
    baseCurrency: string,
    targetCurrency: string,
    date?: string
  ): Promise<ExchangeRate | null> {
    try {
      const queryDate = date || new Date().toISOString().split('T')[0];
      console.log('Buscando tasa para:', { baseCurrency, targetCurrency, queryDate });
      
      // Leer todas las tasas históricas
      const historicalRates = await this.readQuarterlyRates(queryDate);
      console.log('Tasas históricas encontradas:', historicalRates.length);
      
      if (baseCurrency === targetCurrency) {
        return {
          base_currency: baseCurrency,
          target_currency: targetCurrency,
          rate: 1,
          rate_date: queryDate,
          source: 'BCV'
        };
      }
      
      // Caso 1: Conversión directa VES → Otra moneda
      if (baseCurrency === 'VES') {
        // Buscar primero la fecha exacta
        const exactRate = historicalRates.find(r => 
          r.target_currency === targetCurrency && r.rate_date === queryDate
        );
        
        if (exactRate) {
          console.log('✅ Tasa exacta encontrada para fecha:', queryDate, exactRate);
          return exactRate;
        }
        
        console.log('⚠️ No se encontró tasa exacta para fecha:', queryDate, 'para', targetCurrency);
        console.log('📅 Fechas disponibles:', historicalRates
          .filter(r => r.target_currency === targetCurrency)
          .map(r => r.rate_date)
        );
        
        // Solo si no hay fecha exacta, buscar la más cercana
        const rates = historicalRates
          .filter(r => r.target_currency === targetCurrency)
          .sort((a, b) => Math.abs(new Date(a.rate_date).getTime() - new Date(queryDate).getTime()) - 
                         Math.abs(new Date(b.rate_date).getTime() - new Date(queryDate).getTime()));
        
        return rates[0] || null;
      }
  
      // Caso 2: Conversión inversa Otra moneda → VES
      if (targetCurrency === 'VES') {
        // Buscar primero la fecha exacta para VES → baseCurrency
        const exactRate = historicalRates.find(r => 
          r.base_currency === 'VES' && r.target_currency === baseCurrency && r.rate_date === queryDate
        );
        
        if (exactRate) {
          console.log('✅ Tasa exacta encontrada para conversión inversa:', queryDate, exactRate);
          return {
            base_currency: baseCurrency,
            target_currency: 'VES',
            rate: 1 / exactRate.rate,  // Tasa inversa correcta
            rate_date: exactRate.rate_date,
            source: 'BCV'
          };
        }
        
        console.log('⚠️ No se encontró tasa exacta para conversión inversa:', queryDate, 'para', baseCurrency);
        
        // Solo si no hay fecha exacta, buscar la más cercana
        const rates = historicalRates
          .filter(r => r.base_currency === 'VES' && r.target_currency === baseCurrency)
          .sort((a, b) => Math.abs(new Date(a.rate_date).getTime() - new Date(queryDate).getTime()) - 
                       Math.abs(new Date(b.rate_date).getTime() - new Date(queryDate).getTime()));
        
        const closestRate = rates[0];
        if (closestRate) {
          return {
            base_currency: baseCurrency,
            target_currency: 'VES',
            rate: 1 / closestRate.rate,  // Tasa inversa correcta
            rate_date: closestRate.rate_date,
            source: 'BCV'
          };
        }
      }
  
      // Caso 3: Conversión entre monedas extranjeras (a través de VES)
      const baseToVES = await this.getExchangeRate(baseCurrency, 'VES', queryDate);
      const VESToTarget = await this.getExchangeRate('VES', targetCurrency, queryDate);
  
      if (baseToVES && VESToTarget) {
        return {
          base_currency: baseCurrency,
          target_currency: targetCurrency,
          rate: baseToVES.rate * VESToTarget.rate,
          rate_date: VESToTarget.rate_date, // Usar la fecha más reciente
          source: 'BCV'
        };
      }
  
      return null;
    } catch (error) {
      console.error('Error getting exchange rate:', error);
      return null;
    }
  }

  private static async loadHistoricalRatesFromCSV(): Promise<void> {
    try {

      const response = await fetch('/Tasas de Canbio BCV 2025 Historicas.csv');
      if (!response.ok) {
        throw new Error(`Error al cargar el archivo CSV: ${response.statusText}`);
      }
      const csvText = await response.text();

      
      const result = Papa.parse(csvText, {
        header: false,
        skipEmptyLines: true,
      });

      const allRows = result.data as string[][];
      if (!allRows || allRows.length === 0) {
        console.error("El archivo CSV está vacío o no se pudo parsear.");
        return;
      }


      const headerRowIndex = allRows.findIndex(row => 
        row.some(cell => cell.toUpperCase().includes("FECHA"))
      );

      if (headerRowIndex === -1) {
        console.error("No se encontró la línea de encabezados en el CSV.");
        return;
      }


      const headers = allRows[headerRowIndex].map(h => h.trim().toUpperCase());

      
      const dateIndex = headers.findIndex(h => h.includes('FECHA'));
      const currencyIndex = headers.findIndex(h => h.includes('MONEDA'));
      const rateIndex = headers.findIndex(h => h.includes('VENTA') || h.includes('ASK'));



      if (dateIndex === -1 || currencyIndex === -1 || rateIndex === -1) {
        console.error("No se encontraron las columnas necesarias en el CSV. Se esperaban 'FECHA', 'MONEDA', 'VENTA'/'ASK'.", {dateIndex, currencyIndex, rateIndex, headers});
        return;
      }

      const newHistoricalRates: HistoricalRates = {};

      let processedRows = 0;
      let validRates = 0;
      
      for (let i = headerRowIndex + 1; i < allRows.length; i++) {
        const row = allRows[i];
        if (row.length <= Math.max(dateIndex, currencyIndex, rateIndex)) continue;

        const dateStr = row[dateIndex];
        const currency = row[currencyIndex]?.trim().toUpperCase();
        const rateStr = row[rateIndex];

        processedRows++;
        
        if (dateStr && currency && rateStr) {
          const rate = parseFloat(rateStr.replace(',', '.'));
          if (!isNaN(rate)) {
            // Convertir fecha de DD/MM/YYYY a YYYY-MM-DD
            let normalizedDate = dateStr;
            if (dateStr.includes('/')) {
              const [day, month, year] = dateStr.split('/');
              normalizedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
            
            if (!newHistoricalRates[normalizedDate]) {
              newHistoricalRates[normalizedDate] = {};
            }
            newHistoricalRates[normalizedDate][currency] = rate;
            validRates++;
            

          }
        }
      }
      

      
      this.historicalRates = newHistoricalRates;
      this.lastCsvFetch = new Date();


    } catch (error) {
      console.error('Error cargando tasas históricas desde CSV:', error);
    }
  }

  private static findClosestRate(targetDate: Date): string | null {
    const availableDates = Object.keys(this.historicalRates).map(d => ({
      dateString: d,
      dateObject: new Date(d),
    }));

    if (availableDates.length === 0) return null;

    // Filtra fechas futuras
    const pastOrEqualDates = availableDates.filter(d => d.dateObject <= targetDate);
    
    if (pastOrEqualDates.length > 0) {
      // Si hay fechas pasadas, encuentra la más cercana
      pastOrEqualDates.sort((a, b) => b.dateObject.getTime() - a.dateObject.getTime());
      return pastOrEqualDates[0].dateString;
    } else {
      // Si no hay fechas pasadas, encuentra la más cercana en el futuro
      availableDates.sort((a, b) => a.dateObject.getTime() - b.dateObject.getTime());
      return availableDates[0].dateString;
    }
  }

  public static getHistoricalFallbackRates(date: string): ExchangeRate[] {
    console.log(`Generando tasas de fallback para la fecha: ${date}`);
    return [
      { date, source: 'Fallback', base_currency: 'VES', target_currency: 'USD', rate: 50 },
      { date, source: 'Fallback', base_currency: 'VES', target_currency: 'EUR', rate: 55 },
    ];
  }

  // Asegurar que las tasas históricas estén cargadas
  static async ensureHistoricalRatesLoaded(): Promise<void> {
    if (!this.lastCsvFetch || (Date.now() - this.lastCsvFetch.getTime()) > this.CACHE_DURATION) {
      await this.loadHistoricalRatesFromCSV();
    }
  }

  // Método para compatibilidad con código antiguo
  static async getHistoricalRate(
    baseCurrency: string,
    targetCurrency: string,
    date?: string
  ): Promise<ExchangeRate | null> {
    return this.getExchangeRate(baseCurrency, targetCurrency, date);
  }

  // Convertir moneda
  static async convertCurrency(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    date?: string
  ): Promise<CurrencyConversion | null> {
    try {
      // Si las monedas son iguales, no hay conversión
      if (fromCurrency === toCurrency) {
        return {
          amount,
          fromCurrency,
          toCurrency,
          rate: 1,
          convertedAmount: amount,
          conversionDate: date || new Date().toISOString().split('T')[0]
        };
      }

      // Buscar tasa directa
      let rate = await this.getExchangeRate(fromCurrency, toCurrency, date);
      
      if (rate) {
        // Aplicar lógica correcta basada en el formato de la tasa
        let convertedAmount;
        if (fromCurrency === 'VES') {
          // Si la tasa es menor a 1, significa que es USD/VES, multiplicamos
          // Si la tasa es mayor a 1, significa que es VES/USD, dividimos
          convertedAmount = rate.rate < 1 ? amount * rate.rate : amount / rate.rate;
        } else {
          // Para conversión inversa (de otra moneda a VES)
          convertedAmount = rate.rate < 1 ? amount / rate.rate : amount * rate.rate;
        }
        const operation = (fromCurrency === 'VES' && rate.rate < 1) || (fromCurrency !== 'VES' && rate.rate >= 1) ? '×' : '÷';
        console.log(`💱 Conversión ${fromCurrency} -> ${toCurrency}: ${amount} ${operation} ${rate.rate} = ${convertedAmount}`);
        
        return {
          amount,
          fromCurrency,
          toCurrency,
          rate: rate.rate,
          convertedAmount,
          conversionDate: rate.rate_date
        };
      }

      // Buscar tasa inversa
      const inverseRate = await this.getExchangeRate(toCurrency, fromCurrency, date);
      if (inverseRate && inverseRate.rate !== 0) {
        const calculatedRate = 1 / inverseRate.rate;
        // Para tasa inversa, aplicar la misma lógica basada en el valor de la tasa
        let convertedAmount;
        if (fromCurrency === 'VES') {
          convertedAmount = calculatedRate < 1 ? amount * calculatedRate : amount / calculatedRate;
        } else {
          convertedAmount = calculatedRate < 1 ? amount / calculatedRate : amount * calculatedRate;
        }
        const operation = (fromCurrency === 'VES' && calculatedRate < 1) || (fromCurrency !== 'VES' && calculatedRate >= 1) ? '×' : '÷';
        console.log(`💱 Conversión inversa ${fromCurrency} -> ${toCurrency}: ${amount} ${operation} ${calculatedRate} = ${convertedAmount}`);
        
        return {
          amount,
          fromCurrency,
          toCurrency,
          rate: calculatedRate,
          convertedAmount,
          conversionDate: inverseRate.rate_date
        };
      }

      // Conversión a través de USD como moneda puente
      if (fromCurrency !== 'USD' && toCurrency !== 'USD') {
        const fromToUSD = await this.convertCurrency(amount, fromCurrency, 'USD', date);
        if (fromToUSD) {
          return await this.convertCurrency(fromToUSD.convertedAmount, 'USD', toCurrency, date);
        }
      }

      return null;
    } catch (error) {
      console.error('Error converting currency:', error);
      return null;
    }
  }

  // Método simplificado para obtener solo la tasa numérica
  static async getRate(
    fromCurrency: string,
    toCurrency: string,
    date?: string
  ): Promise<number | null> {
    console.log(`🔍 getRate solicitado: ${fromCurrency} -> ${toCurrency}, fecha: ${date}`);
    const exchangeRate = await this.getExchangeRate(fromCurrency, toCurrency, date);
    console.log(`📊 getRate resultado:`, exchangeRate);
    return exchangeRate ? exchangeRate.rate : null;
  }

  // Obtener tasas del BCV
  static async fetchBCVRates(): Promise<ExchangeRate[]> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const rates: ExchangeRate[] = [];
      
      // Obtener tasa USD
      try {
        const usdResponse = await fetch(`${this.BCV_API_URL}/exchange-rates/latest/USD`);
        if (usdResponse.ok) {
          const usdData = await usdResponse.json();
          if (usdData.rate) {
            rates.push({
              base_currency: 'VES',
              target_currency: 'USD',
              rate: parseFloat(usdData.rate),
              rate_date: usdData.date || today,
              source: 'BCV'
            });
          }
        }
      } catch (error) {
        console.warn('Error obteniendo tasa USD del BCV:', error);
      }
      
      // Obtener tasa EUR
      try {
        const eurResponse = await fetch(`${this.BCV_API_URL}/exchange-rates/latest/EUR`);
        if (eurResponse.ok) {
          const eurData = await eurResponse.json();
          if (eurData.rate) {
            rates.push({
              base_currency: 'VES',
              target_currency: 'EUR',
              rate: parseFloat(eurData.rate),
              rate_date: eurData.date || today,
              source: 'BCV'
            });
          }
        }
      } catch (error) {
        console.warn('Error obteniendo tasa EUR del BCV:', error);
      }
      
      if (rates.length === 0) {
        // Si no se pudieron obtener tasas actuales, intentar obtener las últimas disponibles
        return await this.getLastAvailableRates();
      }
      
      return rates;
    } catch (error) {
      console.error('Error fetching BCV rates:', error);
      return await this.getLastAvailableRates();
    }
  }

  static async getLastAvailableRates(): Promise<ExchangeRate[]> {
    try {
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('*')
        .eq('source', 'BCV')
        .order('rate_date', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting last available rates:', error);
      return [];
    }
  }

  static async fetchECBRates(): Promise<ExchangeRate[]> {
    try {
      const response = await fetch(this.ECB_API_URL);
      if (!response.ok) throw new Error('Failed to fetch ECB rates');
      
      const data = await response.json();
      const today = new Date().toISOString().split('T')[0];
      
      return Object.entries(data.rates).map(([currency, rate]) => ({
        base_currency: 'EUR',
        target_currency: currency,
        rate: rate as number,
        rate_date: today,
        source: 'ECB' as const
      }));
    } catch (error) {
      console.error('Error fetching ECB rates:', error);
      return [];
    }
  }

  static async saveExchangeRates(rates: ExchangeRate[]): Promise<void> {
    try {
      for (const rate of rates) {
        const { error } = await supabase
          .from('exchange_rates')
          .upsert({
            base_currency: rate.base_currency,
            target_currency: rate.target_currency,
            rate: rate.rate,
            rate_date: rate.rate_date,
            source: rate.source
          }, {
            onConflict: 'base_currency,target_currency,rate_date,source'
          });

        if (error) {
          console.error('Error saving exchange rate:', error);
        }
      }
    } catch (error) {
      console.error('Error saving exchange rates:', error);
      throw error;
    }
  }

  static async updateAllRates(): Promise<{ success: boolean; message: string }> {
    try {
      const allRates: ExchangeRate[] = [];
      
      // Obtener tasas del BCV
      try {
        const bcvRates = await this.fetchBCVRates();
        allRates.push(...bcvRates);
      } catch (error) {
        console.warn('No se pudieron obtener tasas del BCV:', error);
      }

      // Obtener tasas del BCE
      try {
        const ecbRates = await this.fetchECBRates();
        allRates.push(...ecbRates);
      } catch (error) {
        console.warn('No se pudieron obtener tasas del BCE:', error);
      }

      if (allRates.length > 0) {
        await this.saveExchangeRates(allRates);
        return {
          success: true,
          message: `Se actualizaron ${allRates.length} tasas de cambio exitosamente`
        };
      } else {
        return {
          success: false,
          message: 'No se pudieron obtener tasas de ninguna fuente'
        };
      }
    } catch (error) {
      console.error('Error updating rates:', error);
      return {
        success: false,
        message: `Error al actualizar tasas: ${error instanceof Error ? error.message : 'Error desconocido'}`
      };
    }
  }

  static async getCurrentRates(): Promise<ExchangeRate[]> {
    try {
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('*')
        .order('base_currency');

      if (error) throw error;
      
      // Log para depuración
      console.log('Tasas sin filtrar:', data);
      
      // Filtrado más estricto para eliminar tasas inválidas
      const validRates = (data || []).filter(rate => {
        // Verificar que todos los campos obligatorios estén definidos y sean válidos
        const isValid = (
          rate && 
          typeof rate.id === 'string' && rate.id.trim() !== '' &&
          typeof rate.base_currency === 'string' && rate.base_currency.trim() !== '' &&
          typeof rate.target_currency === 'string' && rate.target_currency.trim() !== '' &&
          typeof rate.rate === 'number' && !isNaN(rate.rate) &&
          typeof rate.rate_date === 'string' && rate.rate_date.trim() !== '' &&
          typeof rate.source === 'string' && rate.source.trim() !== ''
        );
        
        if (!isValid) {
          console.warn('Tasa inválida encontrada:', rate);
        }
        
        return isValid;
      });
      
      // Log para depuración
      console.log('Tasas filtradas en servicio:', validRates);
      
      return validRates;
    } catch (error) {
      console.error('Error getting current rates:', error);
      return [];
    }
  }
}

// Exportar función de compatibilidad
export const getHistoricalRate = async (amount: number, from: string, to: string, date: string): Promise<number> => {
  const conversion = await ExchangeRateService.convertCurrency(amount, from, to, date);
  return conversion ? conversion.convertedAmount : amount;
};