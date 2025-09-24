// IMPLEMENTACIÓN MULTICOMPAÑÍA - PASO 2: SERVICIOS BACKEND
// Este archivo contiene los servicios actualizados para manejar multicompañía

import { supabase } from './lib/supabase';

// =====================================================
// TIPOS Y INTERFACES
// =====================================================

export interface Company {
  id: string;
  name: string;
  rif: string;
  address?: string;
  created_at: string;
  updated_at: string;
  role?: CompanyRole; // Rol del usuario en esta empresa
}

export interface UserCompanyRelation {
  id: string;
  user_id: string;
  company_id: string;
  role: CompanyRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserSession {
  id: string;
  user_id: string;
  active_company_id: string | null;
  created_at: string;
  updated_at: string;
}

export enum CompanyRole {
  ADMIN = 'admin',     // Acceso total a la empresa
  MANAGER = 'manager', // Gestión operativa
  USER = 'user',       // Acceso básico
  VIEWER = 'viewer'    // Solo lectura
}

export const COMPANY_PERMISSIONS = {
  [CompanyRole.ADMIN]: ['read', 'write', 'delete', 'manage_users', 'manage_settings'],
  [CompanyRole.MANAGER]: ['read', 'write', 'delete', 'manage_users'],
  [CompanyRole.USER]: ['read', 'write'],
  [CompanyRole.VIEWER]: ['read']
};

// =====================================================
// SERVICIO DE MULTICOMPAÑÍA
// =====================================================

export class MultiCompanyService {
  
