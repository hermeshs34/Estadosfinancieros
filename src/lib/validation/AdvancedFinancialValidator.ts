import { FinancialData } from '../financialAnalysis';

/**
 * Interfaz para resultados de validación avanzada
 */
export interface AdvancedValidationResult {
  isValid: boolean;
  severity: 'error' | 'warning' | 'info';
  category: 'structure' | 'integrity' | 'business' | 'performance';
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: ValidationSuggestion[];
  metrics: ValidationMetrics;
  recommendations: string[];
}

export interface ValidationError {
  id: string;
  message: string;
  field?: string;
  rowIndex?: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  code: string;
  details?: any;
}

export interface ValidationWarning {
  id: string;
  message: string;
  field?: string;
  rowIndex?: number;
  impact: 'high' | 'medium' | 'low';
  suggestion?: string;
}

export interface ValidationSuggestion {
  id: string;
  message: string;
  category: 'optimization' | 'correction' | 'enhancement';
  priority: 'high' | 'medium' | 'low';
  actionable: boolean;
}

export interface ValidationMetrics {
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  completenessScore: number; // 0-100
  accuracyScore: number; // 0-100
  consistencyScore: number; // 0-100
  overallScore: number; // 0-100
  processingTime: number;
  dataQualityIndex: number;
}

/**
 * Validador financiero avanzado con múltiples niveles de validación
 */
export class AdvancedFinancialValidator {
  private validationRules: ValidationRule[] = [];
  private businessRules: BusinessRule[] = [];
  private performanceThresholds: PerformanceThresholds;

  constructor() {
    this.initializeValidationRules();
    this.initializeBusinessRules();
    this.performanceThresholds = {
      maxProcessingTime: 5000, // 5 segundos
      maxMemoryUsage: 100 * 1024 * 1024, // 100MB
      minDataQualityScore: 80
    };
  }

  /**
   * Ejecuta validación completa de datos financieros
   */
  public async validateFinancialData(
    data: FinancialData[],
    options: ValidationOptions = {}
  ): Promise<AdvancedValidationResult> {
    const startTime = performance.now();
    
    const result: AdvancedValidationResult = {
      isValid: true,
      severity: 'info',
      category: 'structure',
      errors: [],
      warnings: [],
      suggestions: [],
      metrics: this.initializeMetrics(data.length),
      recommendations: []
    };

    try {
      // Validación estructural
      await this.validateStructure(data, result, options);
      
      // Validación de integridad
      await this.validateIntegrity(data, result, options);
      
      // Validación de reglas de negocio
      await this.validateBusinessRules(data, result, options);
      
      // Validación de rendimiento
      await this.validatePerformance(data, result, options);
      
      // Calcular métricas finales
      this.calculateFinalMetrics(result, performance.now() - startTime);
      
      // Generar recomendaciones
      this.generateRecommendations(result);
      
    } catch (error) {
      result.errors.push({
        id: 'validation_error',
        message: `Error durante la validación: ${error.message}`,
        severity: 'critical',
        code: 'VALIDATION_FAILED'
      });
      result.isValid = false;
      result.severity = 'error';
    }

    return result;
  }

  /**
   * Validación estructural de datos
   */
  private async validateStructure(
    data: FinancialData[],
    result: AdvancedValidationResult,
    options: ValidationOptions
  ): Promise<void> {
    // Validar que no esté vacío
    if (!data || data.length === 0) {
      result.errors.push({
        id: 'empty_dataset',
        message: 'El conjunto de datos está vacío',
        severity: 'critical',
        code: 'EMPTY_DATA'
      });
      return;
    }

    // Validar estructura de campos requeridos
    const requiredFields = ['codigo', 'descripcion', 'saldoActual'];
    const sampleRecord = data[0];
    
    for (const field of requiredFields) {
      if (!(field in sampleRecord)) {
        result.errors.push({
          id: `missing_field_${field}`,
          message: `Campo requerido faltante: ${field}`,
          field,
          severity: 'high',
          code: 'MISSING_REQUIRED_FIELD'
        });
      }
    }

    // Validar consistencia de estructura
    const firstRecordKeys = Object.keys(sampleRecord).sort();
    for (let i = 1; i < Math.min(data.length, 100); i++) {
      const currentKeys = Object.keys(data[i]).sort();
      if (JSON.stringify(firstRecordKeys) !== JSON.stringify(currentKeys)) {
        result.warnings.push({
          id: `inconsistent_structure_${i}`,
          message: `Estructura inconsistente en registro ${i + 1}`,
          rowIndex: i,
          impact: 'medium',
          suggestion: 'Verificar que todos los registros tengan la misma estructura'
        });
      }
    }
  }

