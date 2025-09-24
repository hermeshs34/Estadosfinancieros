import React, { useMemo } from 'react';
import { Card } from '../ui/Card';
import { FileText, Upload, TrendingUp, PieChart, Target } from 'lucide-react';
import { useDataContext } from '../../contexts/DataContext';
import { FinancialAnalysisView } from '../analysis/FinancialAnalysisView';
import { formatPercentage, formatPercentageValue, formatRatio } from '../../lib/numberFormatting';
import { useCurrency, type Currency } from '../../hooks/useCurrency';

export const IncomeStatement: React.FC = () => {
  const { incomeStatementData, financialAnalysis } = useDataContext();
  const { selectedCurrency, exchangeRates } = useCurrency();

  // Normalizar datos del estado de resultados
  const isData = incomeStatementData || {
    revenue: 0,
    costOfGoodsSold: 0,
    grossProfit: 0,
    operatingExpenses: 0,
    operatingIncome: 0,
    totalExpenses: 0,
    netIncome: 0
  };

  const symbols: { [key: string]: string } = {
    'VES': 'Bs.',
    'USD': '$',
    'EUR': '€'
  };

  const customFormatCurrency = (amount: number, currency: string) => {
    const formattedAmount = new Intl.NumberFormat('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
    const symbol = symbols[currency];
    return `${symbol} ${formattedAmount}`;
  };

  // Función optimizada para formatear montos con conversión de moneda síncrona (igual que BalanceSheet)
  const formatIncomeAmount = useMemo(() => {
    return (amount: number) => {
      if (!amount || isNaN(amount)) return customFormatCurrency(0, selectedCurrency);
      
      // Si la moneda seleccionada es VES, no necesitamos conversión
      if (selectedCurrency === 'VES') {
        return customFormatCurrency(amount, selectedCurrency);
      }
      
      // Usar las tasas de cambio cargadas para conversión síncrona
      if (exchangeRates && exchangeRates['VES'] && exchangeRates['VES'][selectedCurrency]) {
        const rate = exchangeRates['VES'][selectedCurrency];
        // Para convertir de VES a otra moneda, dividimos por la tasa
        // Si la tasa es menor a 1, significa que es USD/VES, multiplicamos
        // Si la tasa es mayor a 1, significa que es VES/USD, dividimos
        const convertedAmount = rate < 1 ? amount * rate : amount / rate;
        return customFormatCurrency(convertedAmount, selectedCurrency);
      }
      
      // Si no hay tasas disponibles, mostrar en VES
      console.warn(`⚠️ No hay tasa de cambio disponible para VES -> ${selectedCurrency}`);
      return customFormatCurrency(amount, 'VES');
    };
  }, [selectedCurrency, exchangeRates]);

  const convertIncomeAmount = (amount: number | undefined) => {
    const value = amount || 0;
    return formatIncomeAmount(value);
  };
  
  const convertAndFormatParenthesis = (amount: number | undefined) => {
    const value = amount || 0;
    const formattedAmount = formatIncomeAmount(value);
    // Extraer solo el número sin el símbolo de moneda para los paréntesis
    const numberOnly = formattedAmount.replace(/^[^\d]*/, '').trim();
    return `(${numberOnly})`;
  };

  // Función para calcular márgenes
  const calculateMargin = (numerator: number, denominator: number): number => {
    if (denominator === 0) return 0;
    return (numerator / denominator) * 100;
  };

  const formatPercentage = (value: number): string => {
    return `${value.toFixed(2)}%`;
  };

  if (!incomeStatementData || !isData || Object.values(isData).every(val => val === 0)) {
    return (
      <div className="space-y-6">
        <Card className="p-8">
          <div className="flex flex-col items-center justify-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Estado de Resultados no disponible
            </h3>
            <p className="text-gray-600 text-center mb-6 max-w-md">
              El estado de resultados se generará automáticamente una vez que 
              importe datos financieros desde la sección "Data Import".
            </p>
            <div className="flex items-center text-sm text-gray-500">
              <Upload className="w-4 h-4 mr-2" />
              <span>Importe datos para ver el estado de resultados</span>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Estado de Resultados</h2>
          <p className="text-gray-600">Estado de ingresos y gastos</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <TrendingUp className="w-4 h-4" />
          <span>Estado de Resultados Procesado</span>
        </div>
      </div>

      {/* Estado de Resultados Estructurado */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="space-y-6">
          {/* INGRESOS */}
          <div className="border-b border-gray-200 pb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <TrendingUp className="w-5 h-5 text-green-600 mr-2" />
              INGRESOS
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Ventas / Ingresos Operacionales</span>
                <span className="font-medium">{convertIncomeAmount(isData?.revenue)}</span>
              </div>
              <div className="flex justify-between items-center font-semibold bg-green-50 p-3 rounded">
                <span className="text-green-800">Total Ingresos</span>
                <span className="text-green-800">{convertIncomeAmount(isData?.revenue)}</span>
              </div>
            </div>
          </div>

          {/* COSTOS */}
          <div className="border-b border-gray-200 pb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <PieChart className="w-5 h-5 text-red-600 mr-2" />
              COSTOS Y GASTOS
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Costo de Ventas</span>
                <span className="font-medium text-red-600">{convertAndFormatParenthesis(isData?.costOfGoodsSold)}</span>
              </div>
              <div className="flex justify-between items-center font-semibold border-t pt-2">
                <span>Utilidad Bruta</span>
                <span className={`${(isData?.grossProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {convertIncomeAmount(isData?.grossProfit)}
                </span>
              </div>
              
              <div className="mt-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Gastos Operacionales</span>
                  <span className="font-medium text-red-600">{convertAndFormatParenthesis(isData?.operatingExpenses)}</span>
                </div>
                <div className="flex justify-between items-center font-semibold border-t pt-2">
                  <span>Utilidad Operacional</span>
                  <span className={`${(isData?.operatingIncome || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {convertIncomeAmount(isData?.operatingIncome)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* RESULTADO FINAL */}
          <div className="bg-blue-50 p-4 rounded">
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold text-blue-800">UTILIDAD NETA</span>
              <span className={`text-xl font-bold ${
                (isData?.netIncome || 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {convertIncomeAmount(isData?.netIncome)}
              </span>
            </div>
          </div>

          {/* MÁRGENES */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-gray-50 p-4 rounded">
              <div className="text-sm text-gray-600 mb-1">Margen Bruto</div>
              <div className="text-lg font-semibold">
                {isData?.revenue ? 
                  formatPercentage(calculateMargin(isData.grossProfit || 0, isData.revenue)) : 
                  '0%'
                }
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded">
              <div className="text-sm text-gray-600 mb-1">Margen Operacional</div>
              <div className="text-lg font-semibold">
                {isData?.revenue ? 
                  formatPercentage(calculateMargin(isData.operatingIncome || 0, isData.revenue)) : 
                  '0%'
                }
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded">
              <div className="text-sm text-gray-600 mb-1">Margen Neto</div>
              <div className="text-lg font-semibold">
                {isData?.revenue ? 
                  formatPercentage(calculateMargin(isData.netIncome || 0, isData.revenue)) : 
                  '0%'
                }
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Análisis de Rentabilidad */}
      {financialAnalysis && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <PieChart className="w-6 h-6 text-green-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Análisis de Rentabilidad</h3>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                <span className="text-gray-700">ROE (Rentabilidad Patrimonio)</span>
                <span className="font-bold text-green-600">
                  {formatPercentageValue(financialAnalysis.ratios.rentabilidad.roe)}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                <span className="text-gray-700">ROA (Rentabilidad Activos)</span>
                <span className="font-bold text-blue-600">
                  {formatPercentageValue(financialAnalysis.ratios.rentabilidad.roa)}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-purple-50 rounded">
                <span className="text-gray-700">Margen Neto</span>
                <span className="font-bold text-purple-600">
                  {formatPercentageValue(financialAnalysis.ratios.rentabilidad.margenNeto)}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-orange-50 rounded">
                <span className="text-gray-700">Margen Bruto</span>
                <span className="font-bold text-orange-600">
                  {formatPercentageValue(financialAnalysis.ratios.rentabilidad.margenBruto)}
                </span>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <Target className="w-6 h-6 text-indigo-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Eficiencia Operativa</h3>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-indigo-50 rounded">
                <span className="text-gray-700">Rotación de Activos</span>
                <span className="font-bold text-indigo-600">
                  {formatRatio(financialAnalysis.ratios.actividad.rotacionActivos)}x
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-teal-50 rounded">
                <span className="text-gray-700">Rotación de Inventarios</span>
                <span className="font-bold text-teal-600">
                  {formatRatio(financialAnalysis.ratios.actividad.rotacionInventarios)}x
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-pink-50 rounded">
                <span className="text-gray-700">Rotación Cuentas por Cobrar</span>
                <span className="font-bold text-pink-600">
                  {formatRatio(financialAnalysis.ratios.actividad.rotacionCuentasPorCobrar)}x
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Análisis Financiero Completo */}
      {financialAnalysis && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Análisis Completo de Rentabilidad</h3>
          <FinancialAnalysisView analysis={financialAnalysis} />
        </div>
      )}
    </div>
  );
};