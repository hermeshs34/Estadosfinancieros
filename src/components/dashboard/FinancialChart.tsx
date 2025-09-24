import React from 'react';
import { Card } from '../ui/Card';
import { BarChart3, Upload, TrendingUp } from 'lucide-react';
import { useDataContext } from '../../contexts/DataContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { formatNumber } from '../../lib/numberFormatting';

export const FinancialChart: React.FC = () => {
  const { importedData, financialMetrics, balanceSheetData, incomeStatementData } = useDataContext();
  const { formatCurrency } = useCurrency();

  const generateChartData = () => {
    
    if (!balanceSheetData && !incomeStatementData) return [];
    
    // Generar métricas financieras relevantes
    const chartData = [];
    
    // Métricas del Balance General
    if (balanceSheetData) {
      if (balanceSheetData.totalAssets > 0) {
        chartData.push({
          name: 'Activos Totales',
          value: balanceSheetData.totalAssets,
          total: balanceSheetData.totalAssets,
          count: 1
        });
      }
      
      if (balanceSheetData.totalLiabilities > 0) {
        chartData.push({
          name: 'Pasivos Totales',
          value: balanceSheetData.totalLiabilities,
          total: balanceSheetData.totalLiabilities,
          count: 1
        });
      }
      
      if (balanceSheetData.totalEquity > 0) {
        chartData.push({
          name: 'Patrimonio Total',
          value: balanceSheetData.totalEquity,
          total: balanceSheetData.totalEquity,
          count: 1
        });
      }
    }
    
    // Métricas del Estado de Resultados
    if (incomeStatementData) {
      if (incomeStatementData.revenue > 0) {
        chartData.push({
          name: 'Ingresos Totales',
          value: incomeStatementData.revenue,
          total: incomeStatementData.revenue,
          count: 1
        });
      }
      
      if (incomeStatementData.costOfGoodsSold > 0) {
        chartData.push({
          name: 'Costo de Ventas',
          value: incomeStatementData.costOfGoodsSold,
          total: incomeStatementData.costOfGoodsSold,
          count: 1
        });
      }
      
      if (incomeStatementData.netIncome !== 0) {
        chartData.push({
          name: 'Utilidad Neta',
          value: Math.abs(incomeStatementData.netIncome),
          total: incomeStatementData.netIncome,
          count: 1
        });
      }
    }
    
    return chartData.slice(0, 6); // Limitar a 6 métricas
  };

  const chartData = generateChartData();
  const maxValue = Math.max(...chartData.map(d => d.value), 1);

  if (!balanceSheetData && !incomeStatementData) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Financial Performance</h3>
          <BarChart3 className="w-5 h-5 text-gray-400" />
        </div>
        
        <div className="flex flex-col items-center justify-center py-12">
          <BarChart3 className="w-16 h-16 text-gray-300 mb-4" />
          <h4 className="text-lg font-semibold text-gray-900 mb-2">
            Gráfico financiero no disponible
          </h4>
          <p className="text-gray-600 text-center mb-6 max-w-md">
            Los gráficos de rendimiento financiero se mostrarán aquí una vez que se procesen 
            los estados financieros (Balance General y Estado de Resultados).
          </p>
          <div className="flex items-center text-sm text-gray-500">
            <Upload className="w-4 h-4 mr-2" />
            <span>Procese los estados financieros para ver métricas</span>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="p-6" data-chart="financial-performance">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Financial Performance</h3>
        <div className="flex items-center space-x-2">
          <TrendingUp className="w-5 h-5 text-green-500" />
          <span className="text-sm text-gray-600">Métricas Principales</span>
        </div>
      </div>
      
      {chartData.length > 0 ? (
        <div className="space-y-4 min-h-[400px] overflow-visible">
          <div className="text-sm text-gray-600 mb-4">
            Principales métricas financieras (basado en estados financieros procesados)
          </div>
          
          <div className="space-y-6">
            {chartData.map((item, index) => {
              const percentage = (item.value / maxValue) * 100;
              const colors = [
                'bg-blue-500',
                'bg-green-500', 
                'bg-purple-500',
                'bg-orange-500',
                'bg-red-500',
                'bg-indigo-500'
              ];
              
              return (
                <div key={index} className="space-y-3 pb-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700 flex-1 pr-4">
                      {item.name}
                    </span>
                    <span className="text-sm font-semibold text-gray-900 min-w-[120px] text-right">
                      {formatCurrency(item.value)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                    <div 
                      className={`h-4 rounded-full transition-all duration-700 ease-out ${colors[index % colors.length]} shadow-sm`}
                      style={{ 
                        width: `${Math.max(percentage, 3)}%`,
                        minWidth: '12px'
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Total: {formatCurrency(item.total)}</span>
                    <span>Registros: {item.count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 min-h-[300px] flex flex-col items-center justify-center">
          <BarChart3 className="w-16 h-16 text-gray-300 mb-4" />
          <h4 className="text-lg font-semibold text-gray-900 mb-2">
            Gráfico no disponible
          </h4>
          <p className="text-gray-600 max-w-md text-center">
            No se encontraron campos numéricos en los datos importados para generar gráficos.
          </p>
        </div>
      )}
    </div>
  );
};