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
        joined_at: new Date().toISOString(),
        companies: {
          id: company.id,
          name: company.name,
          tax_id: company.tax_id,
          country: company.country,
          currency: company.currency,
          industry: company.industry,
          description: '', // Campo no existe en la tabla
          is_active: true, // Valor por defecto ya que la columna no existe
          created_at: company.created_at,
          user_id: company.user_id
        }
      }));
    } catch (error) {
      console.error('❌ Error en UserService.getUserCompanies:', error);
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

  // Crear un nuevo usuario con arquitectura multicompañía
  static async createUser(userData: CreateUserRequest): Promise<User> {
    try {
      // Usar signUp para crear el usuario (no requiere permisos admin)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            full_name: userData.full_name,
            role: userData.role,
            company_id: userData.company_id
          }
        }
      });

      if (authError) {
        throw authError;
      }

      if (!authData.user) {
        throw new Error('No se pudo crear el usuario');
      }

      // Crear el registro en la tabla users (con company_id)
      const newUser = {
        id: authData.user.id,
        email: userData.email,
        full_name: userData.full_name,
        role: userData.role,
        company_id: userData.company_id,
        is_active: true,
        phone: userData.phone || null
      };

      const { data: userRecord, error: userError } = await supabase
        .from('users')
        .insert([newUser])
        .select()
        .single();

      if (userError) {
        // Si falla la creación del registro, el usuario ya fue creado en auth
        // pero no podemos eliminarlo sin permisos admin
        console.error('Error al crear registro de usuario:', userError);
        throw userError;
      }

      // Retornar el usuario creado
      return {
        ...userRecord,
        role: userData.role,
        is_owner: false,
        joined_at: userRecord.created_at
      };
    } catch (error) {
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

      // Mapear los datos de la tabla users a la interfaz User
      return {
        id: data.id,
        email: data.email,
        full_name: data.full_name,
        phone: data.phone,
        role: data.role,
        is_active: data.is_active,
        last_login: data.last_login,
        created_at: data.user_created_at,
        is_owner: data.is_owner,
        joined_at: data.joined_at
      };
    } catch (error) {
      throw error;
    }
  }

  // Desactivar/activar un usuario
  static async toggleUserStatus(userId: string, isActive: boolean): Promise<User> {
    try {
      return await this.updateUser(userId, { is_active: isActive });
    } catch (error) {
      throw error;
    }
  }

  // Eliminar un usuario de una empresa (arquitectura multicompañía)
  static async removeUserFromCompany(userId: string, companyId: string): Promise<void> {
    try {
      // Eliminar la relación usuario-empresa
      const { error } = await supabase
        .from('user_companies')
        .delete()
        .eq('user_id', userId)
        .eq('company_id', companyId);

      if (error) {
        throw error;
      }
    } catch (error) {
      throw error;
    }
  }

  // Eliminar completamente un usuario del sistema
  static async deleteUser(userId: string): Promise<void> {
    try {
      // Primero eliminar todas las relaciones usuario-empresa
      const { error: relationError } = await supabase
        .from('user_companies')
        .delete()
        .eq('user_id', userId);

      if (relationError) {
        throw relationError;
      }

      // Luego eliminar el usuario de la tabla users
      const { error: userError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (userError) {
        throw userError;
      }

      // Finalmente eliminar de Supabase Auth
      await supabase.auth.admin.deleteUser(userId);
    } catch (error) {
      throw error;
    }
  }

  // Obtener usuarios por rol
  static async getUsersByRole(companyId: string, role: UserRole): Promise<User[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('company_id', companyId)
        .eq('role', role)
        .eq('is_active', true)
        .order('full_name', { ascending: true });

      if (error) {
        throw error;
      }

      return data || [];
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

  // Obtener permisos por rol desde la base de datos
  static async getRolePermissions(): Promise<RolePermission[]> {
    try {
      // Intentar crear la tabla si no existe
      await this.ensureRolePermissionsTableExists();
      
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*')
        .order('role');

      if (error) {
        console.warn('Error loading role permissions from DB:', error);
        
        // Si la tabla no existe, verificar localStorage como fallback
        if (error.message.includes('Could not find the table')) {
          const fallbackData = localStorage.getItem('role_permissions_fallback');
          if (fallbackData) {
            console.log('Usando permisos guardados en localStorage como fallback');
            return JSON.parse(fallbackData);
          }
        }
        
        // Fallback a permisos por defecto si hay error
        return this.getDefaultRolePermissions();
      }

      if (!data || data.length === 0) {
        // Si no hay datos, insertar permisos por defecto
        const defaultPermissions = this.getDefaultRolePermissions();
        await this.initializeDefaultPermissions(defaultPermissions);
        return defaultPermissions;
      }

      return data;
    } catch (error) {
      console.warn('Error accessing role permissions, using defaults:', error);
      return this.getDefaultRolePermissions();
    }
  }

  // Asegurar que la tabla role_permissions existe
  private static async ensureRolePermissionsTableExists(): Promise<void> {
    try {
      // Intentar crear la tabla usando SQL directo
      const { error } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS role_permissions (
            id SERIAL PRIMARY KEY,
            role VARCHAR(50) NOT NULL UNIQUE,
            permissions TEXT[] NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `
      });
      
      if (error) {
        console.warn('Could not create table via RPC, table might already exist or RPC not available:', error);
      }
    } catch (error) {
      console.warn('Error ensuring table exists:', error);
    }
  }

  // Permisos por defecto del sistema
  private static getDefaultRolePermissions(): RolePermission[] {
    return [
      {
        role: 'admin',
        permissions: [
          'users.create',
          'users.read',
          'users.update',
          'users.delete',
          'roles.manage',
          'companies.manage',
          'financial_data.full_access',
          'reports.full_access',
          'settings.manage'
        ]
      },
      {
        role: 'senior_analyst',
        permissions: [
          'users.read',
          'financial_data.full_access',
          'reports.full_access',
          'companies.read'
        ]
      },
      {
        role: 'junior_analyst',
        permissions: [
          'financial_data.read',
          'financial_data.create',
          'reports.read',
          'companies.read'
        ]
      },
      {
        role: 'read_only',
        permissions: [
          'financial_data.read',
          'reports.read',
          'companies.read'
        ]
      }
    ];
  }

  // Inicializar permisos por defecto en la base de datos
  private static async initializeDefaultPermissions(permissions: RolePermission[]): Promise<void> {
    try {
      const { error } = await supabase
        .from('role_permissions')
        .insert(permissions);
      
      if (error) {
        console.error('Error initializing default permissions:', error);
      }
    } catch (error) {
      console.error('Error initializing default permissions:', error);
    }
  }

  // Obtener el usuario actual con su rol
  static async getCurrentUserWithRole(companyId: string): Promise<{ user: any; role: UserRole } | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Buscar el usuario en la tabla users para obtener su rol
      const { data: userData, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .eq('company_id', companyId)
        .single();

      if (error || !userData) {
        console.warn('Usuario no encontrado en la tabla users:', error);
        return null;
      }

      return {
        user,
        role: userData.role as UserRole
      };
    } catch (error) {
      console.error('Error obteniendo usuario actual:', error);
      return null;
    }
  }

  // Verificar si un usuario tiene un permiso específico (versión asíncrona)
  static async hasPermission(userRole: UserRole, permission: string): Promise<boolean> {
    try {
      const rolePermissions = await this.getRolePermissions();
      const userPermissions = rolePermissions.find(rp => rp.role === userRole);
      return userPermissions?.permissions.includes(permission) || false;
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }

  // Verificar si un usuario tiene un permiso específico (versión síncrona con fallback)
  static hasPermissionSync(userRole: UserRole, permission: string): boolean {
    try {
      // Usar permisos por defecto para verificación síncrona
      const rolePermissions = this.getDefaultRolePermissions();
      const userPermissions = rolePermissions.find(rp => rp.role === userRole);
      return userPermissions?.permissions.includes(permission) || false;
    } catch (error) {
      console.error('Error checking permission sync:', error);
      return false;
    }
  }

  // Actualizar permisos de roles
  static async updateRolePermissions(rolePermissions: RolePermission[]): Promise<void> {
    try {
      // Intentar asegurar que la tabla existe
      await this.ensureRolePermissionsTableExists();
      
      // Verificar si la tabla existe intentando hacer una consulta simple
      const { error: testError } = await supabase
        .from('role_permissions')
        .select('role')
        .limit(1);
      
      if (testError && testError.message.includes('Could not find the table')) {
        // La tabla no existe, usar almacenamiento local como fallback
        localStorage.setItem('role_permissions_fallback', JSON.stringify(rolePermissions));
        console.warn('Tabla role_permissions no existe. Guardando en localStorage como fallback.');
        throw new Error('La tabla role_permissions no existe en la base de datos. Por favor, créala manualmente usando el SQL proporcionado en la consola.');
      }
      
      // Eliminar permisos existentes
      const { error: deleteError } = await supabase
        .from('role_permissions')
        .delete()
        .neq('role', 'nonexistent'); // Eliminar todos los registros

      if (deleteError) {
        throw new Error(`Error eliminando permisos existentes: ${deleteError.message}`);
      }

      // Insertar nuevos permisos
      const { error: insertError } = await supabase
        .from('role_permissions')
        .insert(rolePermissions);

      if (insertError) {
        throw new Error(`Error guardando nuevos permisos: ${insertError.message}`);
      }

      console.log('Permisos de rol actualizados exitosamente');
    } catch (error) {
      console.error('Error actualizando permisos de rol:', error);
      throw error;
    }
  }

  // Obtener estadísticas de usuarios
  static async getUserStats(companyId: string): Promise<{
    total: number;
    active: number;
    inactive: number;
    byRole: Record<UserRole, number>;
  }> {
    try {
      const users = await this.getUsers(companyId);
      
      const stats = {
        total: users.length,
        active: users.filter(u => u.is_active).length,
        inactive: users.filter(u => !u.is_active).length,
        byRole: {
          admin: users.filter(u => u.role === 'admin').length,
          senior_analyst: users.filter(u => u.role === 'senior_analyst').length,
          junior_analyst: users.filter(u => u.role === 'junior_analyst').length,
          read_only: users.filter(u => u.role === 'read_only').length
        } as Record<UserRole, number>
      };

      return stats;
    } catch (error) {
      throw error;
    }
  }
}

export default UserService;