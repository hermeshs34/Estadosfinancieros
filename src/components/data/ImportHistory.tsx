import React, { useState } from 'react';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { CheckCircle, AlertCircle, Clock, FileText, Database, Upload, Trash2 } from 'lucide-react';
import { useDataContext } from '../../contexts/DataContext';
import { Button } from '../ui/Button';

export const ImportHistory: React.FC = () => {
  const { importHistory, deleteImportRecord } = useDataContext();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status: 'success' | 'error') => {
    return status === 'success' ? (
      <CheckCircle className="w-5 h-5 text-green-600" />
    ) : (
      <AlertCircle className="w-5 h-5 text-red-600" />
    );
  };

  const getFileTypeIcon = (fileType: string) => {
    return <FileText className="w-5 h-5 text-blue-600" />;
  };

  if (importHistory.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Historial de Importaciones</CardTitle>
        </CardHeader>
        
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="text-center">
            <Database className="w-20 h-20 text-gray-300 mx-auto mb-6" />
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              No hay historial de importaciones
            </h3>
            <p className="text-gray-600 mb-6 max-w-lg">
              El historial de todas las importaciones de datos aparecerá aquí. Incluirá detalles sobre archivos procesados, estado de importación y registros importados.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
              <div className="flex items-start space-x-3">
                <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="text-left">
                  <h4 className="text-sm font-semibold text-blue-900 mb-1">
                    Información que se mostrará:
                  </h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Archivos importados (CSV, Excel, PDF)</li>
                    <li>• Estado de cada importación</li>
                    <li>• Número de registros procesados</li>
                    <li>• Fecha y hora de importación</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center text-sm text-gray-500 mt-6">
              <Upload className="w-4 h-4 mr-2" />
              <span>Importe su primer archivo para comenzar</span>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  const handleDeleteRecord = (recordId: string) => {
    deleteImportRecord(recordId);
    setDeleteConfirm(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial de Importaciones</CardTitle>
      </CardHeader>
      
      <div className="p-6">
        <div className="space-y-4">
          {importHistory.map((record) => (
            <div key={record.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  {getFileTypeIcon(record.fileType)}
                  {getStatusIcon(record.status)}
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{record.fileName}</h4>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span>{record.fileType}</span>
                    <span>•</span>
                    <span>{record.recordCount} registros</span>
                    <span>•</span>
                    <span>{formatDate(record.importDate)}</span>
                  </div>
                  {record.errorMessage && (
                    <p className="text-sm text-red-600 mt-1">{record.errorMessage}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  record.status === 'success' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {record.status === 'success' ? 'Exitoso' : 'Error'}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteConfirm(record.id)}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal de confirmación para eliminar registro */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Confirmar Eliminación
            </h3>
            <p className="text-gray-600 mb-6">
              ¿Está seguro de que desea eliminar este registro del historial? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirm(null)}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDeleteRecord(deleteConfirm)}
              >
                Eliminar
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};