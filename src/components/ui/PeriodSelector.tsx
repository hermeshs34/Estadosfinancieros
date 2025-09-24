import React from 'react';
import { Calendar, ChevronDown, Plus } from 'lucide-react';
import { useDataContext } from '../../contexts/DataContext';
import { FinancialPeriod } from '../../types';
import { Button } from './Button';
import { PublishedStatusToggle } from '../PublishedStatusToggle';

interface PeriodSelectorProps {
  className?: string;
}

export const PeriodSelector: React.FC<PeriodSelectorProps> = ({ className = '' }) => {
  const { 
    financialPeriods, 
    selectedPeriod, 
    setSelectedPeriod,
    selectedCompany,
    loadFinancialPeriods,
    createFinancialPeriod
  } = useDataContext();

  const [isOpen, setIsOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [showCreateForm, setShowCreateForm] = React.useState(false);
  const [newPeriod, setNewPeriod] = React.useState({
    period_name: '',
    start_date: '',
    end_date: '',
    period_type: 'monthly' as 'monthly' | 'quarterly' | 'annual'
  });

  React.useEffect(() => {
    const fetchPeriods = async () => {
      if (selectedCompany && financialPeriods.length === 0) {
        setIsLoading(true);
        try {
          await loadFinancialPeriods(selectedCompany.id!);
        } catch (error) {
          console.error('Error loading periods:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchPeriods();
  }, [selectedCompany, financialPeriods.length, loadFinancialPeriods]);

  const handlePeriodSelect = (period: FinancialPeriod) => {
    setSelectedPeriod(period);
    setIsOpen(false);
  };

  const handleCreatePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;
  
    try {
      setIsLoading(true);
      await createFinancialPeriod({
        ...newPeriod,
        company_id: selectedCompany.id!,
        is_closed: false
      });
      setNewPeriod({
        period_name: '',
        start_date: '',
        end_date: '',
        period_type: 'monthly'
      });
      setShowCreateForm(false);
    } catch (error: any) {
      console.error('Error creating period:', error);
      
      // Mostrar mensaje específico según el tipo de error
      if (error.message && error.message.includes('Ya existe un período')) {
        alert(error.message);
      } else if (error.code === '23505') {
        alert('Ya existe un período financiero con este nombre para la empresa seleccionada.');
      } else {
        alert('Error al crear el período financiero. Por favor, verifica los datos e intenta nuevamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const formatPeriodDisplay = (period: FinancialPeriod) => {
    const startDate = new Date(period.start_date).toLocaleDateString('es-ES', {
      month: 'short',
      year: 'numeric'
    });
    const endDate = new Date(period.end_date).toLocaleDateString('es-ES', {
      month: 'short',
      year: 'numeric'
    });
    return `${period.period_name} (${startDate} - ${endDate})`;
  };

  if (!selectedCompany) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Calendar className="h-4 w-4 text-gray-400" />
        <span className="text-sm text-gray-500">Selecciona una empresa primero</span>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Calendar className="h-4 w-4 text-gray-400" />
        <span className="text-sm text-gray-500">Cargando períodos...</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[200px]"
      >
        <Calendar className="h-4 w-4 text-gray-600" />
        <span className="flex-1 text-left truncate">
          {selectedPeriod ? formatPeriodDisplay(selectedPeriod) : 'Seleccionar período'}
        </span>
        <ChevronDown className="h-4 w-4 text-gray-400" />
      </button>

      {/* Mostrar PublishedStatusToggle cuando hay un período seleccionado */}
      {selectedPeriod && (
        <div className="mt-2">
          <PublishedStatusToggle 
            period={selectedPeriod} 
            onStatusChange={() => {
              // Opcional: recargar períodos si es necesario
              // loadFinancialPeriods(selectedCompany?.id!);
            }}
          />
        </div>
      )}

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
          {financialPeriods.length > 0 ? (
            <>
              {financialPeriods.map((period) => (
                <button
                  key={period.id}
                  onClick={() => handlePeriodSelect(period)}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between ${
                    selectedPeriod?.id === period.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                  }`}
                >
                  <div className="flex-1">
                    <div className="font-medium">{period.period_name}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(period.start_date).toLocaleDateString('es-ES')} - {new Date(period.end_date).toLocaleDateString('es-ES')}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500 capitalize">{period.period_type}</span>
                    {period.is_closed && (
                      <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                        Cerrado
                      </span>
                    )}
                  </div>
                </button>
              ))}
              <div className="border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowCreateForm(true);
                    setIsOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Crear nuevo período</span>
                </button>
              </div>
            </>
          ) : (
            <div className="p-4 text-center">
              <Calendar className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-3">No hay períodos registrados</p>
              <Button
                onClick={() => {
                  setShowCreateForm(true);
                  setIsOpen(false);
                }}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                Crear primer período
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Formulario de creación */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Crear Nuevo Período</h3>
            <form onSubmit={handleCreatePeriod} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del período
                </label>
                <input
                  type="text"
                  value={newPeriod.period_name}
                  onChange={(e) => setNewPeriod({ ...newPeriod, period_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: Enero 2024"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de período
                </label>
                <select
                  value={newPeriod.period_type}
                  onChange={(e) => setNewPeriod({ ...newPeriod, period_type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="monthly">Mensual</option>
                  <option value="quarterly">Trimestral</option>
                  <option value="annual">Anual</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha inicio
                  </label>
                  <input
                    type="date"
                    value={newPeriod.start_date}
                    onChange={(e) => setNewPeriod({ ...newPeriod, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha fin
                  </label>
                  <input
                    type="date"
                    value={newPeriod.end_date}
                    onChange={(e) => setNewPeriod({ ...newPeriod, end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isLoading ? 'Creando...' : 'Crear Período'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};