// RESPALDO ORIGINAL DE UserManagement.tsx
// Creado antes de implementar multicompañía
// Fecha: 2025-09-22

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Users, Plus, Edit, Trash2, Shield, UserCheck, UserX, Search } from 'lucide-react';
import { User, UserRole } from '../../types';
import UserService from '../../lib/userService';
import { useDataContext } from '../../contexts/DataContext';
import UserForm from './UserForm';
import UserRoleManager from './UserRoleManager';

interface UserManagementProps {
  companyId?: string;
}

const UserManagement: React.FC<UserManagementProps> = ({ companyId }) => {
  const { selectedCompany } = useDataContext();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUserForm, setShowUserForm] = useState(false);
  const [showRoleManager, setShowRoleManager] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<UserRole | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
  const [userStats, setUserStats] = useState<{
    total: number;
    active: number;
    inactive: number;
    byRole: Record<UserRole, number>;
  } | null>(null);

  const currentCompanyId = companyId || selectedCompany?.id;

  const loadCurrentUser = async () => {
    if (!currentCompanyId) return;
    
    try {
      const currentUser = await UserService.getCurrentUserWithRole(currentCompanyId);
      if (currentUser) {
        setCurrentUserRole(currentUser.role);
      }
    } catch (err) {
      console.error('Error loading current user:', err);
    }
  };

  useEffect(() => {
    if (currentCompanyId) {
      loadCurrentUser();
      loadUsers();
      loadUserStats();
    }
  }, [currentCompanyId]);

  const loadUsers = async () => {
    if (!currentCompanyId) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      const userData = await UserService.getUsers(currentCompanyId);
      setUsers(userData);
    } catch (err) {
      console.error('Error loading users:', err);
      setError('Error al cargar los usuarios');
    } finally {
      setLoading(false);
    }
  };

  const loadUserStats = async () => {
    if (!currentCompanyId) return;
    
    try {
      const stats = await UserService.getUserStats(currentCompanyId);
      setUserStats(stats);
    } catch (err) {
      console.error('Error loading user stats:', err);
    }
  };

  const handleCreateUser = () => {
    setEditingUser(null);
    setShowUserForm(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setShowUserForm(true);
  };

  const handleToggleUserStatus = async (user: User) => {
    if (!currentCompanyId) return;
    
    try {
      await UserService.updateUser(user.id, currentCompanyId, { is_active: !user.is_active });
      await loadUsers();
      await loadUserStats();
    } catch (err) {
      console.error('Error toggling user status:', err);
      setError('Error al cambiar el estado del usuario');
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!confirm(`¿Estás seguro de que deseas desactivar al usuario ${user.full_name}?`)) {
      return;
    }

    try {
      await UserService.deleteUser(user.id);
      await loadUsers();
      await loadUserStats();
    } catch (err) {
      console.error('Error deleting user:', err);
      setError('Error al eliminar el usuario');
    }
  };

  // Funciones de validación de permisos
  const canCreateUsers = () => {
    return currentUserRole && UserService.hasPermissionSync(currentUserRole, 'users.create');
  };

  const canEditUsers = () => {
    return currentUserRole && UserService.hasPermissionSync(currentUserRole, 'users.update');
  };

  const canDeleteUsers = () => {
    return currentUserRole && UserService.hasPermissionSync(currentUserRole, 'users.delete');
  };

  const canManageRoles = () => {
    return currentUserRole && UserService.hasPermissionSync(currentUserRole, 'roles.manage');
  };

  const handleUserFormClose = () => {
    setShowUserForm(false);
    setEditingUser(null);
    loadUsers();
    loadUserStats();
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

  const getRoleBadgeColor = (role: UserRole): string => {
    const colors: Record<UserRole, string> = {
      admin: 'bg-red-100 text-red-800',
      senior_analyst: 'bg-blue-100 text-blue-800',
      junior_analyst: 'bg-green-100 text-green-800',
      read_only: 'bg-gray-100 text-gray-800'
    };
    return colors[role];
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && user.is_active) ||
                         (filterStatus === 'inactive' && !user.is_active);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  if (!currentCompanyId) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-gray-500">Selecciona una empresa para gestionar usuarios.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {currentUserRole === 'viewer' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            <p className="text-blue-800 font-medium">Modo Solo Lectura</p>
          </div>
          <p className="text-blue-700 text-sm mt-1">
            Tu rol actual es de solo lectura. Puedes ver la información de usuarios pero no realizar modificaciones.
          </p>
        </div>
      )}
      
      {/* Header con estadísticas */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-6 w-6" />
            Gestión de Usuarios
          </h1>
          <p className="text-gray-600 mt-1">
            Administra los usuarios y sus permisos en el sistema
          </p>
        </div>
        <div className="flex gap-2">
          {canManageRoles() && (
            <Button
              onClick={() => setShowRoleManager(true)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Shield className="h-4 w-4" />
              Roles y Permisos
            </Button>
          )}
          {canCreateUsers() && (
            <Button
              onClick={handleCreateUser}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Nuevo Usuario
            </Button>
          )}
        </div>
      </div>

      {/* Estadísticas */}
      {userStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Usuarios</p>
                  <p className="text-2xl font-bold text-gray-900">{userStats.total}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Activos</p>
                  <p className="text-2xl font-bold text-green-600">{userStats.active}</p>
                </div>
                <UserCheck className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Inactivos</p>
                  <p className="text-2xl font-bold text-red-600">{userStats.inactive}</p>
                </div>
                <UserX className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Administradores</p>
                  <p className="text-2xl font-bold text-purple-600">{userStats.byRole.admin}</p>
                </div>
                <Shield className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros y búsqueda */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Buscar usuarios..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value as UserRole | 'all')}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos los roles</option>
              <option value="admin">Administrador</option>
              <option value="senior_analyst">Analista Senior</option>
              <option value="junior_analyst">Analista Junior</option>
              <option value="read_only">Solo Lectura</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos los estados</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de usuarios */}
      <Card>
        <CardHeader>
          <CardTitle>Usuarios ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600">{error}</p>
              <Button onClick={loadUsers} className="mt-4">
                Reintentar
              </Button>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No hay usuarios</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || filterRole !== 'all' || filterStatus !== 'all'
                  ? 'No se encontraron usuarios con los filtros aplicados.'
                  : 'Comienza creando tu primer usuario.'}
              </p>
              {!searchTerm && filterRole === 'all' && filterStatus === 'all' && (
                <Button onClick={handleCreateUser} className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Usuario
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usuario
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rol
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-700">
                                {user.full_name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.full_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.email}
                            </div>
                            {user.phone && (
                              <div className="text-sm text-gray-500">
                                {user.phone}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          getRoleBadgeColor(user.role)
                        }`}>
                          {getRoleLabel(user.role)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {user.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          {canEditUsers() && (
                            <Button
                              onClick={() => handleEditUser(user)}
                              variant="outline"
                              size="sm"
                              className="flex items-center gap-1"
                            >
                              <Edit className="h-3 w-3" />
                              Editar
                            </Button>
                          )}
                          {canEditUsers() && (
                            <Button
                              onClick={() => handleToggleUserStatus(user)}
                              variant="outline"
                              size="sm"
                              className={`flex items-center gap-1 ${
                                user.is_active
                                  ? 'text-red-600 hover:text-red-700'
                                  : 'text-green-600 hover:text-green-700'
                              }`}
                            >
                              {user.is_active ? (
                                <>
                                  <UserX className="h-3 w-3" />
                                  Desactivar
                                </>
                              ) : (
                                <>
                                  <UserCheck className="h-3 w-3" />
                                  Activar
                                </>
                              )}
                            </Button>
                          )}
                          {canDeleteUsers() && !user.is_active && (
                            <Button
                              onClick={() => handleDeleteUser(user)}
                              variant="outline"
                              size="sm"
                              className="flex items-center gap-1 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                              Eliminar
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modales */}
      {showUserForm && (
        <UserForm
          user={editingUser}
          companyId={currentCompanyId}
          onClose={handleUserFormClose}
        />
      )}

      {showRoleManager && (
        <UserRoleManager
          onClose={() => setShowRoleManager(false)}
        />
      )}
    </div>
  );
};

export default UserManagement;