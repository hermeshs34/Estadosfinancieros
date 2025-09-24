import React, { useState } from 'react';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { BalanceSheet } from './BalanceSheet';
import { IncomeStatement } from './IncomeStatement';
import { CashFlowStatement } from './CashFlowStatement';
import { CriticalItemsAnalyzer } from '../analysis/CriticalItemsAnalyzer';
import { FinancialCharts } from '../charts/FinancialCharts';
import { VarianceAnalysis } from '../analysis/VarianceAnalysis';
import { RiskIndicators } from '../analysis/RiskIndicators';
import { DateFilter } from '../ui/DateFilter';
import { useDataContext } from '../../contexts/DataContext';
import { FileText, Download, Printer, AlertTriangle, BarChart3, TrendingUp, Shield } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type StatementType = 'balance' | 'income' | 'cashflow' | 'critical' | 'charts' | 'variance' | 'risk';

export const FinancialStatements: React.FC = () => {
  const [activeStatement, setActiveStatement] = useState<StatementType>('balance');
  const {
    importedData,
    selectedMonth,
    selectedYear,
    availableMonths,
    availableYears,
    setDateFilter,
    balanceSheetData,
    incomeStatementData
  } = useDataContext();

  const statements = [
    { id: 'balance', name: 'Balance Sheet', component: BalanceSheet },
    { id: 'income', name: 'Income Statement', component: IncomeStatement },
    { id: 'cashflow', name: 'Cash Flow Statement', component: CashFlowStatement },
    { id: 'critical', name: 'Critical Analysis', component: CriticalItemsAnalyzer },
    { id: 'charts', name: 'Financial Charts', component: FinancialCharts },
    { id: 'variance', name: 'Variance Analysis', component: VarianceAnalysis },
    { id: 'risk', name: 'Risk Indicators', component: RiskIndicators },
  ];

  const ActiveComponent = statements.find(s => s.id === activeStatement)?.component || BalanceSheet;

  // Función para exportar a Excel
  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    const { balanceSheetData, incomeStatementData, cashFlowData } = useDataContext();
    
    // Hoja de Balance
    if (balanceSheetData) {
      const balanceData = [
        { Concepto: 'Activos Corrientes', Valor: balanceSheetData.currentAssets || 0 },
        { Concepto: 'Activos No Corrientes', Valor: balanceSheetData.nonCurrentAssets || 0 },
        { Concepto: 'Total Activos', Valor: balanceSheetData.totalAssets || 0 },
        { Concepto: 'Pasivos Corrientes', Valor: balanceSheetData.currentLiabilities || 0 },
        { Concepto: 'Pasivos No Corrientes', Valor: balanceSheetData.nonCurrentLiabilities || 0 },
        { Concepto: 'Total Pasivos', Valor: balanceSheetData.totalLiabilities || 0 },
        { Concepto: 'Patrimonio', Valor: balanceSheetData.totalEquity || 0 }
      ];
      const ws1 = XLSX.utils.json_to_sheet(balanceData);
      XLSX.utils.book_append_sheet(wb, ws1, 'Balance General');
    }
    
    // Hoja de Estado de Resultados
    if (incomeStatementData) {
      const incomeData = [
        { Concepto: 'Ingresos', Valor: incomeStatementData.revenue || 0 },
        { Concepto: 'Costo de Ventas', Valor: incomeStatementData.costOfGoodsSold || 0 },
        { Concepto: 'Utilidad Bruta', Valor: incomeStatementData.grossProfit || 0 },
        { Concepto: 'Gastos Operativos', Valor: incomeStatementData.operatingExpenses || 0 },
        { Concepto: 'Utilidad Operativa', Valor: incomeStatementData.operatingIncome || 0 },
        { Concepto: 'Utilidad Neta', Valor: incomeStatementData.netIncome || 0 }
      ];
      const ws2 = XLSX.utils.json_to_sheet(incomeData);
      XLSX.utils.book_append_sheet(wb, ws2, 'Estado de Resultados');
    }
    
    const fileName = `estados_financieros_${selectedMonth || 'todos'}_${selectedYear || 'todos'}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // Función para generar PDF
  const generatePDF = () => {
    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(20);
    doc.text('Estados Financieros', 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Período: ${selectedMonth || 'Todos'} ${selectedYear || 'Todos'}`, 20, 30);
    
    let yPosition = 50;
    
    // Balance General
    if (balanceSheetData) {
      doc.setFontSize(16);
      doc.text('Balance General', 20, yPosition);
      yPosition += 10;
      
      const balanceTableData = [
        ['Activos Corrientes', (balanceSheetData.currentAssets || 0).toLocaleString()],
        ['Activos No Corrientes', (balanceSheetData.nonCurrentAssets || 0).toLocaleString()],
        ['Total Activos', (balanceSheetData.totalAssets || 0).toLocaleString()],
        ['Pasivos Corrientes', (balanceSheetData.currentLiabilities || 0).toLocaleString()],
        ['Pasivos No Corrientes', (balanceSheetData.nonCurrentLiabilities || 0).toLocaleString()],
        ['Total Pasivos', (balanceSheetData.totalLiabilities || 0).toLocaleString()],
        ['Patrimonio', (balanceSheetData.totalEquity || 0).toLocaleString()]
      ];
      
      autoTable(doc, {
        head: [['Concepto', 'Valor']],
        body: balanceTableData,
        startY: yPosition,
        styles: { fontSize: 10 },
        headStyles: { fillColor: [41, 128, 185] }
      });
      
      yPosition = (doc as any).lastAutoTable.finalY + 20;
    }
    
    // Estado de Resultados
    if (incomeStatementData && yPosition < 250) {
      doc.setFontSize(16);
      doc.text('Estado de Resultados', 20, yPosition);
      yPosition += 10;
      
      const incomeTableData = [
        ['Ingresos', (incomeStatementData.revenue || 0).toLocaleString()],
        ['Costo de Ventas', (incomeStatementData.costOfGoodsSold || 0).toLocaleString()],
        ['Utilidad Bruta', (incomeStatementData.grossProfit || 0).toLocaleString()],
        ['Gastos Operativos', (incomeStatementData.operatingExpenses || 0).toLocaleString()],
        ['Utilidad Operativa', (incomeStatementData.operatingIncome || 0).toLocaleString()],
        ['Utilidad Neta', (incomeStatementData.netIncome || 0).toLocaleString()]
      ];
      
      autoTable(doc, {
        head: [['Concepto', 'Valor']],
        body: incomeTableData,
        startY: yPosition,
        styles: { fontSize: 10 },
        headStyles: { fillColor: [231, 76, 60] }
      });
    }
    
    const fileName = `estados_financieros_${selectedMonth || 'todos'}_${selectedYear || 'todos'}.pdf`;
    doc.save(fileName);
  };

  // Función para imprimir
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Financial Statements</h1>
          <p className="text-gray-600 mt-1">Comprehensive financial reporting and analysis</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button onClick={exportToExcel} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export to Excel
          </Button>
          <Button onClick={generatePDF} variant="outline" size="sm">
            <FileText className="w-4 h-4 mr-2" />
            Generate PDF
          </Button>
          <Button onClick={handlePrint} variant="secondary" size="sm">
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
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

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Financial Statements</CardTitle>
            <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
              {statements.map((statement) => (
                <button
                  key={statement.id}
                  onClick={() => setActiveStatement(statement.id as StatementType)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center ${
                    activeStatement === statement.id
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {statement.id === 'critical' && <AlertTriangle className="w-4 h-4 mr-1" />}
                  {statement.id === 'charts' && <BarChart3 className="w-4 h-4 mr-1" />}
                  {statement.id === 'variance' && <TrendingUp className="w-4 h-4 mr-1" />}
                  {statement.id === 'risk' && <Shield className="w-4 h-4 mr-1" />}
                  {statement.name}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        
        <ActiveComponent />
      </Card>
    </div>
  );
};