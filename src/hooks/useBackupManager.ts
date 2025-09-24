import { useState, useEffect, useCallback } from 'react';
import { backupService, BackupSchedule, BackupOptions, BackupResult } from '../lib/backup/BackupService';

interface BackupItem {
  id: string;
  timestamp: string;
  size: number;
  metadata: any;
}

interface BackupStats {
  totalBackups: number;
  totalSize: number;
  averageSize: number;
  newestBackup: string | null;
  oldestBackup: string | null;
}

interface UseBackupManagerReturn {
  // Estado
  backups: BackupItem[];
  schedules: BackupSchedule[];
  stats: BackupStats | null;
  isLoading: boolean;
  isCreatingBackup: boolean;
  error: string | null;
  
  // Acciones
  createBackup: (data: any, options?: Partial<BackupOptions>) => Promise<boolean>;
  restoreBackup: (backupId: string) => Promise<any>;
  deleteBackup: (backupId: string) => Promise<boolean>;
  refreshData: () => Promise<void>;
  
  // Schedules
  createSchedule: (schedule: Omit<BackupSchedule, 'id' | 'createdAt'>) => Promise<boolean>;
  toggleSchedule: (scheduleId: string, enabled: boolean) => Promise<boolean>;
  removeSchedule: (scheduleId: string) => Promise<boolean>;
  
  // Utilidades
  cleanupOldBackups: (daysOld?: number) => Promise<number>;
  exportBackup: (backupId: string) => Promise<boolean>;
  importBackup: (file: File) => Promise<boolean>;
}

