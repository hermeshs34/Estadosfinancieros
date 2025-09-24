import { useState, useEffect, useCallback } from 'react';
import { RiskAlert } from '../types/alerts';

interface NotificationSettings {
  enabled: boolean;
  sound: boolean;
  email: boolean;
  desktop: boolean;
  autoHide: boolean;
  hideDelay: number;
  emailRecipients: string[];
}

interface UseNotificationsReturn {
  settings: NotificationSettings;
  updateSettings: (newSettings: Partial<NotificationSettings>) => void;
  sendNotification: (alert: RiskAlert) => void;
  requestPermissions: () => Promise<void>;
  hasPermissions: boolean;
}

const defaultSettings: NotificationSettings = {
  enabled: true,
  sound: true,
  email: false,
  desktop: true,
  autoHide: true,
  hideDelay: 5000,
  emailRecipients: []
};

export const useNotifications = (): UseNotificationsReturn => {
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [hasPermissions, setHasPermissions] = useState(false);

  // Cargar configuración desde localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('notificationSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...defaultSettings, ...parsed });
      } catch (error) {
        console.error('Error parsing notification settings:', error);
      }
    }
  }, []);

  // Verificar permisos de notificación
  useEffect(() => {
    if ('Notification' in window) {
      setHasPermissions(Notification.permission === 'granted');
    }
  }, []);

  // Guardar configuración en localStorage
  const updateSettings = useCallback((newSettings: Partial<NotificationSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    localStorage.setItem('notificationSettings', JSON.stringify(updatedSettings));
  }, [settings]);

  // Solicitar permisos de notificación
  const requestPermissions = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      setHasPermissions(permission === 'granted');
    }
  }, []);

  // Reproducir sonido de alerta
  const playAlertSound = useCallback((alertType: string) => {
    if (!settings.sound) return;

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Configurar frecuencia según tipo de alerta
      const frequencies = {
        critical: 800,
        high: 600,
        medium: 400,
        low: 300
      };

      const frequency = frequencies[alertType as keyof typeof frequencies] || 400;
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);

      // Para alertas críticas, reproducir sonido repetitivo
      if (alertType === 'critical') {
        setTimeout(() => {
          const osc2 = audioContext.createOscillator();
          const gain2 = audioContext.createGain();
          osc2.connect(gain2);
          gain2.connect(audioContext.destination);
          osc2.frequency.setValueAtTime(600, audioContext.currentTime);
          gain2.gain.setValueAtTime(0.1, audioContext.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
          osc2.start(audioContext.currentTime);
          osc2.stop(audioContext.currentTime + 0.3);
        }, 600);
      }
    } catch (error) {
      console.error('Error playing alert sound:', error);
    }
  }, [settings.sound]);

  // Mostrar notificación del navegador
  const showDesktopNotification = useCallback((alert: RiskAlert) => {
    if (!settings.desktop || !hasPermissions) return;

    try {
      const notification = new Notification(`Alerta Financiera: ${alert.title}`, {
        body: alert.description,
        icon: '/favicon.ico',
        tag: alert.id,
        requireInteraction: alert.type === 'critical',
        silent: !settings.sound
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // Auto-cerrar notificaciones no críticas
      if (settings.autoHide && alert.type !== 'critical') {
        setTimeout(() => {
          notification.close();
        }, settings.hideDelay);
      }
    } catch (error) {
      console.error('Error showing desktop notification:', error);
    }
  }, [settings.desktop, settings.autoHide, settings.hideDelay, settings.sound, hasPermissions]);

  // Enviar notificación por email (simulado)
  const sendEmailNotification = useCallback(async (alert: RiskAlert) => {
    if (!settings.email || settings.emailRecipients.length === 0) return;

    try {
      // Aquí se implementaría la lógica real de envío de email
      const emailData = {
        recipients: settings.emailRecipients,
        subject: `Alerta Financiera ${alert.type.toUpperCase()}: ${alert.title}`,
        body: `
          <h2>Alerta Financiera</h2>
          <p><strong>Tipo:</strong> ${alert.type.toUpperCase()}</p>
          <p><strong>Categoría:</strong> ${alert.category}</p>
          <p><strong>Descripción:</strong> ${alert.description}</p>
          <p><strong>Recomendación:</strong> ${alert.recommendation}</p>
          <p><strong>Fecha:</strong> ${alert.timestamp.toLocaleString()}</p>
        `,
        priority: alert.type === 'critical' ? 'high' : 'normal'
      };

      // Simular envío de email
      console.log('Enviando notificación por email:', emailData);
      
      // En una implementación real, aquí se haría la llamada a la API
      // await fetch('/api/send-email', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(emailData)
      // });
    } catch (error) {
      console.error('Error sending email notification:', error);
    }
  }, [settings.email, settings.emailRecipients]);

  // Función principal para enviar notificación
  const sendNotification = useCallback((alert: RiskAlert) => {
    if (!settings.enabled) return;

    playAlertSound(alert.type);
    showDesktopNotification(alert);
    sendEmailNotification(alert);
  }, [settings.enabled, playAlertSound, showDesktopNotification, sendEmailNotification]);

  return {
    settings,
    updateSettings,
    sendNotification,
    requestPermissions,
    hasPermissions
  };
};

export default useNotifications;