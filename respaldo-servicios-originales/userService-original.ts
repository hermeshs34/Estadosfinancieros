// RESPALDO ORIGINAL DE USERSERVICE - ANTES DE MULTICOMPAÑÍA
// Fecha de respaldo: 2025-09-22
// Este archivo contiene la implementación original antes de los cambios de multicompañía

import { supabase } from './supabase';
import { getCurrentUser } from './supabase';
import { User, CreateUserRequest, UpdateUserRequest, UserRole, UserPermission, RolePermission } from '../types';

class UserService {
  // Obtener todos los usuarios de una empresa usando el campo company_id
  static async getUsers(companyId: string): Promise<User[]> {
    try {
      // Filtrar usuarios por company_id
      const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name, phone, role, is_active, last_login, created_at, company_id')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Mapear los datos de la tabla users a la interfaz User
      return (data || []).map(item => ({
        id: item.id,
        email: item.email,
        full_name: item.full_name,
        phone: item.phone,
        role: item.role,
        is_active: item.is_active,
        last_login: item.last_login,
        created_at: item.created_at,
        // Campos adicionales temporales
        is_owner: false,
        joined_at: item.created_at
      }));
    } catch (error) {
      throw error;
    }
  }

  // Obtener un usuario por ID en el contexto de una empresa
  static async getUserById(userId: string, companyId: string): Promise<User | null> {
    try {
      // Obtener usuario filtrando por ID y company_id
      const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name, phone, role, is_active, last_login, created_at, company_id')
        .eq('id', userId)
        .eq('company_id', companyId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      // Mapear los datos de la tabla users a la interfaz User
      return {
        id: data.id,
        email: data.email,
        full_name: data.full_name,
        phone: data.phone,
        role: data.role,
        is_active: data.is_active,
        last_login: data.last_login,
        created_at: data.created_at,
        // Campos temporales hasta implementar user_companies
        is_owner: false,
        joined_at: data.created_at
      };
    } catch (error) {
      throw error;
    }
  }

  // Obtener todas las empresas de un usuario
  static async getUserCompanies(userId: string): Promise<any[]> {
    try {
      console.log('🏢 UserService.getUserCompanies - Buscando empresas para usuario:', userId);
      
      // Filtrar empresas por user_id del usuario autenticado
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, tax_id, country, currency, created_at, updated_at, user_id, industry')
        .eq('user_id', userId);

      if (error) {
        console.error('❌ Error obteniendo empresas del usuario:', error);
        throw error;
      }

      console.log('🏢 UserService.getUserCompanies - Empresas encontradas:', data?.length || 0);
      
      // Mapear a formato esperado por CompanySelector
      return (data || []).map(company => ({
        id: `temp_${company.id}`, // ID temporal para la relación
        user_id: userId,
        company_id: company.id,
        role: 'owner', // Rol temporal
        is_owner: true, // Temporal: todos son propietarios
        is_active: true,
        joined_at: company.created_at,
        companies: {
          id: company.id,
          name: company.name,
          tax_id: company.tax_id,
          country: company.country,
          currency: company.currency,
          industry: company.industry,
          created_at: company.created_at,
          updated_at: company.updated_at,
          user_id: company.user_id
        }
      }));
    } catch (error) {
      console.error('❌ Error en getUserCompanies:', error);
      throw error;
    }
  }

  // Agregar un usuario existente a una empresa
  static async addUserToCompany(userId: string, companyId: string, role: string, isOwner: boolean = false): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_companies')
        .insert({
          user_id: userId,
          company_id: companyId,
          role: role,
          is_active: true,
          is_owner: isOwner,
          joined_at: new Date().toISOString()
        });

      if (error) {
        throw error;
      }
    } catch (error) {
      throw error;
    }
  }

  // Crear un nuevo usuario
  static async createUser(userData: CreateUserRequest, companyId: string): Promise<User> {
    try {
      console.log('👤 UserService.createUser - Creando usuario:', userData.email);
      console.log('🏢 UserService.createUser - Para empresa:', companyId);
      
      // Crear el usuario en la tabla users con company_id
      const { data, error } = await supabase
        .from('users')
        .insert({
          email: userData.email,
          full_name: userData.full_name,
          phone: userData.phone,
          role: userData.role || 'user',
          is_active: true,
          company_id: companyId, // Asignar directamente el company_id
          created_at: new Date().toISOString()
        })
        .select('id, email, full_name, phone, role, is_active, last_login, created_at, company_id')
        .single();

      if (error) {
        console.error('❌ Error creando usuario:', error);
        throw error;
      }

      console.log('✅ Usuario creado exitosamente:', data.id);
      
      // Mapear a la interfaz User
      return {
        id: data.id,
        email: data.email,
        full_name: data.full_name,
        phone: data.phone,
        role: data.role,
        is_active: data.is_active,
        last_login: data.last_login,
        created_at: data.created_at,
        // Campos temporales
        is_owner: false,
        joined_at: data.created_at
      };
    } catch (error) {
      console.error('❌ Error en createUser:', error);
      throw error;
    }
  }

  // Actualizar un usuario con arquitectura multicompañía
  static async updateUser(userId: string, companyId: string, userData: Partial<User>): Promise<User> {
    try {
      // Separar datos del usuario de datos de la relación
      const { role, is_owner, ...userOnlyData } = userData;
      
      // Actualizar datos del usuario si hay cambios
      if (Object.keys(userOnlyData).length > 0) {
        const { error: userError } = await supabase
          .from('users')
          .update(userOnlyData)
          .eq('id', userId);

        if (userError) {
          throw userError;
        }
      }

      // Actualizar datos de la relación si hay cambios
      if (role !== undefined || is_owner !== undefined) {
        const relationUpdate: any = {};
        if (role !== undefined) relationUpdate.role = role;
        if (is_owner !== undefined) relationUpdate.is_owner = is_owner;

        const { error: relationError } = await supabase
          .from('user_companies')
          .update(relationUpdate)
          .eq('user_id', userId)
          .eq('company_id', companyId);

        if (relationError) {
          throw relationError;
        }
      }

      // Obtener el usuario actualizado desde la tabla users
      const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name, phone, role, is_active, last_login, created_at')
        .eq('id', userId)
        .single();

      if (error) {
        throw error;
      }

      return {
        id: data.id,
        email: data.email,
        full_name: data.full_name,
        phone: data.phone,
        role: data.role,
        is_active: data.is_active,
        last_login: data.last_login,
        created_at: data.created_at,
        // Campos temporales
        is_owner: false,
        joined_at: data.created_at
      };
    } catch (error) {
      throw error;
    }
  }

  // Eliminar un usuario (desactivar)
  static async deleteUser(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: false })
        .eq('id', userId);

      if (error) {
        throw error;
      }
    } catch (error) {
      throw error;
    }
  }

  // Obtener permisos de un usuario
  static async getUserPermissions(userId: string): Promise<UserPermission[]> {
    try {
      const { data, error } = await supabase
        .from('user_permissions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      throw error;
    }
  }

  // Asignar permisos a un usuario
  static async assignPermissions(userId: string, permissions: string[]): Promise<void> {
    try {
      // Primero, desactivar todos los permisos existentes
      await supabase
        .from('user_permissions')
        .update({ is_active: false })
        .eq('user_id', userId);

      // Luego, insertar los nuevos permisos
      const permissionData = permissions.map(permission => ({
        user_id: userId,
        permission: permission,
        is_active: true
      }));

      const { error } = await supabase
        .from('user_permissions')
        .insert(permissionData);

      if (error) {
        throw error;
      }
    } catch (error) {
      throw error;
    }
  }

  // Verificar si un usuario tiene un permiso específico
  static async hasPermission(userId: string, permission: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('user_permissions')
        .select('id')
        .eq('user_id', userId)
        .eq('permission', permission)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return !!data;
    } catch (error) {
      throw error;
    }
  }

  // Obtener roles disponibles
  static async getRoles(): Promise<UserRole[]> {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      throw error;
    }
  }

  // Obtener permisos de un rol
  static async getRolePermissions(roleId: string): Promise<RolePermission[]> {
    try {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*')
        .eq('role_id', roleId)
        .eq('is_active', true);

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      throw error;
    }
  }

  // Buscar usuarios por email
  static async searchUsersByEmail(email: string, companyId: string): Promise<User[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name, phone, role, is_active, last_login, created_at, company_id')
        .eq('company_id', companyId)
        .ilike('email', `%${email}%`)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return (data || []).map(item => ({
        id: item.id,
        email: item.email,
        full_name: item.full_name,
        phone: item.phone,
        role: item.role,
        is_active: item.is_active,
        last_login: item.last_login,
        created_at: item.created_at,
        is_owner: false,
        joined_at: item.created_at
      }));
    } catch (error) {
      throw error;
    }
  }

  // Activar/Desactivar usuario
  static async toggleUserStatus(userId: string): Promise<void> {
    try {
      // Obtener el estado actual
      const { data: currentUser, error: fetchError } = await supabase
        .from('users')
        .select('is_active')
        .eq('id', userId)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      // Cambiar el estado
      const { error } = await supabase
        .from('users')
        .update({ is_active: !currentUser.is_active })
        .eq('id', userId);

      if (error) {
        throw error;
      }
    } catch (error) {
      throw error;
    }
  }

  // Obtener estadísticas de usuarios
  static async getUserStats(companyId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('role, is_active')
        .eq('company_id', companyId);

      if (error) {
        throw error;
      }

      const stats = {
        total: data.length,
        active: data.filter(u => u.is_active).length,
        inactive: data.filter(u => !u.is_active).length,
        byRole: data.reduce((acc, user) => {
          acc[user.role] = (acc[user.role] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      };

      return stats;
    } catch (error) {
      throw error;
    }
  }

  // Actualizar último login
  static async updateLastLogin(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', userId);

      if (error) {
        throw error;
      }
    } catch (error) {
      throw error;
    }
  }

  // Validar email único en la empresa
  static async isEmailUnique(email: string, companyId: string, excludeUserId?: string): Promise<boolean> {
    try {
      let query = supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .eq('company_id', companyId);

      if (excludeUserId) {
        query = query.neq('id', excludeUserId);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return !data || data.length === 0;
    } catch (error) {
      throw error;
    }
  }

  // Obtener usuarios recientes
  static async getRecentUsers(companyId: string, limit: number = 5): Promise<User[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name, phone, role, is_active, last_login, created_at, company_id')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return (data || []).map(item => ({
        id: item.id,
        email: item.email,
        full_name: item.full_name,
        phone: item.phone,
        role: item.role,
        is_active: item.is_active,
        last_login: item.last_login,
        created_at: item.created_at,
        is_owner: false,
        joined_at: item.created_at
      }));
    } catch (error) {
      throw error;
    }
  }
}

export default UserService;