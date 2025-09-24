import React from 'react';
import { Card } from '../ui/Card';
import { FileText, Upload, DollarSign, Droplets, Activity } from 'lucide-react';
import { useDataContext } from '../../contexts/DataContext';
import { FinancialAnalysisView } from '../analysis/FinancialAnalysisView';
import { formatRatio } from '../../lib/numberFormatting';
import { useCurrency, type Currency } from '../../hooks/useCurrency';

export const CashFlowStatement: React.FC = () => {
  const { cashFlowData, importedData, financialAnalysis } = useDataContext();
  const { selectedCurrency, exchangeRates } = useCurrency();

  const customFormatCurrency = (amount: number, currency: Currency): string => {
    const symbols = {
      VES: 'Bs.',
      USD: '$',
      EUR: '€'
    };
    
    const formattedAmount = new Intl.NumberFormat('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
    
    const symbol = symbols[currency];
    return `${symbol} ${formattedAmount}`;
  };

  // Función optimizada para formatear montos con conversión de moneda síncrona (igual que BalanceSheet e IncomeStatement)
  const convertAndFormat = (amount: number | undefined) => {
    const value = amount || 0;
    if (!value || isNaN(value)) return customFormatCurrency(0, selectedCurrency);
    
    // Si la moneda seleccionada es VES, no necesitamos conversión
    if (selectedCurrency === 'VES') {
      return customFormatCurrency(value, selectedCurrency);
    }
    
    // Usar las tasas de cambio cargadas para conversión síncrona
    if (exchangeRates && exchangeRates['VES'] && exchangeRates['VES'][selectedCurrency]) {
      const rate = exchangeRates['VES'][selectedCurrency];
      // Para convertir de VES a otra moneda, dividimos por la tasa
      // Si la tasa es menor a 1, significa que es USD/VES, multiplicamos
        // Si la tasa es mayor a 1, significa que es VES/USD, dividimos
        const convertedAmount = rate < 1 ? value * rate : value / rate;
        const operation = rate < 1 ? 'multiplicado' : 'dividido';
        console.log(`💱 CashFlow - Convertido ${value} VES a ${convertedAmount} ${selectedCurrency} (${operation} por tasa: ${rate})`);
      return customFormatCurrency(convertedAmount, selectedCurrency);
    }
    
    // Si no hay tasas disponibles, mostrar en VES
    console.warn(`⚠️ CashFlow - No hay tasa de cambio disponible para VES -> ${selectedCurrency}`);
    return customFormatCurrency(value, 'VES');
  };

  if (importedData.length === 0) {
    return (
      <div className="space-y-6">
        <Card className="p-8">
          <div className="flex flex-col items-center justify-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Estado de Flujo de Efectivo no disponible
            </h3>
            <p className="text-gray-600 text-center mb-6 max-w-md">
              El estado de flujo de efectivo se generará automáticamente una vez que 
              importe datos financieros desde la sección "Data Import".
            </p>
            <div className="flex items-center text-sm text-gray-500">
              <Upload className="w-4 h-4 mr-2" />
              <span>Importe datos para ver el flujo de efectivo</span>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Calcular totales de flujo de efectivo
  const calculateFlowTotal = (flowArray: any[]) => {
    return flowArray?.reduce((sum, item) => sum + (parseFloat(item.value) || 0), 0) || 0;
  };

  const operatingTotal = calculateFlowTotal(cashFlowData?.operating || []);
  const investingTotal = calculateFlowTotal(cashFlowData?.investing || []);
  const financingTotal = calculateFlowTotal(cashFlowData?.financing || []);
  const netCashFlow = operatingTotal + investingTotal + financingTotal;

  return (
    <div className="space-y-6">

      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Estado de Flujo de Efectivo</h2>
          <p className="text-gray-600">Flujos de efectivo por actividades</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <DollarSign className="w-4 h-4" />
          <span>Basado en {importedData.length} registros</span>
        </div>
      </div>

      {/* Estado de Flujo de Efectivo Estructurado */}
      <div className="space-y-6">
        {/* ACTIVIDADES OPERATIVAS */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <Activity className="w-6 h-6 text-blue-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">Actividades Operativas</h3>
          </div>
          <div className="space-y-3">
            {cashFlowData?.operating?.length > 0 ? (
              cashFlowData.operating.map((item: any, index: number) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-gray-600">
                    <span className="font-medium text-blue-700 mr-2">{item.code}</span>
                    {item.account}
                  </span>
                  <span className="font-medium">{convertAndFormat(parseFloat(item.value) || 0)}</span>
                </div>
              ))
            ) : (
              <div className="text-gray-500 italic">No se encontraron datos específicos de flujo operativo</div>
            )}
            <div className="border-t pt-3">
              <div className="flex justify-between items-center font-semibold bg-blue-50 p-3 rounded">
                <span className="text-blue-800">Flujo Neto de Actividades Operativas</span>
                <span className={`text-blue-800 ${operatingTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {convertAndFormat(operatingTotal)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ACTIVIDADES DE INVERSIÓN */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <Droplets className="w-6 h-6 text-purple-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">Actividades de Inversión</h3>
          </div>
          <div className="space-y-3">
            {cashFlowData?.investing?.length > 0 ? (
              cashFlowData.investing.map((item: any, index: number) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-gray-600">
                    <span className="font-medium text-purple-700 mr-2">{item.code}</span>
                    {item.account}
                  </span>
                  <span className="font-medium">{convertAndFormat(parseFloat(item.value) || 0)}</span>
                </div>
              ))
            ) : (
              <div className="text-gray-500 italic">No se encontraron datos específicos de flujo de inversión</div>
            )}
            <div className="border-t pt-3">
              <div className="flex justify-between items-center font-semibold bg-purple-50 p-3 rounded">
                <span className="text-purple-800">Flujo Neto de Actividades de Inversión</span>
                <span className={`text-purple-800 ${investingTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {convertAndFormat(investingTotal)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ACTIVIDADES DE FINANCIAMIENTO */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <DollarSign className="w-6 h-6 text-green-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">Actividades de Financiamiento</h3>
          </div>
          <div className="space-y-3">
            {cashFlowData?.financing?.length > 0 ? (
              cashFlowData.financing.map((item: any, index: number) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-gray-600">
                    <span className="font-medium text-green-700 mr-2">{item.code}</span>
                    {item.account}
                  </span>
                  <span className="font-medium">{convertAndFormat(parseFloat(item.value) || 0)}</span>
                </div>
              ))
            ) : (
              <div className="text-gray-500 italic">No se encontraron datos específicos de flujo de financiamiento</div>
            )}
            <div className="border-t pt-3">
              <div className="flex justify-between items-center font-semibold bg-green-50 p-3 rounded">
                <span className="text-green-800">Flujo Neto de Actividades de Financiamiento</span>
                <span className={`text-green-800 ${financingTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {convertAndFormat(financingTotal)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* FLUJO NETO TOTAL */}
        <div className="bg-gray-50 rounded-lg border-2 border-gray-300 p-6">
          <div className="flex justify-between items-center">
            <span className="text-xl font-bold text-gray-900">FLUJO NETO DE EFECTIVO</span>
            <span className={`text-2xl font-bold ${
              netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {convertAndFormat(netCashFlow)}
            </span>
          </div>
          <div className="mt-2 text-sm text-gray-600">
            Variación neta en el efectivo y equivalentes de efectivo
          </div>
        </div>
      </div>

      {/* Análisis de Liquidez */}
      {financialAnalysis && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <Droplets className="w-6 h-6 text-blue-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Análisis de Liquidez</h3>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                <span className="text-gray-700">Razón Corriente</span>
                <span className={`font-bold ${
                  financialAnalysis.ratios.liquidez.corriente >= 2 ? 'text-green-600' :
                  financialAnalysis.ratios.liquidez.corriente >= 1 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {formatRatio(financialAnalysis.ratios.liquidez.corriente)}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-cyan-50 rounded">
                <span className="text-gray-700">Prueba Ácida</span>
                <span className={`font-bold ${
                  financialAnalysis.ratios.liquidez.rapida >= 1 ? 'text-green-600' :
                  financialAnalysis.ratios.liquidez.rapida >= 0.5 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {formatRatio(financialAnalysis.ratios.liquidez.rapida)}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-teal-50 rounded">
                <span className="text-gray-700">Ratio de Efectivo</span>
                <span className={`font-bold ${
                  financialAnalysis.ratios.liquidez.efectivo >= 0.2 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatRatio(financialAnalysis.ratios.liquidez.efectivo)}
                </span>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <Activity className="w-6 h-6 text-purple-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Gestión de Efectivo</h3>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-purple-50 rounded">
                <div className="text-sm text-gray-600 mb-2">Flujo de Efectivo Operativo</div>
                <div className="text-lg font-bold text-purple-600">
                  {convertAndFormat(operatingTotal)}
                </div>
              </div>
              <div className="p-4 bg-indigo-50 rounded">
                <div className="text-sm text-gray-600 mb-2">Eficiencia en Cobros</div>
                <div className="text-lg font-bold text-indigo-600">
                  {financialAnalysis.ratios.actividad.rotacionCuentasPorCobrar > 0 
                    ? `${Math.round(365 / financialAnalysis.ratios.actividad.rotacionCuentasPorCobrar)} días`
                    : 'Sin datos'}
                </div>
              </div>
              <div className="p-4 bg-pink-50 rounded">
                <div className="text-sm text-gray-600 mb-2">Rotación de Inventarios</div>
                <div className="text-lg font-bold text-pink-600">
                  {financialAnalysis.ratios.actividad.rotacionInventarios > 0 
                    ? `${Math.round(365 / financialAnalysis.ratios.actividad.rotacionInventarios)} días`
                    : 'Sin datos'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Análisis Financiero Completo */}
      {financialAnalysis && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Análisis Completo de Flujo de Efectivo</h3>
          <FinancialAnalysisView analysis={financialAnalysis} />
        </div>
      )}
    </div>
  );
};