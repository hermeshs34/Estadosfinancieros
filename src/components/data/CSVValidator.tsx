import React, { useState, useCallback } from 'react';
import { CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { formatCurrency } from '../../lib/utils/numberFormatting';
import { advancedValidator, AdvancedValidationResult } from '../../lib/validation/AdvancedFinancialValidator';
import AdvancedValidationDisplay from '../validation/AdvancedValidationDisplay';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  stats: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    duplicateRows: number;
    emptyRows: number;
  };
}

interface CSVValidatorState {
  validationResult: ValidationResult | null;
  advancedValidationResult: AdvancedValidationResult | null;
  showAdvancedValidation: boolean;
  isValidating: boolean;
}

interface CSVValidatorProps {
  data: DataRow[];
  onValidationComplete?: (result: ValidationResult) => void;
}

interface DataRow {
  [key: string]: any;
}

export class CSVValidatorService {
  private requiredColumns = [
    'codigo', 'descripcion', 'saldoactual'
  ];

  private alternativeColumns = {
    'codigo': ['Codigo', 'code', 'Code', 'cuenta', 'Cuenta'],
    'descripcion': ['Descripcion', 'Description', 'nombre', 'Nombre'],
    'saldoactual': ['SaldoActual', 'Saldo', 'Valor', 'Value', 'saldo', 'valor']
  };

  private numericColumns = [
    'saldoactual', 'SaldoActual', 'Saldo', 'Valor', 'Value',
    'debitos', 'Debitos', 'creditos', 'Creditos',
    'saldoinicial', 'SaldoInicial'
  ];

