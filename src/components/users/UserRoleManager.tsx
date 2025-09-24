import React, { useState, useEffect } from 'react';
import { X, Shield, Users, Check, AlertTriangle, Info } from 'lucide-react';
import { UserRole, UserPermission, RolePermission } from '../../types';
import UserService from '../../lib/userService';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';

interface UserRoleManagerProps {
  onClose: () => void;
}

const UserRoleManager: React.FC<UserRoleManagerProps> = ({ onClose }) => {
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadRolePermissions();
  }, []);

  // Limpiar mensaje después de 5 segundos
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const loadRolePermissions = async () => {
    try {
      setLoading(true);
      setError(null);
      const permissions = await UserService.getRolePermissions();
      setRolePermissions(permissions);
    } catch (err) {
      console.error('Error loading role permissions:', err);
      setError('Error al cargar los permisos de roles');
      setMessage({ type: 'error', text: 'Error cargando permisos de roles' });
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = (roleId: string, permission: UserPermission, enabled: boolean) => {
    setRolePermissions(prev => 
      prev.map(rolePermission => {
        if (rolePermission.role === roleId as UserRole) {
          const updatedPermissions = enabled
            ? [...rolePermission.permissions, permission]
            : rolePermission.permissions.filter(p => p !== permission);
          
          return {
            ...rolePermission,
            permissions: updatedPermissions
          };
        }
        return rolePermission;
      })
    );
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null); // Limpiar mensajes anteriores
    try {
      setError(null);
      await UserService.updateRolePermissions(rolePermissions);
      setHasChanges(false);
      setMessage({ type: 'success', text: 'Permisos de roles guardados exitosamente' });
      onClose();
    } catch (err) {
      console.error('Error saving role permissions:', err);
      
      if (err.message && err.message.includes('role_permissions no existe')) {
        setError('La tabla de permisos no existe en la base de datos. Consulta la consola para ver las instrucciones de creación.');
        setMessage({ type: 'error', text: 'Tabla de permisos no encontrada. Ver consola para instrucciones.' });
        
        // Mostrar instrucciones en consola
        console.log('%c=== INSTRUCCIONES PARA CREAR TABLA ===', 'color: red; font-weight: bold; font-size: 16px;');
        console.log('Para resolver este error, ejecuta el siguiente SQL en tu base de datos Supabase:');
        console.log('');
        console.log(`CREATE TABLE role_permissions (
  id SERIAL PRIMARY KEY,
  role VARCHAR(50) NOT NULL UNIQUE,
  permissions TEXT[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`);
        console.log('');
        console.log('Luego inserta los datos iniciales:');
        console.log(`INSERT INTO role_permissions (role, permissions) VALUES
('admin', ARRAY['users.create','users.read','users.update','users.delete','companies.manage','financial_data.full_access','reports.full_access','settings.manage']),
('senior_analyst', ARRAY['users.read','financial_data.full_access','reports.full_access','companies.read']),
('junior_analyst', ARRAY['financial_data.read','financial_data.create','reports.read','companies.read']),
('read_only', ARRAY['financial_data.read','reports.read','companies.read']);`);
        console.log('');
        console.log('Accede a: https://supabase.com/dashboard/project/[tu-proyecto]/sql');
      } else {
        setError('Error al guardar los permisos');
        setMessage({ type: 'error', text: 'Error al guardar los permisos de roles' });
      }
    } finally {
      setSaving(false);
    }
  };

  const getRoleLabel = (role: UserRole): string => {
    const labels: Record<UserRole, string> = {
      admin: 'Administrador',
      senior_analyst: 'Analista Senior',
      junior_analyst: 'Analista Junior',
      read_only: 'Solo Lectura'
    };
    return labels[role];
  };

  const getRoleDescription = (role: UserRole): string => {
    const descriptions: Record<UserRole, string> = {
      admin: 'Control total del sistema y gestión de usuarios',
      senior_analyst: 'Análisis avanzado y gestión de datos financieros',
      junior_analyst: 'Análisis básico y entrada de datos',
      read_only: 'Solo visualización de datos y reportes básicos'
    };
    return descriptions[role];
  };

  const getPermissionLabel = (permission: UserPermission): string => {
    const labels: Record<UserPermission, string> = {
      read_financial_data: 'Ver datos financieros',
      write_financial_data: 'Crear/editar datos financieros',
      delete_financial_data: 'Eliminar datos financieros',
      manage_companies: 'Gestionar empresas',
      manage_users: 'Gestionar usuarios',
      manage_system_settings: 'Configuración del sistema',
      export_data: 'Exportar datos',
      import_data: 'Importar datos',
      view_reports: 'Ver reportes',
      create_advanced_reports: 'Crear reportes avanzados',
      manage_exchange_rates: 'Gestionar tasas de cambio',
      audit_logs: 'Ver logs de auditoría'
    };
    return labels[permission];
  };

  const getPermissionDescription = (permission: UserPermission): string => {
    const descriptions: Record<UserPermission, string> = {
      read_financial_data: 'Permite visualizar balances, estados de resultados y otros datos financieros',
      write_financial_data: 'Permite crear y modificar entradas financieras, cuentas y períodos',
      delete_financial_data: 'Permite eliminar datos financieros (requiere confirmación)',
      manage_companies: 'Permite crear, editar y eliminar empresas del sistema',
      manage_users: 'Permite gestionar usuarios, roles y permisos',
      manage_system_settings: 'Permite modificar configuraciones globales del sistema',
      export_data: 'Permite exportar datos a Excel, PDF y otros formatos',
      import_data: 'Permite importar datos desde archivos CSV y Excel',
      view_reports: 'Permite acceder a reportes financieros básicos',
      create_advanced_reports: 'Permite crear reportes personalizados y análisis avanzados',
      manage_exchange_rates: 'Permite actualizar y gestionar tasas de cambio',
      audit_logs: 'Permite ver el historial de cambios y actividad del sistema'
    };
    return descriptions[permission];
  };

  const getPermissionRisk = (permission: UserPermission): 'low' | 'medium' | 'high' => {
    const risks: Record<UserPermission, 'low' | 'medium' | 'high'> = {
      read_financial_data: 'low',
      write_financial_data: 'medium',
      delete_financial_data: 'high',
      manage_companies: 'high',
      manage_users: 'high',
      manage_system_settings: 'high',
      export_data: 'medium',
      import_data: 'medium',
      view_reports: 'low',
      create_advanced_reports: 'low',
      manage_exchange_rates: 'medium',
      audit_logs: 'low'
    };
    return risks[permission];
  };

  const getRiskColor = (risk: 'low' | 'medium' | 'high'): string => {
    const colors = {
      low: 'text-green-600',
      medium: 'text-yellow-600',
      high: 'text-red-600'
    };
    return colors[risk];
  };

  const getRiskIcon = (risk: 'low' | 'medium' | 'high') => {
    switch (risk) {
      case 'low':
        return <Check className="h-4 w-4" />;
      case 'medium':
        return <Info className="h-4 w-4" />;
      case 'high':
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const allPermissions: UserPermission[] = [
    'read_financial_data',
    'write_financial_data',
    'delete_financial_data',
    'manage_companies',
    'manage_users',
    'manage_system_settings',
    'export_data',
    'import_data',
    'view_reports',
    'create_advanced_reports',
    'manage_exchange_rates',
    'audit_logs'
  ];

  const groupedPermissions = {
    'Datos Financieros': [
      'read_financial_data',
      'write_financial_data',
      'delete_financial_data',
      'manage_exchange_rates'
    ] as UserPermission[],
    'Gestión': [
      'manage_companies',
      'manage_users',
      'manage_system_settings'
    ] as UserPermission[],
    'Importación/Exportación': [
      'export_data',
      'import_data'
    ] as UserPermission[],
    'Reportes y Auditoría': [
      'view_reports',
      'create_advanced_reports',
      'audit_logs'
    ] as UserPermission[]
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Cargando permisos...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Gestión de Roles y Permisos
              </h2>
              <p className="text-sm text-gray-500">
                Configura los permisos para cada rol del sistema
              </p>
            </div>
          </div>
          <Button
            onClick={onClose}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Mensaje de confirmación */}
          {message && (
            <div className={`mb-4 p-4 rounded-lg border ${
              message.type === 'success' 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              <div className="flex items-center gap-2">
                {message.type === 'success' ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                <span className="font-medium">{message.text}</span>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {hasChanges && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
              <p className="text-sm text-yellow-800">
                <AlertTriangle className="h-4 w-4 inline mr-2" />
                Tienes cambios sin guardar. No olvides guardar antes de cerrar.
              </p>
            </div>
          )}

          <div className="space-y-6">
            {Object.entries(groupedPermissions).map(([groupName, permissions]) => (
              <Card key={groupName}>
                <CardHeader>
                  <CardTitle className="text-lg">{groupName}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 font-medium text-gray-900 w-1/3">
                            Permiso
                          </th>
                          {rolePermissions.map((rolePermission) => (
                            <th key={rolePermission.role} className="text-center py-3 px-4 font-medium text-gray-900">
                              <div className="flex flex-col items-center">
                                <span>{getRoleLabel(rolePermission.role)}</span>
                                <span className="text-xs text-gray-500 mt-1">
                                  {getRoleDescription(rolePermission.role)}
                                </span>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {permissions.map((permission) => {
                          const risk = getPermissionRisk(permission);
                          return (
                            <tr key={permission} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-4 px-4">
                                <div className="flex items-start gap-3">
                                  <div className={`mt-1 ${getRiskColor(risk)}`}>
                                    {getRiskIcon(risk)}
                                  </div>
                                  <div>
                                    <div className="font-medium text-gray-900">
                                      {getPermissionLabel(permission)}
                                    </div>
                                    <div className="text-sm text-gray-500 mt-1">
                                      {getPermissionDescription(permission)}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              {rolePermissions.map((rolePermission) => {
                                const hasPermission = rolePermission.permissions.includes(permission);
                                return (
                                  <td key={`${rolePermission.role}-${permission}`} className="py-4 px-4 text-center">
                                    <input
                                      type="checkbox"
                                      checked={hasPermission}
                                      onChange={(e) => handlePermissionChange(
                                        rolePermission.role,
                                        permission,
                                        e.target.checked
                                      )}
                                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Leyenda de riesgo */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-sm">Niveles de Riesgo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-green-600">Bajo Riesgo</span>
                  <span className="text-gray-500">- Permisos de solo lectura</span>
                </div>
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-yellow-600" />
                  <span className="text-yellow-600">Riesgo Medio</span>
                  <span className="text-gray-500">- Permisos de modificación de datos</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="text-red-600">Alto Riesgo</span>
                  <span className="text-gray-500">- Permisos administrativos y de eliminación</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Botones */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <Button
              onClick={onClose}
              variant="outline"
              disabled={saving}
            >
              {hasChanges ? 'Cancelar' : 'Cerrar'}
            </Button>
            {hasChanges && (
              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Shield className="h-4 w-4" />
                )}
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserRoleManager;