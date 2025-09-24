import React, { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { useDataContext } from '../../contexts/DataContext';
import { AlertTriangle, Shield, TrendingDown, Activity, DollarSign, Percent, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface RiskIndicator {
  name: string;
  value: number;
  benchmark: number;
  status: 'excellent' | 'good' | 'warning' | 'critical';
  description: string;
  recommendation: string;
  icon: React.ComponentType<any>;
}

interface RiskLevel {
  level: 'low' | 'medium' | 'high' | 'critical';
  color: string;
  bgColor: string;
  description: string;
}

export const RiskIndicators: React.FC = () => {
  const { balanceSheetData, incomeStatementData } = useDataContext();

  // Calcular indicadores de riesgo
  const riskIndicators = useMemo((): RiskIndicator[] => {
    if (!balanceSheetData || !incomeStatementData) return [];

    const {
      currentAssets = 0,
      currentLiabilities = 0,
      totalAssets = 0,
      totalLiabilities = 0,
      totalEquity = 0,
      inventory = 0,
      accountsReceivable = 0
    } = balanceSheetData;

    const {
      revenue = 0,
      netIncome = 0,
      operatingIncome = 0,
      interestExpense = 0
    } = incomeStatementData;

    const indicators: RiskIndicator[] = [];

    // 1. Liquidez Corriente
    const currentRatio = currentLiabilities > 0 ? currentAssets / currentLiabilities : 0;
    indicators.push({
      name: 'Liquidez Corriente',
      value: currentRatio,
      benchmark: 1.5,
      status: currentRatio >= 2 ? 'excellent' : currentRatio >= 1.5 ? 'good' : currentRatio >= 1 ? 'warning' : 'critical',
      description: 'Capacidad para cubrir obligaciones a corto plazo',
      recommendation: currentRatio < 1.5 ? 'Mejorar gestión de efectivo y reducir pasivos corrientes' : 'Mantener niveles actuales de liquidez',
      icon: Activity
    });

    // 2. Endeudamiento
    const debtRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;
    indicators.push({
      name: 'Ratio de Endeudamiento',
      value: debtRatio,
      benchmark: 60,
      status: debtRatio <= 40 ? 'excellent' : debtRatio <= 60 ? 'good' : debtRatio <= 80 ? 'warning' : 'critical',
      description: 'Porcentaje de activos financiados con deuda',
      recommendation: debtRatio > 60 ? 'Reducir niveles de deuda o aumentar patrimonio' : 'Nivel de endeudamiento saludable',
      icon: TrendingDown
    });

    // 3. Cobertura de Intereses
    const interestCoverage = interestExpense > 0 ? operatingIncome / interestExpense : 0;
    indicators.push({
      name: 'Cobertura de Intereses',
      value: interestCoverage,
      benchmark: 2.5,
      status: interestCoverage >= 5 ? 'excellent' : interestCoverage >= 2.5 ? 'good' : interestCoverage >= 1.5 ? 'warning' : 'critical',
      description: 'Capacidad para pagar intereses de la deuda',
      recommendation: interestCoverage < 2.5 ? 'Mejorar rentabilidad operativa o reducir deuda' : 'Capacidad adecuada para servir la deuda',
      icon: Shield
    });

    // 4. Margen de Utilidad Neta
    const netMargin = revenue > 0 ? (netIncome / revenue) * 100 : 0;
    indicators.push({
      name: 'Margen de Utilidad Neta',
      value: netMargin,
      benchmark: 5,
      status: netMargin >= 10 ? 'excellent' : netMargin >= 5 ? 'good' : netMargin >= 2 ? 'warning' : 'critical',
      description: 'Rentabilidad después de todos los gastos',
      recommendation: netMargin < 5 ? 'Optimizar costos y mejorar eficiencia operativa' : 'Rentabilidad saludable',
      icon: Percent
    });

    // 5. ROA (Return on Assets)
    const roa = totalAssets > 0 ? (netIncome / totalAssets) * 100 : 0;
    indicators.push({
      name: 'Retorno sobre Activos (ROA)',
      value: roa,
      benchmark: 5,
      status: roa >= 8 ? 'excellent' : roa >= 5 ? 'good' : roa >= 2 ? 'warning' : 'critical',
      description: 'Eficiencia en el uso de activos para generar utilidades',
      recommendation: roa < 5 ? 'Mejorar eficiencia operativa y gestión de activos' : 'Uso eficiente de activos',
      icon: DollarSign
    });

    // 6. Rotación de Cuentas por Cobrar (días)
    const receivablesTurnover = revenue > 0 && accountsReceivable > 0 ? (accountsReceivable / revenue) * 365 : 0;
    if (receivablesTurnover > 0) {
      indicators.push({
        name: 'Días de Cuentas por Cobrar',
        value: receivablesTurnover,
        benchmark: 45,
        status: receivablesTurnover <= 30 ? 'excellent' : receivablesTurnover <= 45 ? 'good' : receivablesTurnover <= 60 ? 'warning' : 'critical',
        description: 'Tiempo promedio para cobrar las ventas',
        recommendation: receivablesTurnover > 45 ? 'Mejorar políticas de cobranza y crédito' : 'Gestión eficiente de cobranzas',
        icon: Activity
      });
    }

    return indicators;
  }, [balanceSheetData, incomeStatementData]);

  // Calcular nivel de riesgo general
  const overallRiskLevel = useMemo((): RiskLevel => {
    if (riskIndicators.length === 0) {
      return {
        level: 'medium',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        description: 'No hay suficientes datos para evaluar el riesgo'
      };
    }

    const criticalCount = riskIndicators.filter(i => i.status === 'critical').length;
    const warningCount = riskIndicators.filter(i => i.status === 'warning').length;
    const goodCount = riskIndicators.filter(i => i.status === 'good').length;
    const excellentCount = riskIndicators.filter(i => i.status === 'excellent').length;

    if (criticalCount >= 2) {
      return {
        level: 'critical',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        description: 'Riesgo financiero crítico - Requiere atención inmediata'
      };
    } else if (criticalCount >= 1 || warningCount >= 3) {
      return {
        level: 'high',
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        description: 'Riesgo financiero alto - Monitoreo constante requerido'
      };
    } else if (warningCount >= 1) {
      return {
        level: 'medium',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        description: 'Riesgo financiero moderado - Algunas áreas requieren atención'
      };
    } else {
      return {
        level: 'low',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        description: 'Riesgo financiero bajo - Situación financiera saludable'
      };
    }
  }, [riskIndicators]);

  const exportToExcel = () => {
    try {
      const workbook = XLSX.utils.book_new();
      
      // Hoja de Indicadores de Riesgo
      const indicatorsData = riskIndicators.map(indicator => ({
        'Indicador': indicator.name,
        'Valor': indicator.name.includes('Días') || indicator.name.includes('Ratio') || indicator.name.includes('Cobertura') 
          ? indicator.value.toFixed(1)
          : `${indicator.value.toFixed(1)}%`,
        'Benchmark': indicator.name.includes('Días') || indicator.name.includes('Ratio') || indicator.name.includes('Cobertura')
          ? indicator.benchmark.toFixed(1)
          : `${indicator.benchmark}%`,
        'Estado': indicator.status === 'excellent' ? 'Excelente' :
                 indicator.status === 'good' ? 'Bueno' :
                 indicator.status === 'warning' ? 'Advertencia' : 'Crítico',
        'Descripción': indicator.description,
        'Recomendación': indicator.recommendation
      }));
      
      const worksheet = XLSX.utils.json_to_sheet(indicatorsData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Indicadores de Riesgo');
      
      // Hoja de Resumen de Riesgo
      const summaryData = [{
        'Nivel de Riesgo General': overallRiskLevel.level.toUpperCase(),
        'Descripción': overallRiskLevel.description,
        'Indicadores Excelentes': riskIndicators.filter(i => i.status === 'excellent').length,
        'Indicadores Buenos': riskIndicators.filter(i => i.status === 'good').length,
        'Indicadores en Advertencia': riskIndicators.filter(i => i.status === 'warning').length,
        'Indicadores Críticos': riskIndicators.filter(i => i.status === 'critical').length
      }];
      
      const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Resumen de Riesgo');
      
      XLSX.writeFile(workbook, 'indicadores-riesgo.xlsx');
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
      doc.text('Indicadores de Riesgo Financiero', 20, 20);
      
      doc.setFontSize(12);
      doc.text(`Fecha de generación: ${new Date().toLocaleDateString()}`, 20, 35);
      
      // Resumen de riesgo general
      doc.setFontSize(14);
      doc.text('Evaluación General de Riesgo', 20, 55);
      
      doc.setFontSize(12);
      doc.text(`Nivel: ${overallRiskLevel.level.toUpperCase()}`, 20, 70);
      doc.text(`${overallRiskLevel.description}`, 20, 80);
      
      // Tabla de indicadores
      if (riskIndicators.length > 0) {
        const tableData = riskIndicators.map(indicator => [
          indicator.name,
          indicator.name.includes('Días') || indicator.name.includes('Ratio') || indicator.name.includes('Cobertura') 
            ? indicator.value.toFixed(1)
            : `${indicator.value.toFixed(1)}%`,
          indicator.name.includes('Días') || indicator.name.includes('Ratio') || indicator.name.includes('Cobertura')
            ? indicator.benchmark.toFixed(1)
            : `${indicator.benchmark}%`,
          indicator.status === 'excellent' ? 'Excelente' :
          indicator.status === 'good' ? 'Bueno' :
          indicator.status === 'warning' ? 'Advertencia' : 'Crítico'
        ]);
        
        autoTable(doc, {
          head: [['Indicador', 'Valor', 'Benchmark', 'Estado']],
          body: tableData,
          startY: 95,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [66, 139, 202] }
        });
        
        // Alertas críticas
        const criticalIndicators = riskIndicators.filter(i => i.status === 'critical');
        if (criticalIndicators.length > 0) {
          let yPosition = (doc as any).lastAutoTable.finalY + 20;
          
          doc.setFontSize(14);
          doc.text('Alertas Críticas', 20, yPosition);
          yPosition += 15;
          
          criticalIndicators.forEach((indicator, index) => {
            doc.setFontSize(10);
            doc.text(`${index + 1}. ${indicator.name}`, 25, yPosition);
            yPosition += 8;
            doc.text(`   Recomendación: ${indicator.recommendation}`, 25, yPosition);
            yPosition += 12;
          });
        }
      }
      
      doc.save('indicadores-riesgo.pdf');
    } catch (error) {
      console.error('Error al generar PDF:', error);
      alert('Error al generar el archivo PDF');
    }
  };

  // Obtener color del indicador
  const getIndicatorColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  // Obtener color de fondo del indicador
  const getIndicatorBgColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'bg-green-50 border-green-200';
      case 'good': return 'bg-blue-50 border-blue-200';
      case 'warning': return 'bg-yellow-50 border-yellow-200';
      case 'critical': return 'bg-red-50 border-red-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  if (riskIndicators.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2" />
            Indicadores de Riesgo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-4">
            No hay datos suficientes para calcular los indicadores de riesgo.
          </p>
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
            <CardTitle className="flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Indicadores de Riesgo
            </CardTitle>
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
            Evaluación integral de los indicadores financieros clave para identificar riesgos potenciales.
          </p>
        </CardContent>
      </Card>
      {/* Resumen de riesgo general */}
      <Card className={`border-2 ${overallRiskLevel.bgColor}`}>
        <CardHeader>
          <CardTitle className={`flex items-center ${overallRiskLevel.color}`}>
            <AlertTriangle className="w-6 h-6 mr-2" />
            Evaluación General de Riesgo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-2xl font-bold ${overallRiskLevel.color}`}>
                {overallRiskLevel.level.toUpperCase()}
              </p>
              <p className="text-gray-600 mt-1">{overallRiskLevel.description}</p>
            </div>
            <div className="text-right">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-green-600">Excelente: {riskIndicators.filter(i => i.status === 'excellent').length}</div>
                <div className="text-blue-600">Bueno: {riskIndicators.filter(i => i.status === 'good').length}</div>
                <div className="text-yellow-600">Advertencia: {riskIndicators.filter(i => i.status === 'warning').length}</div>
                <div className="text-red-600">Crítico: {riskIndicators.filter(i => i.status === 'critical').length}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Indicadores individuales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {riskIndicators.map((indicator, index) => {
          const IconComponent = indicator.icon;
          return (
            <Card key={index} className={`border ${getIndicatorBgColor(indicator.status)}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center">
                    <IconComponent className={`w-5 h-5 mr-2 ${getIndicatorColor(indicator.status)}`} />
                    <h3 className="font-semibold text-gray-800 text-sm">{indicator.name}</h3>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    indicator.status === 'excellent' ? 'bg-green-100 text-green-800' :
                    indicator.status === 'good' ? 'bg-blue-100 text-blue-800' :
                    indicator.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {indicator.status === 'excellent' ? 'Excelente' :
                     indicator.status === 'good' ? 'Bueno' :
                     indicator.status === 'warning' ? 'Advertencia' : 'Crítico'}
                  </span>
                </div>
                
                <div className="mb-3">
                  <div className="flex items-baseline justify-between">
                    <span className={`text-2xl font-bold ${getIndicatorColor(indicator.status)}`}>
                      {indicator.name.includes('Días') || indicator.name.includes('Ratio') || indicator.name.includes('Cobertura') 
                        ? indicator.value.toFixed(1)
                        : `${indicator.value.toFixed(1)}%`
                      }
                    </span>
                    <span className="text-sm text-gray-500">
                      Meta: {indicator.name.includes('Días') || indicator.name.includes('Ratio') || indicator.name.includes('Cobertura')
                        ? indicator.benchmark.toFixed(1)
                        : `${indicator.benchmark}%`
                      }
                    </span>
                  </div>
                  
                  {/* Barra de progreso */}
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        indicator.status === 'excellent' ? 'bg-green-500' :
                        indicator.status === 'good' ? 'bg-blue-500' :
                        indicator.status === 'warning' ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{
                        width: `${Math.min(100, Math.max(0, 
                          indicator.name.includes('Endeudamiento') 
                            ? 100 - (indicator.value / 100) * 100
                            : (indicator.value / (indicator.benchmark * 1.5)) * 100
                        ))}%`
                      }}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <p className="text-xs text-gray-600">{indicator.description}</p>
                  <p className="text-xs text-gray-700 font-medium">
                    <strong>Recomendación:</strong> {indicator.recommendation}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Alertas críticas */}
      {riskIndicators.filter(i => i.status === 'critical').length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center text-red-800">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Alertas Críticas - Acción Inmediata Requerida
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {riskIndicators
                .filter(i => i.status === 'critical')
                .map((indicator, index) => (
                  <div key={index} className="p-3 bg-white rounded border border-red-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-red-800">{indicator.name}</span>
                      <span className="text-red-600 font-bold">
                        {indicator.name.includes('Días') || indicator.name.includes('Ratio') || indicator.name.includes('Cobertura')
                          ? indicator.value.toFixed(1)
                          : `${indicator.value.toFixed(1)}%`
                        }
                      </span>
                    </div>
                    <p className="text-sm text-red-700">{indicator.recommendation}</p>
                  </div>
                ))
              }
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};