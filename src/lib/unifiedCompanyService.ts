import { supabase } from './supabase';
import { getCurrentUser } from './supabase';

export interface Company {
  id: string;
  name: string;
  tax_id: string;
  industry: string;
  country: string;
  currency: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface UserCompany extends Company {
  role: 'ADMIN' | 'MANAGER' | 'USER' | 'VIEWER';
  is_owner: boolean;
  joined_at: string;
  user_company_id: string;
}

export interface ActiveSession {
  user_id: string;
  active_company_id: string;
  updated_at: string;
}

/**
 * Servicio unificado para gestión de empresas multicompañía
 * Reemplaza tanto SupabaseService.getUserCompanies() como UserService.getUserCompanies()
 */
export class UnifiedCompanyService {
  
  /**
   * Obtiene todas las empresas a las que pertenece un usuario
   * Usa la tabla user_companies (arquitectura multicompañía)
   */
  static async getUserCompanies(userId?: string): Promise<UserCompany[]> {
    try {
      let targetUserId = userId;
      
      // Si no se proporciona userId, usar el usuario autenticado
      if (!targetUserId) {
        const { user } = await getCurrentUser();
        if (!user) throw new Error('Usuario no autenticado');
        targetUserId = user.id;
      }
      
      console.log('🏢 UnifiedCompanyService - Cargando empresas para usuario:', targetUserId);
      
      const { data, error } = await supabase
        .from('user_companies')
        .select(`
          id,
          role,
          is_active,
          created_at,
          companies (
            id,
            name,
            tax_id,
            industry,
            country,
            currency,
            created_at,
            updated_at,
            user_id
          )
        `)
        .eq('user_id', targetUserId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ Error obteniendo empresas del usuario:', error);
        throw error;
      }
      
      const companies = (data || []).map(item => ({
        ...item.companies,
        description: '', // Campo no existe en la tabla
        is_active: true, // Valor por defecto
        role: item.role as 'ADMIN' | 'MANAGER' | 'USER' | 'VIEWER',
        is_owner: item.role === 'ADMIN',
        joined_at: item.created_at, // Usar created_at como joined_at
        user_company_id: item.id
      })) as UserCompany[];
      
      console.log('✅ UnifiedCompanyService - Empresas encontradas:', companies.length);
      return companies;
      
    } catch (error) {
      console.error('❌ Error en UnifiedCompanyService.getUserCompanies:', error);
      throw error;
    }
  }
  
  /**
   * Obtiene la empresa activa del usuario
   */
  static async getActiveCompany(userId?: string): Promise<UserCompany | null> {
    try {
      let targetUserId = userId;
      
      if (!targetUserId) {
        const { user } = await getCurrentUser();
        if (!user) throw new Error('Usuario no autenticado');
        targetUserId = user.id;
      }
      
      console.log('🎯 UnifiedCompanyService - Obteniendo empresa activa para:', targetUserId);
      
      const { data, error } = await supabase
        .from('user_sessions')
        .select(`
          active_company_id,
          updated_at,
          companies (
            id,
            name,
            tax_id,
            industry,
            country,
            currency,
            created_at,
            updated_at,
            user_id
          )
        `)
        .eq('user_id', targetUserId)
        .single();
      
      if (error || !data?.companies) {
        console.log('ℹ️ No hay empresa activa configurada');
        return null;
      }
      
      // Obtener el rol del usuario en esta empresa
      const { data: userCompanyData, error: roleError } = await supabase
        .from('user_companies')
        .select('id, role')
        .eq('user_id', targetUserId)
        .eq('company_id', data.active_company_id)
        .eq('is_active', true)
        .single();
      
      if (roleError) {
        console.error('❌ Error obteniendo rol del usuario:', roleError);
        return null;
      }
      
      const activeCompany: UserCompany = {
        ...data.companies,
        description: '', // Campo no existe en la tabla
        is_active: true, // Valor por defecto
        role: userCompanyData.role as 'ADMIN' | 'MANAGER' | 'USER' | 'VIEWER',
        is_owner: userCompanyData.role === 'ADMIN',
        joined_at: data.updated_at,
        user_company_id: userCompanyData.id
      };
      
      console.log('✅ Empresa activa:', activeCompany.name);
      return activeCompany;
      
    } catch (error) {
      console.error('❌ Error en UnifiedCompanyService.getActiveCompany:', error);
      return null;
    }
  }
  
  /**
   * Establece la empresa activa para un usuario
   */
  static async setActiveCompany(companyId: string, userId?: string): Promise<void> {
    try {
      let targetUserId = userId;
      
      if (!targetUserId) {
        const { user } = await getCurrentUser();
        if (!user) throw new Error('Usuario no autenticado');
        targetUserId = user.id;
      }
      
      console.log('🎯 UnifiedCompanyService - Estableciendo empresa activa:', companyId);
      
      // Verificar que el usuario pertenece a la empresa
      const { data: userCompany, error: verifyError } = await supabase
        .from('user_companies')
        .select('id')
        .eq('user_id', targetUserId)
        .eq('company_id', companyId)
        .eq('is_active', true)
        .single();
      
      if (verifyError || !userCompany) {
        throw new Error('Usuario no pertenece a esta empresa');
      }
      
      // Actualizar o crear sesión
      const { error } = await supabase
        .from('user_sessions')
        .upsert({
          user_id: targetUserId,
          active_company_id: companyId,
          updated_at: new Date().toISOString()
        });
      
      if (error) {
        console.error('❌ Error estableciendo empresa activa:', error);
        throw error;
      }
      
      console.log('✅ Empresa activa establecida correctamente');
      
    } catch (error) {
      console.error('❌ Error en UnifiedCompanyService.setActiveCompany:', error);
      throw error;
    }
  }
  
  /**
   * Migración temporal: obtiene empresas usando el método legacy
   * Para compatibilidad durante la transición
   */
  static async getLegacyCompanies(): Promise<Company[]> {
    try {
      const { user } = await getCurrentUser();
      if (!user) throw new Error('Usuario no autenticado');
      
      console.log('⚠️ UnifiedCompanyService - Usando método legacy');
      
      // Método legacy: buscar por user_id en companies
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ Error en método legacy:', error);
        throw error;
      }
      
      // Agregar campos faltantes con valores por defecto
      const companiesWithDefaults = (data || []).map(company => ({
        ...company,
        description: company.description || '', // Campo opcional
        is_active: company.is_active !== undefined ? company.is_active : true // Valor por defecto
      }));
      
      console.log('✅ Empresas legacy encontradas:', companiesWithDefaults.length);
      return companiesWithDefaults;
      
    } catch (error) {
      console.error('❌ Error en UnifiedCompanyService.getLegacyCompanies:', error);
      throw error;
    }
  }
  
  /**
   * Verifica si un usuario tiene acceso a una empresa
   */
  static async hasAccessToCompany(companyId: string, userId?: string): Promise<boolean> {
    try {
      let targetUserId = userId;
      
      if (!targetUserId) {
        const { user } = await getCurrentUser();
        if (!user) return false;
        targetUserId = user.id;
      }
      
      const { data, error } = await supabase
        .from('user_companies')
        .select('id')
        .eq('user_id', targetUserId)
        .eq('company_id', companyId)
        .eq('is_active', true)
        .single();
      
      return !error && !!data;
      
    } catch (error) {
      console.error('❌ Error verificando acceso a empresa:', error);
      return false;
    }
  }
}

export default UnifiedCompanyService;