import React, { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { useDataContext } from '../../contexts/DataContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { BarChart3, PieChart, TrendingUp, Activity } from 'lucide-react';
import { formatCurrency, formatPercentage, formatRatio } from '../../lib/numberFormatting';


interface ChartData {
  name: string;
  value: number;
  color: string;
  percentage?: number;
}

export const FinancialCharts: React.FC = () => {
  const { balanceSheetData, incomeStatementData, importedData } = useDataContext();
  const { formatCurrency: formatCurrencyWithContext, selectedCurrency } = useCurrency();
  


  // Datos para gráfico de composición de activos
  const assetsComposition = useMemo((): ChartData[] => {
    if (!balanceSheetData) return [];
    
    const data = [
      {
        name: 'Activos Corrientes',
        value: balanceSheetData.currentAssets || 0,
        color: '#3B82F6'
      },
      {
        name: 'Activos No Corrientes',
        value: balanceSheetData.nonCurrentAssets || 0,
        color: '#10B981'
      }
    ];
    
    const total = data.reduce((sum, item) => sum + item.value, 0);
    return data.map(item => ({
      ...item,
      percentage: total > 0 ? (item.value / total) * 100 : 0
    }));
  }, [balanceSheetData]);

  // Datos para gráfico de estructura financiera
  const financialStructure = useMemo((): ChartData[] => {
    if (!balanceSheetData) return [];
    
    const data = [
      {
        name: 'Pasivos',
        value: balanceSheetData.totalLiabilities || 0,
        color: '#EF4444'
      },
      {
        name: 'Patrimonio',
        value: balanceSheetData.totalEquity || 0,
        color: '#8B5CF6'
      }
    ];
    
    const total = data.reduce((sum, item) => sum + item.value, 0);
    return data.map(item => ({
      ...item,
      percentage: total > 0 ? (item.value / total) * 100 : 0
    }));
  }, [balanceSheetData]);

  // Datos para análisis de rentabilidad
  const profitabilityData = useMemo((): ChartData[] => {
    if (!incomeStatementData) {
      console.log('🚨 FinancialCharts: incomeStatementData is null/undefined');
      return [];
    }
    
    console.log('📊 FinancialCharts - incomeStatementData recibido:', incomeStatementData);
    
    const revenue = incomeStatementData.revenue || 0;
    const costOfGoodsSold = incomeStatementData.costOfGoodsSold || 0;
    const operatingExpenses = incomeStatementData.operatingExpenses || 0;
    const netIncome = incomeStatementData.netIncome || 0;
    
    console.log('📊 FinancialCharts - Valores extraídos:');
    console.log('💰 Revenue:', revenue);
    console.log('💰 Cost of Goods Sold:', costOfGoodsSold);
    console.log('💰 Operating Expenses:', operatingExpenses);
    console.log('💰 Net Income:', netIncome);
    
    return [
      {
        name: 'Ingresos',
        value: revenue,
        color: '#10B981',
        percentage: 100
      },
      {
        name: 'Costo de Ventas',
        value: costOfGoodsSold,
        color: '#EF4444',
        percentage: revenue > 0 ? (costOfGoodsSold / revenue) * 100 : 0
      },
      {
        name: 'Gastos Operacionales',
        value: operatingExpenses,
        color: '#F59E0B',
        percentage: revenue > 0 ? (operatingExpenses / revenue) * 100 : 0
      },
      {
        name: 'Utilidad Neta',
        value: netIncome,
        color: '#3B82F6',
        percentage: revenue > 0 ? (netIncome / revenue) * 100 : 0
      }
    ];
  }, [incomeStatementData]);

  // Función para exportar a Excel
  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    
    // Hoja de composición de activos
    if (assetsComposition.length > 0) {
      const assetsData = assetsComposition.map(item => ({
        'Tipo de Activo': item.name,
        'Valor': item.value,
        'Porcentaje': `${item.percentage.toFixed(1)}%`
      }));
      const assetsWs = XLSX.utils.json_to_sheet(assetsData);
      XLSX.utils.book_append_sheet(wb, assetsWs, 'Composición de Activos');
    }
    
    // Hoja de estructura financiera
    if (financialStructure.length > 0) {
      const structureData = financialStructure.map(item => ({
        'Componente': item.name,
        'Valor': item.value,
        'Porcentaje': `${item.percentage.toFixed(1)}%`
      }));
      const structureWs = XLSX.utils.json_to_sheet(structureData);
      XLSX.utils.book_append_sheet(wb, structureWs, 'Estructura Financiera');
    }
    
    // Hoja de análisis de rentabilidad
    if (profitabilityData.length > 0) {
      const profitabilityExportData = profitabilityData.map(item => ({
        'Métrica': item.name,
        'Valor': item.value,
        'Porcentaje': `${item.percentage?.toFixed(1)}%` || 'N/A'
      }));
      const profitabilityWs = XLSX.utils.json_to_sheet(profitabilityExportData);
      XLSX.utils.book_append_sheet(wb, profitabilityWs, 'Análisis de Rentabilidad');
    }
    
    XLSX.writeFile(wb, `analisis_financiero_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Función para generar PDF
  const generatePDF = async () => {
    const doc = new jsPDF();
    let yPosition = 20;
    
    // Título
    doc.setFontSize(20);
    doc.text('Análisis Financiero', 20, yPosition);
    yPosition += 20;
    
    // Fecha
    doc.setFontSize(12);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 20, yPosition);
    yPosition += 20;
    
    // Función auxiliar para capturar elementos y añadirlos al PDF
    const addImageToPDF = async (element: Element, title: string): Promise<number> => {
      try {
        const canvas = await html2canvas(element as HTMLElement, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff'
        });
        
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 170;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        // Verificar si necesitamos una nueva página
        if (yPosition + imgHeight > 280) {
          doc.addPage();
          yPosition = 20;
        }
        
        doc.setFontSize(14);
        doc.text(title, 20, yPosition);
        yPosition += 10;
        
        doc.addImage(imgData, 'PNG', 20, yPosition, imgWidth, imgHeight);
        return yPosition + imgHeight + 20;
      } catch (error) {
        console.error(`Error capturando ${title}:`, error);
        return yPosition;
      }
    };

    try {
      // Capturar métricas clave
      const metricsElement = document.querySelector('[data-chart="key-metrics"]');
      if (metricsElement) {
        yPosition = await addImageToPDF(metricsElement, 'Métricas Clave');
      }
      
      // Capturar Financial Chart (gráfico de rendimiento financiero)
      const financialChartElement = document.querySelector('[data-chart="financial-performance"]');
      if (financialChartElement) {
        yPosition = await addImageToPDF(financialChartElement, 'Gráfico de Rendimiento Financiero');
      }
      
      // Capturar gráfico de composición de activos
      const assetsChartElement = document.querySelector('[data-chart="assets-composition"]');
      if (assetsChartElement && assetsComposition.length > 0) {
        yPosition = await addImageToPDF(assetsChartElement, 'Composición de Activos');
        
        // Tabla de datos
        const assetsTableData = assetsComposition.map(item => [
          item.name,
          item.value.toLocaleString(),
          `${item.percentage.toFixed(1)}%`
        ]);
        
        autoTable(doc, {
          head: [['Tipo de Activo', 'Valor', 'Porcentaje']],
          body: assetsTableData,
          startY: yPosition,
          styles: { fontSize: 10 },
          headStyles: { fillColor: [66, 139, 202] }
        });
        
        yPosition = (doc as any).lastAutoTable.finalY + 20;
      }
      
      // Capturar gráfico de estructura financiera
      const structureChartElement = document.querySelector('[data-chart="financial-structure"]');
      if (structureChartElement && financialStructure.length > 0) {
        yPosition = await addImageToPDF(structureChartElement, 'Estructura Financiera');
        
        // Tabla de datos
        const structureTableData = financialStructure.map(item => [
          item.name,
          item.value.toLocaleString(),
          `${item.percentage.toFixed(1)}%`
        ]);
        
        autoTable(doc, {
          head: [['Componente', 'Valor', 'Porcentaje']],
          body: structureTableData,
          startY: yPosition,
          styles: { fontSize: 10 },
          headStyles: { fillColor: [66, 139, 202] }
        });
        
        yPosition = (doc as any).lastAutoTable.finalY + 20;
      }
      
      // Capturar gráfico de análisis de rentabilidad
      const profitabilityChartElement = document.querySelector('[data-chart="profitability-analysis"]');
      if (profitabilityChartElement && profitabilityData.length > 0) {
        yPosition = await addImageToPDF(profitabilityChartElement, 'Análisis de Rentabilidad');
        
        // Tabla de datos
        const profitabilityTableData = profitabilityData.map(item => [
          item.name,
          item.value.toLocaleString(),
          `${item.percentage?.toFixed(1)}%` || 'N/A'
        ]);
        
        autoTable(doc, {
          head: [['Métrica', 'Valor', 'Porcentaje']],
          body: profitabilityTableData,
          startY: yPosition,
          styles: { fontSize: 10 },
          headStyles: { fillColor: [66, 139, 202] }
        });
      }
      
      doc.save(`analisis_financiero_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar el PDF. Por favor, inténtelo de nuevo.');
    }
  };

  // Componente de gráfico de barras simple
  const SimpleBarChart: React.FC<{ data: ChartData[]; title: string; height?: number }> = ({ 
    data, 
    title, 
    height = 200 
  }) => {
    const maxValue = Math.max(...data.map(d => d.value));
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.map((item, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">{item.name}</span>
                  <div className="text-right">
                    <span className="text-sm font-bold text-gray-900">
                      {formatCurrencyWithContext(item.value)}
                    </span>
                    {item.percentage !== undefined && (
                      <span className="text-xs text-gray-500 ml-2">
                        ({item.percentage.toFixed(1)}%)
                      </span>
                    )}
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="h-3 rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%`,
                      backgroundColor: item.color
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  // Componente de gráfico circular simple
  const SimplePieChart: React.FC<{ data: ChartData[]; title: string }> = ({ data, title }) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    let cumulativePercentage = 0;
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <PieChart className="w-5 h-5 mr-2" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-6">
            {/* Gráfico circular SVG */}
            <div className="relative">
              <svg width="120" height="120" className="transform -rotate-90">
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  stroke="#E5E7EB"
                  strokeWidth="10"
                />
                {data.map((item, index) => {
                  const percentage = total > 0 ? (item.value / total) * 100 : 0;
                  const strokeDasharray = `${percentage * 3.14} 314`;
                  const strokeDashoffset = -cumulativePercentage * 3.14;
                  cumulativePercentage += percentage;
                  
                  return (
                    <circle
                      key={index}
                      cx="60"
                      cy="60"
                      r="50"
                      fill="none"
                      stroke={item.color}
                      strokeWidth="10"
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                      className="transition-all duration-500 ease-out"
                    />
                  );
                })}
              </svg>
            </div>
            
            {/* Leyenda */}
            <div className="flex-1 space-y-3">
              {data.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm font-medium text-gray-700">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-gray-900">
                      {formatCurrencyWithContext(item.value)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {item.percentage.toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Componente de métricas clave
  const KeyMetrics: React.FC = () => {
    const metrics = useMemo(() => {
      if (!balanceSheetData || !incomeStatementData) return [];
      
      const totalAssets = balanceSheetData.totalAssets || 0;
      const totalLiabilities = balanceSheetData.totalLiabilities || 0;
      const totalEquity = balanceSheetData.totalEquity || 0;
      const netIncome = incomeStatementData.netIncome || 0;
      const totalRevenue = incomeStatementData.totalRevenue || 0;
      
      return [
        {
          name: 'Liquidez Corriente',
          value: balanceSheetData.currentLiabilities > 0 
            ? (balanceSheetData.currentAssets || 0) / balanceSheetData.currentLiabilities 
            : 0,
          format: 'ratio',
          color: balanceSheetData.currentLiabilities > 0 && 
                 ((balanceSheetData.currentAssets || 0) / balanceSheetData.currentLiabilities) >= 1.5 
                 ? '#10B981' : '#EF4444',
          icon: Activity
        },
        {
          name: 'Endeudamiento',
          value: totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0,
          format: 'percentage',
          color: totalAssets > 0 && ((totalLiabilities / totalAssets) * 100) <= 50 ? '#10B981' : '#EF4444',
          icon: TrendingUp
        },
        {
          name: 'Margen Neto',
          value: totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0,
          format: 'percentage',
          color: totalRevenue > 0 && ((netIncome / totalRevenue) * 100) >= 10 ? '#10B981' : '#EF4444',
          icon: BarChart3
        },
        {
          name: 'ROA',
          value: totalAssets > 0 ? (netIncome / totalAssets) * 100 : 0,
          format: 'percentage',
          color: totalAssets > 0 && ((netIncome / totalAssets) * 100) >= 5 ? '#10B981' : '#EF4444',
          icon: PieChart
        }
      ];
    }, [balanceSheetData, incomeStatementData]);
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, index) => {
          const IconComponent = metric.icon;
          return (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{metric.name}</p>
                    <p className="text-2xl font-bold" style={{ color: metric.color }}>
                      {metric.format === 'ratio' 
                        ? formatRatio(metric.value)
                        : metric.format === 'percentage'
                        ? formatPercentage(metric.value)
                        : formatCurrency(metric.value)
                      }
                    </p>
                  </div>
                  <IconComponent className="w-8 h-8" style={{ color: metric.color }} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  if (!balanceSheetData && !incomeStatementData) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No hay datos financieros disponibles para mostrar gráficos.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Botones de exportación */}
      <div className="flex justify-end items-center mb-4">
        <div className="flex space-x-2">
        <Button
          onClick={exportToExcel}
          variant="outline"
          className="flex items-center"
        >
          <Download className="w-4 h-4 mr-2" />
          Exportar a Excel
        </Button>
        <Button
          onClick={generatePDF}
          variant="outline"
          className="flex items-center"
        >
          <Download className="w-4 h-4 mr-2" />
          Exportar a PDF
        </Button>
        </div>
      </div>
      
      {/* Métricas clave */}
      <div data-chart="key-metrics">
        <KeyMetrics />
      </div>
      
      {/* Gráficos principales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {assetsComposition.length > 0 && (
          <div data-chart="assets-composition">
            <SimplePieChart 
              data={assetsComposition} 
              title="Composición de Activos" 
            />
          </div>
        )}
        
        {financialStructure.length > 0 && (
          <div data-chart="financial-structure">
            <SimplePieChart 
              data={financialStructure} 
              title="Estructura Financiera" 
            />
          </div>
        )}
      </div>
      
      {/* Análisis de rentabilidad */}
      {profitabilityData.length > 0 && (
        <div data-chart="profitability-analysis">
          <SimpleBarChart 
            data={profitabilityData} 
            title="Análisis de Rentabilidad" 
            height={250}
          />
        </div>
      )}
    </div>
  );
};