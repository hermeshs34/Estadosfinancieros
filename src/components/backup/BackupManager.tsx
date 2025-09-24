import React, { useState } from 'react';
import {
  CloudArrowDownIcon,
  CloudArrowUpIcon,
  ClockIcon,
  TrashIcon,
  Cog6ToothIcon,
  DocumentArrowDownIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  DocumentArrowUpIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { BackupSchedule } from '../../lib/backup/BackupService';
import { useBackupManager } from '../../hooks/useBackupManager';

interface BackupManagerProps {
  currentData?: any;
  onRestore?: (data: any) => void;
}

const BackupManager: React.FC<BackupManagerProps> = ({ currentData, onRestore }) => {
  const [activeTab, setActiveTab] = useState<'backups' | 'schedules' | 'settings'>('backups');
  const [showCreateSchedule, setShowCreateSchedule] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<string | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);

  const {
    backups,
    schedules,
    stats,
    isLoading,
    isCreatingBackup,
    error,
    createBackup,
    restoreBackup,
    deleteBackup,
    refreshData,
    createSchedule,
    toggleSchedule,
    removeSchedule,
    cleanupOldBackups,
    exportBackup,
    importBackup
  } = useBackupManager();

  const handleCreateBackup = async () => {
    const success = await createBackup(currentData, {
      description: 'Backup manual creado por el usuario'
    });
    
    if (success) {
      alert('Backup creado exitosamente');
    } else if (error) {
      alert(error);
    }
  };

  const handleRestoreBackup = async (backupId: string) => {
    if (!confirm('¿Está seguro de que desea restaurar este backup? Esto sobrescribirá los datos actuales.')) {
      return;
    }

    const data = await restoreBackup(backupId);
    if (data) {
      onRestore?.(data);
      alert('Backup restaurado exitosamente');
    } else if (error) {
      alert(error);
    }
  };

  const handleDeleteBackup = async (backupId: string) => {
    if (!confirm('¿Está seguro de que desea eliminar este backup?')) {
      return;
    }

    const success = await deleteBackup(backupId);
    if (success) {
      alert('Backup eliminado exitosamente');
    } else if (error) {
      alert(error);
    }
  };

  const handleImportBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const success = await importBackup(file);
    if (success) {
      alert('Backup importado exitosamente');
      setShowImportDialog(false);
    } else if (error) {
      alert(error);
    }
    
    // Reset input
    event.target.value = '';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: es });
  };

  const renderBackupsList = () => (
    <div className="space-y-4">
      {/* Estadísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{stats.totalBackups}</div>
            <div className="text-sm text-blue-600">Total Backups</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{formatFileSize(stats.totalSize)}</div>
            <div className="text-sm text-green-600">Tamaño Total</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{formatFileSize(stats.averageSize)}</div>
            <div className="text-sm text-purple-600">Tamaño Promedio</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">
              {stats.newestBackup ? formatDate(stats.newestBackup) : 'N/A'}
            </div>
            <div className="text-sm text-yellow-600">Último Backup</div>
          </div>
        </div>
      )}

      {/* Botones de acción */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Backups Disponibles</h3>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowImportDialog(true)}
            className="flex items-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            <DocumentArrowUpIcon className="w-4 h-4 mr-2" />
            Importar
          </button>
          <button
            onClick={handleCreateBackup}
            disabled={isCreatingBackup}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            <CloudArrowUpIcon className="w-4 h-4 mr-2" />
            {isCreatingBackup ? 'Creando...' : 'Crear Backup'}
          </button>
        </div>
      </div>

      {/* Lista de backups */}
      {backups.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <DocumentArrowDownIcon className="w-12 h-12 mx-auto mb-2" />
          <p>No hay backups disponibles</p>
          <p className="text-sm">Crea tu primer backup para comenzar</p>
        </div>
      ) : (
        <div className="space-y-2">
          {backups.map((backup) => (
            <div
              key={backup.id}
              className={`border rounded-lg p-4 hover:bg-gray-50 transition-colors ${
                selectedBackup === backup.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
              onClick={() => setSelectedBackup(selectedBackup === backup.id ? null : backup.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center">
                    <DocumentArrowDownIcon className="w-5 h-5 text-gray-400 mr-2" />
                    <div>
                      <div className="font-medium text-gray-900">
                        {backup.metadata?.description || 'Backup sin descripción'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatDate(backup.timestamp)} • {formatFileSize(backup.size)}
                      </div>
                      {backup.metadata?.createdBy && (
                        <div className="text-xs text-gray-400">
                          Creado por: {backup.metadata.createdBy}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      exportBackup(backup.id);
                    }}
                    className="p-2 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                    title="Exportar backup"
                  >
                    <DocumentArrowDownIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRestoreBackup(backup.id);
                    }}
                    className="p-2 text-green-600 hover:bg-green-100 rounded-md transition-colors"
                    title="Restaurar backup"
                  >
                    <CloudArrowDownIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteBackup(backup.id);
                    }}
                    className="p-2 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                    title="Eliminar backup"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {selectedBackup === backup.id && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    <div><strong>ID:</strong> {backup.id}</div>
                    {backup.metadata?.companyName && (
                      <div><strong>Empresa:</strong> {backup.metadata.companyName}</div>
                    )}
                    {backup.metadata?.period && (
                      <div><strong>Período:</strong> {backup.metadata.period}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderSchedulesList = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Backups Programados</h3>
        <button
          onClick={() => setShowCreateSchedule(true)}
          className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
        >
          <ClockIcon className="w-4 h-4 mr-2" />
          Programar Backup
        </button>
      </div>

      {schedules.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <ClockIcon className="w-12 h-12 mx-auto mb-2" />
          <p>No hay backups programados</p>
          <p className="text-sm">Programa backups automáticos para mayor seguridad</p>
        </div>
      ) : (
        <div className="space-y-2">
          {schedules.map((schedule) => (
            <div key={schedule.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center">
                    <ClockIcon className="w-5 h-5 text-gray-400 mr-2" />
                    <div>
                      <div className="font-medium text-gray-900">{schedule.name}</div>
                      <div className="text-sm text-gray-500">
                        Frecuencia: {schedule.frequency}
                        {schedule.time && ` a las ${schedule.time}`}
                      </div>
                      {schedule.nextRun && (
                        <div className="text-xs text-gray-400">
                          Próxima ejecución: {formatDate(schedule.nextRun)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    schedule.enabled 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {schedule.enabled ? 'Activo' : 'Inactivo'}
                  </div>
                  <button
                    onClick={() => toggleSchedule(schedule.id, !schedule.enabled)}
                    className="p-2 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                    title={schedule.enabled ? 'Desactivar' : 'Activar'}
                  >
                    <Cog6ToothIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('¿Está seguro de que desea eliminar este schedule?')) {
                        removeSchedule(schedule.id);
                      }
                    }}
                    className="p-2 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                    title="Eliminar schedule"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Configuración de Backups</h3>
      
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start">
          <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
          <div>
            <h4 className="font-medium text-yellow-800">Política de Retención</h4>
            <p className="text-sm text-yellow-700 mt-1">
              Los backups se mantienen por 30 días por defecto. Los backups más antiguos se eliminan automáticamente.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <InformationCircleIcon className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-800">Almacenamiento</h4>
            <p className="text-sm text-blue-700 mt-1">
              Los backups se almacenan localmente en el navegador. Para mayor seguridad, considere exportar backups importantes.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <button
          onClick={async () => {
            const deleted = await cleanupOldBackups(30);
            alert(`Se eliminaron ${deleted} backups antiguos`);
          }}
          className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          <TrashIcon className="w-4 h-4 mr-2" />
          Limpiar Backups Antiguos
        </button>
      </div>
    </div>
  );

  const tabs = [
    { id: 'backups', label: 'Backups', count: backups.length },
    { id: 'schedules', label: 'Programados', count: schedules.length },
    { id: 'settings', label: 'Configuración', count: null }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Cargando...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* Header */}
      <div className="p-6 border-b">
        <h2 className="text-xl font-semibold text-gray-900">Gestión de Backups</h2>
        <p className="text-sm text-gray-600 mt-1">
          Administra backups automáticos y manuales de tus datos financieros
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <nav className="flex space-x-8 px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              {tab.count !== null && tab.count > 0 && (
                <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-600 mr-2 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-800">Error</h4>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'backups' && renderBackupsList()}
        {activeTab === 'schedules' && renderSchedulesList()}
        {activeTab === 'settings' && renderSettings()}
      </div>

      {/* Modal de importación */}
      {showImportDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Importar Backup</h3>
            <p className="text-sm text-gray-600 mb-4">
              Selecciona un archivo de backup en formato JSON para importar.
            </p>
            
            <div className="mb-4">
              <input
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowImportDialog(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BackupManager;