export const useBackupManager = (): UseBackupManagerReturn => {
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [schedules, setSchedules] = useState<BackupSchedule[]>([]);
  const [stats, setStats] = useState<BackupStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const [backupList, scheduleList, backupStats] = await Promise.all([
        backupService.listBackups(),
        Promise.resolve(backupService.getSchedules()),
        backupService.getBackupStats()
      ]);
      
      setBackups(backupList);
      setSchedules(scheduleList);
      setStats(backupStats);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(`Error cargando datos de backup: ${errorMessage}`);
      console.error('Error loading backup data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createBackup = useCallback(async (
    data: any, 
    options: Partial<BackupOptions> = {}
  ): Promise<boolean> => {
    setIsCreatingBackup(true);
    setError(null);
    
    try {
      const defaultOptions: BackupOptions = {
        includeAnalysis: true,
        includeSettings: true,
        format: 'json',
        destination: 'local',
        ...options
      };

      const result = await backupService.createBackup({
        metadata: {
          description: options.description || 'Backup creado automáticamente',
          createdBy: 'Usuario',
          timestamp: new Date().toISOString(),
          ...options.metadata
        },
        financialData: data || {},
        settings: options.settings || {}
      }, defaultOptions);

      if (result.success) {
        await refreshData();
        return true;
      } else {
        setError(`Error creando backup: ${result.error}`);
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(`Error creando backup: ${errorMessage}`);
      console.error('Error creating backup:', err);
      return false;
    } finally {
      setIsCreatingBackup(false);
    }
  }, [refreshData]);

  const restoreBackup = useCallback(async (backupId: string): Promise<any> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await backupService.restoreBackup(backupId);
      if (result.success && result.data) {
        return result.data;
      } else {
        setError(`Error restaurando backup: ${result.error}`);
        return null;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(`Error restaurando backup: ${errorMessage}`);
      console.error('Error restoring backup:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteBackup = useCallback(async (backupId: string): Promise<boolean> => {
    setError(null);
    
    try {
      const success = await backupService.deleteBackup(backupId);
      if (success) {
        await refreshData();
        return true;
      } else {
        setError('Error eliminando backup');
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(`Error eliminando backup: ${errorMessage}`);
      console.error('Error deleting backup:', err);
      return false;
    }
  }, [refreshData]);

  const createSchedule = useCallback(async (
    schedule: Omit<BackupSchedule, 'id' | 'createdAt'>
  ): Promise<boolean> => {
    setError(null);
    
    try {
      const newSchedule: BackupSchedule = {
        ...schedule,
        id: `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString()
      };
      
      backupService.addSchedule(newSchedule);
      await refreshData();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(`Error creando schedule: ${errorMessage}`);
      console.error('Error creating schedule:', err);
      return false;
    }
  }, [refreshData]);

  const toggleSchedule = useCallback(async (
    scheduleId: string, 
    enabled: boolean
  ): Promise<boolean> => {
    setError(null);
    
    try {
      backupService.toggleSchedule(scheduleId, enabled);
      await refreshData();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(`Error modificando schedule: ${errorMessage}`);
      console.error('Error toggling schedule:', err);
      return false;
    }
  }, [refreshData]);

  const removeSchedule = useCallback(async (scheduleId: string): Promise<boolean> => {
    setError(null);
    
    try {
      backupService.removeSchedule(scheduleId);
      await refreshData();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(`Error eliminando schedule: ${errorMessage}`);
      console.error('Error removing schedule:', err);
      return false;
    }
  }, [refreshData]);

  const cleanupOldBackups = useCallback(async (daysOld: number = 30): Promise<number> => {
    setError(null);
    
    try {
      const deleted = await backupService.cleanupOldBackups(daysOld);
      await refreshData();
      return deleted;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(`Error limpiando backups: ${errorMessage}`);
      console.error('Error cleaning up backups:', err);
      return 0;
    }
  }, [refreshData]);

  const exportBackup = useCallback(async (backupId: string): Promise<boolean> => {
    setError(null);
    
    try {
      const result = await backupService.restoreBackup(backupId);
      if (result.success && result.data) {
        // Crear y descargar archivo
        const dataStr = JSON.stringify(result.data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `backup_${backupId}_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        return true;
      } else {
        setError(`Error exportando backup: ${result.error}`);
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(`Error exportando backup: ${errorMessage}`);
      console.error('Error exporting backup:', err);
      return false;
    }
  }, []);

  const importBackup = useCallback(async (file: File): Promise<boolean> => {
    setError(null);
    
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      const options: BackupOptions = {
        includeAnalysis: true,
        includeSettings: true,
        format: 'json',
        destination: 'local'
      };

      const result = await backupService.createBackup({
        metadata: {
          description: `Backup importado desde ${file.name}`,
          createdBy: 'Usuario',
          imported: true,
          originalFileName: file.name
        },
        ...data
      }, options);

      if (result.success) {
        await refreshData();
        return true;
      } else {
        setError(`Error importando backup: ${result.error}`);
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(`Error importando backup: ${errorMessage}`);
      console.error('Error importing backup:', err);
      return false;
    }
  }, [refreshData]);

  // Cargar datos iniciales
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Auto-refresh cada 5 minutos
  useEffect(() => {
    const interval = setInterval(refreshData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refreshData]);

  return {
    // Estado
    backups,
    schedules,
    stats,
    isLoading,
    isCreatingBackup,
    error,
    
    // Acciones
    createBackup,
    restoreBackup,
    deleteBackup,
    refreshData,
    
    // Schedules
    createSchedule,
    toggleSchedule,
    removeSchedule,
    
    // Utilidades
    cleanupOldBackups,
    exportBackup,
    importBackup
  };
};

// Hook especializado para backup automático
export const useAutoBackup = (data: any, interval: number = 30000) => {
  const { createBackup, isCreatingBackup } = useBackupManager();
  const [lastBackup, setLastBackup] = useState<string | null>(null);

  useEffect(() => {
    if (!data || isCreatingBackup) return;

    const autoBackupInterval = setInterval(async () => {
      const success = await createBackup(data, {
        description: 'Backup automático',
        metadata: {
          automatic: true,
          interval: interval
        }
      });
      
      if (success) {
        setLastBackup(new Date().toISOString());
      }
    }, interval);

    return () => clearInterval(autoBackupInterval);
  }, [data, interval, createBackup, isCreatingBackup]);

  return {
    lastBackup,
    isCreatingBackup
  };
};