  /**
   * Valida la estructura y contenido de los datos CSV
   */
  public validateCSVData(data: DataRow[]): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: [],
      stats: {
        totalRows: data.length,
        validRows: 0,
        invalidRows: 0,
        duplicateRows: 0,
        emptyRows: 0
      }
    };

    // Validación básica: archivo vacío
    if (data.length === 0) {
      result.isValid = false;
      result.errors.push('El archivo CSV está vacío');
      return result;
    }

    // Validar estructura de columnas
    this.validateColumns(data, result);

    // Validar contenido de filas
    this.validateRows(data, result);

    // Detectar duplicados
    this.detectDuplicates(data, result);

    // Validar rangos de valores
    this.validateValueRanges(data, result);

    // Generar sugerencias
    this.generateSuggestions(data, result);

    return result;
  }

  /**
   * Valida que existan las columnas necesarias
   */
  private validateColumns(data: DataRow[], result: ValidationResult): void {
    if (data.length === 0) return;

    const availableColumns = Object.keys(data[0]);
    const missingColumns: string[] = [];

    for (const requiredCol of this.requiredColumns) {
      const hasColumn = this.findColumnVariant(availableColumns, requiredCol);
      if (!hasColumn) {
        missingColumns.push(requiredCol);
      }
    }

    if (missingColumns.length > 0) {
      result.errors.push(
        `Columnas requeridas faltantes: ${missingColumns.join(', ')}`
      );
      result.suggestions.push(
        'Asegúrate de que el archivo contenga al menos las columnas: código, descripción y saldo actual'
      );
    }

    // Verificar si hay columnas con nombres similares
    for (const missing of missingColumns) {
      const similar = this.findSimilarColumns(availableColumns, missing);
      if (similar.length > 0) {
        result.warnings.push(
          `Posibles columnas similares a '${missing}': ${similar.join(', ')}`
        );
      }
    }
  }

  /**
   * Valida el contenido de cada fila
   */
  private validateRows(data: DataRow[], result: ValidationResult): void {
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNumber = i + 1;
      let isValidRow = true;

      // Verificar si la fila está completamente vacía
      if (this.isEmptyRow(row)) {
        result.stats.emptyRows++;
        continue;
      }

      // Validar código
      const codigo = this.getColumnValue(row, 'codigo');
      if (!codigo || codigo.toString().trim() === '') {
        result.warnings.push(`Fila ${rowNumber}: Código vacío o faltante`);
        isValidRow = false;
      }

      // Validar descripción
      const descripcion = this.getColumnValue(row, 'descripcion');
      if (!descripcion || descripcion.toString().trim().length < 2) {
        result.warnings.push(`Fila ${rowNumber}: Descripción muy corta o faltante`);
      }

      // Validar valores numéricos
      for (const numCol of this.numericColumns) {
        const value = row[numCol];
        if (value !== undefined && value !== null && value !== '') {
          if (!this.isValidNumericValue(value)) {
            result.errors.push(
              `Fila ${rowNumber}: Valor no numérico en columna '${numCol}': '${value}'`
            );
            isValidRow = false;
          }
        }
      }

      // Validar que al menos tenga un valor significativo
      const hasSignificantValue = this.hasSignificantValues(row);
      if (!hasSignificantValue && codigo && descripcion) {
        result.warnings.push(
          `Fila ${rowNumber}: No tiene valores numéricos significativos`
        );
      }

      if (isValidRow) {
        result.stats.validRows++;
      } else {
        result.stats.invalidRows++;
      }
    }
  }

  /**
   * Detecta filas duplicadas
   */
  private detectDuplicates(data: DataRow[], result: ValidationResult): void {
    const seen = new Set<string>();
    const duplicates: number[] = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const codigo = this.getColumnValue(row, 'codigo');
      const descripcion = this.getColumnValue(row, 'descripcion');
      
      if (codigo && descripcion) {
        const key = `${codigo.toString().trim()}-${descripcion.toString().trim()}`;
        if (seen.has(key)) {
          duplicates.push(i + 1);
        } else {
          seen.add(key);
        }
      }
    }

    if (duplicates.length > 0) {
      result.stats.duplicateRows = duplicates.length;
      result.warnings.push(
        `Se encontraron ${duplicates.length} filas duplicadas en las líneas: ${duplicates.join(', ')}`
      );
    }
  }

  /**
   * Valida rangos de valores para detectar posibles errores
   */
  private validateValueRanges(data: DataRow[], result: ValidationResult): void {
    const values: number[] = [];
    
    for (const row of data) {
      const saldoActual = this.getNumericValue(this.getColumnValue(row, 'saldoactual'));
      if (saldoActual !== null && !isNaN(saldoActual)) {
        values.push(Math.abs(saldoActual));
      }
    }

    if (values.length > 0) {
      const max = Math.max(...values);
      const min = Math.min(...values.filter(v => v > 0));
      const avg = values.reduce((a, b) => a + b, 0) / values.length;

      // Detectar valores extremos
      const threshold = avg * 1000; // 1000 veces el promedio
      const extremeValues = values.filter(v => v > threshold);
      
      if (extremeValues.length > 0) {
        result.warnings.push(
          `Se detectaron ${extremeValues.length} valores extremadamente altos que podrían ser errores`
        );
      }

      // Verificar consistencia decimal
      const hasDecimals = values.some(v => v % 1 !== 0);
      const allIntegers = values.every(v => v % 1 === 0);
      
      if (allIntegers && max > 1000000) {
        result.suggestions.push(
          'Los valores parecen estar en unidades menores (ej: centavos). Considera si necesitas dividir por 100.'
        );
      }
    }
  }

  /**
   * Genera sugerencias basadas en el análisis de datos
   */
  private generateSuggestions(data: DataRow[], result: ValidationResult): void {
    // Sugerir formato estándar si se detectan inconsistencias
    const hasInconsistentFormat = result.warnings.some(w => 
      w.includes('Código vacío') || w.includes('Descripción muy corta')
    );

    if (hasInconsistentFormat) {
      result.suggestions.push(
        'Considera usar el formato estándar CSV con columnas: Codigo, Descripcion, SaldoActual'
      );
    }

    // Sugerir limpieza de datos
    if (result.stats.emptyRows > 0) {
      result.suggestions.push(
        `Se encontraron ${result.stats.emptyRows} filas vacías que serán ignoradas automáticamente`
      );
    }

    // Sugerir revisión de duplicados
    if (result.stats.duplicateRows > 0) {
      result.suggestions.push(
        'Revisa las filas duplicadas para evitar errores en los cálculos'
      );
    }
  }

  // Métodos auxiliares
  private findColumnVariant(availableColumns: string[], targetColumn: string): boolean {
    const variants = [targetColumn, ...(this.alternativeColumns[targetColumn] || [])];
    return variants.some(variant => 
      availableColumns.some(col => col.toLowerCase() === variant.toLowerCase())
    );
  }

  private findSimilarColumns(availableColumns: string[], target: string): string[] {
    return availableColumns.filter(col => {
      const similarity = this.calculateSimilarity(col.toLowerCase(), target.toLowerCase());
      return similarity > 0.6 && similarity < 1.0;
    });
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  private getColumnValue(row: DataRow, columnType: string): any {
    const variants = [columnType, ...(this.alternativeColumns[columnType] || [])];
    for (const variant of variants) {
      if (row[variant] !== undefined) {
        return row[variant];
      }
    }
    return null;
  }

  private isEmptyRow(row: DataRow): boolean {
    return Object.values(row).every(value => 
      value === null || value === undefined || value === '' || 
      (typeof value === 'string' && value.trim() === '')
    );
  }

  private isValidNumericValue(value: any): boolean {
    if (value === null || value === undefined || value === '') return true;
    
    const stringValue = value.toString().trim();
    if (stringValue === '') return true;
    
    // Permitir formatos comunes de números
    const numericPattern = /^-?[\d,.]+(\([\d,.]+\))?$/;
    return numericPattern.test(stringValue) || !isNaN(parseFloat(stringValue));
  }

  private hasSignificantValues(row: DataRow): boolean {
    for (const numCol of this.numericColumns) {
      const value = this.getNumericValue(row[numCol]);
      if (value !== null && !isNaN(value) && Math.abs(value) > 0.001) {
        return true;
      }
    }
    return false;
  }

  private getNumericValue(value: any): number | null {
    if (value === null || value === undefined || value === '') return null;
    
    let cleaned = value.toString().trim();
    
    // Manejar paréntesis como números negativos
    if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
      cleaned = '-' + cleaned.slice(1, -1);
    }
    
    // Remover caracteres no numéricos excepto punto, coma y guión
    cleaned = cleaned.replace(/[^\d.,-]/g, '');
    
    // Manejar separadores decimales
    if (cleaned.includes('.') && cleaned.includes(',')) {
      if (cleaned.lastIndexOf('.') > cleaned.lastIndexOf(',')) {
        cleaned = cleaned.replace(/,/g, '');
      } else {
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
      }
    } else if (cleaned.includes(',')) {
      const parts = cleaned.split(',');
      if (parts.length === 2 && parts[1].length <= 3) {
        cleaned = cleaned.replace(',', '.');
      } else {
        cleaned = cleaned.replace(/,/g, '');
      }
    }
    
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }
}

