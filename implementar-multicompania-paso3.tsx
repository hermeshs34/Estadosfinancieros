// IMPLEMENTACIÓN MULTICOMPAÑÍA - PASO 3: COMPONENTES FRONTEND
// Este archivo contiene los componentes React para manejar multicompañía

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { MultiCompanyService, Company, CompanyRole, COMPANY_PERMISSIONS } from './implementar-multicompania-paso2';

// =====================================================
// CONTEXTO DE MULTICOMPAÑÍA
// =====================================================

interface CompanyContextType {
  // Estado
  companies: Company[];
  activeCompany: Company | null;
  loading: boolean;
  error: string | null;
  
  // Acciones
  switchCompany: (companyId: string) => Promise<void>;
  addUserToCompany: (companyId: string, role?: CompanyRole) => Promise<void>;
  removeUserFromCompany: (companyId: string) => Promise<void>;
  refreshCompanies: () => Promise<void>;
  
  // Utilidades
  hasPermission: (permission: string) => boolean;
  getUserRole: () => CompanyRole | null;
  isMultiCompany: boolean;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

// =====================================================
// PROVEEDOR DE CONTEXTO
// =====================================================

interface CompanyProviderProps {
  children: ReactNode;
  user: User | null;
}

export const CompanyProvider: React.FC<CompanyProviderProps> = ({ children, user }) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar empresas del usuario
  const loadUserCompanies = async () => {
    if (!user) {
      setCompanies([]);
      setActiveCompany(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const [userCompanies, active] = await Promise.all([
        MultiCompanyService.getUserCompanies(user.id),
        MultiCompanyService.getActiveCompany(user.id)
      ]);
      
      setCompanies(userCompanies);
      
      // Si hay empresa activa, usarla; sino, usar la primera disponible
      const companyToSet = active || userCompanies[0] || null;
      setActiveCompany(companyToSet);
      
      // Si no había empresa activa pero hay empresas, establecer la primera como activa
      if (!active && userCompanies.length > 0) {
        await MultiCompanyService.setActiveCompany(user.id, userCompanies[0].id);
      }
    } catch (err) {
      console.error('Error loading companies:', err);
      setError('Error al cargar las empresas');
    } finally {
      setLoading(false);
    }
  };

  // Cambiar empresa activa
  const switchCompany = async (companyId: string) => {
    if (!user) return;
    
    try {
      setError(null);
      await MultiCompanyService.setActiveCompany(user.id, companyId);
      
      const company = companies.find(c => c.id === companyId);
      setActiveCompany(company || null);
    } catch (err) {
      console.error('Error switching company:', err);
      setError('Error al cambiar de empresa');
    }
  };

  // Agregar usuario a empresa
  const addUserToCompany = async (companyId: string, role: CompanyRole = CompanyRole.USER) => {
    if (!user) return;
    
    try {
      setError(null);
      await MultiCompanyService.addUserToCompany(user.id, companyId, role);
      await loadUserCompanies(); // Recargar empresas
    } catch (err) {
      console.error('Error adding user to company:', err);
      setError('Error al agregar usuario a la empresa');
    }
  };

  // Remover usuario de empresa
  const removeUserFromCompany = async (companyId: string) => {
    if (!user) return;
    
    try {
      setError(null);
      await MultiCompanyService.removeUserFromCompany(user.id, companyId);
      await loadUserCompanies(); // Recargar empresas
    } catch (err) {
      console.error('Error removing user from company:', err);
      setError('Error al remover usuario de la empresa');
    }
  };

  // Refrescar empresas
  const refreshCompanies = async () => {
    await loadUserCompanies();
  };

  // Verificar permisos
  const hasPermission = (permission: string): boolean => {
    if (!activeCompany || !activeCompany.role) return false;
    
    const permissions = COMPANY_PERMISSIONS[activeCompany.role] || [];
    return permissions.includes(permission);
  };

  // Obtener rol del usuario
  const getUserRole = (): CompanyRole | null => {
    return activeCompany?.role || null;
  };

  // Verificar si es multicompañía
  const isMultiCompany = companies.length > 1;

  // Cargar empresas al montar o cambiar usuario
  useEffect(() => {
    loadUserCompanies();
  }, [user]);

  const value: CompanyContextType = {
    companies,
    activeCompany,
    loading,
    error,
    switchCompany,
    addUserToCompany,
    removeUserFromCompany,
    refreshCompanies,
    hasPermission,
    getUserRole,
    isMultiCompany
  };

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  );
};

// =====================================================
// HOOK PERSONALIZADO
// =====================================================

export const useCompany = (): CompanyContextType => {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
};

// =====================================================
// COMPONENTE SELECTOR DE EMPRESA
// =====================================================

interface CompanySelectorProps {
  className?: string;
  showLabel?: boolean;
}

