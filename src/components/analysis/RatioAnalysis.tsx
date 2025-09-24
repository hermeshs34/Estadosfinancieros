import React from 'react';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Calculator, Upload, FileText } from 'lucide-react';
import { useDataContext } from '../../contexts/DataContext';
import { DateFilter } from '../ui/DateFilter';
import { FinancialAnalysisView } from './FinancialAnalysisView';

export const RatioAnalysis: React.FC = () => {
  const {
    financialAnalysis,
    importedData,
    selectedMonth,
    selectedYear,
    availableMonths,
    availableYears,
    setDateFilter
  } = useDataContext();

  if (!financialAnalysis) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Análisis de Ratios Financieros</h1>
            <p className="text-gray-600 mt-1">Métricas de rendimiento financiero y benchmarking</p>
          </div>
        </div>

        <Card>
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="text-center">
              <Calculator className="w-20 h-20 text-gray-300 mx-auto mb-6" />
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                No hay datos para análisis de ratios
              </h3>
              <p className="text-gray-600 mb-6 max-w-lg">
                Para generar análisis de ratios financieros, primero debe importar estados financieros desde la sección "Data Import".
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
                <div className="flex items-start space-x-3">
                  <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="text-left">
                    <h4 className="text-sm font-semibold text-blue-900 mb-1">
                      Tipos de ratios disponibles:
                    </h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• Ratios de liquidez</li>
                      <li>• Ratios de rentabilidad</li>
                      <li>• Ratios de apalancamiento</li>
                      <li>• Ratios de eficiencia</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-center text-sm text-gray-500 mt-6">
                <Upload className="w-4 h-4 mr-2" />
                <span>Importe archivos CSV, Excel o PDF para comenzar el análisis</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Análisis de Ratios Financieros</h1>
          <p className="text-gray-600 mt-1">Métricas de rendimiento financiero y benchmarking</p>
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

      <FinancialAnalysisView analysis={financialAnalysis} />
    </div>
  );
};