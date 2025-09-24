import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export interface BackupData {
  timestamp: string;
  version: string;
  metadata: {
    companyName?: string;
    period?: string;
    createdBy?: string;
    description?: string;
  };
  financialData: {
    balanceSheet?: any[];
    incomeStatement?: any[];
    cashFlow?: any[];
    analysis?: any[];
  };
  settings: {
    preferences?: any;
    configurations?: any;
  };
}

export interface BackupOptions {
  includeAnalysis?: boolean;
  includeSettings?: boolean;
  compression?: boolean;
  encryption?: boolean;
  format?: 'json' | 'csv' | 'excel';
  destination?: 'local' | 'cloud' | 'both';
}

export interface BackupResult {
  success: boolean;
  backupId: string;
  filePath?: string;
  size: number;
  timestamp: string;
  error?: string;
}

export interface BackupSchedule {
  id: string;
  name: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'manual';
  time?: string; // HH:mm format
  dayOfWeek?: number; // 0-6, Sunday = 0
  dayOfMonth?: number; // 1-31
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
  options: BackupOptions;
}

class BackupService {
  private static instance: BackupService;
  private schedules: Map<string, BackupSchedule> = new Map();
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;

  private constructor() {
    this.loadSchedules();
    this.startScheduler();
  }

  public static getInstance(): BackupService {
    if (!BackupService.instance) {
      BackupService.instance = new BackupService();
    }
    return BackupService.instance;
  }

