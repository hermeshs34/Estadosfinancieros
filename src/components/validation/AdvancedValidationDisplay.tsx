import React, { useState } from 'react';
import { 
  AdvancedValidationResult, 
  ValidationError, 
  ValidationWarning, 
  ValidationSuggestion 
} from '../../lib/validation/AdvancedFinancialValidator';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  XCircleIcon, 
  InformationCircleIcon,
  ChartBarIcon,
  ClockIcon,
  CpuChipIcon
} from '@heroicons/react/24/outline';

interface AdvancedValidationDisplayProps {
  validationResult: AdvancedValidationResult;
  onClose?: () => void;
  onRetry?: () => void;
}

export const AdvancedValidationDisplay: React.FC<AdvancedValidationDisplayProps> = ({
  validationResult,
  onClose,
  onRetry
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'errors' | 'warnings' | 'suggestions' | 'metrics'>('overview');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'high': return 'text-red-500 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-blue-600 bg-blue-50';
      case 'error': return 'text-red-600 bg-red-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      case 'info': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Estado General */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Estado General de Validación</h3>
          <div className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            validationResult.isValid 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {validationResult.isValid ? (
              <CheckCircleIcon className="w-4 h-4 mr-1" />
            ) : (
              <XCircleIcon className="w-4 h-4 mr-1" />
            )}
            {validationResult.isValid ? 'Válido' : 'Inválido'}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{validationResult.errors.length}</div>
            <div className="text-sm text-red-600">Errores</div>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{validationResult.warnings.length}</div>
            <div className="text-sm text-yellow-600">Advertencias</div>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{validationResult.suggestions.length}</div>
            <div className="text-sm text-blue-600">Sugerencias</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className={`text-2xl font-bold ${getScoreColor(validationResult.metrics.overallScore)}`}>
              {validationResult.metrics.overallScore.toFixed(0)}%
            </div>
            <div className="text-sm text-green-600">Puntuación</div>
          </div>
        </div>
      </div>

      {/* Métricas de Calidad */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Métricas de Calidad de Datos</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Completitud</span>
            <div className="flex items-center">
              <div className="w-32 bg-gray-200 rounded-full h-2 mr-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${validationResult.metrics.completenessScore}%` }}
                ></div>
              </div>
              <span className={`text-sm font-medium ${getScoreColor(validationResult.metrics.completenessScore)}`}>
                {validationResult.metrics.completenessScore.toFixed(0)}%
              </span>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Precisión</span>
            <div className="flex items-center">
              <div className="w-32 bg-gray-200 rounded-full h-2 mr-2">
                <div 
                  className="bg-green-600 h-2 rounded-full" 
                  style={{ width: `${validationResult.metrics.accuracyScore}%` }}
                ></div>
              </div>
              <span className={`text-sm font-medium ${getScoreColor(validationResult.metrics.accuracyScore)}`}>
                {validationResult.metrics.accuracyScore.toFixed(0)}%
              </span>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Consistencia</span>
            <div className="flex items-center">
              <div className="w-32 bg-gray-200 rounded-full h-2 mr-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full" 
                  style={{ width: `${validationResult.metrics.consistencyScore}%` }}
                ></div>
              </div>
              <span className={`text-sm font-medium ${getScoreColor(validationResult.metrics.consistencyScore)}`}>
                {validationResult.metrics.consistencyScore.toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recomendaciones Principales */}
      {validationResult.recommendations.length > 0 && (
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recomendaciones Principales</h3>
          <ul className="space-y-2">
            {validationResult.recommendations.map((recommendation, index) => (
              <li key={index} className="flex items-start">
                <InformationCircleIcon className="w-5 h-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-700">{recommendation}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  const renderErrors = () => (
    <div className="space-y-4">
      {validationResult.errors.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <CheckCircleIcon className="w-12 h-12 mx-auto mb-2 text-green-500" />
          <p>No se encontraron errores</p>
        </div>
      ) : (
        validationResult.errors.map((error, index) => (
          <div key={error.id} className="bg-white rounded-lg border border-red-200 p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start">
                <XCircleIcon className="w-5 h-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center mb-1">
                    <span className={`px-2 py-1 rounded text-xs font-medium mr-2 ${
                      getSeverityColor(error.severity)
                    }`}>
                      {error.severity.toUpperCase()}
                    </span>
                    {error.field && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        Campo: {error.field}
                      </span>
                    )}
                    {error.rowIndex !== undefined && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded ml-1">
                        Fila: {error.rowIndex + 1}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-900 font-medium">{error.message}</p>
                  <p className="text-xs text-gray-500 mt-1">Código: {error.code}</p>
                  
                  {error.details && (
                    <div className="mt-2">
                      <button
                        onClick={() => toggleExpanded(error.id)}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        {expandedItems.has(error.id) ? 'Ocultar detalles' : 'Ver detalles'}
                      </button>
                      {expandedItems.has(error.id) && (
                        <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                          {JSON.stringify(error.details, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderWarnings = () => (
    <div className="space-y-4">
      {validationResult.warnings.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <CheckCircleIcon className="w-12 h-12 mx-auto mb-2 text-green-500" />
          <p>No se encontraron advertencias</p>
        </div>
      ) : (
        validationResult.warnings.map((warning, index) => (
          <div key={warning.id} className="bg-white rounded-lg border border-yellow-200 p-4">
            <div className="flex items-start">
              <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="flex items-center mb-1">
                  <span className={`px-2 py-1 rounded text-xs font-medium mr-2 ${
                    getSeverityColor(warning.impact)
                  }`}>
                    {warning.impact.toUpperCase()}
                  </span>
                  {warning.field && (
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      Campo: {warning.field}
                    </span>
                  )}
                  {warning.rowIndex !== undefined && (
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded ml-1">
                      Fila: {warning.rowIndex + 1}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-900 font-medium">{warning.message}</p>
                {warning.suggestion && (
                  <p className="text-xs text-gray-600 mt-1">
                    <strong>Sugerencia:</strong> {warning.suggestion}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderSuggestions = () => (
    <div className="space-y-4">
      {validationResult.suggestions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <InformationCircleIcon className="w-12 h-12 mx-auto mb-2 text-blue-500" />
          <p>No hay sugerencias disponibles</p>
        </div>
      ) : (
        validationResult.suggestions.map((suggestion, index) => (
          <div key={suggestion.id} className="bg-white rounded-lg border border-blue-200 p-4">
            <div className="flex items-start">
              <InformationCircleIcon className="w-5 h-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="flex items-center mb-1">
                  <span className={`px-2 py-1 rounded text-xs font-medium mr-2 ${
                    getSeverityColor(suggestion.priority)
                  }`}>
                    {suggestion.priority.toUpperCase()}
                  </span>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {suggestion.category}
                  </span>
                  {suggestion.actionable && (
                    <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded ml-1">
                      Accionable
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-900">{suggestion.message}</p>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderMetrics = () => (
    <div className="space-y-6">
      {/* Estadísticas de Procesamiento */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Estadísticas de Procesamiento</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center p-4 bg-gray-50 rounded-lg">
            <ChartBarIcon className="w-8 h-8 text-blue-500 mr-3" />
            <div>
              <div className="text-lg font-semibold text-gray-900">
                {validationResult.metrics.totalRecords.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Total de Registros</div>
            </div>
          </div>
          
          <div className="flex items-center p-4 bg-gray-50 rounded-lg">
            <ClockIcon className="w-8 h-8 text-green-500 mr-3" />
            <div>
              <div className="text-lg font-semibold text-gray-900">
                {validationResult.metrics.processingTime.toFixed(0)}ms
              </div>
              <div className="text-sm text-gray-600">Tiempo de Procesamiento</div>
            </div>
          </div>
          
          <div className="flex items-center p-4 bg-gray-50 rounded-lg">
            <CpuChipIcon className="w-8 h-8 text-purple-500 mr-3" />
            <div>
              <div className={`text-lg font-semibold ${getScoreColor(validationResult.metrics.dataQualityIndex)}`}>
                {validationResult.metrics.dataQualityIndex.toFixed(1)}
              </div>
              <div className="text-sm text-gray-600">Índice de Calidad</div>
            </div>
          </div>
        </div>
      </div>

      {/* Desglose de Validación */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Desglose de Validación</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-sm font-medium text-gray-700">Registros Válidos</span>
            <span className="text-sm text-green-600 font-semibold">
              {validationResult.metrics.validRecords} / {validationResult.metrics.totalRecords}
            </span>
          </div>
          
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-sm font-medium text-gray-700">Registros Inválidos</span>
            <span className="text-sm text-red-600 font-semibold">
              {validationResult.metrics.invalidRecords}
            </span>
          </div>
          
          <div className="flex justify-between items-center py-2">
            <span className="text-sm font-medium text-gray-700">Tasa de Éxito</span>
            <span className={`text-sm font-semibold ${
              validationResult.metrics.totalRecords > 0 
                ? getScoreColor((validationResult.metrics.validRecords / validationResult.metrics.totalRecords) * 100)
                : 'text-gray-500'
            }`}>
              {validationResult.metrics.totalRecords > 0 
                ? ((validationResult.metrics.validRecords / validationResult.metrics.totalRecords) * 100).toFixed(1)
                : '0'
              }%
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  const tabs = [
    { id: 'overview', label: 'Resumen', count: null },
    { id: 'errors', label: 'Errores', count: validationResult.errors.length },
    { id: 'warnings', label: 'Advertencias', count: validationResult.warnings.length },
    { id: 'suggestions', label: 'Sugerencias', count: validationResult.suggestions.length },
    { id: 'metrics', label: 'Métricas', count: null }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Validación Avanzada de Datos Financieros</h2>
            <p className="text-sm text-gray-600 mt-1">
              Análisis completo de calidad e integridad de datos
            </p>
          </div>
          <div className="flex space-x-2">
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100"
              >
                Revalidar
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cerrar
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                {tab.count !== null && tab.count > 0 && (
                  <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'errors' && renderErrors()}
          {activeTab === 'warnings' && renderWarnings()}
          {activeTab === 'suggestions' && renderSuggestions()}
          {activeTab === 'metrics' && renderMetrics()}
        </div>
      </div>
    </div>
  );
};

export default AdvancedValidationDisplay;