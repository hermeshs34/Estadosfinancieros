import React from 'react';
import { DollarSign, ChevronDown } from 'lucide-react';
import { useCurrency } from '../../hooks/useCurrency';
import { CURRENCY_INFO } from '../../types/financials';

interface CurrencySelectorProps {
  className?: string;
  disabled?: boolean;
}

const CURRENCIES = Object.values(CURRENCY_INFO);

export const CurrencySelector: React.FC<CurrencySelectorProps> = ({
  className = '',
  disabled = false
}) => {
  const { selectedCurrency, setCurrency } = useCurrency();
  const [isOpen, setIsOpen] = React.useState(false);

  const selectedCurrencyData = CURRENCIES.find(c => c.code === selectedCurrency) || CURRENCIES[0];

  const handleCurrencySelect = (currency: string) => {
    setCurrency(currency as any);
    setIsOpen(false);
  };

  const groupedCurrencies = CURRENCIES.reduce((acc, currency) => {
    if (!acc[currency.region]) {
      acc[currency.region] = [];
    }
    acc[currency.region].push(currency);
    return acc;
  }, {} as Record<string, typeof CURRENCIES>);

  if (disabled) {
    return (
      <div className={`flex items-center space-x-2 opacity-50 ${className}`}>
        <DollarSign className="h-4 w-4 text-gray-400" />
        <span className="text-sm text-gray-500">{selectedCurrencyData.name}</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-3 text-sm border border-gray-200 rounded-lg hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm transition-all duration-200 min-w-[180px]"
      >
        <span className="text-lg">{selectedCurrencyData.flag}</span>
        <div className="flex flex-col items-start">
          <span className="text-gray-800 font-medium">{selectedCurrencyData.symbol}</span>
          <span className="text-xs text-gray-500">{selectedCurrencyData.code}</span>
        </div>
        <ChevronDown className="h-4 w-4 text-gray-400 ml-auto" />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-xl z-20 max-h-96 overflow-y-auto">
            <div className="p-2">
              <div className="text-xs font-semibold text-gray-500 px-3 py-2 border-b border-gray-100 mb-2">
                Seleccionar Moneda
              </div>
              {Object.entries(groupedCurrencies).map(([region, currencies]) => (
                <div key={region} className="mb-3">
                  <div className="text-xs font-medium text-gray-400 px-3 py-1 uppercase tracking-wide">
                    {region}
                  </div>
                  {currencies.map((currency) => (
                    <button
                      key={currency.code}
                      onClick={() => handleCurrencySelect(currency.code)}
                      className={`w-full text-left px-3 py-3 text-sm hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 rounded-lg flex items-center space-x-3 transition-all duration-200 ${
                        selectedCurrency === currency.code
                          ? 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 shadow-sm'
                          : 'text-gray-700'
                      }`}
                    >
                      <span className="text-lg">{currency.flag}</span>
                      <div className="flex-1">
                        <div className="font-medium">{currency.name}</div>
                        <div className="text-xs text-gray-500">{currency.code}</div>
                      </div>
                      <span className="text-gray-600 font-mono text-sm">{currency.symbol}</span>
                      {selectedCurrency === currency.code && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};