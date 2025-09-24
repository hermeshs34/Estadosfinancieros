import React, { useState, useEffect } from 'react';
import { useDataContext } from '../../contexts/DataContext';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Building, Plus, Calendar, Edit, Trash2, Save, X } from 'lucide-react';
import { Company, FinancialPeriod } from '../../lib/supabaseService';
import SupabaseService from '../../lib/supabaseService';

interface CompanyFormData {
  name: string;
  tax_id: string;
  industry: string;
  country: string;
  currency: string;
}

interface PeriodFormData {
  period_name: string;
  start_date: string;
  end_date: string;
  period_type: 'monthly' | 'quarterly' | 'annual';
}

export const CompanyManagement: React.FC = () => {
  const {
    companies,
    selectedCompany,
    setSelectedCompany,
    financialPeriods: periods,
    selectedPeriod,
    setSelectedPeriod,
    loadCompanies,
    createCompany,
    loadFinancialPeriods,
    createFinancialPeriod,
    updateFinancialPeriod,
    deleteFinancialPeriod
  } = useDataContext();

  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [showPeriodForm, setShowPeriodForm] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [editingPeriod, setEditingPeriod] = useState<FinancialPeriod | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');

  const [companyForm, setCompanyForm] = useState<CompanyFormData>({
    name: '',
    tax_id: '',
    industry: '',
    country: 'Venezuela',
    currency: 'VES'
  });

  const [periodForm, setPeriodForm] = useState<PeriodFormData>({
    period_name: '',
    start_date: '',
    end_date: '',
    period_type: 'monthly'
  });

  useEffect(() => {
    if (selectedCompany?.id) {
      loadFinancialPeriods(selectedCompany.id);
    }
  }, [selectedCompany, loadFinancialPeriods]);

  // Cargar empresas al montar el componente
  useEffect(() => {
    console.log('🏢 CompanyManagement - Cargando empresas al montar componente');
    loadCompanies();
  }, [loadCompanies]);

  // Función auxiliar para formatear fecha sin problemas de zona horaria
  const formatDateToString = (date: Date): string => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Función para calcular fechas automáticamente según el tipo de período
  const calculatePeriodDates = (periodType: 'monthly' | 'quarterly' | 'annual', baseDate?: string) => {
    const referenceDate = baseDate ? new Date(baseDate) : new Date();
    const currentYear = referenceDate.getFullYear();
    const currentMonth = referenceDate.getMonth();
    
    let startDate: string;
    let endDate: string;
    let periodName: string;
    
    switch (periodType) {
      case 'monthly':
        const monthStart = new Date(currentYear, currentMonth, 1);
        const monthEnd = new Date(currentYear, currentMonth + 1, 0);
        
        startDate = formatDateToString(monthStart);
        endDate = formatDateToString(monthEnd);
        const startDay = monthStart.getDate().toString().padStart(2, '0');
        const startMonth = (monthStart.getMonth() + 1).toString().padStart(2, '0');
        const endDay = monthEnd.getDate().toString().padStart(2, '0');
        const endMonth = (monthEnd.getMonth() + 1).toString().padStart(2, '0');
        periodName = `EJERCICIO FISCAL ${currentYear} (${startDay}/${startMonth}/${currentYear} - ${endDay}/${endMonth}/${currentYear})`;
        break;
        
      case 'quarterly':
        const quarter = Math.floor(currentMonth / 3);
        const quarterStart = new Date(currentYear, quarter * 3, 1);
        const quarterEnd = new Date(currentYear, (quarter + 1) * 3, 0);
        
        startDate = formatDateToString(quarterStart);
        endDate = formatDateToString(quarterEnd);
        periodName = `Q${quarter + 1} ${currentYear}`;
        break;
        
      case 'annual':
      default:
        const yearStart = new Date(currentYear, 0, 1);
        const yearEnd = new Date(currentYear, 11, 31);
        
        startDate = formatDateToString(yearStart);
        endDate = formatDateToString(yearEnd);
        periodName = `Año Fiscal ${currentYear}`;
        break;
    }
    
    return { startDate, endDate, periodName };
  };

  // Función para generar nombre de período basado en fechas existentes
  const generatePeriodNameFromDates = (startDate: string, endDate: string, periodType: 'monthly' | 'quarterly' | 'annual') => {
    if (!startDate || !endDate) return '';
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const year = start.getFullYear();
    
    const startDay = start.getDate().toString().padStart(2, '0');
    const startMonth = (start.getMonth() + 1).toString().padStart(2, '0');
    const endDay = end.getDate().toString().padStart(2, '0');
    const endMonth = (end.getMonth() + 1).toString().padStart(2, '0');
    
    switch (periodType) {
      case 'monthly':
        return `EJERCICIO FISCAL ${year} (${startDay}/${startMonth}/${year} - ${endDay}/${endMonth}/${year})`;
      case 'quarterly':
        const quarter = Math.floor(start.getMonth() / 3) + 1;
        return `Q${quarter} ${year} (${startDay}/${startMonth}/${year} - ${endDay}/${endMonth}/${year})`;
      case 'annual':
      default:
        return `Año Fiscal ${year} (${startDay}/${startMonth}/${year} - ${endDay}/${endMonth}/${year})`;
    }
  };

  // Función para manejar cambio de tipo de período
  const handlePeriodTypeChange = (newPeriodType: 'monthly' | 'quarterly' | 'annual') => {
    if (periodForm.start_date && periodForm.end_date) {
      const newPeriodName = generatePeriodNameFromDates(
        periodForm.start_date, 
        periodForm.end_date, 
        newPeriodType
      );
      
      setPeriodForm({
        ...periodForm,
        period_type: newPeriodType,
        period_name: newPeriodName
      });
    } else {
      const baseDate = periodForm.start_date || undefined;
      const { startDate, endDate, periodName } = calculatePeriodDates(newPeriodType, baseDate);
      
      setPeriodForm({
        ...periodForm,
        period_type: newPeriodType,
        start_date: startDate,
        end_date: endDate,
        period_name: periodName
      });
    }
  };

  // Función para actualizar nombre cuando cambian las fechas manualmente
  const handleDateChange = (field: 'start_date' | 'end_date', value: string) => {
    const updatedForm = {
      ...periodForm,
      [field]: value
    };
    
    // Si ambas fechas están completas, generar nombre automáticamente
    if (updatedForm.start_date && updatedForm.end_date) {
      updatedForm.period_name = generatePeriodNameFromDates(
        updatedForm.start_date,
        updatedForm.end_date,
        updatedForm.period_type
      );
    }
    
    setPeriodForm(updatedForm);
  };

  // Función para resetear el formulario de período
  const resetPeriodForm = () => {
    setPeriodForm({
      period_name: '',
      start_date: '',
      end_date: '',
      period_type: 'monthly'
    });
    setEditingPeriod(null);
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyForm.name || !companyForm.tax_id) return;

    setLoading(true);
    try {
      await createCompany(companyForm);
      setCompanyForm({
        name: '',
        tax_id: '',
        industry: '',
        country: 'Venezuela',
        currency: 'VES'
      });
      setShowCompanyForm(false);
    } catch (error) {
      console.error('Error creando empresa:', error);
      alert('Error al crear la empresa');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompanyId || !periodForm.period_name || !periodForm.start_date || !periodForm.end_date) return;

    setLoading(true);
    try {
      if (editingPeriod) {
        await updateFinancialPeriod(editingPeriod.id!, {
          period_name: periodForm.period_name,
          start_date: periodForm.start_date,
          end_date: periodForm.end_date,
          period_type: periodForm.period_type
        });
      } else {
        await createFinancialPeriod({
          company_id: selectedCompanyId,
          period_name: periodForm.period_name,
          start_date: periodForm.start_date,
          end_date: periodForm.end_date,
          period_type: periodForm.period_type
        });
      }
      resetPeriodForm();
      setShowPeriodForm(false);
    } catch (error) {
      console.error('Error con período:', error);
      alert('Error al procesar el período');
    } finally {
      setLoading(false);
    }
  };

  const handleEditCompany = (company: Company) => {
    setEditingCompany(company);
    setCompanyForm({
      name: company.name,
      tax_id: company.tax_id,
      industry: company.industry,
      country: company.country,
      currency: company.currency
    });
    setShowCompanyForm(true);
  };

  const handleEditPeriod = (period: FinancialPeriod) => {
    setEditingPeriod(period);
    setPeriodForm({
      period_name: period.period_name,
      start_date: period.start_date,
      end_date: period.end_date,
      period_type: period.period_type
    });
    setSelectedCompanyId(period.company_id);
    setShowPeriodForm(true);
  };

  const handleDeleteCompany = async (companyId: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta empresa?')) {
      return;
    }

    try {
      await SupabaseService.deleteCompany(companyId);
      await loadCompanies();
    } catch (error) {
      console.error('Error eliminando empresa:', error);
      alert('Error al eliminar la empresa');
    }
  };

  const handleDeletePeriod = async (periodId: string, isPublished?: boolean) => {
    // Verificar si el período está publicado
    if (isPublished) {
      alert(
        '🔒 No se puede eliminar este período porque está PUBLICADO.\n\n' +
        'Los períodos publicados están protegidos contra eliminación para mantener la integridad de los datos financieros.\n\n' +
        'Si necesita eliminarlo:\n' +
        '1. Primero cambie el estado a "Borrador" usando el botón de estado\n' +
        '2. Luego podrá eliminar el período'
      );
      return;
    }

    if (!window.confirm('¿Estás seguro de que quieres eliminar este período financiero?')) {
      return;
    }

    try {
      await SupabaseService.safeDeleteFinancialPeriod(periodId);
      
      if (selectedCompany?.id) {
        await loadFinancialPeriods(selectedCompany.id);
      }
      
      if (selectedPeriod?.id === periodId) {
        setSelectedPeriod(null);
      }
    } catch (error) {
      console.error('Error eliminando período:', error);
      
      if (error instanceof Error && error.message.includes('tiene balances cargados')) {
        alert(
          'No se puede eliminar este período porque tiene balances cargados.\n\n' +
          'Para eliminar el período:\n' +
          '1. Vaya a "Importar Datos"\n' +
          '2. Seleccione este período\n' +
          '3. Elimine los balances cargados\n' +
          '4. Luego podrá eliminar el período'
        );
      } else {
        alert('Error eliminando período: ' + (error instanceof Error ? error.message : 'Error desconocido'));
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Gestión de Empresas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="w-5 h-5" />
            Gestión de Empresas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Empresas Registradas</h3>
            <Button
              onClick={() => setShowCompanyForm(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nueva Empresa
            </Button>
          </div>

          <div className="grid gap-4">
            {companies.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Building className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium mb-2">No hay empresas registradas</p>
                <p className="text-sm">Crea tu primera empresa para comenzar</p>
              </div>
            ) : (
              companies.map((company) => (
                <div key={company.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-lg">{company.name}</h4>
                    <p className="text-gray-600">RIF: {company.tax_id}</p>
                    <p className="text-gray-600">Sector: {company.industry}</p>
                    <p className="text-gray-600">{company.country} - {company.currency}</p>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => handleEditCompany(company)}
                      variant="outline"
                      size="sm"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => handleDeleteCompany(company.id)}
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Períodos de la empresa */}
                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-between items-center mb-3">
                    <h5 className="font-medium flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Períodos Financieros
                    </h5>
                    <Button
                      onClick={() => {
                        resetPeriodForm();
                        setSelectedCompanyId(company.id);
                        setShowPeriodForm(true);
                      }}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Nuevo Período
                    </Button>
                  </div>

                  <div className="grid gap-2">
                    {periods
                      .filter(period => period.company_id === company.id)
                      .map((period) => (
                        <div key={period.id} className="flex justify-between items-center bg-gray-50 p-3 rounded">
                          <div>
                            <span className="font-medium">{period.period_name}</span>
                            <span className="text-gray-600 ml-2">
                              ({new Date(period.start_date).toLocaleDateString()} - {new Date(period.end_date).toLocaleDateString()})
                            </span>
                          </div>
                          <div className="flex space-x-1">
                            <Button
                              onClick={() => handleEditPeriod(period)}
                              variant="outline"
                              size="sm"
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              onClick={() => handleDeletePeriod(period.id, period.is_published)}
                              variant="outline"
                              size="sm"
                              className={`${
                                period.is_published 
                                  ? 'text-gray-400 cursor-not-allowed opacity-50' 
                                  : 'text-red-600 hover:text-red-700'
                              }`}
                              disabled={period.is_published}
                              title={period.is_published ? '🔒 Período publicado - No se puede eliminar' : 'Eliminar período'}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal para crear/editar empresa */}
      {showCompanyForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingCompany ? 'Editar Empresa' : 'Nueva Empresa'}
            </h3>
            <form onSubmit={handleCreateCompany} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre de la Empresa
                </label>
                <input
                  type="text"
                  value={companyForm.name}
                  onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  RIF
                </label>
                <input
                  type="text"
                  value={companyForm.tax_id}
                  onChange={(e) => setCompanyForm({ ...companyForm, tax_id: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sector
                </label>
                <input
                  type="text"
                  value={companyForm.industry}
                  onChange={(e) => setCompanyForm({ ...companyForm, industry: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  País
                </label>
                <input
                  type="text"
                  value={companyForm.country}
                  onChange={(e) => setCompanyForm({ ...companyForm, country: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Moneda
                </label>
                <input
                  type="text"
                  value={companyForm.currency}
                  onChange={(e) => setCompanyForm({ ...companyForm, currency: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  onClick={() => {
                    setShowCompanyForm(false);
                    setEditingCompany(null);
                    setCompanyForm({
                      name: '',
                      tax_id: '',
                      industry: '',
                      country: 'Venezuela',
                      currency: 'VES'
                    });
                  }}
                  variant="outline"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {editingCompany ? 'Actualizar' : 'Crear'} Empresa
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para crear/editar período */}
      {showPeriodForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingPeriod ? 'Editar Período' : 'Nuevo Período'}
            </h3>
            <form onSubmit={handleCreatePeriod} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Período
                </label>
                <select
                  value={periodForm.period_type}
                  onChange={(e) => handlePeriodTypeChange(e.target.value as 'monthly' | 'quarterly' | 'annual')}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="monthly">Mensual</option>
                  <option value="quarterly">Trimestral</option>
                  <option value="annual">Anual</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del Período
                </label>
                <input
                  type="text"
                  value={periodForm.period_name}
                  onChange={(e) => setPeriodForm({ ...periodForm, period_name: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de Inicio
                </label>
                <input
                  type="date"
                  value={periodForm.start_date}
                  onChange={(e) => handleDateChange('start_date', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de Fin
                </label>
                <input
                  type="date"
                  value={periodForm.end_date}
                  onChange={(e) => handleDateChange('end_date', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  onClick={() => {
                    setShowPeriodForm(false);
                    resetPeriodForm();
                  }}
                  variant="outline"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {editingPeriod ? 'Actualizar' : 'Crear'} Período
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};