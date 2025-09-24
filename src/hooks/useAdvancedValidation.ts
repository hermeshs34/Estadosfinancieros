import React, { useState, useCallback, useEffect } from 'react';
import { 
  advancedValidator, 
  AdvancedValidationResult 
} from '../lib/validation/AdvancedFinancialValidator';

interface UseAdvancedValidationOptions {
  onValidationComplete?: (result: AdvancedValidationResult) => void;
  onValidationError?: (error: Error) => void;
  autoValidate?: boolean;
}

interface UseAdvancedValidationReturn {
  validationResult: AdvancedValidationResult | null;
  isValidating: boolean;
  error: Error | null;
  validate: (data: any[]) => Promise<void>;
  clearResult: () => void;
  retryValidation: () => Promise<void>;
}

export const useAdvancedValidation = (
  options: UseAdvancedValidationOptions = {}
): UseAdvancedValidationReturn => {
  const [validationResult, setValidationResult] = useState<AdvancedValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastData, setLastData] = useState<any[] | null>(null);

  const validate = useCallback(async (data: any[]) => {
    if (!data || data.length === 0) {
      setError(new Error('No hay datos para validar'));
      return;
    }

    setIsValidating(true);
    setError(null);
    setLastData(data);

    try {
      const result = await advancedValidator.validateFinancialData(data);
      setValidationResult(result);
      options.onValidationComplete?.(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Error desconocido durante la validación');
      setError(error);
      options.onValidationError?.(error);
    } finally {
      setIsValidating(false);
    }
  }, [options]);

  const retryValidation = useCallback(async () => {
    if (lastData) {
      await validate(lastData);
    }
  }, [lastData, validate]);

  const clearResult = useCallback(() => {
    setValidationResult(null);
    setError(null);
    setLastData(null);
  }, []);

  return {
    validationResult,
    isValidating,
    error,
    validate,
    clearResult,
    retryValidation
  };
};

// Hook especializado para validación de balances
export const useBalanceValidation = (options: UseAdvancedValidationOptions = {}) => {
  const validation = useAdvancedValidation(options);

  const validateBalance = useCallback(async (balanceData: any[]) => {
    // Validaciones específicas para balances antes de la validación general
    const requiredFields = ['cuenta', 'saldo', 'tipo'];
    const hasRequiredFields = balanceData.every(row => 
      requiredFields.every(field => field in row)
    );

    if (!hasRequiredFields) {
      throw new Error('Los datos del balance deben contener los campos: cuenta, saldo, tipo');
    }

    await validation.validate(balanceData);
  }, [validation]);

  return {
    ...validation,
    validateBalance
  };
};

// Hook especializado para validación de estados de resultados
export const useIncomeStatementValidation = (options: UseAdvancedValidationOptions = {}) => {
  const validation = useAdvancedValidation(options);

  const validateIncomeStatement = useCallback(async (incomeData: any[]) => {
    // Validaciones específicas para estados de resultados
    const requiredFields = ['cuenta', 'valor', 'categoria'];
    const hasRequiredFields = incomeData.every(row => 
      requiredFields.every(field => field in row)
    );

    if (!hasRequiredFields) {
      throw new Error('Los datos del estado de resultados deben contener los campos: cuenta, valor, categoria');
    }

    await validation.validate(incomeData);
  }, [validation]);

  return {
    ...validation,
    validateIncomeStatement
  };
};

// Hook para validación en tiempo real
export const useRealtimeValidation = (
  data: any[],
  debounceMs: number = 1000,
  options: UseAdvancedValidationOptions = {}
) => {
  const validation = useAdvancedValidation({
    ...options,
    autoValidate: true
  });

  // Debounced validation effect
  useEffect(() => {
    if (!data || data.length === 0) return;

    const timeoutId = setTimeout(() => {
      validation.validate(data);
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [data, debounceMs, validation.validate]);

  return validation;
};

export default useAdvancedValidation;