  /**
   * Validación de integridad de datos
   */
  private async validateIntegrity(
    data: FinancialData[],
    result: AdvancedValidationResult,
    options: ValidationOptions
  ): Promise<void> {
    const codigosUnicos = new Set<string>();
    const valoresNumericos: number[] = [];
    
    for (let i = 0; i < data.length; i++) {
      const record = data[i];
      
      // Validar códigos únicos
      if (record.codigo) {
        if (codigosUnicos.has(record.codigo)) {
          result.errors.push({
            id: `duplicate_code_${i}`,
            message: `Código duplicado: ${record.codigo}`,
            field: 'codigo',
            rowIndex: i,
            severity: 'high',
            code: 'DUPLICATE_CODE'
          });
        } else {
          codigosUnicos.add(record.codigo);
        }
      }
      
      // Validar valores numéricos
      if (record.saldoActual !== undefined && record.saldoActual !== null) {
        const valor = this.parseNumericValue(record.saldoActual);
        if (valor === null) {
          result.errors.push({
            id: `invalid_numeric_${i}`,
            message: `Valor numérico inválido: ${record.saldoActual}`,
            field: 'saldoActual',
            rowIndex: i,
            severity: 'medium',
            code: 'INVALID_NUMERIC'
          });
        } else {
          valoresNumericos.push(valor);
          
          // Detectar valores extremos
          if (Math.abs(valor) > 1e12) {
            result.warnings.push({
              id: `extreme_value_${i}`,
              message: `Valor extremo detectado: ${valor}`,
              field: 'saldoActual',
              rowIndex: i,
              impact: 'medium',
              suggestion: 'Verificar si el valor es correcto'
            });
          }
        }
      }
    }
    
    // Análisis estadístico de valores
    if (valoresNumericos.length > 0) {
      this.analyzeStatisticalOutliers(valoresNumericos, result);
    }
  }

  /**
   * Validación de reglas de negocio financiero
   */
  private async validateBusinessRules(
    data: FinancialData[],
    result: AdvancedValidationResult,
    options: ValidationOptions
  ): Promise<void> {
    // Validar ecuación patrimonial básica
    const activos = this.sumByAccountType(data, ['201', '202', '203']);
    const pasivos = this.sumByAccountType(data, ['301', '302', '303']);
    const patrimonio = this.sumByAccountType(data, ['401', '402', '403']);
    
    const diferencia = Math.abs(activos - (pasivos + patrimonio));
    const tolerancia = Math.max(activos, pasivos + patrimonio) * 0.01; // 1% de tolerancia
    
    if (diferencia > tolerancia) {
      result.errors.push({
        id: 'patrimonial_equation_error',
        message: `Ecuación patrimonial no balanceada. Diferencia: ${diferencia.toFixed(2)}`,
        severity: 'high',
        code: 'UNBALANCED_EQUATION',
        details: { activos, pasivos, patrimonio, diferencia }
      });
    }
    
    // Validar coherencia de signos
    this.validateAccountSigns(data, result);
    
    // Validar rangos típicos por tipo de cuenta
    this.validateAccountRanges(data, result);
  }

