import React from 'react';
import { Card } from '../ui/Card';
import { TrendingUp, Upload, BarChart3 } from 'lucide-react';
import { useDataContext } from '../../contexts/DataContext';
import { DateFilter } from '../ui/DateFilter';

export const ComparativeAnalysis: React.FC = () => {
  const {
    importedData,
    selectedMonth,
    selectedYear,
    availableMonths,
    availableYears,
    setDateFilter
  } = useDataContext();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Análisis Comparativo</h1>
          <p className="text-gray-600 mt-1">Comparación de rendimiento financiero período a período</p>
        </div>
      </div>

      {importedData.length > 0 && (
        <DateFilter
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          availableMonths={availableMonths}
          availableYears={availableYears}
          onMonthChange={(month) => setDateFilter(month, selectedYear)}
          onYearChange={(year) => setDateFilter(selectedMonth, year)}
        />
      )}

      <Card>
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="text-center">
            <BarChart3 className="w-20 h-20 text-gray-300 mx-auto mb-6" />
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              {importedData.length === 0 ? 'No hay datos para análisis comparativo' : 'Análisis Comparativo por Mes/Año'}
            </h3>
            <p className="text-gray-600 mb-6 max-w-lg">
              {importedData.length === 0 
                ? 'Para realizar análisis comparativos entre períodos, necesita importar datos financieros de múltiples períodos desde la sección "Data Import".'
                : `Comparando datos ${selectedMonth && selectedMonth !== 'all' ? `del mes ${selectedMonth}` : 'de todos los meses'} ${selectedYear && selectedYear !== 'all' ? `del año ${selectedYear}` : 'de todos los años'}.`
              }
            </p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 max-w-md mx-auto">
              <div className="flex items-start space-x-3">
                <TrendingUp className="w-5 h-5 text-green-600 mt-0.5" />
                <div className="text-left">
                  <h4 className="text-sm font-semibold text-green-900 mb-1">
                    Análisis disponibles:
                  </h4>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>• Tendencias de ingresos y rentabilidad</li>
                    <li>• Crecimiento período a período</li>
                    <li>• Evolución de ratios financieros</li>
                    <li>• Análisis trimestral/anual</li>
                  </ul>
                </div>
              </div>
            </div>
            {importedData.length === 0 && (
              <div className="flex items-center justify-center text-sm text-gray-500 mt-6">
                <Upload className="w-4 h-4 mr-2" />
                <span>Importe datos de múltiples períodos para comenzar</span>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};