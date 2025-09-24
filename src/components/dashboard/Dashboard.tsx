import React, { useState } from 'react';
import { MetricsGrid } from './MetricsGrid';
import { FinancialChart } from './FinancialChart';
import { FinancialAnalysisView } from '../analysis/FinancialAnalysisView';
import { RatiosOverview } from './RatiosOverview';
import { RecentActivity } from './RecentActivity';
import { BalanceValidation } from '../validation/BalanceValidation';
import { DateFilter } from '../ui/DateFilter';
import RiskAlertsManager from '../analysis/RiskAlertsManager';

import { 
  FileText, 
  Upload, 
  Calendar, 
  Database, 
  TrendingUp, 
  DollarSign, 
  BarChart3, 
  Activity,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Eye,
  Download,
  Filter,
  Settings
} from 'lucide-react';
import { useDataContext } from '../../contexts/DataContext';

// Componentes de UI mejorados
const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 ${className}`}>
    {children}
  </div>
);

const CardHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
    {children}
  </div>
);

const CardTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-2xl font-bold text-gray-800 tracking-tight">{children}</h3>
);

const Dashboard: React.FC = () => {
  const { 
    importedData, 
    importHistory, 
    financialAnalysis,
    selectedMonth,
    selectedYear,
    availableMonths,
    availableYears,
    setDateFilter,
    filteredData
  } = useDataContext();
  
  const getLastImportDate = () => {
    if (importHistory.length === 0) return 'No hay importaciones';
    const lastImport = importHistory[importHistory.length - 1];
    try {
      const date = new Date(lastImport.timestamp);
      if (isNaN(date.getTime())) {
        return 'Fecha no disponible';
      }
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Fecha no disponible';
    }
  };

  const getCurrentPeriod = () => {
    const now = new Date();
    const quarter = Math.ceil((now.getMonth() + 1) / 3);
    return `Q${quarter} ${now.getFullYear()}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6 space-y-8">
      {/* Enhanced Header Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-700 to-purple-800 rounded-3xl shadow-2xl">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative p-10 text-white">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-8">
              <div className="flex-shrink-0 bg-white/15 backdrop-blur-sm rounded-2xl p-4">
                <svg width="60" height="48" viewBox="0 0 60 48" className="drop-shadow-lg">
                  <defs>
                    <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style={{stopColor:"#ffffff",stopOpacity:1}} />
                      <stop offset="100%" style={{stopColor:"#e2e8f0",stopOpacity:0.8}} />
                    </linearGradient>
                    
                    <linearGradient id="accentGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" style={{stopColor:"#fbbf24",stopOpacity:1}} />
                      <stop offset="100%" style={{stopColor:"#f59e0b",stopOpacity:1}} />
                    </linearGradient>
                  </defs>
                  
                  {/* Letra H estilizada */}
                  <g transform="translate(8, 10)">
                    <rect x="0" y="0" width="4" height="28" fill="url(#logoGradient)" rx="2"/>
                    <rect x="20" y="0" width="4" height="28" fill="url(#logoGradient)" rx="2"/>
                    <rect x="4" y="12" width="16" height="5" fill="url(#logoGradient)" rx="2.5"/>
                    
                    {/* Elementos AI */}
                    <circle cx="2" cy="4" r="2" fill="url(#accentGradient)"/>
                    <circle cx="22" cy="4" r="2" fill="url(#accentGradient)"/>
                    <circle cx="12" cy="24" r="1.5" fill="url(#accentGradient)" opacity="0.8"/>
                    
                    {/* Conexiones neurales */}
                    <line x1="4" y1="4" x2="20" y2="4" stroke="url(#accentGradient)" strokeWidth="1" opacity="0.6"/>
                    <line x1="12" y1="22" x2="22" y2="24" stroke="url(#accentGradient)" strokeWidth="1" opacity="0.4"/>
                  </g>
                </svg>
              </div>
              <div>
                <h1 className="text-5xl font-bold mb-3 tracking-tight">Financial Dashboard</h1>
                <p className="text-xl text-blue-100 font-medium">Análisis Financiero Inteligente</p>
              </div>
            </div>
            <div className="text-right">
              <div className="bg-white/15 backdrop-blur-md rounded-2xl p-6 space-y-3 border border-white/20">
                <div className="flex items-center justify-end text-blue-100">
                  <Calendar className="w-5 h-5 mr-3" />
                  <span className="font-semibold text-lg">Período: {getCurrentPeriod()}</span>
                </div>
                <div className="flex items-center justify-end text-blue-100">
                  <Database className="w-5 h-5 mr-3" />
                  <span className="font-medium">Actualizado: {getLastImportDate()}</span>
                </div>
                {importedData.length > 0 && (
                  <div className="flex items-center justify-end text-emerald-200">
                    <CheckCircle className="w-5 h-5 mr-3" />
                    <span className="font-semibold">{importedData.length} Registros Cargados</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Filter Section */}
      {importedData.length > 0 && (
        <Card className="border-2 border-blue-100">
          <div className="bg-gradient-to-r from-blue-500 via-indigo-50 to-purple-50 px-8 py-6 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-3 shadow-lg">
                  <Filter className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-800">Filtros de Período</h3>
                  <p className="text-gray-600 font-medium">Selecciona el rango temporal para el análisis</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="bg-white rounded-xl p-4 shadow-md border border-gray-200">
                  <DateFilter
                    selectedMonth={selectedMonth}
                    selectedYear={selectedYear}
                    availableMonths={availableMonths}
                    availableYears={availableYears}
                    onMonthChange={(month) => {
                      console.log('🔄 Cambiando mes a:', month, 'manteniendo año:', selectedYear);
                      setDateFilter(month, selectedYear);
                    }}
                    onYearChange={(year) => {
                      console.log('🔄 Cambiando año a:', year, 'reseteando mes a null');
                      setDateFilter(null, year);
                    }}
                    className="mb-0"
                  />
                </div>
                <button className="flex items-center space-x-3 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                  <RefreshCw className="w-5 h-5" />
                  <span className="font-semibold">Actualizar</span>
                </button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Metrics Grid */}
      <MetricsGrid />

      {/* Financial Analysis */}
      {financialAnalysis && (
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl p-2">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <CardTitle>Análisis Financiero Detallado</CardTitle>
            </div>
          </CardHeader>
          <div className="p-8">
            <FinancialAnalysisView analysis={financialAnalysis} />
          </div>
        </Card>
      )}

      {/* Balance Validation */}
      {financialAnalysis && (
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl p-2">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <CardTitle>Control de Ecuación Patrimonial</CardTitle>
            </div>
          </CardHeader>
          <div className="p-8">
            <BalanceValidation validation={financialAnalysis.patrimonialValidation} />
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-1 gap-8">
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl p-2">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <CardTitle>Tendencia de Ingresos</CardTitle>
            </div>
          </CardHeader>
          <div className="p-8">
            <FinancialChart />
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-xl p-2">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <CardTitle>Ratios Financieros Clave</CardTitle>
            </div>
          </CardHeader>
          <div className="p-8">
            <RatiosOverview />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-2">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <CardTitle>Actividad Reciente</CardTitle>
              </div>
            </CardHeader>
            <div className="p-8">
              <RecentActivity />
            </div>
          </Card>
        </div>

        <Card className="border-2 border-orange-100">
          <div className="bg-gradient-to-r from-orange-50 via-red-50 to-pink-50 px-8 py-6 rounded-t-2xl border-b border-orange-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-xl p-3 shadow-lg">
                  <AlertCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Alertas de Riesgo</h3>
                  <p className="text-gray-600">Monitoreo en tiempo real</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 px-4 py-2 bg-emerald-100 text-emerald-800 rounded-full text-sm font-semibold shadow-md">
                <Activity className="w-4 h-4" />
                <span>Activo</span>
              </div>
            </div>
          </div>
          {financialAnalysis ? (
            <div className="p-6">
              <div className="space-y-4">
                {financialAnalysis.alertas.map((alert, index) => (
                  <div key={index} className="p-4 rounded-xl border-l-4 bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-400 shadow-sm">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-yellow-100 shadow-sm">
                        <span className="text-lg text-yellow-600">⚠</span>
                      </div>
                      <div className="ml-4 flex-1">
                        <p className="text-sm font-medium text-yellow-800">
                          {alert}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {financialAnalysis.alertas.length === 0 && (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                      <CheckCircle className="w-8 h-8 text-emerald-600" />
                    </div>
                    <p className="text-emerald-700 font-bold text-lg">Sin Alertas de Riesgo</p>
                    <p className="text-emerald-600 text-sm mt-2">Todos los indicadores están en rangos óptimos</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 px-6">
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <AlertCircle className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-3">
                  Sin Alertas Disponibles
                </h3>
                <p className="text-gray-600 mb-6 max-w-md leading-relaxed">
                  Las alertas de riesgo aparecerán automáticamente cuando se detecten métricas fuera de rangos normales.
                </p>
                <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
                  <span>💡 Importe datos para activar el monitoreo</span>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Enhanced System Status */}
      <Card className="border-2 border-emerald-100">
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 px-8 py-6 rounded-t-2xl border-b border-emerald-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl p-3 shadow-lg">
                <Database className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-800">Estado del Sistema</h3>
                <p className="text-gray-600 font-medium">Integridad de datos y salud del sistema</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {importedData.length > 0 ? (
                <div className="flex items-center space-x-2 px-6 py-3 bg-emerald-100 text-emerald-800 rounded-full font-bold shadow-md">
                  <CheckCircle className="w-5 h-5" />
                  <span>Operacional</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2 px-6 py-3 bg-yellow-100 text-yellow-800 rounded-full font-bold shadow-md">
                  <AlertCircle className="w-5 h-5" />
                  <span>Esperando Datos</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="p-8">
          {importedData.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <FileText className="w-10 h-10 text-white" />
                </div>
                <div className="text-4xl font-bold text-gray-800 mb-2">{importedData.length}</div>
                <div className="text-gray-600 font-semibold">Registros Totales</div>
              </div>
              <div className="text-center bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-100">
                <div className="bg-gradient-to-r from-purple-500 to-pink-600 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Upload className="w-10 h-10 text-white" />
                </div>
                <div className="text-4xl font-bold text-gray-800 mb-2">{importHistory.length}</div>
                <div className="text-gray-600 font-semibold">Importaciones</div>
              </div>
              <div className="text-center bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 border border-emerald-100">
                <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Calendar className="w-10 h-10 text-white" />
                </div>
                <div className="text-lg font-bold text-gray-800 mb-2">{getLastImportDate()}</div>
                <div className="text-gray-600 font-semibold">Última Importación</div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="bg-gradient-to-r from-gray-100 to-gray-200 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Eye className="w-12 h-12 text-gray-400" />
              </div>
              <h4 className="text-2xl font-bold text-gray-800 mb-4">Listo para Importar Datos</h4>
              <p className="text-gray-600 mb-8 text-lg max-w-md mx-auto">Las secciones adicionales estarán disponibles una vez que se importen los datos.</p>
              <button className="flex items-center space-x-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 mx-auto">
                <Upload className="w-6 h-6" />
                <span className="font-semibold text-lg">Importar Datos Financieros</span>
              </button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default Dashboard;