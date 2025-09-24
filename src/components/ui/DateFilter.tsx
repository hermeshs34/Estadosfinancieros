import React from 'react';
import { Calendar, Filter } from 'lucide-react';

interface DateFilterProps {
  selectedMonth: number | null;
  selectedYear: number | null;
  availableMonths: number[];
  availableYears: number[];
  onMonthChange: (month: number | null) => void;
  onYearChange: (year: number | null) => void;
  className?: string;
}

const MONTHS = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' }
];

export const DateFilter: React.FC<DateFilterProps> = ({
  selectedMonth,
  selectedYear,
  availableMonths,
  availableYears,
  onMonthChange,
  onYearChange,
  className = ''
}) => {
  return (
    <div className={`flex items-center space-x-4 p-4 bg-gray-50 rounded-lg border ${className}`}>
      <div className="flex items-center space-x-2">
        <Filter className="w-4 h-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700">Filtros:</span>
      </div>
      
      {/* Filtro por Año */}
      <div className="flex items-center space-x-2">
        <Calendar className="w-4 h-4 text-gray-500" />
        <label className="text-sm text-gray-600">Año:</label>
        <select
          value={selectedYear || ''}
          onChange={(e) => onYearChange(e.target.value ? parseInt(e.target.value) : null)}
          className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Todos los años</option>
          {availableYears.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>

      {/* Filtro por Mes */}
      <div className="flex items-center space-x-2">
        <label className="text-sm text-gray-600">Mes:</label>
        <select
          value={selectedMonth || ''}
          onChange={(e) => onMonthChange(e.target.value ? parseInt(e.target.value) : null)}
          className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={!selectedYear}
        >
          <option value="">Todos los meses</option>
          {MONTHS
            .filter(month => availableMonths.includes(month.value))
            .map(month => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))
          }
        </select>
      </div>

      {/* Indicador de filtros activos */}
      {(selectedMonth || selectedYear) && (
        <div className="flex items-center space-x-2 text-sm text-blue-600">
          <span>Filtros activos:</span>
          {selectedYear && (
            <span className="px-2 py-1 bg-blue-100 rounded-full text-xs">
              {selectedYear}
            </span>
          )}
          {selectedMonth && (
            <span className="px-2 py-1 bg-blue-100 rounded-full text-xs">
              {MONTHS.find(m => m.value === selectedMonth)?.label}
            </span>
          )}
          <button
            onClick={() => {
              onMonthChange(null);
              onYearChange(null);
            }}
            className="text-xs text-red-500 hover:text-red-700 underline"
          >
            Limpiar filtros
          </button>
        </div>
      )}
    </div>
  );
};