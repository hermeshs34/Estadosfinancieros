import React, { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { useDataContext } from '../../contexts/DataContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface VarianceItem {
  account: string;
  currentValue: number;
  previousValue: number;
  variance: number;
  variancePercentage: number;
  trend: 'up' | 'down' | 'stable';
  significance: 'high' | 'medium' | 'low';
}

export const VarianceAnalysis: React.FC = () => {
  const { importedData, balanceSheetData, incomeStatementData } = useDataContext();
  const { selectedCurrency, formatCurrency } = useCurrency();
  
  // En una implementación real, los datos del período anterior vendrían de una base de datos histórica
  // Por ahora, no hay datos históricos disponibles
  const previousBalanceData = null;
  const previousIncomeData = null;

  // Calcular varianzas para Balance General
  const balanceVarianceData = useMemo((): VarianceItem[] => {
    if (!balanceSheetData || !previousBalanceData) return [];

    const accounts = [
      { key: 'currentAssets', name: 'Activos Corrientes' },
      { key: 'nonCurrentAssets', name: 'Activos No Corrientes' },
      { key: 'totalAssets', name: 'Total Activos' },
      { key: 'currentLiabilities', name: 'Pasivos Corrientes' },
      { key: 'nonCurrentLiabilities', name: 'Pasivos No Corrientes' },
      { key: 'totalLiabilities', name: 'Total Pasivos' },
      { key: 'totalEquity', name: 'Patrimonio Total' }
    ];

    return accounts.map(account => {
      const currentValue = balanceSheetData[account.key] || 0;
      const previousValue = previousBalanceData[account.key] || 0;
      const variance = currentValue - previousValue;
      const variancePercentage = previousValue !== 0 ? (variance / Math.abs(previousValue)) * 100 : 0;
      
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (Math.abs(variancePercentage) > 1) {
        trend = variance > 0 ? 'up' : 'down';
      }
      
      let significance: 'high' | 'medium' | 'low' = 'low';
      if (Math.abs(variancePercentage) > 20) {
        significance = 'high';
      } else if (Math.abs(variancePercentage) > 10) {
        significance = 'medium';
      }
      
      return {
        account: account.name,
        currentValue,
        previousValue,
        variance,
        variancePercentage,
        trend,
        significance
      };
    }).filter(item => item.currentValue !== 0 || item.previousValue !== 0);
  }, [balanceSheetData, previousBalanceData]);
  
  // Calcular varianzas para Estado de Resultados
  const incomeVarianceData = useMemo((): VarianceItem[] => {
    if (!incomeStatementData || !previousIncomeData) return [];

    const accounts = [
      { key: 'revenue', name: 'Ingresos' },
      { key: 'costOfGoodsSold', name: 'Costo de Ventas' },
      { key: 'grossProfit', name: 'Utilidad Bruta' },
      { key: 'operatingExpenses', name: 'Gastos Operativos' },
      { key: 'operatingIncome', name: 'Utilidad Operativa' },
      { key: 'netIncome', name: 'Utilidad Neta' }
    ];

    return accounts.map(account => {
      const currentValue = incomeStatementData[account.key] || 0;
      const previousValue = previousIncomeData[account.key] || 0;
      const variance = currentValue - previousValue;
      const variancePercentage = previousValue !== 0 ? (variance / Math.abs(previousValue)) * 100 : 0;
      
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (Math.abs(variancePercentage) > 1) {
        trend = variance > 0 ? 'up' : 'down';
      }
      
      let significance: 'high' | 'medium' | 'low' = 'low';
      if (Math.abs(variancePercentage) > 20) {
        significance = 'high';
      } else if (Math.abs(variancePercentage) > 10) {
        significance = 'medium';
      }
      
      return {
        account: account.name,
        currentValue,
        previousValue,
        variance,
        variancePercentage,
        trend,
        significance
      };
    }).filter(item => item.currentValue !== 0 || item.previousValue !== 0);
  }, [incomeStatementData, previousIncomeData]);

  const exportToExcel = () => {
    try {
      const workbook = XLSX.utils.book_new();
      
      // Hoja de Balance General
      if (balanceVarianceData.length > 0) {
        const balanceData = balanceVarianceData.map(item => ({
          'Cuenta': item.account,
          'Valor Actual': item.currentValue,
          'Valor Anterior': item.previousValue,
          'Variación': item.variance,
          'Porcentaje': `${item.variancePercentage.toFixed(1)}%`,
          'Tendencia': item.trend === 'up' ? 'Ascendente' : item.trend === 'down' ? 'Descendente' : 'Estable',
          'Significancia': item.significance === 'high' ? 'Alta' : item.significance === 'medium' ? 'Media' : 'Baja'
        }));
        
        const balanceWorksheet = XLSX.utils.json_to_sheet(balanceData);
        XLSX.utils.book_append_sheet(workbook, balanceWorksheet, 'Balance General');
      }
      
      // Hoja de Estado de Resultados
      if (incomeVarianceData.length > 0) {
        const incomeData = incomeVarianceData.map(item => ({
          'Cuenta': item.account,
          'Valor Actual': item.currentValue,
          'Valor Anterior': item.previousValue,
          'Variación': item.variance,
          'Porcentaje': `${item.variancePercentage.toFixed(1)}%`,
          'Tendencia': item.trend === 'up' ? 'Ascendente' : item.trend === 'down' ? 'Descendente' : 'Estable',
          'Significancia': item.significance === 'high' ? 'Alta' : item.significance === 'medium' ? 'Media' : 'Baja'
        }));
        
        const incomeWorksheet = XLSX.utils.json_to_sheet(incomeData);
        XLSX.utils.book_append_sheet(workbook, incomeWorksheet, 'Estado de Resultados');
      }
      
      XLSX.writeFile(workbook, 'analisis-variaciones.xlsx');
    } catch (error) {
      console.error('Error al exportar a Excel:', error);
      alert('Error al generar el archivo Excel');
    }
  };

  const generatePDF = () => {
    try {
      const doc = new jsPDF();
      
      // Título
      doc.setFontSize(18);
      doc.text('Análisis de Variaciones', 20, 20);
      
      doc.setFontSize(12);
      doc.text(`Fecha de generación: ${new Date().toLocaleDateString()}`, 20, 35);
      
      let yPosition = 50;
      
      // Tabla de Balance General
      if (balanceVarianceData.length > 0) {
        doc.setFontSize(14);
        doc.text('Balance General', 20, yPosition);
        yPosition += 10;
        
        const balanceTableData = balanceVarianceData.map(item => [
          item.account,
          item.currentValue.toLocaleString(),
          item.previousValue.toLocaleString(),
          item.variance.toLocaleString(),
          `${item.variancePercentage.toFixed(1)}%`,
          item.trend === 'up' ? 'Asc' : item.trend === 'down' ? 'Desc' : 'Est'
        ]);
        
        autoTable(doc, {
          head: [['Cuenta', 'Actual', 'Anterior', 'Variación', '%', 'Tend']],
          body: balanceTableData,
          startY: yPosition,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [66, 139, 202] }
        });
        
        yPosition = (doc as any).lastAutoTable.finalY + 20;
      }
      
      // Tabla de Estado de Resultados
      if (incomeVarianceData.length > 0) {
        doc.setFontSize(14);
        doc.text('Estado de Resultados', 20, yPosition);
        yPosition += 10;
        
        const incomeTableData = incomeVarianceData.map(item => [
          item.account,
          item.currentValue.toLocaleString(),
          item.previousValue.toLocaleString(),
          item.variance.toLocaleString(),
          `${item.variancePercentage.toFixed(1)}%`,
          item.trend === 'up' ? 'Asc' : item.trend === 'down' ? 'Desc' : 'Est'
        ]);
        
        autoTable(doc, {
          head: [['Cuenta', 'Actual', 'Anterior', 'Variación', '%', 'Tend']],
          body: incomeTableData,
          startY: yPosition,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [40, 167, 69] }
        });
      }
      
      doc.save('analisis-variaciones.pdf');
    } catch (error) {
      console.error('Error al generar PDF:', error);
      alert('Error al generar el archivo PDF');
    }
  };

  // Obtener el ícono de tendencia
  const getTrendIcon = (trend: 'up' | 'down' | 'stable', significance: string) => {
    const iconClass = `w-4 h-4 ${
      significance === 'high' ? 'text-red-500' :
      significance === 'medium' ? 'text-yellow-500' :
      'text-gray-400'
    }`;
    
    switch (trend) {
      case 'up':
        return <TrendingUp className={iconClass} />;
      case 'down':
        return <TrendingDown className={iconClass} />;
      default:
        return <Minus className={iconClass} />;
    }
  };

  // Obtener color de la varianza
  const getVarianceColor = (variance: number, significance: string, account: string) => {
    if (significance === 'low') return 'text-gray-600';
    
    // Para cuentas donde el aumento es positivo
    const positiveAccounts = [
      'Ingresos', 'Utilidad Bruta', 'Utilidad Operativa', 'Utilidad Neta',
      'Activos Corrientes', 'Total Activos', 'Patrimonio Total'
    ];
    
    // Para cuentas donde la disminución es positiva
    const negativeAccounts = [
      'Costo de Ventas', 'Gastos Operativos', 'Pasivos Corrientes', 
      'Pasivos No Corrientes', 'Total Pasivos'
    ];
    
    if (positiveAccounts.includes(account)) {
      return variance > 0 ? 'text-green-600' : 'text-red-600';
    } else if (negativeAccounts.includes(account)) {
      return variance < 0 ? 'text-green-600' : 'text-red-600';
    }
    
    return 'text-gray-600';
  };

  // Resumen de varianzas significativas
  const significantVariances = useMemo(() => {
    return [...balanceVarianceData, ...incomeVarianceData].filter(item => item.significance === 'high');
  }, [balanceVarianceData, incomeVarianceData]);

  if (balanceVarianceData.length === 0 && incomeVarianceData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Análisis de Varianza</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertTriangle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              Análisis de Varianza No Disponible
            </h4>
            <p className="text-gray-600 mb-4 max-w-md mx-auto">
              Para realizar un análisis de varianza se requieren datos históricos de períodos anteriores. 
              Actualmente solo se cuenta con datos del período actual.
            </p>
            <p className="text-sm text-gray-500">
              💡 Importe datos de períodos anteriores para habilitar esta funcionalidad
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Botones de exportación */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Análisis de Variaciones</CardTitle>
            <div className="flex gap-2">
              <Button
                onClick={exportToExcel}
                className="bg-green-600 hover:bg-green-700 text-white"
                size="sm"
              >
                <Download className="w-4 h-4 mr-2" />
                Excel
              </Button>
              <Button
                onClick={generatePDF}
                className="bg-red-600 hover:bg-red-700 text-white"
                size="sm"
              >
                <Download className="w-4 h-4 mr-2" />
                PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            Análisis comparativo entre períodos para identificar variaciones significativas en las cuentas financieras.
          </p>
        </CardContent>
      </Card>
      {/* Alertas de varianzas significativas */}
      {significantVariances.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center text-yellow-800">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Variaciones Significativas Detectadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {significantVariances.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                  <span className="font-medium text-gray-800">{item.account}</span>
                  <div className="flex items-center space-x-2">
                    {getTrendIcon(item.trend, item.significance)}
                    <span className={`font-bold ${
                      getVarianceColor(item.variance, item.significance, item.account)
                    }`}>
                      {item.variancePercentage > 0 ? '+' : ''}{item.variancePercentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabla de análisis de varianza - Balance General */}
      {balanceVarianceData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Análisis de Varianza - Balance General</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Cuenta</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Período Anterior</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Período Actual</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Variación</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">%</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Tendencia</th>
                  </tr>
                </thead>
                <tbody>
                  {balanceVarianceData.map((item, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-800">{item.account}</td>
                      <td className="py-3 px-4 text-right text-gray-600">
                        {formatNumber(item.previousValue, 0)}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-800 font-medium">
                        {formatNumber(item.currentValue, 0)}
                      </td>
                      <td className={`py-3 px-4 text-right font-medium ${
                        getVarianceColor(item.variance, item.significance, item.account)
                      }`}>
                        {item.variance > 0 ? '+' : ''}{formatNumber(item.variance, 0)}
                      </td>
                      <td className={`py-3 px-4 text-right font-bold ${
                        getVarianceColor(item.variance, item.significance, item.account)
                      }`}>
                        {item.variancePercentage > 0 ? '+' : ''}{item.variancePercentage.toFixed(1)}%
                      </td>
                      <td className="py-3 px-4 text-center">
                        {getTrendIcon(item.trend, item.significance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Tabla de análisis de varianza - Estado de Resultados */}
      {incomeVarianceData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Análisis de Varianza - Estado de Resultados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Cuenta</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Período Anterior</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Período Actual</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Variación</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">%</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Tendencia</th>
                  </tr>
                </thead>
                <tbody>
                  {incomeVarianceData.map((item, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-800">{item.account}</td>
                      <td className="py-3 px-4 text-right text-gray-600">
                        {formatCurrency(item.previousValue, selectedCurrency)}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-800 font-medium">
                        {formatCurrency(item.currentValue, selectedCurrency)}
                      </td>
                      <td className={`py-3 px-4 text-right font-medium ${
                        getVarianceColor(item.variance, item.significance, item.account)
                      }`}>
                        {item.variance > 0 ? '+' : ''}{formatCurrency(item.variance, selectedCurrency)}
                      </td>
                      <td className={`py-3 px-4 text-right font-bold ${
                        getVarianceColor(item.variance, item.significance, item.account)
                      }`}>
                        {item.variancePercentage > 0 ? '+' : ''}{item.variancePercentage.toFixed(1)}%
                      </td>
                      <td className="py-3 px-4 text-center">
                        {getTrendIcon(item.trend, item.significance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resumen estadístico */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">Variaciones Altas</p>
              <p className="text-2xl font-bold text-red-600">
                {[...balanceVarianceData, ...incomeVarianceData].filter(item => item.significance === 'high').length}
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">Variaciones Medias</p>
              <p className="text-2xl font-bold text-yellow-600">
                {[...balanceVarianceData, ...incomeVarianceData].filter(item => item.significance === 'medium').length}
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">Cuentas Estables</p>
              <p className="text-2xl font-bold text-green-600">
                {[...balanceVarianceData, ...incomeVarianceData].filter(item => item.significance === 'low').length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};