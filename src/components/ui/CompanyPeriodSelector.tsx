import React, { useEffect } from 'react';
import { Building2, Calendar, AlertCircle } from 'lucide-react';
import { useDataContext } from '../../contexts/DataContext';
import { useCurrency } from '../../contexts/CurrencyContext';

export const CompanyPeriodSelector: React.FC = () => {
  const {
    companies,
    selectedCompany,
    selectedPeriod,
    financialPeriods,
    setSelectedCompany,
    setSelectedPeriod,
    loadFinancialPeriods
  } = useDataContext();
  
  const { selectedCurrency, setCurrency, setBalanceDate } = useCurrency();

  // Sincronizar la fecha del balance cuando cambie el período seleccionado
  useEffect(() => {
    if (selectedPeriod?.end_date) {
      setBalanceDate(selectedPeriod.end_date);
    }
  }, [selectedPeriod, setBalanceDate]);

  const handleCompanyChange = async (companyId: string) => {
    const company = companies.find(c => c.id === companyId);
    if (company) {
      setSelectedCompany(company);
      await loadFinancialPeriods(company.id);
      setSelectedPeriod(null);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Selector de Empresa */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Building2 className="inline h-4 w-4 mr-1" />
            Empresa
          </label>
          <select
            value={selectedCompany?.id || ''}
            onChange={(e) => handleCompanyChange(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Seleccionar empresa...</option>
            {companies.map(company => (
              <option key={company.id} value={company.id}>
                {company.name} ({company.currency})
              </option>
            ))}
          </select>
        </div>

        {/* Selector de Período */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Calendar className="inline h-4 w-4 mr-1" />
            Período Financiero
          </label>
          <select
            value={selectedPeriod?.id || ''}
            onChange={(e) => {
              const period = financialPeriods.find(p => p.id === e.target.value);
              setSelectedPeriod(period || null);
            }}
            disabled={!selectedCompany}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          >
            <option value="">Seleccionar período...</option>
            {financialPeriods.map(period => (
              <option key={period.id} value={period.id}>
                {period.period_name} ({period.start_date} - {period.end_date})
              </option>
            ))}
          </select>
        </div>

        {/* Selector de Moneda */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            💱 Moneda de Visualización
          </label>
          <select
            value={selectedCurrency}
            onChange={(e) => setCurrency(e.target.value as any)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          >
            <option value="VES">VES (Bolívar)</option>
            <option value="USD">USD (Dólar)</option>
            <option value="EUR">EUR (Euro)</option>
          </select>
        </div>
      </div>
      
      {/* Información de Estado */}
      {selectedCompany && selectedPeriod && (
        <div className="mt-4 p-3 bg-blue-50 rounded-md">
          <div className="flex items-center gap-2 text-sm text-blue-700">
            <AlertCircle className="h-4 w-4" />
            <span>
              Trabajando con: <strong>{selectedCompany.name}</strong> - 
              <strong>{selectedPeriod.period_name}</strong> - 
              Visualización en <strong>{selectedCurrency}</strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};