  /**
   * Obtiene todas las empresas a las que pertenece un usuario
   */
  static async getUserCompanies(userId: string): Promise<Company[]> {
    try {
      const { data, error } = await supabase
        .from('user_companies')
        .select(`
          role,
          is_active,
          companies (
            id,
            name,
            rif,
            address,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('companies(name)');
      
      if (error) {
        console.error('Error fetching user companies:', error);
        throw error;
      }
      
      return data?.map(item => ({
        ...item.companies,
        role: item.role as CompanyRole
      })) || [];
    } catch (error) {
      console.error('Error in getUserCompanies:', error);
      throw error;
    }
  }

  /**
   * Obtiene la empresa activa del usuario
   */
  static async getActiveCompany(userId: string): Promise<Company | null> {
    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .select(`
          companies (
            id,
            name,
            rif,
            address,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', userId)
        .single();
      
      if (error) {
        // Si no hay sesión, devolver la primera empresa del usuario
        const companies = await this.getUserCompanies(userId);
        return companies[0] || null;
      }
      
      return data?.companies || null;
    } catch (error) {
      console.error('Error in getActiveCompany:', error);
      return null;
    }
  }

  /**
   * Cambia la empresa activa del usuario
   */
  static async setActiveCompany(userId: string, companyId: string): Promise<void> {
    try {
      // Verificar que el usuario pertenece a la empresa
      const { data: userCompany, error: checkError } = await supabase
        .from('user_companies')
        .select('id')
        .eq('user_id', userId)
        .eq('company_id', companyId)
        .eq('is_active', true)
        .single();
      
      if (checkError || !userCompany) {
        throw new Error('Usuario no pertenece a esta empresa');
      }

      // Actualizar o crear sesión
      const { error } = await supabase
        .from('user_sessions')
        .upsert({ 
          user_id: userId, 
          active_company_id: companyId,
          updated_at: new Date().toISOString()
        });
      
      if (error) {
        console.error('Error setting active company:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in setActiveCompany:', error);
      throw error;
    }
  }

  /**
   * Agrega un usuario a una empresa
   */
  static async addUserToCompany(
    userId: string, 
    companyId: string, 
    role: CompanyRole = CompanyRole.USER
  ): Promise<UserCompanyRelation> {
    try {
      const { data, error } = await supabase
        .from('user_companies')
        .insert({ 
          user_id: userId, 
          company_id: companyId, 
          role 
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error adding user to company:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error in addUserToCompany:', error);
      throw error;
    }
  }

  /**
   * Remueve un usuario de una empresa (desactiva la relación)
   */
  static async removeUserFromCompany(userId: string, companyId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_companies')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('company_id', companyId);
      
      if (error) {
        console.error('Error removing user from company:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in removeUserFromCompany:', error);
      throw error;
    }
  }

  /**
   * Actualiza el rol de un usuario en una empresa
   */
  static async updateUserRole(
    userId: string, 
    companyId: string, 
    newRole: CompanyRole
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_companies')
        .update({ 
          role: newRole, 
          updated_at: new Date().toISOString() 
        })
        .eq('user_id', userId)
        .eq('company_id', companyId)
        .eq('is_active', true);
      
      if (error) {
        console.error('Error updating user role:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in updateUserRole:', error);
      throw error;
    }
  }

  /**
   * Obtiene el rol de un usuario en una empresa específica
   */
  static async getUserRole(userId: string, companyId: string): Promise<CompanyRole | null> {
    try {
      const { data, error } = await supabase
        .from('user_companies')
        .select('role')
        .eq('user_id', userId)
        .eq('company_id', companyId)
        .eq('is_active', true)
        .single();
      
      if (error) {
        return null;
      }
      
      return data?.role as CompanyRole || null;
    } catch (error) {
      console.error('Error in getUserRole:', error);
      return null;
    }
  }

  /**
   * Verifica si un usuario tiene un permiso específico en una empresa
   */
  static async hasPermission(
    userId: string, 
    companyId: string, 
    permission: string
  ): Promise<boolean> {
    try {
      const role = await this.getUserRole(userId, companyId);
      if (!role) return false;
      
      const permissions = COMPANY_PERMISSIONS[role] || [];
      return permissions.includes(permission);
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }

  /**
   * Obtiene todos los usuarios de una empresa
   */
  static async getCompanyUsers(companyId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('user_companies')
        .select(`
          role,
          is_active,
          created_at,
          users (
            id,
            email,
            full_name,
            created_at
          )
        `)
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('users(full_name)');
      
      if (error) {
        console.error('Error fetching company users:', error);
        throw error;
      }
      
      return data?.map(item => ({
        ...item.users,
        role: item.role,
        joined_at: item.created_at
      })) || [];
    } catch (error) {
      console.error('Error in getCompanyUsers:', error);
      throw error;
    }
  }
}

// =====================================================
// ACTUALIZACIÓN DEL USERSERVICE EXISTENTE
// =====================================================

/**
 * Extensión del UserService existente para compatibilidad con multicompañía
 */
export class UserServiceMultiCompany {
  
  /**
   * Obtiene usuarios filtrados por empresa activa
   */
  static async getUsers(activeCompanyId?: string): Promise<any[]> {
    try {
      if (!activeCompanyId) {
        // Si no hay empresa activa, devolver array vacío
        return [];
      }

      // Obtener usuarios de la empresa específica
      return await MultiCompanyService.getCompanyUsers(activeCompanyId);
    } catch (error) {
      console.error('Error in getUsers:', error);
      throw error;
    }
  }

  /**
   * Crea un usuario y lo asocia a una empresa
   */
  static async createUser(userData: any, companyId: string, role: CompanyRole = CompanyRole.USER): Promise<any> {
    try {
      // Crear usuario en auth.users (esto debería usar el método existente)
      const { data: authUser, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            full_name: userData.full_name,
            company_id: companyId // Mantener compatibilidad
          }
        }
      });

      if (authError) throw authError;
      if (!authUser.user) throw new Error('Error creating user');

      // Crear entrada en tabla users (mantener compatibilidad)
      const { data: user, error: userError } = await supabase
        .from('users')
        .insert({
          id: authUser.user.id,
          email: userData.email,
          full_name: userData.full_name,
          company_id: companyId, // Mantener para compatibilidad
          phone: userData.phone || null
        })
        .select()
        .single();

      if (userError) throw userError;

      // Agregar relación en user_companies
      await MultiCompanyService.addUserToCompany(authUser.user.id, companyId, role);

      // Establecer empresa activa
      await MultiCompanyService.setActiveCompany(authUser.user.id, companyId);

      return user;
    } catch (error) {
      console.error('Error in createUser:', error);
      throw error;
    }
  }

  /**
   * Actualiza un usuario (mantiene compatibilidad)
   */
  static async updateUser(userId: string, userData: any): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          full_name: userData.full_name,
          phone: userData.phone,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error in updateUser:', error);
      throw error;
    }
  }
}

// =====================================================
// HOOKS Y UTILIDADES
// =====================================================

/**
 * Utilidad para verificar permisos
 */
export const checkPermission = async (
  userId: string, 
  companyId: string, 
  permission: string
): Promise<boolean> => {
  return await MultiCompanyService.hasPermission(userId, companyId, permission);
};

/**
 * Utilidad para obtener contexto completo del usuario
 */
export const getUserContext = async (userId: string) => {
  try {
    const [companies, activeCompany] = await Promise.all([
      MultiCompanyService.getUserCompanies(userId),
      MultiCompanyService.getActiveCompany(userId)
    ]);

    return {
      companies,
      activeCompany,
      hasMultipleCompanies: companies.length > 1
    };
  } catch (error) {
    console.error('Error getting user context:', error);
    return {
      companies: [],
      activeCompany: null,
      hasMultipleCompanies: false
    };
  }
};

// =====================================================
// EXPORTACIONES
// =====================================================

export {
  MultiCompanyService as default,
  MultiCompanyService,
  UserServiceMultiCompany,
  CompanyRole,
  COMPANY_PERMISSIONS
};

/*
USO EJEMPLO:

// Obtener empresas del usuario
const companies = await MultiCompanyService.getUserCompanies(userId);

// Cambiar empresa activa
await MultiCompanyService.setActiveCompany(userId, companyId);

// Verificar permisos
const canDelete = await MultiCompanyService.hasPermission(userId, companyId, 'delete');

// Agregar usuario a empresa
await MultiCompanyService.addUserToCompany(userId, companyId, CompanyRole.MANAGER);

// Obtener contexto completo
const context = await getUserContext(userId);
*/