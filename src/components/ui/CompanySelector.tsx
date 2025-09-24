import React, { useState, useEffect } from 'react';
import { ChevronDown, Building2, Check, Plus } from 'lucide-react';
import { CompanyWithRole } from '../../types';
import UnifiedCompanyService from '../../lib/unifiedCompanyService';
import { getCurrentUser } from '../../lib/supabase';
import { Button } from './Button';

interface CompanySelectorProps {
  currentCompany: CompanyWithRole | null;
  onCompanyChange: (company: CompanyWithRole) => void;
  onCreateCompany?: () => void;
}

const CompanySelector: React.FC<CompanySelectorProps> = ({
  currentCompany,
  onCompanyChange,
  onCreateCompany
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [companies, setCompanies] = useState<CompanyWithRole[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUserCompanies();
  }, []);

  const loadUserCompanies = async () => {
    try {
      setLoading(true);
      const { user, error } = await getCurrentUser();
      if (user && !error) {
        console.log('🏢 CompanySelector - Cargando empresas con servicio unificado para:', user.id);
        const userCompanies = await UnifiedCompanyService.getUserCompanies(user.id);
        
        // Convertir UserCompany[] a CompanyWithRole[] para compatibilidad
        const companiesWithRole: CompanyWithRole[] = userCompanies.map(company => ({
          id: company.id,
          name: company.name,
          tax_id: company.tax_id,
          industry: company.industry,
          country: company.country,
          currency: company.currency,
          description: company.description,
          is_active: company.is_active,
          created_at: company.created_at,
          updated_at: company.updated_at,
          user_id: company.user_id,
          role: company.role,
          is_owner: company.is_owner,
          joined_at: company.joined_at,
          user_company_id: company.user_company_id
        }));
        
        console.log('✅ CompanySelector - Empresas cargadas (unificado):', companiesWithRole.length);
        setCompanies(companiesWithRole);
      }
    } catch (error) {
      console.error('❌ CompanySelector - Error cargando empresas (unificado):', error);
      // Fallback al método legacy si falla
      console.log('⚠️ CompanySelector - Intentando con método legacy...');
      try {
        const legacyCompanies = await UnifiedCompanyService.getLegacyCompanies();
        const companiesWithRole: CompanyWithRole[] = legacyCompanies.map(company => ({
          ...company,
          role: 'ADMIN' as const,
          is_owner: true,
          joined_at: company.created_at,
          user_company_id: `legacy_${company.id}`
        }));
        console.log('✅ CompanySelector - Empresas cargadas con método legacy:', companiesWithRole.length);
        setCompanies(companiesWithRole);
      } catch (legacyError) {
        console.error('❌ CompanySelector - Error también con método legacy:', legacyError);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCompanySelect = (company: CompanyWithRole) => {
    onCompanyChange(company);
    setIsOpen(false);
  };

  const getRoleLabel = (role: string) => {
    const roleLabels = {
      admin: 'Administrador',
      senior_analyst: 'Analista Senior',
      junior_analyst: 'Analista Junior',
      read_only: 'Solo Lectura'
    };
    return roleLabels[role as keyof typeof roleLabels] || role;
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <Building2 className="h-4 w-4 text-gray-400" />
        <span className="text-sm text-gray-500">Cargando empresas...</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors min-w-[200px]"
      >
        <div className="flex items-center space-x-2">
          <Building2 className="h-4 w-4" />
          <div className="flex flex-col items-start">
            <span className="truncate max-w-32">
              {currentCompany ? currentCompany.name : 'Seleccionar empresa'}
            </span>
            {currentCompany && (
              <span className="text-xs text-gray-500 capitalize">
                {currentCompany.role}
              </span>
            )}
          </div>
        </div>
        <ChevronDown className={`h-4 w-4 transition-transform ${
          isOpen ? 'transform rotate-180' : ''
        }`} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 z-20 mt-1 w-80 bg-white border border-gray-300 rounded-md shadow-lg">
            <div className="py-1 max-h-60 overflow-y-auto">
              {companies.length === 0 ? (
                <div className="px-4 py-2 text-sm text-gray-500">
                  No hay empresas disponibles
                </div>
              ) : (
                companies.map((company) => (
                  <button
                    key={company.id}
                    onClick={() => handleCompanySelect(company)}
                    className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-100 focus:outline-none focus:bg-gray-100 transition-colors ${
                      currentCompany?.id === company.id 
                        ? 'bg-blue-50 text-blue-700' 
                        : 'text-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="font-medium">{company.name}</span>
                        <span className="text-xs text-gray-500">
                          {company.tax_id} • {company.country}
                        </span>
                        <span className="text-xs text-gray-500 capitalize mt-1">
                          Rol: {company.role}
                          {company.is_owner && ' (Propietario)'}
                        </span>
                      </div>
                      {currentCompany?.id === company.id && (
                        <Check className="h-4 w-4 text-blue-600" />
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
            
            {onCreateCompany && (
              <div className="border-t border-gray-200 p-2">
                <Button
                  onClick={() => {
                    onCreateCompany();
                    setIsOpen(false);
                  }}
                  variant="outline"
                  size="sm"
                  className="w-full justify-center"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Crear nueva empresa
                </Button>
              </div>
            )}
            
            {companies.length > 0 && (
              <div className="border-t border-gray-200 px-4 py-2">
                <div className="text-xs text-gray-500">
                  {companies.length} empresa{companies.length !== 1 ? 's' : ''} disponible{companies.length !== 1 ? 's' : ''}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export { CompanySelector };
export default CompanySelector;