export const CompanySelector: React.FC<CompanySelectorProps> = ({ 
  className = '', 
  showLabel = true 
}) => {
  const { companies, activeCompany, switchCompany, loading, isMultiCompany } = useCompany();

  // Si solo hay una empresa, no mostrar selector
  if (!isMultiCompany) {
    return showLabel && activeCompany ? (
      <div className={`text-sm text-gray-600 ${className}`}>
        <span className="font-medium">{activeCompany.name}</span>
      </div>
    ) : null;
  }

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-8 bg-gray-200 rounded w-48"></div>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {showLabel && (
        <label className="text-sm font-medium text-gray-700">
          Empresa:
        </label>
      )}
      <select
        value={activeCompany?.id || ''}
        onChange={(e) => switchCompany(e.target.value)}
        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
      >
        {companies.map((company) => (
          <option key={company.id} value={company.id}>
            {company.name} ({company.rif})
          </option>
        ))}
      </select>
    </div>
  );
};

// =====================================================
// COMPONENTE DE INFORMACIÓN DE EMPRESA
// =====================================================

export const CompanyInfo: React.FC = () => {
  const { activeCompany, getUserRole, isMultiCompany } = useCompany();
  const role = getUserRole();

  if (!activeCompany) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
        <p className="text-yellow-800">No hay empresa activa seleccionada</p>
      </div>
    );
  }

  const roleLabels = {
    [CompanyRole.ADMIN]: 'Administrador',
    [CompanyRole.MANAGER]: 'Gerente',
    [CompanyRole.USER]: 'Usuario',
    [CompanyRole.VIEWER]: 'Visualizador'
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-blue-900">
            {activeCompany.name}
          </h3>
          <p className="text-sm text-blue-700">
            RIF: {activeCompany.rif}
          </p>
          {activeCompany.address && (
            <p className="text-sm text-blue-600">
              {activeCompany.address}
            </p>
          )}
        </div>
        <div className="text-right">
          {role && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {roleLabels[role]}
            </span>
          )}
          {isMultiCompany && (
            <p className="text-xs text-blue-600 mt-1">
              Multiempresa activa
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// =====================================================
// COMPONENTE DE GESTIÓN DE EMPRESAS
// =====================================================

interface CompanyManagementProps {
  userId?: string;
}

export const CompanyManagement: React.FC<CompanyManagementProps> = ({ userId }) => {
  const { companies, refreshCompanies, hasPermission } = useCompany();
  const [availableCompanies, setAvailableCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);

  // Solo mostrar si el usuario tiene permisos de gestión
  if (!hasPermission('manage_users')) {
    return null;
  }

  const loadAvailableCompanies = async () => {
    // Aquí cargarías todas las empresas disponibles
    // Por ahora, mostrar las empresas actuales del usuario
    setAvailableCompanies(companies);
  };

  useEffect(() => {
    loadAvailableCompanies();
  }, [companies]);

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        Gestión de Empresas
      </h3>
      
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Empresas Actuales ({companies.length})
          </h4>
          <div className="space-y-2">
            {companies.map((company) => (
              <div key={company.id} className="flex items-center justify-between p-3 border rounded-md">
                <div>
                  <p className="font-medium">{company.name}</p>
                  <p className="text-sm text-gray-500">{company.rif}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {company.role}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// =====================================================
// HOC PARA PROTEGER COMPONENTES POR PERMISOS
// =====================================================

interface WithPermissionProps {
  permission: string;
  fallback?: ReactNode;
  children: ReactNode;
}

export const WithPermission: React.FC<WithPermissionProps> = ({ 
  permission, 
  fallback = null, 
  children 
}) => {
  const { hasPermission } = useCompany();
  
  if (!hasPermission(permission)) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
};

// =====================================================
// HOOK PARA PERMISOS
// =====================================================

export const usePermissions = () => {
  const { hasPermission, getUserRole, activeCompany } = useCompany();
  
  return {
    hasPermission,
    getUserRole,
    activeCompany,
    canRead: hasPermission('read'),
    canWrite: hasPermission('write'),
    canDelete: hasPermission('delete'),
    canManageUsers: hasPermission('manage_users'),
    canManageSettings: hasPermission('manage_settings')
  };
};

// =====================================================
// COMPONENTE DE INDICADOR DE EMPRESA
// =====================================================

export const CompanyIndicator: React.FC = () => {
  const { activeCompany, isMultiCompany } = useCompany();
  
  if (!activeCompany) return null;
  
  return (
    <div className="flex items-center space-x-2 text-sm">
      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
      <span className="text-gray-600">
        {activeCompany.name}
        {isMultiCompany && (
          <span className="ml-1 text-xs text-blue-600">(Multi)</span>
        )}
      </span>
    </div>
  );
};

// =====================================================
// EXPORTACIONES
// =====================================================

export {
  CompanyProvider,
  useCompany,
  CompanySelector,
  CompanyInfo,
  CompanyManagement,
  WithPermission,
  usePermissions,
  CompanyIndicator
};

/*
USO EJEMPLO:

// En App.tsx
<CompanyProvider user={user}>
  <Router>
    <Routes>
      <Route path="/" element={<Dashboard />} />
    </Routes>
  </Router>
</CompanyProvider>

// En cualquier componente
const { activeCompany, switchCompany, hasPermission } = useCompany();

// Proteger componentes
<WithPermission permission="delete">
  <DeleteButton />
</WithPermission>

// Usar permisos
const { canWrite, canManageUsers } = usePermissions();
*/