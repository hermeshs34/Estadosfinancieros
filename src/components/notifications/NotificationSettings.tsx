import React, { useState } from 'react';
import { Settings, Bell, Mail, Volume2, VolumeX, Plus, Trash2, Save } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useNotifications } from '../../hooks/useNotifications';

interface NotificationSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationSettings: React.FC<NotificationSettingsProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings, requestPermissions, hasPermissions } = useNotifications();
  const [newEmail, setNewEmail] = useState('');
  const [tempSettings, setTempSettings] = useState(settings);

  const handleSave = () => {
    updateSettings(tempSettings);
    onClose();
  };

  const addEmailRecipient = () => {
    if (newEmail && !tempSettings.emailRecipients.includes(newEmail)) {
      setTempSettings(prev => ({
        ...prev,
        emailRecipients: [...prev.emailRecipients, newEmail]
      }));
      setNewEmail('');
    }
  };

  const removeEmailRecipient = (email: string) => {
    setTempSettings(prev => ({
      ...prev,
      emailRecipients: prev.emailRecipients.filter(e => e !== email)
    }));
  };

  const testNotification = () => {
    if (hasPermissions) {
      new Notification('Prueba de Notificación', {
        body: 'Esta es una notificación de prueba del sistema financiero.',
        icon: '/favicon.ico'
      });
    } else {
      requestPermissions();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-2">
              <Settings className="w-6 h-6" />
              <h2 className="text-xl font-bold">Configuración de Notificaciones</h2>
            </div>
            <Button onClick={onClose} variant="ghost" size="sm">
              ×
            </Button>
          </div>

          <div className="space-y-6">
            {/* Configuración General */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Configuración General</h3>
              <div className="space-y-3">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={tempSettings.enabled}
                    onChange={(e) => setTempSettings(prev => ({ ...prev, enabled: e.target.checked }))}
                    className="rounded"
                  />
                  <Bell className="w-5 h-5" />
                  <span>Habilitar todas las notificaciones</span>
                </label>

                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={tempSettings.autoHide}
                    onChange={(e) => setTempSettings(prev => ({ ...prev, autoHide: e.target.checked }))}
                    className="rounded"
                  />
                  <span>Auto-ocultar notificaciones no críticas</span>
                </label>

                {tempSettings.autoHide && (
                  <div className="ml-8">
                    <label className="block text-sm text-gray-600 mb-1">
                      Tiempo de auto-ocultado (segundos):
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="30"
                      value={tempSettings.hideDelay / 1000}
                      onChange={(e) => setTempSettings(prev => ({
                        ...prev,
                        hideDelay: parseInt(e.target.value) * 1000
                      }))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>1s</span>
                      <span>{tempSettings.hideDelay / 1000}s</span>
                      <span>30s</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Notificaciones de Sonido */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Notificaciones de Sonido</h3>
              <div className="space-y-3">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={tempSettings.sound}
                    onChange={(e) => setTempSettings(prev => ({ ...prev, sound: e.target.checked }))}
                    className="rounded"
                  />
                  {tempSettings.sound ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                  <span>Reproducir sonidos de alerta</span>
                </label>

                {tempSettings.sound && (
                  <div className="ml-8 p-3 bg-gray-50 rounded">
                    <p className="text-sm text-gray-600 mb-2">Tipos de sonido por nivel de alerta:</p>
                    <ul className="text-sm space-y-1">
                      <li>• <strong>Crítico:</strong> Sonido repetitivo de alta frecuencia</li>
                      <li>• <strong>Alto:</strong> Sonido de frecuencia media</li>
                      <li>• <strong>Medio:</strong> Sonido suave</li>
                      <li>• <strong>Bajo:</strong> Sonido muy suave</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Notificaciones del Navegador */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Notificaciones del Navegador</h3>
              <div className="space-y-3">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={tempSettings.desktop}
                    onChange={(e) => setTempSettings(prev => ({ ...prev, desktop: e.target.checked }))}
                    className="rounded"
                  />
                  <Bell className="w-5 h-5" />
                  <span>Mostrar notificaciones del navegador</span>
                </label>

                {tempSettings.desktop && (
                  <div className="ml-8 space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm ${
                        hasPermissions ? 'text-green-600' : 'text-red-600'
                      }`}>
                        Estado: {hasPermissions ? 'Permisos concedidos' : 'Permisos requeridos'}
                      </span>
                      {!hasPermissions && (
                        <Button
                          onClick={requestPermissions}
                          size="sm"
                          variant="outline"
                        >
                          Solicitar Permisos
                        </Button>
                      )}
                    </div>
                    <Button
                      onClick={testNotification}
                      size="sm"
                      variant="outline"
                      disabled={!hasPermissions}
                    >
                      Probar Notificación
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Notificaciones por Email */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Notificaciones por Email</h3>
              <div className="space-y-3">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={tempSettings.email}
                    onChange={(e) => setTempSettings(prev => ({ ...prev, email: e.target.checked }))}
                    className="rounded"
                  />
                  <Mail className="w-5 h-5" />
                  <span>Enviar notificaciones por email</span>
                </label>

                {tempSettings.email && (
                  <div className="ml-8 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Destinatarios de email:
                      </label>
                      <div className="flex space-x-2">
                        <input
                          type="email"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          placeholder="email@ejemplo.com"
                          className="flex-1 px-3 py-2 border rounded-md"
                          onKeyPress={(e) => e.key === 'Enter' && addEmailRecipient()}
                        />
                        <Button
                          onClick={addEmailRecipient}
                          size="sm"
                          disabled={!newEmail}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {tempSettings.emailRecipients.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Destinatarios configurados:</p>
                        <div className="space-y-2">
                          {tempSettings.emailRecipients.map((email, index) => (
                            <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                              <span className="text-sm">{email}</span>
                              <Button
                                onClick={() => removeEmailRecipient(email)}
                                size="sm"
                                variant="ghost"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                      <p className="text-sm text-yellow-800">
                        <strong>Nota:</strong> Las notificaciones por email están actualmente simuladas. 
                        En un entorno de producción, se requiere configurar un servicio de email.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Configuración por Tipo de Alerta */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Configuración por Tipo de Alerta</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { type: 'critical', label: 'Críticas', color: 'red' },
                  { type: 'high', label: 'Altas', color: 'orange' },
                  { type: 'medium', label: 'Medias', color: 'yellow' },
                  { type: 'low', label: 'Bajas', color: 'blue' }
                ].map(({ type, label, color }) => (
                  <div key={type} className={`p-3 border-l-4 border-${color}-500 bg-${color}-50`}>
                    <h4 className="font-medium mb-2">Alertas {label}</h4>
                    <div className="space-y-2 text-sm">
                      <p>• Sonido: {tempSettings.sound ? 'Activado' : 'Desactivado'}</p>
                      <p>• Navegador: {tempSettings.desktop ? 'Activado' : 'Desactivado'}</p>
                      <p>• Email: {tempSettings.email ? 'Activado' : 'Desactivado'}</p>
                      {type === 'critical' && (
                        <p className="text-red-600 font-medium">• Requiere interacción manual</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex justify-end space-x-3 mt-8 pt-6 border-t">
            <Button onClick={onClose} variant="outline">
              Cancelar
            </Button>
            <Button onClick={handleSave} className="flex items-center space-x-2">
              <Save className="w-4 h-4" />
              <span>Guardar Configuración</span>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default NotificationSettings;