import React, { useState, useEffect, useCallback } from 'react';
import { Bell, X, Volume2, VolumeX, Mail, Settings, Check } from 'lucide-react';
import { RiskAlert } from '../../types/alerts';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useNotifications } from '../../hooks/useNotifications';
import NotificationSettings from './NotificationSettings';

interface NotificationSystemProps {
  alerts: RiskAlert[];
  onAlertAcknowledge: (alertId: string) => void;
  onAlertResolve: (alertId: string) => void;
}

const NotificationSystem: React.FC<NotificationSystemProps> = ({
  alerts,
  onAlertAcknowledge,
  onAlertResolve
}) => {
  const { settings, sendNotification } = useNotifications();
  const [notifications, setNotifications] = useState<RiskAlert[]>([]);
  const [showSettings, setShowSettings] = useState(false);

  // Procesar nuevas alertas y enviar notificaciones
  const processedAlerts = React.useRef(new Set<string>());

  // Procesar nuevas alertas
  useEffect(() => {
    const newAlerts = alerts.filter(alert => 
      alert.status === 'active' && 
      !processedAlerts.current.has(alert.id)
    );

    if (newAlerts.length > 0 && settings.enabled) {
      newAlerts.forEach(alert => {
        sendNotification(alert);
        processedAlerts.current.add(alert.id);
      });

      setNotifications(prev => [...prev, ...newAlerts]);

      // Auto-ocultar notificaciones no críticas
      if (settings.autoHide) {
        newAlerts.forEach(alert => {
          if (alert.type !== 'critical') {
            setTimeout(() => {
              setNotifications(prev => prev.filter(n => n.id !== alert.id));
            }, settings.hideDelay);
          }
        });
      }
    }
  }, [alerts, settings.enabled, settings.autoHide, settings.hideDelay, sendNotification]);

  // Limpiar notificaciones resueltas
  useEffect(() => {
    setNotifications(prev => 
      prev.filter(notification => 
        alerts.find(alert => alert.id === notification.id && alert.status === 'active')
      )
    );
  }, [alerts]);

  const dismissNotification = (alertId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== alertId));
  };

  const handleAcknowledge = (alertId: string) => {
    onAlertAcknowledge(alertId);
    dismissNotification(alertId);
  };

  const handleResolve = (alertId: string) => {
    onAlertResolve(alertId);
    dismissNotification(alertId);
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'critical': return 'border-l-red-500 bg-red-50';
      case 'high': return 'border-l-orange-500 bg-orange-50';
      case 'medium': return 'border-l-yellow-500 bg-yellow-50';
      default: return 'border-l-blue-500 bg-blue-50';
    }
  };

  return (
    <>
      {/* Botón de configuración flotante */}
      <div className="fixed top-4 right-4 z-50">
        <Button
          onClick={() => setShowSettings(!showSettings)}
          className="rounded-full p-2 shadow-lg"
          variant="outline"
        >
          <Bell className="w-5 h-5" />
          {notifications.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {notifications.length}
            </span>
          )}
        </Button>
      </div>

      {/* Panel de configuración avanzada */}
      <NotificationSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

      {/* Notificaciones flotantes */}
      <div className="fixed top-20 right-4 z-40 space-y-2 max-w-sm">
        {notifications.map(notification => (
          <Card key={notification.id} className={`p-4 border-l-4 ${getNotificationColor(notification.type)} shadow-lg animate-slide-in`}>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <h4 className="font-semibold text-sm">{notification.title}</h4>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    notification.type === 'critical' ? 'bg-red-100 text-red-800' :
                    notification.type === 'high' ? 'bg-orange-100 text-orange-800' :
                    notification.type === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {notification.type === 'critical' ? 'Crítico' :
                     notification.type === 'high' ? 'Alto' :
                     notification.type === 'medium' ? 'Medio' : 'Bajo'}
                  </span>
                </div>
                <p className="text-sm text-gray-700 mb-2">{notification.description}</p>
                <div className="flex space-x-2">
                  <Button
                    onClick={() => handleAcknowledge(notification.id)}
                    size="sm"
                    variant="outline"
                    className="text-xs"
                  >
                    <Check className="w-3 h-3 mr-1" />
                    Reconocer
                  </Button>
                  <Button
                    onClick={() => handleResolve(notification.id)}
                    size="sm"
                    variant="outline"
                    className="text-xs"
                  >
                    Resolver
                  </Button>
                </div>
              </div>
              <Button
                onClick={() => dismissNotification(notification.id)}
                variant="ghost"
                size="sm"
                className="ml-2"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Estilos CSS para animaciones */}
      <style>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </>
  );
};

export default NotificationSystem;