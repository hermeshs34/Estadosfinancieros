import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../ui/Card';
import { FileText, Upload, TrendingUp, TrendingDown, DollarSign, BarChart3, PieChart, Coins } from 'lucide-react';
import { useDataContext } from '../../contexts/DataContext';
import { formatCurrency, formatNumber } from '../../lib/numberFormatting';
import { useCurrency } from '../../contexts/CurrencyContext';
import { CURRENCY_INFO, Currency } from '../../types/financials';

// Mapeo de strings de iconos a componentes React
const iconMap = {
  'TrendingUp': TrendingUp,
  'TrendingDown': TrendingDown,
  'DollarSign': DollarSign,
  'FileText': FileText,
  'Upload': Upload,
  'BarChart3': BarChart3,
  'PieChart': PieChart,
  'Coins': Coins
};

// Función para obtener el icono apropiado según la moneda
const getCurrencyIcon = (currency: Currency) => {
  // Para monedas con símbolo de dólar, usar DollarSign
  if (['USD', 'CAD', 'AUD', 'MXN', 'COP'].includes(currency)) {
    return DollarSign;
  }
  // Para bolívares venezolanos, usar Coins
  if (currency === 'VES') {
    return Coins;
  }
  // Para otras monedas, usar TrendingUp como genérico
  return TrendingUp;
};

export const MetricsGrid: React.FC = () => {
  const { financialMetrics, importedData } = useDataContext();
  const { convertAmount, selectedCurrency, balanceDate } = useCurrency();
  const [convertedMetrics, setConvertedMetrics] = useState<Array<{ value: number; converting: boolean }>>([]);

  // Métricas por defecto si no hay métricas procesadas
  const defaultMetrics = useMemo(() => [
    {
      name: 'Registros Importados',
      value: importedData.length,
      type: 'number',
      icon: FileText,
      color: 'blue'
    },
    {
      name: 'Campos de Datos',
      value: importedData.length > 0 ? Object.keys(importedData[0]).length : 0,
      type: 'number',
      icon: TrendingUp,
      color: 'green'
    }
  ], [importedData]);

  // Convertir métricas de forma asíncrona
  useEffect(() => {
    const convertMetrics = async () => {
      const metricsToShow = financialMetrics.length > 0 ? financialMetrics : defaultMetrics;
      const converted = await Promise.all(
        metricsToShow.map(async (metric) => {
          if (metric.type === 'currency') {
            try {
              const convertedValue = await convertAmount(metric.value, 'VES', selectedCurrency, balanceDate);
              return { value: convertedValue, converting: false };
            } catch (error) {
              console.error('Error converting metric:', error);
              return { value: metric.value, converting: false };
            }
          }
          return { value: metric.value, converting: false };
        })
      );
      setConvertedMetrics(converted);
    };

    const metricsToShow = financialMetrics.length > 0 ? financialMetrics : defaultMetrics;
    // Inicializar con valores originales mientras se convierten
    setConvertedMetrics(metricsToShow.map(metric => ({ value: metric.value, converting: metric.type === 'currency' })));
    convertMetrics();
  }, [financialMetrics, selectedCurrency, convertAmount, balanceDate, defaultMetrics]);

  if (importedData.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="col-span-full">
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No hay métricas financieras disponibles
              </h3>
              <p className="text-gray-600 mb-6 max-w-md">
                Para ver las métricas del dashboard, primero debe importar datos financieros desde la sección "Data Import".
              </p>
              <div className="flex items-center justify-center text-sm text-gray-500">
                <Upload className="w-4 h-4 mr-2" />
                <span>Importe archivos CSV, Excel o PDF para comenzar</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const metricsToShow = financialMetrics.length > 0 ? financialMetrics : defaultMetrics;
  
  // Financial metrics processed successfully

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metricsToShow.map((metric, index) => {
        // Manejar iconos como strings o componentes React
        let IconComponent;
        if (typeof metric.icon === 'string') {
          IconComponent = iconMap[metric.icon as keyof typeof iconMap] || DollarSign;
        } else {
          IconComponent = metric.icon || DollarSign;
        }
        
        // Ensure IconComponent is a valid React component
        if (!IconComponent || typeof IconComponent !== 'function') {
          console.warn('Invalid icon component for metric:', metric.name, 'Icon:', metric.icon);
          IconComponent = DollarSign; // Fallback to default icon
        }
        const colorClasses = {
          blue: {
            bg: 'bg-gradient-to-br from-blue-500 to-blue-600',
            text: 'text-white',
            shadow: 'shadow-blue-200',
            border: 'border-blue-200'
          },
          green: {
            bg: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
            text: 'text-white',
            shadow: 'shadow-emerald-200',
            border: 'border-emerald-200'
          },
          purple: {
            bg: 'bg-gradient-to-br from-purple-500 to-purple-600',
            text: 'text-white',
            shadow: 'shadow-purple-200',
            border: 'border-purple-200'
          },
          orange: {
            bg: 'bg-gradient-to-br from-orange-500 to-orange-600',
            text: 'text-white',
            shadow: 'shadow-orange-200',
            border: 'border-orange-200'
          }
        };
        
        const colors = colorClasses[metric.color as keyof typeof colorClasses] || colorClasses.blue;
        
        return (
          <div key={index} className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-2">{metric.name}</p>
                <p className="text-3xl font-bold text-gray-900 mb-1">
                  {metric.type === 'currency' 
                    ? (convertedMetrics[index]?.converting 
                        ? 'Convirtiendo...' 
                        : `${CURRENCY_INFO[selectedCurrency].symbol} ${formatNumber(convertedMetrics[index]?.value || metric.value)}`)
                    : formatNumber(metric.value)
                  }
                </p>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-xs text-gray-500">Live data</span>
                </div>
              </div>
              <div className={`p-4 rounded-xl ${colors.bg} ${colors.text} shadow-lg ${colors.shadow}`}>
                {metric.type === 'currency' ? (
                  React.createElement(getCurrencyIcon(selectedCurrency), { className: "w-7 h-7" })
                ) : (
                  <IconComponent className="w-7 h-7" />
                )}
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Updated now</span>
                <div className="flex items-center space-x-1">
                  <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                  <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                  <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
      
      {/* Enhanced Information Section */}
      <div className="col-span-full bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-xl border border-blue-200 p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3 rounded-xl shadow-lg">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-1">Financial Data Active</h4>
              <p className="text-sm text-gray-600">
                System processing <span className="font-semibold text-blue-600">{importedData.length}</span> financial records. 
                Metrics update automatically in real-time.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 px-4 py-2 bg-white/70 backdrop-blur-sm rounded-lg border border-white/50">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-gray-700">Live Updates</span>
            </div>
            <div className="flex items-center space-x-2 px-4 py-2 bg-white/70 backdrop-blur-sm rounded-lg border border-white/50">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-gray-700">Synchronized</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};