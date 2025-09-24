import { useState, useEffect, useCallback } from 'react';
import { DisplayScale, detectOptimalScale } from '../utils/formatFinancialValues';

interface UseDisplayScaleOptions {
  defaultScale?: DisplayScale;
  autoDetect?: boolean;
  storageKey?: string;
}

interface UseDisplayScaleReturn {
  currentScale: DisplayScale;
  setScale: (scale: DisplayScale) => void;
  autoDetectScale: (values: number[]) => DisplayScale;
  resetToDefault: () => void;
  isAutoDetected: boolean;
}

const DEFAULT_STORAGE_KEY = 'financial_app_display_scale';
const DEFAULT_SCALE: DisplayScale = 'millions';

/**
 * Hook personalizado para manejar la escala de visualización de valores financieros
 */
export const useDisplayScale = ({
  defaultScale = DEFAULT_SCALE,
  autoDetect = false,
  storageKey = DEFAULT_STORAGE_KEY
}: UseDisplayScaleOptions = {}): UseDisplayScaleReturn => {
  
  const [currentScale, setCurrentScale] = useState<DisplayScale>(defaultScale);
  const [isAutoDetected, setIsAutoDetected] = useState(false);

  // Cargar escala desde localStorage al inicializar
  useEffect(() => {
    try {
      const savedScale = localStorage.getItem(storageKey);
      if (savedScale && isValidScale(savedScale)) {
        setCurrentScale(savedScale as DisplayScale);
        console.log('📊 Escala cargada desde localStorage:', savedScale);
      }
    } catch (error) {
      console.warn('Error cargando escala desde localStorage:', error);
    }
  }, [storageKey]);

  // Guardar escala en localStorage cuando cambie
  const setScale = useCallback((scale: DisplayScale) => {
    setCurrentScale(scale);
    setIsAutoDetected(false);
    
    try {
      localStorage.setItem(storageKey, scale);
      console.log('💾 Escala guardada en localStorage:', scale);
    } catch (error) {
      console.warn('Error guardando escala en localStorage:', error);
    }
  }, [storageKey]);

  // Auto-detectar la mejor escala basada en un array de valores
  const autoDetectScale = useCallback((values: number[]): DisplayScale => {
    if (!values || values.length === 0) {
      return defaultScale;
    }

    // Filtrar valores válidos (no NaN, no infinitos, no cero)
    const validValues = values.filter(value => 
      typeof value === 'number' && 
      isFinite(value) && 
      !isNaN(value) && 
      value !== 0
    );

    if (validValues.length === 0) {
      return defaultScale;
    }

    // Encontrar el valor máximo absoluto
    const maxAbsValue = Math.max(...validValues.map(v => Math.abs(v)));
    
    // Detectar la escala óptima
    const optimalScale = detectOptimalScale(maxAbsValue);
    
    console.log('🔍 Auto-detección de escala:', {
      valoresAnalizados: validValues.length,
      valorMaximo: maxAbsValue.toLocaleString(),
      escalaOptima: optimalScale
    });

    // Si auto-detect está habilitado, aplicar automáticamente
    if (autoDetect) {
      setCurrentScale(optimalScale);
      setIsAutoDetected(true);
      
      try {
        localStorage.setItem(storageKey, optimalScale);
      } catch (error) {
        console.warn('Error guardando escala auto-detectada:', error);
      }
    }

    return optimalScale;
  }, [autoDetect, defaultScale, storageKey]);

  // Resetear a la escala por defecto
  const resetToDefault = useCallback(() => {
    setScale(defaultScale);
    setIsAutoDetected(false);
  }, [defaultScale, setScale]);

  return {
    currentScale,
    setScale,
    autoDetectScale,
    resetToDefault,
    isAutoDetected
  };
};

/**
 * Valida si una cadena es una escala válida
 */
function isValidScale(scale: string): boolean {
  return ['real', 'thousands', 'millions', 'billions'].includes(scale);
}

/**
 * Hook simplificado para casos donde solo se necesita la escala actual
 */
export const useCurrentScale = (): DisplayScale => {
  const { currentScale } = useDisplayScale();
  return currentScale;
};

/**
 * Hook para auto-detectar escala basada en datos financieros
 */
export const useAutoScale = (financialData: any[]): DisplayScale => {
  const { autoDetectScale } = useDisplayScale({ autoDetect: true });
  
  useEffect(() => {
    if (!financialData || financialData.length === 0) return;
    
    // Extraer valores numéricos de los datos financieros
    const values: number[] = [];
    
    financialData.forEach(item => {
      if (typeof item === 'object' && item !== null) {
        Object.values(item).forEach(value => {
          if (typeof value === 'number' && isFinite(value) && !isNaN(value)) {
            values.push(Math.abs(value));
          }
        });
      }
    });
    
    if (values.length > 0) {
      autoDetectScale(values);
    }
  }, [financialData, autoDetectScale]);
  
  const { currentScale } = useDisplayScale();
  return currentScale;
};

/**
 * Hook para manejar escalas específicas por tipo de reporte
 */
export const useReportScale = (reportType: 'balance' | 'income' | 'cashflow' | 'general') => {
  const storageKey = `financial_app_${reportType}_scale`;
  
  return useDisplayScale({
    storageKey,
    defaultScale: reportType === 'cashflow' ? 'thousands' : 'millions'
  });
};