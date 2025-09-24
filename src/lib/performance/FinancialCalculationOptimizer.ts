import { FinancialData, FinancialRatios, FinancialInsights } from '../financialAnalysis';

// Cache para resultados de cálculos
interface CalculationCache {
  [key: string]: {
    result: any;
    timestamp: number;
    dataHash: string;
  };
}

// Worker pool para cálculos intensivos
interface WorkerTask {
  id: string;
  type: 'ratios' | 'validation' | 'analysis';
  data: any;
  resolve: (result: any) => void;
  reject: (error: Error) => void;
}

export class FinancialCalculationOptimizer {
  private cache: CalculationCache = {};
  private workerPool: Worker[] = [];
  private taskQueue: WorkerTask[] = [];
  private isProcessing = false;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutos
  private readonly MAX_WORKERS = navigator.hardwareConcurrency || 4;

  constructor() {
    this.initializeWorkerPool();
  }

  private initializeWorkerPool(): void {
    // En un entorno real, aquí inicializaríamos Web Workers
    // Por ahora, simulamos el comportamiento
    console.log(`Inicializando pool de ${this.MAX_WORKERS} workers para cálculos financieros`);
  }

  // Generar hash de datos para cache
  private generateDataHash(data: any): string {
    return btoa(JSON.stringify(data)).slice(0, 16);
  }

  // Verificar si el cache es válido
  private isCacheValid(cacheEntry: any): boolean {
    return Date.now() - cacheEntry.timestamp < this.CACHE_TTL;
  }

  // Obtener resultado del cache
  private getCachedResult(key: string, dataHash: string): any | null {
    const cached = this.cache[key];
    if (cached && cached.dataHash === dataHash && this.isCacheValid(cached)) {
      console.log(`📋 Cache hit para: ${key}`);
      return cached.result;
    }
    return null;
  }

  // Guardar resultado en cache
  private setCachedResult(key: string, result: any, dataHash: string): void {
    this.cache[key] = {
      result,
      timestamp: Date.now(),
      dataHash
    };
    console.log(`💾 Resultado cacheado para: ${key}`);
  }

  // Limpiar cache expirado
  private cleanExpiredCache(): void {
    const now = Date.now();
    Object.keys(this.cache).forEach(key => {
      if (!this.isCacheValid(this.cache[key])) {
        delete this.cache[key];
      }
    });
  }

  // Optimizar búsqueda de valores con índices
  public createDataIndex(data: FinancialData[]): Map<string, FinancialData[]> {
    const index = new Map<string, FinancialData[]>();
    
    data.forEach(row => {
      // Crear índices por diferentes campos
      const cuenta = (row.Cuenta || row.cuenta || '').toLowerCase();
      const codigo = (row.Codigo || row.codigo || '').toLowerCase();
      const descripcion = (row.Descripcion || row.descripcion || '').toLowerCase();
      
      // Indexar por palabras clave
      const keywords = [...cuenta.split(' '), ...codigo.split('.'), ...descripcion.split(' ')]
        .filter(word => word.length > 2);
      
      keywords.forEach(keyword => {
        if (!index.has(keyword)) {
          index.set(keyword, []);
        }
        index.get(keyword)!.push(row);
      });
    });
    
    console.log(`📊 Índice creado con ${index.size} entradas para ${data.length} registros`);
    return index;
  }

  // Búsqueda optimizada usando índices
  public optimizedFindValue(keywords: string[], dataIndex: Map<string, FinancialData[]>): number {
    const startTime = performance.now();
    
    // Buscar en el índice
    const candidates = new Set<FinancialData>();
    
    keywords.forEach(keyword => {
      const keywordLower = keyword.toLowerCase();
      const matches = dataIndex.get(keywordLower) || [];
      matches.forEach(match => candidates.add(match));
    });
    
    // Procesar candidatos
    let bestMatch: { row: FinancialData; score: number; value: number } | null = null;
    
    for (const row of candidates) {
      const cuenta = (row.Cuenta || row.cuenta || '').toLowerCase();
      const codigo = (row.Codigo || row.codigo || '').toLowerCase();
      
      // Calcular score de relevancia
      let score = 0;
      keywords.forEach(keyword => {
        const keywordLower = keyword.toLowerCase();
        if (cuenta.includes(keywordLower)) score += 2;
        if (codigo.includes(keywordLower)) score += 3;
      });
      
      if (score > 0) {
        const value = this.extractValueFromRow(row);
        if (value > 0 && (!bestMatch || score > bestMatch.score)) {
          bestMatch = { row, score, value };
        }
      }
    }
    
    const endTime = performance.now();
    console.log(`⚡ Búsqueda optimizada completada en ${(endTime - startTime).toFixed(2)}ms`);
    
    return bestMatch ? bestMatch.value : 0;
  }