  /**
   * Crea un backup manual de los datos financieros
   */
  public async createBackup(
    data: Partial<BackupData>,
    options: BackupOptions = {}
  ): Promise<BackupResult> {
    const backupId = this.generateBackupId();
    const timestamp = new Date().toISOString();

    try {
      // Preparar datos del backup
      const backupData: BackupData = {
        timestamp,
        version: '1.0.0',
        metadata: {
          createdBy: 'Sistema Automático',
          description: 'Backup automático de datos financieros',
          ...data.metadata
        },
        financialData: data.financialData || {},
        settings: data.settings || {}
      };

      // Aplicar opciones de backup
      if (!options.includeAnalysis) {
        delete backupData.financialData.analysis;
      }
      if (!options.includeSettings) {
        backupData.settings = {};
      }

      // Crear el archivo de backup
      const result = await this.saveBackup(backupId, backupData, options);
      
      // Registrar el backup
      await this.registerBackup({
        id: backupId,
        timestamp,
        size: result.size,
        options,
        metadata: backupData.metadata
      });

      return {
        success: true,
        backupId,
        filePath: result.filePath,
        size: result.size,
        timestamp
      };

    } catch (error) {
      console.error('Error creating backup:', error);
      return {
        success: false,
        backupId,
        size: 0,
        timestamp,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Restaura datos desde un backup
   */
  public async restoreBackup(backupId: string): Promise<{
    success: boolean;
    data?: BackupData;
    error?: string;
  }> {
    try {
      const backupData = await this.loadBackup(backupId);
      
      if (!backupData) {
        return {
          success: false,
          error: 'Backup no encontrado'
        };
      }

      // Validar integridad del backup
      const isValid = await this.validateBackup(backupData);
      if (!isValid) {
        return {
          success: false,
          error: 'El backup está corrupto o es inválido'
        };
      }

      return {
        success: true,
        data: backupData
      };

    } catch (error) {
      console.error('Error restoring backup:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Lista todos los backups disponibles
   */
  public async listBackups(): Promise<{
    id: string;
    timestamp: string;
    size: number;
    metadata: any;
  }[]> {
    try {
      const backups = await this.getStoredBackups();
      return backups.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch (error) {
      console.error('Error listing backups:', error);
      return [];
    }
  }

  /**
   * Elimina un backup
   */
  public async deleteBackup(backupId: string): Promise<boolean> {
    try {
      await this.removeBackupFile(backupId);
      await this.unregisterBackup(backupId);
      return true;
    } catch (error) {
      console.error('Error deleting backup:', error);
      return false;
    }
  }

  /**
   * Configura un schedule de backup automático
   */
  public setSchedule(schedule: Omit<BackupSchedule, 'id'>): string {
    const id = this.generateScheduleId();
    const fullSchedule: BackupSchedule = {
      id,
      ...schedule,
      nextRun: this.calculateNextRun(schedule)
    };

    this.schedules.set(id, fullSchedule);
    this.saveSchedules();
    
    return id;
  }

  /**
   * Obtiene todos los schedules configurados
   */
  public getSchedules(): BackupSchedule[] {
    return Array.from(this.schedules.values());
  }

  /**
   * Elimina un schedule
   */
  public removeSchedule(scheduleId: string): boolean {
    const deleted = this.schedules.delete(scheduleId);
    if (deleted) {
      this.saveSchedules();
    }
    return deleted;
  }

  /**
   * Habilita/deshabilita un schedule
   */
  public toggleSchedule(scheduleId: string, enabled: boolean): boolean {
    const schedule = this.schedules.get(scheduleId);
    if (schedule) {
      schedule.enabled = enabled;
      if (enabled) {
        schedule.nextRun = this.calculateNextRun(schedule);
      }
      this.saveSchedules();
      return true;
    }
    return false;
  }

  /**
   * Inicia el scheduler de backups automáticos
   */
  private startScheduler(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    // Verificar schedules cada minuto
    this.intervalId = setInterval(() => {
      this.checkSchedules();
    }, 60000);
  }

  /**
   * Verifica si algún schedule debe ejecutarse
   */
  private async checkSchedules(): Promise<void> {
    if (this.isRunning) return;

    const now = new Date();
    
    for (const schedule of this.schedules.values()) {
      if (!schedule.enabled || !schedule.nextRun) continue;

      const nextRun = new Date(schedule.nextRun);
      if (now >= nextRun) {
        await this.executeScheduledBackup(schedule);
      }
    }
  }

  /**
   * Ejecuta un backup programado
   */
  private async executeScheduledBackup(schedule: BackupSchedule): Promise<void> {
    this.isRunning = true;
    
    try {
      // Obtener datos actuales para el backup
      const currentData = await this.getCurrentFinancialData();
      
      const result = await this.createBackup({
        metadata: {
          description: `Backup automático - ${schedule.name}`,
          createdBy: 'Sistema Automático'
        },
        financialData: currentData,
        settings: await this.getCurrentSettings()
      }, schedule.options);

      // Actualizar schedule
      schedule.lastRun = new Date().toISOString();
      schedule.nextRun = this.calculateNextRun(schedule);
      this.saveSchedules();

      console.log(`Backup automático completado: ${result.backupId}`);
      
    } catch (error) {
      console.error(`Error en backup automático para schedule ${schedule.id}:`, error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Calcula la próxima ejecución de un schedule
   */
  private calculateNextRun(schedule: BackupSchedule): string {
    const now = new Date();
    let nextRun = new Date(now);

    switch (schedule.frequency) {
      case 'daily':
        if (schedule.time) {
          const [hours, minutes] = schedule.time.split(':').map(Number);
          nextRun.setHours(hours, minutes, 0, 0);
          if (nextRun <= now) {
            nextRun.setDate(nextRun.getDate() + 1);
          }
        } else {
          nextRun.setDate(nextRun.getDate() + 1);
        }
        break;

      case 'weekly':
        const targetDay = schedule.dayOfWeek || 0;
        const currentDay = nextRun.getDay();
        const daysUntilTarget = (targetDay - currentDay + 7) % 7 || 7;
        nextRun.setDate(nextRun.getDate() + daysUntilTarget);
        if (schedule.time) {
          const [hours, minutes] = schedule.time.split(':').map(Number);
          nextRun.setHours(hours, minutes, 0, 0);
        }
        break;

      case 'monthly':
        const targetDate = schedule.dayOfMonth || 1;
        nextRun.setDate(targetDate);
        if (nextRun <= now) {
          nextRun.setMonth(nextRun.getMonth() + 1);
        }
        if (schedule.time) {
          const [hours, minutes] = schedule.time.split(':').map(Number);
          nextRun.setHours(hours, minutes, 0, 0);
        }
        break;

      default:
        // Manual - no next run
        return '';
    }

    return nextRun.toISOString();
  }

  // Métodos privados de utilidad
  private generateBackupId(): string {
    const timestamp = format(new Date(), 'yyyyMMdd-HHmmss', { locale: es });
    const random = Math.random().toString(36).substring(2, 8);
    return `backup-${timestamp}-${random}`;
  }

  private generateScheduleId(): string {
    return `schedule-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }

  private async saveBackup(
    backupId: string, 
    data: BackupData, 
    options: BackupOptions
  ): Promise<{ filePath: string; size: number }> {
    const fileName = `${backupId}.json`;
    const content = JSON.stringify(data, null, 2);
    const size = new Blob([content]).size;

    // En un entorno real, aquí se guardaría en el sistema de archivos o cloud
    // Por ahora, simulamos guardando en localStorage para demo
    if (typeof window !== 'undefined') {
      localStorage.setItem(`backup_${backupId}`, content);
    }

    return {
      filePath: fileName,
      size
    };
  }

  private async loadBackup(backupId: string): Promise<BackupData | null> {
    if (typeof window !== 'undefined') {
      const content = localStorage.getItem(`backup_${backupId}`);
      if (content) {
        try {
          return JSON.parse(content);
        } catch (error) {
          console.error('Error parsing backup data:', error);
        }
      }
    }
    return null;
  }

  private async validateBackup(data: BackupData): Promise<boolean> {
    // Validaciones básicas de integridad
    return !!(data.timestamp && data.version && data.financialData);
  }

  private async registerBackup(backup: any): Promise<void> {
    if (typeof window !== 'undefined') {
      const backups = this.getBackupRegistry();
      backups.push(backup);
      localStorage.setItem('backup_registry', JSON.stringify(backups));
    }
  }

  private async unregisterBackup(backupId: string): Promise<void> {
    if (typeof window !== 'undefined') {
      const backups = this.getBackupRegistry();
      const filtered = backups.filter((b: any) => b.id !== backupId);
      localStorage.setItem('backup_registry', JSON.stringify(filtered));
    }
  }

  private getBackupRegistry(): any[] {
    if (typeof window !== 'undefined') {
      const registry = localStorage.getItem('backup_registry');
      if (registry) {
        try {
          return JSON.parse(registry);
        } catch (error) {
          console.error('Error parsing backup registry:', error);
        }
      }
    }
    return [];
  }

  private async getStoredBackups(): Promise<any[]> {
    return this.getBackupRegistry();
  }

  private async removeBackupFile(backupId: string): Promise<void> {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`backup_${backupId}`);
    }
  }

  private async getCurrentFinancialData(): Promise<any> {
    // En un entorno real, esto obtendría los datos actuales de la base de datos
    // Por ahora retornamos un objeto vacío
    return {
      balanceSheet: [],
      incomeStatement: [],
      cashFlow: [],
      analysis: []
    };
  }

  private async getCurrentSettings(): Promise<any> {
    // En un entorno real, esto obtendría la configuración actual
    return {
      preferences: {},
      configurations: {}
    };
  }

  private loadSchedules(): void {
    if (typeof window !== 'undefined') {
      const schedules = localStorage.getItem('backup_schedules');
      if (schedules) {
        try {
          const parsed = JSON.parse(schedules);
          this.schedules = new Map(Object.entries(parsed));
        } catch (error) {
          console.error('Error loading schedules:', error);
        }
      }
    }
  }

  private saveSchedules(): void {
    if (typeof window !== 'undefined') {
      const schedulesObj = Object.fromEntries(this.schedules);
      localStorage.setItem('backup_schedules', JSON.stringify(schedulesObj));
    }
  }

  /**
   * Limpia backups antiguos según la política de retención
   */
  public async cleanupOldBackups(retentionDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    const backups = await this.listBackups();
    let deletedCount = 0;
    
    for (const backup of backups) {
      const backupDate = new Date(backup.timestamp);
      if (backupDate < cutoffDate) {
        const deleted = await this.deleteBackup(backup.id);
        if (deleted) deletedCount++;
      }
    }
    
    return deletedCount;
  }

  /**
   * Obtiene estadísticas de backups
   */
  public async getBackupStats(): Promise<{
    totalBackups: number;
    totalSize: number;
    oldestBackup?: string;
    newestBackup?: string;
    averageSize: number;
  }> {
    const backups = await this.listBackups();
    
    if (backups.length === 0) {
      return {
        totalBackups: 0,
        totalSize: 0,
        averageSize: 0
      };
    }
    
    const totalSize = backups.reduce((sum, backup) => sum + backup.size, 0);
    const sortedByDate = backups.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    return {
      totalBackups: backups.length,
      totalSize,
      oldestBackup: sortedByDate[0]?.timestamp,
      newestBackup: sortedByDate[sortedByDate.length - 1]?.timestamp,
      averageSize: totalSize / backups.length
    };
  }
}

// Singleton instance
export const backupService = BackupService.getInstance();
export default BackupService;