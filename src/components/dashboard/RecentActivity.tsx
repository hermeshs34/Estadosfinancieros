import React from 'react';
import { Clock, Upload, FileText, Calculator, CheckCircle, AlertTriangle, Database, TrendingUp } from 'lucide-react';
import { useDataContext } from '../../contexts/DataContext';

export const RecentActivity: React.FC = () => {
  const { importHistory, financialAnalysis, importedData } = useDataContext();

  const formatDate = (timestamp: number) => {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return 'Fecha no disponible';
      }
      return date.toLocaleDateString('es-ES', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Fecha no disponible';
    }
  };

  // Crear lista de actividades recientes
  const recentActivities = [];

  // Agregar importaciones recientes
  importHistory.slice(-5).reverse().forEach(importItem => {
    recentActivities.push({
      id: `import-${importItem.id}`,
      type: 'import',
      title: `Importación de ${importItem.fileName}`,
      description: `${importItem.recordCount} registros importados`,
      timestamp: importItem.timestamp,
      status: importItem.status,
      icon: Database
    });
  });

  // Agregar análisis financiero si existe
  if (financialAnalysis && importHistory.length > 0) {
    const lastImport = importHistory[importHistory.length - 1];
    recentActivities.push({
      id: 'analysis-latest',
      type: 'analysis',
      title: 'Análisis financiero completado',
      description: `${financialAnalysis.alertas.length} alertas generadas`,
      timestamp: lastImport.timestamp + 1000, // Un poco después de la importación
      status: 'success',
      icon: Calculator
    });
  }

  // Agregar validación patrimonial si existe
  if (financialAnalysis?.patrimonialValidation && importHistory.length > 0) {
    const lastImport = importHistory[importHistory.length - 1];
    recentActivities.push({
      id: 'validation-latest',
      type: 'validation',
      title: 'Validación de ecuación patrimonial',
      description: financialAnalysis.patrimonialValidation.isValid ? 'Ecuación balanceada' : 'Discrepancias detectadas',
      timestamp: lastImport.timestamp + 2000,
      status: financialAnalysis.patrimonialValidation.isValid ? 'success' : 'warning',
      icon: CheckCircle
    });
  }

  // Ordenar por timestamp descendente
  recentActivities.sort((a, b) => b.timestamp - a.timestamp);

  if (recentActivities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="text-center">
          <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No hay actividad reciente
          </h3>
          <p className="text-gray-600 mb-6 max-w-md">
            La actividad del sistema aparecerá aquí cuando comience a importar datos y generar análisis.
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-w-md mx-auto">
            <div className="flex items-start space-x-3">
              <FileText className="w-5 h-5 text-gray-600 mt-0.5" />
              <div className="text-left">
                <h4 className="text-sm font-semibold text-gray-900 mb-1">
                  Actividades que se mostrarán:
                </h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Importaciones de archivos</li>
                  <li>• Análisis de ratios completados</li>
                  <li>• Validaciones patrimoniales</li>
                  <li>• Reportes generados</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-center text-sm text-gray-500 mt-6">
            <Upload className="w-4 h-4 mr-2" />
            <span>Comience importando datos para ver actividad</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="space-y-4">
        {recentActivities.slice(0, 8).map((activity) => {
          const IconComponent = activity.icon;
          return (
            <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                activity.status === 'success' ? 'bg-green-100' :
                activity.status === 'warning' ? 'bg-yellow-100' :
                activity.status === 'error' ? 'bg-red-100' :
                'bg-blue-100'
              }`}>
                <IconComponent className={`w-4 h-4 ${
                  activity.status === 'success' ? 'text-green-600' :
                  activity.status === 'warning' ? 'text-yellow-600' :
                  activity.status === 'error' ? 'text-red-600' :
                  'text-blue-600'
                }`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {activity.title}
                  </p>
                  <p className="text-xs text-gray-500 flex-shrink-0 ml-2">
                    {formatDate(activity.timestamp)}
                  </p>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {activity.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      
      {recentActivities.length > 8 && (
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-500">
            Mostrando las 8 actividades más recientes de {recentActivities.length} total
          </p>
        </div>
      )}
    </div>
  );
};