  /**
   * Validación de rendimiento y eficiencia
   */
  private async validatePerformance(
    data: FinancialData[],
    result: AdvancedValidationResult,
    options: ValidationOptions
  ): Promise<void> {
    const dataSize = JSON.stringify(data).length;
    
    if (dataSize > this.performanceThresholds.maxMemoryUsage) {
      result.warnings.push({
        id: 'large_dataset',
        message: `Conjunto de datos grande (${(dataSize / 1024 / 1024).toFixed(2)}MB)`,
        impact: 'medium',
        suggestion: 'Considerar procesamiento por lotes para mejorar rendimiento'
      });
    }
    
    // Validar eficiencia de estructura de datos
    const duplicateDescriptions = this.findDuplicateDescriptions(data);
    if (duplicateDescriptions.length > 0) {
      result.suggestions.push({
        id: 'optimize_descriptions',
        message: `Se encontraron ${duplicateDescriptions.length} descripciones duplicadas`,
        category: 'optimization',
        priority: 'low',
        actionable: true
      });
    }
  }

  /**
   * Analiza valores atípicos estadísticamente
   */
  private analyzeStatisticalOutliers(values: number[], result: AdvancedValidationResult): void {
    const sorted = [...values].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    
    const outliers = values.filter(v => v < lowerBound || v > upperBound);
    
    if (outliers.length > 0) {
      result.warnings.push({
        id: 'statistical_outliers',
        message: `Se detectaron ${outliers.length} valores atípicos estadísticamente`,
        impact: 'low',
        suggestion: 'Revisar valores que se desvían significativamente del patrón normal'
      });
    }
  }

  /**
   * Suma valores por tipo de cuenta
   */
  private sumByAccountType(data: FinancialData[], accountPrefixes: string[]): number {
    return data
      .filter(record => 
        record.codigo && 
        accountPrefixes.some(prefix => record.codigo.startsWith(prefix))
      )
      .reduce((sum, record) => {
        const value = this.parseNumericValue(record.saldoActual);
        return sum + (value || 0);
      }, 0);
  }

  /**
   * Valida signos de cuentas según su naturaleza
   */
  private validateAccountSigns(data: FinancialData[], result: AdvancedValidationResult): void {
    const accountSignRules = {
      '201': 'positive', // Activos corrientes
      '202': 'positive', // Activos no corrientes
      '301': 'negative', // Pasivos corrientes
      '302': 'negative', // Pasivos no corrientes
      '401': 'negative', // Patrimonio
      '501': 'negative', // Ingresos
      '601': 'positive'  // Gastos
    };
    
    for (let i = 0; i < data.length; i++) {
      const record = data[i];
      if (!record.codigo || !record.saldoActual) continue;
      
      const accountPrefix = record.codigo.substring(0, 3);
      const expectedSign = accountSignRules[accountPrefix];
      
      if (expectedSign) {
        const value = this.parseNumericValue(record.saldoActual);
        if (value !== null) {
          const isPositive = value > 0;
          const shouldBePositive = expectedSign === 'positive';
          
          if (isPositive !== shouldBePositive) {
            result.warnings.push({
              id: `incorrect_sign_${i}`,
              message: `Posible signo incorrecto en cuenta ${record.codigo}: ${value}`,
              field: 'saldoActual',
              rowIndex: i,
              impact: 'medium',
              suggestion: `Las cuentas tipo ${accountPrefix} generalmente tienen signo ${expectedSign === 'positive' ? 'positivo' : 'negativo'}`
            });
          }
        }
      }
    }
  }

  /**
   * Valida rangos típicos por tipo de cuenta
   */
  private validateAccountRanges(data: FinancialData[], result: AdvancedValidationResult): void {
    // Implementar validaciones de rangos específicas por industria
    // Por ejemplo, ratios típicos, límites regulatorios, etc.
  }

  /**
   * Encuentra descripciones duplicadas
   */
  private findDuplicateDescriptions(data: FinancialData[]): string[] {
    const descriptions = new Map<string, number>();
    
    data.forEach(record => {
      if (record.descripcion) {
        const desc = record.descripcion.toLowerCase().trim();
        descriptions.set(desc, (descriptions.get(desc) || 0) + 1);
      }
    });
    
    return Array.from(descriptions.entries())
      .filter(([_, count]) => count > 1)
      .map(([desc, _]) => desc);
  }

