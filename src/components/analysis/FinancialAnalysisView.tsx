import React, { useMemo } from 'react';
import { PieChart, BarChart, Bar, Pie, Cell, Tooltip, ResponsiveContainer, XAxis, YAxis, Legend } from 'recharts';
import { FinancialInsights } from '../../lib/financialAnalysis';
import { formatPercentage, formatPercentageValue, formatRatio } from '../../lib/numberFormatting';
import { Card } from '../ui/Card';
import { useCurrency } from '../../contexts/CurrencyContext';
import { useDataContext } from '../../contexts/DataContext';
import { getAstronomicalWarning, isAstronomicalValue } from '../../utils/formatFinancialValues';

interface FinancialAnalysisViewProps {
  analysis: FinancialInsights;
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="mb-8">
    <h3 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">{title}</h3>
    {children}
  </div>
);

export const FinancialAnalysisView: React.FC<FinancialAnalysisViewProps> = ({ analysis }) => {
  const { selectedCurrency, formatCurrency } = useCurrency();
  const { balanceSheetData, incomeStatementData } = useDataContext();

  // Debug: Log the analysis data
  // console.log('FinancialAnalysisView - analysis:', analysis);

  const convertAndFormat = (value: number | undefined | null) => {
    if (value === undefined || value === null) return 'N/A';
    return formatCurrency(value);
  };

  // Función para formatear valores con advertencias de cifras astronómicas
  const formatWithWarning = (value: number | undefined | null) => {
    if (value === undefined || value === null) return { formatted: 'N/A', warning: null };
    const formatted = formatCurrency(value);
    const warning = getAstronomicalWarning(value, selectedCurrency);
    return { formatted, warning };
  };
  
  const processFinancialText = (text: string | undefined) => {
    if (!text) return '';
    const regex = /(VES|Bs\.|Bs)\s*([\d,]+\.\d{2})/g;
    return text.replace(regex, (match, currency, amount) => {
      const numericValue = parseFloat(amount.replace(/,/g, ''));
      if (isNaN(numericValue)) return match;
      return formatCurrency(numericValue, selectedCurrency);
    });
  };

  // Usar balanceSheetData en lugar de analysis.structure para consistencia con FinancialCharts
  const structure = balanceSheetData || analysis?.structure;
  const { profitability, ratios, resumenEjecutivo, alertas, recomendaciones } = analysis || {};

  // console.log('FinancialAnalysisView - destructured data:', { structure, profitability, ratios, resumenEjecutivo, alertas, recomendaciones });

  if (!analysis) {
    console.log('FinancialAnalysisView - No analysis data available');
    return (
      <div className="p-4 text-center text-gray-500">
        El análisis financiero no está disponible.
      </div>
    );
  }

  // Datos para el gráfico de composición de activos - usando balanceSheetData
  const assetData = useMemo(() => {
    const rawData = [
      { name: 'Activos Corrientes', rawValue: structure?.currentAssets ?? 0 },
      { name: 'Activos No Corrientes', rawValue: structure?.nonCurrentAssets ?? 0 },
    ];
    
    // Los valores ya están en la moneda correcta
    const convertedData = rawData.map(item => {
      const convertedValue = item.rawValue;
      // console.log(`🔍 AssetData - ${item.name}: ${item.rawValue} VES → ${convertedValue.toFixed(2)} ${selectedCurrency}`);
      return {
        ...item,
        value: convertedValue
      };
    });
    
    const total = convertedData.reduce((sum, item) => sum + item.value, 0);
    return convertedData.map(item => ({
      ...item,
      percentage: total > 0 ? (item.value / total) * 100 : 0
    }));
  }, [structure, selectedCurrency]);

  // Datos para el gráfico de estructura financiera (pasivos y patrimonio) - usando balanceSheetData
  const liabilityEquityData = useMemo(() => {
    const rawData = [
      { name: 'Pasivos', rawValue: structure?.totalLiabilities ?? 0 },
      { name: 'Patrimonio', rawValue: structure?.totalEquity ?? 0 },
    ];
    
    // Convertir los valores a la moneda seleccionada
    const convertedData = rawData.map(item => {
      const convertedValue = item.rawValue;
      // console.log(`🔍 LiabilityEquityData - ${item.name}: ${item.rawValue} VES → ${convertedValue.toFixed(2)} ${selectedCurrency}`);
      return {
        ...item,
        value: convertedValue
      };
    });
    
    const total = convertedData.reduce((sum, item) => sum + item.value, 0);
    return convertedData.map(item => ({
      ...item,
      percentage: total > 0 ? (item.value / total) * 100 : 0
    }));
  }, [structure, selectedCurrency]);

  const profitabilityData = useMemo(() => {
    // Usar los mismos datos que FinancialCharts para consistencia
    if (!incomeStatementData) {
      console.log('🚨 FinancialAnalysisView: incomeStatementData is null/undefined');
      return [];
    }
    
    console.log('📊 FinancialAnalysisView - incomeStatementData recibido:', incomeStatementData);
    
    const revenue = incomeStatementData.revenue || 0;
    const costOfGoodsSold = incomeStatementData.costOfGoodsSold || 0;
    const operatingExpenses = incomeStatementData.operatingExpenses || 0;
    const netIncome = incomeStatementData.netIncome || 0;
    
    console.log('📊 FinancialAnalysisView - Valores extraídos:');
    console.log('💰 Revenue:', revenue);
    console.log('💰 Cost of Goods Sold:', costOfGoodsSold);
    console.log('💰 Operating Expenses:', operatingExpenses);
    console.log('💰 Net Income:', netIncome);
    
    const rawData = [
      { name: 'Ingresos', rawValue: revenue },
      { name: 'Costo de Ventas', rawValue: costOfGoodsSold },
      { name: 'Gastos Operativos', rawValue: operatingExpenses },
      { name: 'Utilidad Neta', rawValue: netIncome },
    ];
    
    // Los valores ya están en la moneda correcta
    return rawData.map(item => ({
      ...item,
      value: item.rawValue
    }));
  }, [incomeStatementData, selectedCurrency]);

  const COLORS = ['#34D399', '#60A5FA', '#F87171', '#A78BFA'];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const value = payload[0].value;
      // Para gráficos de barras, usar 'label' que contiene el nombre de la categoría
      // Para gráficos de pastel, usar payload[0].name
      const name = label || payload[0].name;
      const formattedValue = formatCurrency(value, selectedCurrency);
      const warning = getAstronomicalWarning(value, selectedCurrency);
      
      return (
        <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
          <p className="font-medium text-gray-800">{name}</p>
          <p className="text-blue-600">{formattedValue}</p>
          {warning && (
            <p className="text-xs text-amber-600 mt-1">{warning}</p>
          )}
        </div>
      );
    }
    return null;
  };

  // Función para renderizar etiquetas en los gráficos de pastel
  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
    if (percent < 0.05) return null; // No mostrar etiquetas para sectores muy pequeños
    
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize="12"
        fontWeight="bold"
      >
        {`${formatPercentage(percent)}`}
      </text>
    );
  };

  // Calcular totales (los valores ya están en la moneda correcta)
  const totalAssets = useMemo(() => {
    return structure?.totalAssets || (structure?.currentAssets ?? 0) + (structure?.nonCurrentAssets ?? 0) || 1;
  }, [structure]);
  
  const totalLiabilities = useMemo(() => {
    return structure?.totalLiabilities ?? 0;
  }, [structure]);
  
  const totalEquity = useMemo(() => {
    return structure?.totalEquity ?? 0;
  }, [structure]);
  
  const totalLiabilityAndEquity = useMemo(() => totalLiabilities + totalEquity || 1, [totalLiabilities, totalEquity]);
  
  const totalRevenue = useMemo(() => {
    const revenue = incomeStatementData?.revenue || 0;
    return revenue === 0 ? 1 : revenue;
  }, [incomeStatementData]);


  return (
    <div className="p-4 bg-gray-50">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <div className="p-6 print:min-h-[350px]" data-testid="asset-composition-chart" data-chart="asset-composition">
            <h4 className="text-lg font-semibold text-gray-700 mb-4">Composición de Activos</h4>
            {structure ? <div className="print:h-[300px] h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={assetData} 
                    dataKey="value" 
                    nameKey="name" 
                    cx="50%" 
                    cy="50%" 
                    outerRadius={80} 
                    fill="#8884d8" 
                    labelLine={false}
                    label={renderCustomLabel}
                  >
                    {assetData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    wrapperStyle={{ paddingTop: '20px' }}
                    formatter={(value, entry: any) => 
                      <span className="text-gray-600">{value}: {formatCurrency(entry.payload.value, selectedCurrency)} ({formatPercentage(entry.payload.percentage / 100)})</span>
                    }/>
                </PieChart>
              </ResponsiveContainer>
            </div> : <p>Datos de estructura no disponibles.</p>}
          </div>
        </Card>

        <Card>
          <div className="p-6 print:min-h-[350px]" data-testid="financial-structure-chart" data-chart="financial-structure">
            <h4 className="text-lg font-semibold text-gray-700 mb-4">Estructura Financiera</h4>
            {structure ? <div className="print:h-[300px] h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={liabilityEquityData} 
                    dataKey="value" 
                    nameKey="name" 
                    cx="50%" 
                    cy="50%" 
                    outerRadius={80} 
                    fill="#8884d8" 
                    labelLine={false}
                    label={renderCustomLabel}
                  >
                    {liabilityEquityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  formatter={(value, entry: any) => 
                    <span className="text-gray-600">{value}: {formatCurrency(entry.payload.value, selectedCurrency)} ({formatPercentage(entry.payload.percentage / 100)})</span>
                  }/>
                </PieChart>
              </ResponsiveContainer>
            </div> : <p>Datos de estructura no disponibles.</p>}
          </div>
        </Card>
      </div>

      <div className="mt-8">
        <Card>
          <div className="p-6 print:min-h-[400px]" data-testid="profitability-chart" data-chart="profitability">
            <h4 className="text-lg font-semibold text-gray-700 mb-4">Análisis de Rentabilidad</h4>
            {profitability ? <>
            <div className="print:h-[350px] h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={profitabilityData} layout="vertical" margin={{ top: 20, right: 80, left: 140, bottom: 5 }}>
                <XAxis 
                  type="number" 
                  tickFormatter={(value) => formatCurrency(value, selectedCurrency)}
                  tick={{ fill: '#6B7280', fontSize: 12 }}
                />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  width={140} 
                  tick={{ fill: '#4B5563', fontSize: 12 }} 
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" fill="#8884d8" barSize={25}>
                  {profitabilityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.value >= 0 ? COLORS[1] : COLORS[2]} />
                  ))}
                </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
             <div className="mt-4 space-y-2">
                {profitabilityData.map(item => (
                  <div key={item.name} className="flex justify-between text-sm">
                    <span className="text-gray-700">{item.name}</span>
                    <span className="font-medium text-gray-800">{formatCurrency(item.value, selectedCurrency)} ({formatPercentage(item.value / totalRevenue)})</span>
                  </div>
                ))}
              </div>
            </> : <p>Datos de rentabilidad no disponibles.</p>}
          </div>
        </Card>
      </div>

      {resumenEjecutivo && <div className="mt-8">
        <Section title="Resumen Ejecutivo">
          <p className="text-gray-600 leading-relaxed">
            {processFinancialText(resumenEjecutivo)}
          </p>
        </Section>
      </div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
        <div>
          <Section title="Alertas">
            {alertas && alertas.length > 0 ? (
              <ul className="space-y-3">
                {alertas.map((alerta, index) => (
                  <li key={index} className="flex items-start p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg">
                    <span className="text-yellow-500 mr-3">⚠️</span>
                    <span className="text-yellow-800">{processFinancialText(alerta)}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-green-600">No se encontraron alertas.</p>}
          </Section>
        </div>
        <div>
          <Section title="Recomendaciones">
            {recomendaciones && recomendaciones.length > 0 ? (
              <ul className="space-y-3">
                {recomendaciones.map((rec, index) => (
                  <li key={index} className="flex items-start p-3 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg">
                    <span className="text-blue-500 mr-3">💡</span>
                    <span className="text-blue-800">{processFinancialText(rec)}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-gray-600">No hay recomendaciones disponibles.</p>}
          </Section>
        </div>
      </div>

      {ratios && <div className="mt-8">
        <Section title="Ratios Financieros Clave">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-white rounded-lg shadow-sm text-center">
              <p className="text-sm text-gray-500">Liquidez Corriente</p>
              <p className="text-2xl font-bold text-blue-600">
                {(() => {
                  const ratio = ratios.liquidez?.corriente;
                  if (ratio === null || ratio === undefined || isNaN(ratio)) {
                    return <span className="text-gray-400 text-sm">No calculable</span>;
                  }
                  return formatRatio(ratio);
                })()}
              </p>
            </div>
            <div className="p-4 bg-white rounded-lg shadow-sm text-center">
              <p className="text-sm text-gray-500">Rentabilidad (ROE)</p>
              <p className="text-2xl font-bold text-green-600">
                {(() => {
                  const ratio = ratios.rentabilidad?.roe;
                  if (ratio === null || ratio === undefined || isNaN(ratio)) {
                    return <span className="text-gray-400 text-sm">No calculable</span>;
                  }
                  return formatPercentageValue(ratio);
                })()}
              </p>
            </div>
            <div className="p-4 bg-white rounded-lg shadow-sm text-center">
              <p className="text-sm text-gray-500">Endeudamiento</p>
              <p className="text-2xl font-bold text-red-600">
                {(() => {
                  const ratio = ratios.endeudamiento?.total;
                  if (ratio === null || ratio === undefined || isNaN(ratio)) {
                    return <span className="text-gray-400 text-sm">No calculable</span>;
                  }
                  return formatPercentageValue(ratio);
                })()}
              </p>
            </div>
            <div className="p-4 bg-white rounded-lg shadow-sm text-center">
              <p className="text-sm text-gray-500">Rotación de Activos</p>
              <p className="text-2xl font-bold text-purple-600">
                {(() => {
                  const ratio = ratios.actividad?.rotacionActivos;
                  if (ratio === null || ratio === undefined || isNaN(ratio)) {
                    return <span className="text-gray-400 text-sm">No calculable</span>;
                  }
                  return formatRatio(ratio);
                })()}
              </p>
            </div>
          </div>
        </Section>
      </div>}

      {ratios?.seguros && (
        <div className="mt-8">
          <Section title="Ratios Específicos de Seguros">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-white rounded-lg shadow-sm text-center">
                <p className="text-sm text-gray-500">Ratio de Solvencia</p>
                <p className="text-2xl font-bold text-indigo-600">
                  {(() => {
                    const ratio = ratios.seguros.solvencia;
                    if (ratio === null || ratio === undefined || isNaN(ratio)) {
                      return <span className="text-gray-400 text-sm">No calculable</span>;
                    }
                    return formatPercentageValue(ratio);
                  })()}
                </p>
              </div>
              <div className="p-4 bg-white rounded-lg shadow-sm text-center">
                <p className="text-sm text-gray-500">Ratio de Cobertura Técnica</p>
                <p className="text-2xl font-bold text-teal-600">
                  {(() => {
                    const ratio = ratios.seguros.coberturaTecnica;
                    if (ratio === null || ratio === undefined || isNaN(ratio)) {
                      return <span className="text-gray-400 text-sm">No calculable</span>;
                    }
                    return formatPercentageValue(ratio);
                  })()}
                </p>
              </div>
              <div className="p-4 bg-white rounded-lg shadow-sm text-center">
                <p className="text-sm text-gray-500">Ratio de Reservas</p>
                <p className="text-2xl font-bold text-pink-600">
                  {(() => {
                    const ratio = ratios.seguros.ratioReservas;
                    if (ratio === null || ratio === undefined || isNaN(ratio)) {
                      return <span className="text-gray-400 text-sm">No calculable</span>;
                    }
                    return formatPercentageValue(ratio);
                  })()}
                </p>
              </div>
            </div>
          </Section>
        </div>
      )}
    </div>
  );
};