// Componente React para mostrar los resultados de validación
interface ValidationDisplayProps {
  validationResult: ValidationResult;
  onClose?: () => void;
}

export const CSVValidator: React.FC<CSVValidatorProps> = ({ data, onValidationComplete }) => {
  const [state, setState] = useState<CSVValidatorState>({
    validationResult: null,
    advancedValidationResult: null,
    showAdvancedValidation: false,
    isValidating: false
  });

  const validator = new CSVValidatorService();

  const runBasicValidation = useCallback(async () => {
    setState(prev => ({ ...prev, isValidating: true }));
    
    try {
      const result = validator.validateCSVData(data);
      setState(prev => ({ ...prev, validationResult: result, isValidating: false }));
      onValidationComplete?.(result);
    } catch (error) {
      console.error('Error during validation:', error);
      setState(prev => ({ ...prev, isValidating: false }));
    }
  }, [data, onValidationComplete]);

  const runAdvancedValidation = useCallback(async () => {
    setState(prev => ({ ...prev, isValidating: true, showAdvancedValidation: true }));
    
    try {
      const result = await advancedValidator.validateFinancialData(data);
      setState(prev => ({ 
        ...prev, 
        advancedValidationResult: result, 
        isValidating: false 
      }));
    } catch (error) {
      console.error('Error during advanced validation:', error);
      setState(prev => ({ ...prev, isValidating: false }));
    }
  }, [data]);

  const handleCloseAdvanced = () => {
    setState(prev => ({ ...prev, showAdvancedValidation: false }));
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <button
          onClick={runBasicValidation}
          disabled={state.isValidating}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {state.isValidating ? 'Validando...' : 'Validación Básica'}
        </button>
        
        <button
          onClick={runAdvancedValidation}
          disabled={state.isValidating}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
        >
          {state.isValidating ? 'Validando...' : 'Validación Avanzada'}
        </button>
      </div>

      {state.validationResult && (
        <ValidationDisplay 
          validationResult={state.validationResult} 
          onClose={() => setState(prev => ({ ...prev, validationResult: null }))}
        />
      )}

      {state.showAdvancedValidation && state.advancedValidationResult && (
         <AdvancedValidationDisplay 
           validationResult={state.advancedValidationResult}
           onClose={handleCloseAdvanced}
           onRetry={runAdvancedValidation}
         />
       )}
    </div>
  );
};

export const ValidationDisplay: React.FC<ValidationDisplayProps> = ({ 
  validationResult, 
  onClose 
}) => {
  const { isValid, errors, warnings, suggestions, stats } = validationResult;

  return (
    <div className="mt-4 p-4 border rounded-lg bg-white">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">
          Resultado de Validación {isValid ? '✅' : '❌'}
        </h3>
        {onClose && (
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        )}
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4 text-sm">
        <div className="text-center p-2 bg-blue-50 rounded">
          <div className="font-bold text-blue-600">{stats.totalRows}</div>
          <div className="text-blue-500">Total</div>
        </div>
        <div className="text-center p-2 bg-green-50 rounded">
          <div className="font-bold text-green-600">{stats.validRows}</div>
          <div className="text-green-500">Válidas</div>
        </div>
        <div className="text-center p-2 bg-red-50 rounded">
          <div className="font-bold text-red-600">{stats.invalidRows}</div>
          <div className="text-red-500">Inválidas</div>
        </div>
        <div className="text-center p-2 bg-yellow-50 rounded">
          <div className="font-bold text-yellow-600">{stats.duplicateRows}</div>
          <div className="text-yellow-500">Duplicadas</div>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded">
          <div className="font-bold text-gray-600">{stats.emptyRows}</div>
          <div className="text-gray-500">Vacías</div>
        </div>
      </div>

      {/* Errores */}
      {errors.length > 0 && (
        <div className="mb-4">
          <h4 className="font-semibold text-red-600 mb-2">❌ Errores:</h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Advertencias */}
      {warnings.length > 0 && (
        <div className="mb-4">
          <h4 className="font-semibold text-yellow-600 mb-2">⚠️ Advertencias:</h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-yellow-700">
            {warnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Sugerencias */}
      {suggestions.length > 0 && (
        <div className="mb-4">
          <h4 className="font-semibold text-blue-600 mb-2">💡 Sugerencias:</h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-blue-700">
            {suggestions.map((suggestion, index) => (
              <li key={index}>{suggestion}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CSVValidator;