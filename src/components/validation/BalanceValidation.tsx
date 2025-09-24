import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Shield, Zap } from 'lucide-react';
import { PatrimonialEquationValidation } from '../../lib/financialAnalysis';
import { formatCurrency } from '../../lib/numberFormatting';
import { useBalanceValidation } from '../../hooks/useAdvancedValidation';
import AdvancedValidationDisplay from './AdvancedValidationDisplay';

interface BalanceValidationProps {
  validation: PatrimonialEquationValidation;
  balanceData?: any[];
  onAdvancedValidation?: (result: any) => void;
}

export const BalanceValidation: React.FC<BalanceValidationProps> = ({ 
  validation, 
  balanceData,
  onAdvancedValidation 
}) => {
  const [showAdvancedValidation, setShowAdvancedValidation] = useState(false);
  
  const {
    validationResult: advancedResult,
    isValidating: isAdvancedValidating,
    validateBalance,
    clearResult
  } = useBalanceValidation({
    onValidationComplete: (result) => {
      setShowAdvancedValidation(true);
      onAdvancedValidation?.(result);
    }
  });

  const handleAdvancedValidation = async () => {
    if (balanceData && balanceData.length > 0) {
      try {
        await validateBalance(balanceData);
      } catch (error) {
        console.error('Error en validación avanzada:', error);
      }
    }
  };

  const handleCloseAdvanced = () => {
    setShowAdvancedValidation(false);
    clearResult();
  };


  const getStatusIcon = () => {
    if (validation.hasSignErrors) {
      return <XCircle className="w-5 h-5 text-red-500" />;
    } else if (!validation.isValid) {
      return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    } else {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
  };

  const getStatusColor = () => {
    if (validation.hasSignErrors) {
      return 'border-red-200 bg-red-50';
    } else if (!validation.isValid) {
      return 'border-yellow-200 bg-yellow-50';
    } else {
      return 'border-green-200 bg-green-50';
    }
  };

  return (
    <div className={`rounded-lg border-2 p-6 ${getStatusColor()}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <h3 className="text-lg font-semibold text-gray-900">
            Validación de Ecuación Patrimonial
          </h3>
        </div>
        
        {balanceData && balanceData.length > 0 && (
          <div className="flex gap-2">
            <button
              onClick={handleAdvancedValidation}
              disabled={isAdvancedValidating}
              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Shield className="w-4 h-4 mr-2" />
              {isAdvancedValidating ? 'Validando...' : 'Validación Avanzada'}
            </button>
          </div>
        )}
      </div>

      {validation.errorMessage && (
        <div className="mb-4 p-3 bg-white rounded border border-gray-200">
          <p className="text-sm text-gray-700">
            <strong>⚠️ Alerta:</strong> {validation.errorMessage}
          </p>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h4 className="text-sm font-medium text-gray-900">
            Tabla de Control - Ecuación Patrimonial
          </h4>
          <p className="text-xs text-gray-600 mt-1">
            Activo = Pasivo + Patrimonio + Resultado del Ejercicio
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Concepto
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  Activo
                </td>
                <td className="px-4 py-3 text-sm text-right text-gray-900 font-mono">
                  {formatCurrency(validation.activo)}
                </td>
              </tr>
              <tr className="bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  Pasivo + Capital
                </td>
                <td className={`px-4 py-3 text-sm text-right font-mono ${
                  validation.pasivo + validation.patrimonio < 0 ? 'text-red-600' : 'text-gray-900'
                }`}>
                  {formatCurrency(validation.pasivo + validation.patrimonio)}
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  Egreso - Ingreso
                </td>
                <td className="px-4 py-3 text-sm text-right text-gray-900 font-mono">
                  {formatCurrency(validation.egresoMenosIngreso)}
                </td>
              </tr>
              <tr className="bg-blue-50 border-t-2 border-blue-200">
                <td className="px-4 py-3 text-sm font-semibold text-blue-900">
                  Control (Activo + Egreso-Ingreso)
                </td>
                <td className="px-4 py-3 text-sm text-right text-blue-900 font-mono font-semibold">
                  {formatCurrency(validation.control)}
                </td>
              </tr>
              <tr className={`border-t-2 ${
                Math.abs(validation.diferencia) <= 0.01 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
              }`}>
                <td className={`px-4 py-3 text-sm font-semibold ${
                  Math.abs(validation.diferencia) <= 0.01 ? 'text-green-900' : 'text-red-900'
                }`}>
                  Diferencia vs (Pasivo+Capital)
                </td>
                <td className={`px-4 py-3 text-sm text-right font-mono font-semibold ${
                  Math.abs(validation.diferencia) <= 0.01 ? 'text-green-900' : 'text-red-900'
                }`}>
                  {formatCurrency(validation.diferencia)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 text-xs text-gray-600">
        <p className="mb-2">
          <strong>📌 Explicación de columnas:</strong>
        </p>
        <ul className="space-y-1 ml-4">
          <li>• <strong>Activo:</strong> Total de activos del balance</li>
          <li>• <strong>Pasivo+Capital:</strong> Suma de pasivo exigible + patrimonio</li>
          <li>• <strong>Egreso-Ingreso:</strong> Resultado del ejercicio (gastos - ingresos)</li>
          <li>• <strong>Control:</strong> Fórmula de validación (Activo + Egreso-Ingreso)</li>
          <li>• <strong>Diferencia:</strong> Si es distinto de 0, hay un error de clasificación/signo</li>
        </ul>
        <p className="mt-2">
          <strong>✅ Interpretación:</strong> Si la diferencia es 0, la contabilidad está cuadrada. 
          Si la diferencia ≠ 0 o aparece signo invertido, revisar cuentas de resultado o patrimonio.
        </p>
      </div>
      
      {/* Modal de Validación Avanzada */}
      {showAdvancedValidation && advancedResult && (
        <AdvancedValidationDisplay
          validationResult={advancedResult}
          onClose={handleCloseAdvanced}
          onRetry={handleAdvancedValidation}
        />
      )}
    </div>
  );
};

export default BalanceValidation;