import React, { useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { useDataContext } from '../../contexts/DataContext';
import { AlertTriangle, TrendingDown, TrendingUp, Eye, Download, BarChart3 } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatNumber, formatPercentage, formatRatio } from '../../lib/numberFormatting';

interface CriticalItem {
  account: string;
  value: number;
  percentage: number;
  riskLevel: 'high' | 'medium' | 'low';
  trend: 'up' | 'down' | 'stable';
  recommendation: string;
  category: string;
}

interface RiskIndicator {
  name: string;
  value: number;
  threshold: number;
  status: 'critical' | 'warning' | 'normal';
  description: string;
}

export const CriticalItemsAnalyzer: React.FC = () => {
  const { balanceSheetData, incomeStatementData } = useDataContext();
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Análisis de partidas críticas
  const criticalItems = useMemo((): CriticalItem[] => {
    const items: CriticalItem[] = [];
    
    if (!balanceSheetData || !incomeStatementData) return items;

    // Análisis de Balance
    const totalAssets = balanceSheetData.totalAssets || 0;
    const equity = balanceSheetData.totalEquity || 0;

    // Cuentas por cobrar (alto riesgo si > 30% de activos)
    const accountsReceivable = balanceSheetData.accountsReceivable || 0;
    if (accountsReceivable > 0) {
      const percentage = (accountsReceivable / totalAssets) * 100;
      items.push({
        account: 'Cuentas por Cobrar',
        value: accountsReceivable,
        percentage,
        riskLevel: percentage > 30 ? 'high' : percentage > 15 ? 'medium' : 'low',
        trend: 'stable',
        recommendation: percentage > 30 ? 'Revisar políticas de cobranza y provisiones' : 'Monitorear rotación de cartera',
        category: 'Liquidez'
      });
    }

    // Inventarios (riesgo si > 25% de activos)
    const inventory = balanceSheetData.inventory || 0;
    if (inventory > 0) {
      const percentage = (inventory / totalAssets) * 100;
      items.push({
        account: 'Inventarios',
        value: inventory,
        percentage,
        riskLevel: percentage > 25 ? 'high' : percentage > 12 ? 'medium' : 'low',
        trend: 'stable',
        recommendation: percentage > 25 ? 'Evaluar obsolescencia y rotación' : 'Optimizar gestión de inventarios',
        category: 'Operacional'
      });
    }

    // Deuda a largo plazo (riesgo si > 40% del patrimonio)
    const longTermDebt = balanceSheetData.longTermDebt || 0;
    if (longTermDebt > 0 && equity > 0) {
      const percentage = (longTermDebt / equity) * 100;
      items.push({
        account: 'Deuda a Largo Plazo',
        value: longTermDebt,
        percentage,
        riskLevel: percentage > 40 ? 'high' : percentage > 20 ? 'medium' : 'low',
        trend: 'stable',
        recommendation: percentage > 40 ? 'Reestructurar deuda o aumentar capital' : 'Mantener niveles de endeudamiento',
        category: 'Endeudamiento'
      });
    }

    // Ratio de endeudamiento total (crítico si > 70%)
    const totalLiabilities = balanceSheetData.totalLiabilities || 0;
    if (totalAssets > 0 && totalLiabilities > 0) {
      const debtRatio = (totalLiabilities / totalAssets) * 100;
      items.push({
        account: 'Endeudamiento Total',
        value: totalLiabilities,
        percentage: debtRatio,
        riskLevel: debtRatio > 70 ? 'high' : debtRatio > 50 ? 'medium' : 'low',
        trend: 'stable',
        recommendation: debtRatio > 70 ? 'Reducir nivel de endeudamiento urgentemente' : debtRatio > 50 ? 'Monitorear estructura de capital' : 'Nivel de endeudamiento saludable',
        category: 'Endeudamiento'
      });
    }

    // Pasivo corriente vs activo corriente (riesgo de liquidez)
    const currentLiabilities = balanceSheetData.currentLiabilities || 0;
    const currentAssets = balanceSheetData.currentAssets || 0;
    if (currentLiabilities > 0 && currentAssets > 0) {
      const currentRatio = currentAssets / currentLiabilities;
      const percentage = (currentLiabilities / currentAssets) * 100;
      items.push({
        account: 'Pasivo Corriente',
        value: currentLiabilities,
        percentage,
        riskLevel: currentRatio < 1 ? 'high' : currentRatio < 1.2 ? 'medium' : 'low',
        trend: 'stable',
        recommendation: currentRatio < 1 ? 'Mejorar liquidez inmediatamente' : currentRatio < 1.2 ? 'Fortalecer posición de liquidez' : 'Liquidez adecuada',
        category: 'Endeudamiento'
      });
    }

    // Análisis de Estado de Resultados
    const revenue = incomeStatementData.revenue || 0;
    const netIncome = incomeStatementData.netIncome || 0;

    // Margen de utilidad (crítico si < 5%)
    if (revenue > 0) {
      const profitMargin = (netIncome / revenue) * 100;
      items.push({
        account: 'Margen de Utilidad',
        value: profitMargin,
        percentage: profitMargin,
        riskLevel: profitMargin < 5 ? 'high' : profitMargin < 10 ? 'medium' : 'low',
        trend: profitMargin > 0 ? 'up' : 'down',
        recommendation: profitMargin < 5 ? 'Urgente: Revisar estructura de costos' : 'Optimizar eficiencia operativa',
        category: 'Rentabilidad'
      });
    }

    return items.sort((a, b) => {
      const riskOrder = { high: 3, medium: 2, low: 1 };
      return riskOrder[b.riskLevel] - riskOrder[a.riskLevel];
    });
  }, [balanceSheetData, incomeStatementData]);

  // Indicadores de riesgo
  const riskIndicators = useMemo((): RiskIndicator[] => {
    const indicators: RiskIndicator[] = [];
    
    if (!balanceSheetData || !incomeStatementData) return indicators;

    const totalAssets = balanceSheetData.totalAssets || 0;
    const totalLiabilities = balanceSheetData.totalLiabilities || 0;
    const currentAssets = balanceSheetData.currentAssets || 0;
    const currentLiabilities = balanceSheetData.currentLiabilities || 0;
    const revenue = incomeStatementData.revenue || 0;
    const netIncome = incomeStatementData.netIncome || 0;

    // Ratio de liquidez corriente
    if (currentLiabilities > 0) {
      const currentRatio = currentAssets / currentLiabilities;
      indicators.push({
        name: 'Liquidez Corriente',
        value: currentRatio,
        threshold: 1.5,
        status: currentRatio < 1 ? 'critical' : currentRatio < 1.5 ? 'warning' : 'normal',
        description: 'Capacidad para cubrir obligaciones a corto plazo'
      });
    }

    // Ratio de endeudamiento
    if (totalAssets > 0) {
      const debtRatio = (totalLiabilities / totalAssets) * 100;
      indicators.push({
        name: 'Endeudamiento',
        value: debtRatio,
        threshold: 60,
        status: debtRatio > 80 ? 'critical' : debtRatio > 60 ? 'warning' : 'normal',
        description: 'Nivel de apalancamiento financiero'
      });
    }

    // ROA (Return on Assets)
    if (totalAssets > 0 && revenue > 0) {
      const roa = (netIncome / totalAssets) * 100;
      indicators.push({
        name: 'ROA',
        value: roa,
        threshold: 5,
        status: roa < 2 ? 'critical' : roa < 5 ? 'warning' : 'normal',
        description: 'Rentabilidad sobre activos totales'
      });
    }

    return indicators;
  }, [balanceSheetData, incomeStatementData]);

  // Función para exportar a Excel
  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    
    // Hoja de partidas críticas
    const criticalItemsData = criticalItems.map(item => ({
      'Cuenta': item.account,
      'Valor': item.value,
      'Porcentaje': `${item.percentage.toFixed(2)}%`,
      'Nivel de Riesgo': item.riskLevel,
      'Tendencia': item.trend,
      'Recomendación': item.recommendation,
      'Categoría': item.category
    }));
    
    const ws1 = XLSX.utils.json_to_sheet(criticalItemsData);
    XLSX.utils.book_append_sheet(wb, ws1, 'Partidas Críticas');
    
    // Hoja de indicadores de riesgo
    const riskData = riskIndicators.map(indicator => ({
      'Indicador': indicator.name,
      'Valor': indicator.value.toFixed(2),
      'Umbral': indicator.threshold,
      'Estado': indicator.status,
      'Descripción': indicator.description
    }));
    
    const ws2 = XLSX.utils.json_to_sheet(riskData);
    XLSX.utils.book_append_sheet(wb, ws2, 'Indicadores de Riesgo');
    
    const currentDate = new Date().toISOString().split('T')[0];
    const fileName = `analisis_critico_${currentDate}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // Función para generar PDF
  const generatePDF = () => {
    try {
      const doc = new jsPDF();
      
      // Título
      doc.setFontSize(20);
      doc.text('Análisis de Partidas Críticas', 20, 20);
      
      const currentDate = new Date().toLocaleDateString('es-ES');
      doc.setFontSize(12);
      doc.text(`Fecha de generación: ${currentDate}`, 20, 30);
      
      // Tabla de partidas críticas
      const criticalTableData = criticalItems.map(item => [
        item.account,
        item.account === 'Margen de Utilidad' 
          ? formatPercentage(item.value)
          : formatNumber(item.value, 0),
        `${item.percentage.toFixed(2)}%`,
        item.riskLevel.toUpperCase(),
        item.recommendation
      ]);
      
      if (criticalTableData.length > 0) {
        autoTable(doc, {
          head: [['Cuenta', 'Valor', '%', 'Riesgo', 'Recomendación']],
          body: criticalTableData,
          startY: 40,
          styles: { fontSize: 8, cellPadding: 3 },
          headStyles: { fillColor: [41, 128, 185], textColor: 255 },
          columnStyles: {
            1: { halign: 'right' },
            2: { halign: 'right' },
            3: { halign: 'center' }
          }
        });
      }
      
      // Tabla de indicadores de riesgo
      const riskTableData = riskIndicators.map(indicator => [
        indicator.name,
        indicator.value.toFixed(2),
        indicator.threshold.toString(),
        indicator.status.toUpperCase(),
        indicator.description
      ]);
      
      if (riskTableData.length > 0) {
        const startY = criticalTableData.length > 0 ? (doc as any).lastAutoTable.finalY + 20 : 50;
        
        doc.setFontSize(14);
        doc.text('Indicadores de Riesgo', 20, startY - 5);
        
        autoTable(doc, {
          head: [['Indicador', 'Valor', 'Umbral', 'Estado', 'Descripción']],
          body: riskTableData,
          startY: startY + 5,
          styles: { fontSize: 8, cellPadding: 3 },
          headStyles: { fillColor: [231, 76, 60], textColor: 255 },
          columnStyles: {
            1: { halign: 'right' },
            2: { halign: 'right' },
            3: { halign: 'center' }
          }
        });
      }
      
      const currentDateFile = new Date().toISOString().split('T')[0];
      const fileName = `analisis_critico_${currentDateFile}.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar el PDF. Por favor, inténtelo de nuevo.');
    }
  };

  const filteredItems = selectedCategory === 'all' 
    ? criticalItems 
    : criticalItems.filter(item => item.category === selectedCategory);

  const categories = ['all', ...Array.from(new Set(criticalItems.map(item => item.category)))];

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      case 'normal': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header con controles */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Análisis de Partidas Críticas</h2>
          <p className="text-gray-600 mt-1">Identificación automática de riesgos y oportunidades</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button onClick={exportToExcel} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Exportar Excel
          </Button>
          <Button onClick={generatePDF} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Generar PDF
          </Button>
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                viewMode === 'table' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600'
              }`}
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('chart')}
              className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                viewMode === 'chart' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Título */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Análisis de Partidas Críticas</h1>
          <p className="text-gray-600 mt-1">Identificación automática de riesgos y oportunidades</p>
        </div>
      </div>

      {/* Indicadores de Riesgo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {riskIndicators.map((indicator, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{indicator.name}</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {indicator.name === 'Liquidez Corriente' 
                      ? formatRatio(indicator.value)
                      : indicator.name === 'Endeudamiento' || indicator.name === 'ROA'
                      ? formatPercentage(indicator.value)
                      : formatNumber(indicator.value)
                    }
                  </p>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(indicator.status)}`}>
                  {indicator.status.toUpperCase()}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">{indicator.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex items-center space-x-4">
        <label className="text-sm font-medium text-gray-700">Categoría:</label>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {categories.map(category => (
            <option key={category} value={category}>
              {category === 'all' ? 'Todas las categorías' : category}
            </option>
          ))}
        </select>
      </div>

      {/* Tabla de Partidas Críticas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-red-500" />
            Partidas Críticas Identificadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredItems.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No se encontraron partidas críticas en los datos actuales.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Cuenta</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">Valor</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">%</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700">Riesgo</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700">Tendencia</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Recomendación</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700">Categoría</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900">{item.account}</td>
                      <td className="py-3 px-4 text-right text-gray-900">
                        {item.account === 'Margen de Utilidad' 
                          ? formatPercentage(item.value)
                          : formatNumber(item.value, 0)
                        }
                      </td>
                      <td className="py-3 px-4 text-right text-gray-900">
                        {formatPercentage(item.percentage)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(item.riskLevel)}`}>
                          {item.riskLevel.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {item.trend === 'up' && <TrendingUp className="w-4 h-4 text-green-500 mx-auto" />}
                        {item.trend === 'down' && <TrendingDown className="w-4 h-4 text-red-500 mx-auto" />}
                        {item.trend === 'stable' && <div className="w-4 h-0.5 bg-gray-400 mx-auto" />}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{item.recommendation}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                          {item.category}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};