  /**
   * Parsea valor numérico de diferentes formatos
   */
  private parseNumericValue(value: any): number | null {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      // Remover separadores de miles y convertir comas decimales
      const cleaned = value.replace(/[,\s]/g, '').replace(/\./g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  }

  /**
   * Inicializa métricas de validación
   */
  private initializeMetrics(totalRecords: number): ValidationMetrics {
    return {
      totalRecords,
      validRecords: 0,
      invalidRecords: 0,
      completenessScore: 0,
      accuracyScore: 0,
      consistencyScore: 0,
      overallScore: 0,
      processingTime: 0,
      dataQualityIndex: 0
    };
  }

  /**
   * Calcula métricas finales
   */
  private calculateFinalMetrics(result: AdvancedValidationResult, processingTime: number): void {
    const metrics = result.metrics;
    metrics.processingTime = processingTime;
    
    // Calcular puntuaciones
    const errorWeight = result.errors.length * 10;
    const warningWeight = result.warnings.length * 5;
    const totalPenalty = errorWeight + warningWeight;
    
    metrics.overallScore = Math.max(0, 100 - totalPenalty);
    metrics.completenessScore = Math.max(0, 100 - (result.errors.filter(e => e.code.includes('MISSING')).length * 20));
    metrics.accuracyScore = Math.max(0, 100 - (result.errors.filter(e => e.code.includes('INVALID')).length * 15));
    metrics.consistencyScore = Math.max(0, 100 - (result.warnings.filter(w => w.id.includes('inconsistent')).length * 10));
    
    metrics.dataQualityIndex = (metrics.completenessScore + metrics.accuracyScore + metrics.consistencyScore) / 3;
    
    // Determinar validez general
    result.isValid = result.errors.length === 0 && metrics.dataQualityIndex >= this.performanceThresholds.minDataQualityScore;
    
    if (result.errors.length > 0) {
      result.severity = 'error';
    } else if (result.warnings.length > 0) {
      result.severity = 'warning';
    }
  }

  /**
   * Genera recomendaciones basadas en los resultados
   */
  private generateRecommendations(result: AdvancedValidationResult): void {
    if (result.errors.length > 0) {
      result.recommendations.push('Corregir errores críticos antes de proceder con el análisis');
    }
    
    if (result.warnings.length > 5) {
      result.recommendations.push('Revisar y corregir advertencias para mejorar la calidad de datos');
    }
    
    if (result.metrics.dataQualityIndex < 90) {
      result.recommendations.push('Implementar procesos de limpieza de datos para mejorar la calidad');
    }
    
    if (result.metrics.processingTime > this.performanceThresholds.maxProcessingTime) {
      result.recommendations.push('Optimizar el tamaño del conjunto de datos para mejorar el rendimiento');
    }
  }

  /**
   * Inicializa reglas de validación
   */
  private initializeValidationRules(): void {
    // Implementar reglas de validación específicas
  }

  /**
   * Inicializa reglas de negocio
   */
  private initializeBusinessRules(): void {
    // Implementar reglas de negocio específicas
  }
}

// Interfaces auxiliares
interface ValidationRule {
  id: string;
  name: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  validate: (data: FinancialData[]) => ValidationError[];
}

interface BusinessRule {
  id: string;
  name: string;
  description: string;
  category: string;
  validate: (data: FinancialData[]) => ValidationError[];
}

interface PerformanceThresholds {
  maxProcessingTime: number;
  maxMemoryUsage: number;
  minDataQualityScore: number;
}

export interface ValidationOptions {
  skipBusinessRules?: boolean;
  skipPerformanceValidation?: boolean;
  customRules?: ValidationRule[];
  toleranceLevel?: 'strict' | 'normal' | 'lenient';
}

// Instancia singleton del validador
export const advancedValidator = new AdvancedFinancialValidator();