  private extractValueFromRow(row: FinancialData): number {
    // Extraer valor con orden de prioridad optimizado
    const candidates = [
      row.SaldoActual, row.Saldo, row.Valor, row.valor,
      row.Monto, row.monto, row.Amount, row.amount
    ];
    
    for (const candidate of candidates) {
      if (candidate !== undefined && candidate !== null && candidate !== '') {
        const parsed = this.parseNumber(candidate);
        if (!isNaN(parsed) && parsed !== 0) {
          return Math.abs(parsed);
        }
      }
    }
    
    // Calcular desde débitos/créditos si es necesario
    const debitos = this.parseNumber(row.Debitos || 0);
    const creditos = this.parseNumber(row.Creditos || 0);
    const saldoInicial = this.parseNumber(row.SaldoInicial || 0);
    
    if (debitos !== 0 || creditos !== 0) {
      return Math.abs(saldoInicial + debitos - creditos);
    }
    
    return 0;
  }

  private parseNumber(value: unknown): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const cleaned = value.replace(/[^\d.,-]/g, '').replace(',', '.');
      return parseFloat(cleaned) || 0;
    }
    return 0;
  }

  // Cálculo de ratios con cache y optimización
  public async calculateOptimizedRatios(data: FinancialData[]): Promise<FinancialRatios> {
    const dataHash = this.generateDataHash(data);
    const cacheKey = `ratios_${dataHash}`;
    
    // Verificar cache
    const cachedResult = this.getCachedResult(cacheKey, dataHash);
    if (cachedResult) {
      console.log('⚡ Ratios obtenidos del cache');
      return cachedResult;
    }
    
    const startTime = performance.now();
    
    // Crear índice de datos para búsquedas optimizadas
    const dataIndex = this.createDataIndex(data);
    
    // Calcular componentes principales usando búsquedas optimizadas
    const activoCorriente = this.optimizedFindValue(['activo corriente', 'activos corrientes', '201'], dataIndex);
    const pasivoCorriente = this.optimizedFindValue(['pasivo corriente', 'pasivos corrientes', '301'], dataIndex);
    const activoTotal = this.optimizedFindValue(['activo total', 'activos totales', 'total activo'], dataIndex);
    const pasivoTotal = this.optimizedFindValue(['pasivo total', 'pasivos totales', 'total pasivo'], dataIndex);
    const patrimonio = this.optimizedFindValue(['patrimonio', 'capital', 'equity'], dataIndex);
    const utilidadNeta = this.optimizedFindValue(['utilidad neta', 'ganancia neta', 'resultado'], dataIndex);
    const ingresos = this.optimizedFindValue(['ingresos', 'ventas', 'revenue'], dataIndex);
    const costoVentas = this.optimizedFindValue(['costo ventas', 'costo de ventas', '501'], dataIndex);
    const inventarios = this.optimizedFindValue(['inventarios', 'inventario', 'mercancia'], dataIndex);
    const cuentasPorCobrar = this.optimizedFindValue(['cuentas por cobrar', 'clientes', 'deudores'], dataIndex);
    const efectivo = this.optimizedFindValue(['efectivo', 'caja', 'bancos'], dataIndex);
    
    const ratios: FinancialRatios = {
      liquidez: {
        corriente: pasivoCorriente > 0 ? activoCorriente / pasivoCorriente : 0,
        rapida: pasivoCorriente > 0 ? (activoCorriente - inventarios) / pasivoCorriente : 0,
        efectivo: pasivoCorriente > 0 ? efectivo / pasivoCorriente : 0
      },
      rentabilidad: {
        roe: patrimonio > 0 ? (utilidadNeta / patrimonio) * 100 : 0,
        roa: activoTotal > 0 ? (utilidadNeta / activoTotal) * 100 : 0,
        margenNeto: ingresos > 0 ? (utilidadNeta / ingresos) * 100 : 0,
        margenBruto: ingresos > 0 ? ((ingresos - costoVentas) / ingresos) * 100 : 0
      },
      endeudamiento: {
        total: activoTotal > 0 ? (pasivoTotal / activoTotal) * 100 : 0,
        patrimonial: patrimonio > 0 ? (pasivoTotal / patrimonio) * 100 : 0,
        cobertura: utilidadNeta > 0 ? pasivoTotal / utilidadNeta : 0
      },
      actividad: {
        rotacionActivos: ingresos > 0 && activoTotal > 0 ? ingresos / activoTotal : 0,
        rotacionInventarios: costoVentas > 0 && inventarios > 0 ? costoVentas / inventarios : 0,
        rotacionCuentasPorCobrar: ingresos > 0 && cuentasPorCobrar > 0 ? ingresos / cuentasPorCobrar : 0
      }
    };
    
    const endTime = performance.now();
    console.log(`⚡ Ratios optimizados calculados en ${(endTime - startTime).toFixed(2)}ms`);
    
    // Guardar en cache
    this.setCachedResult(cacheKey, ratios, dataHash);
    
    return ratios;
  }

  // Procesamiento por lotes para grandes volúmenes
  public async processBatchCalculations(dataBatches: FinancialData[][]): Promise<FinancialRatios[]> {
    const results: FinancialRatios[] = [];
    const startTime = performance.now();
    
    // Procesar lotes en paralelo con control de concurrencia
    const batchSize = Math.min(this.MAX_WORKERS, dataBatches.length);
    const chunks = [];
    
    for (let i = 0; i < dataBatches.length; i += batchSize) {
      chunks.push(dataBatches.slice(i, i + batchSize));
    }
    
    for (const chunk of chunks) {
      const promises = chunk.map(async (batch, index) => {
        console.log(`⚡ Procesando lote optimizado ${index + 1}`);
        return this.calculateOptimizedRatios(batch);
      });
      
      const chunkResults = await Promise.all(promises);
      results.push(...chunkResults);
    }
    
    const endTime = performance.now();
    console.log(`⚡ Procesamiento por lotes completado en ${(endTime - startTime).toFixed(2)}ms`);
    
    return results;
  }

  // Limpiar recursos
  public cleanup(): void {
    this.cleanExpiredCache();
    this.workerPool.forEach(worker => worker.terminate());
    this.workerPool = [];
    console.log('🧹 Recursos de optimización limpiados');
  }

  // Obtener estadísticas de rendimiento
  public getPerformanceStats(): {
    cacheSize: number;
    cacheHitRate: number;
    activeWorkers: number;
    memoryUsage: number;
  } {
    const cacheSize = Object.keys(this.cache).length;
    const memoryUsage = JSON.stringify(this.cache).length;
    
    return {
      cacheSize,
      cacheHitRate: cacheSize > 0 ? (cacheSize / (cacheSize + this.taskQueue.length)) * 100 : 0,
      activeWorkers: this.workerPool.length,
      memoryUsage: Math.round(memoryUsage / 1024) // KB
    };
  }

  // Método para validar y optimizar datos antes del cálculo
  public validateAndOptimizeData(data: FinancialData[]): {
    validData: FinancialData[];
    errors: string[];
    optimizations: string[];
  } {
    const validData: FinancialData[] = [];
    const errors: string[] = [];
    const optimizations: string[] = [];
    
    data.forEach((row, index) => {
      // Validar estructura básica
      if (!row || typeof row !== 'object') {
        errors.push(`Fila ${index + 1}: Estructura de datos inválida`);
        return;
      }
      
      // Validar campos requeridos
      const hasCode = row.Codigo || row.codigo || row.Code;
      const hasDescription = row.Descripcion || row.descripcion || row.Description;
      const hasValue = row.SaldoActual !== undefined || row.Saldo !== undefined || row.Valor !== undefined;
      
      if (!hasCode && !hasDescription) {
        errors.push(`Fila ${index + 1}: Falta código o descripción`);
        return;
      }
      
      if (!hasValue) {
        optimizations.push(`Fila ${index + 1}: Sin valor numérico, se asignará 0`);
      }
      
      validData.push(row);
    });
    
    return { validData, errors, optimizations };
  }
}

// Instancia singleton del optimizador
export const financialOptimizer = new FinancialCalculationOptimizer();

// Función de utilidad para análisis rápido
export async function quickFinancialAnalysis(data: FinancialData[]): Promise<{
  ratios: FinancialRatios;
  performance: any;
  validation: any;
}> {
  const startTime = performance.now();
  
  // Validar y optimizar datos
  const validation = financialOptimizer.validateAndOptimizeData(data);
  
  // Calcular ratios optimizados
  const ratios = await financialOptimizer.calculateOptimizedRatios(validation.validData);
  
  // Obtener estadísticas de rendimiento
  const performanceStats = financialOptimizer.getPerformanceStats();
  
  const endTime = performance.now();
  
  return {
    ratios,
    performance: {
      ...performanceStats,
      totalTime: endTime - startTime
    },
    validation
  };
}