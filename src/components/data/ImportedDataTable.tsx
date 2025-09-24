import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { useDataContext } from '../../contexts/DataContext';
import { formatCurrency } from '../../lib/numberFormatting';
import { Search, FileText, Filter } from 'lucide-react';

interface ImportedDataTableProps {
  className?: string;
}

export const ImportedDataTable: React.FC<ImportedDataTableProps> = ({ className = '' }) => {
  const { importedData } = useDataContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<string>('Codigo');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Filtrar y ordenar datos
  const filteredAndSortedData = useMemo(() => {
    let filtered = importedData.filter(item => {
      const searchLower = searchTerm.toLowerCase();
      const codigo = (item.Codigo || '').toString().toLowerCase();
      const descripcion = (item.Descripcion || '').toString().toLowerCase();
      const cuenta = (item.Cuenta || '').toString().toLowerCase();
      
      return codigo.includes(searchLower) || 
             descripcion.includes(searchLower) || 
             cuenta.includes(searchLower);
    });

    // Ordenar datos
    filtered.sort((a, b) => {
      let aValue = a[sortField] || '';
      let bValue = b[sortField] || '';
      
      // Convertir a string para comparación
      aValue = aValue.toString();
      bValue = bValue.toString();
      
      if (sortDirection === 'asc') {
        return aValue.localeCompare(bValue, 'es', { numeric: true });
      } else {
        return bValue.localeCompare(aValue, 'es', { numeric: true });
      }
    });

    return filtered;
  }, [importedData, searchTerm, sortField, sortDirection]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) return '↕️';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  if (importedData.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Datos Importados
          </CardTitle>
        </CardHeader>
        <div className="p-6">
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No hay datos importados
            </h3>
            <p className="text-gray-600">
              Importe un archivo CSV, Excel o PDF para ver los datos aquí.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Datos Importados ({filteredAndSortedData.length} registros)
        </CardTitle>
      </CardHeader>
      <div className="p-6">
        {/* Barra de búsqueda */}
        <div className="mb-4 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar por código, descripción o cuenta..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Filter className="w-4 h-4" />
            <span>{filteredAndSortedData.length} de {importedData.length}</span>
          </div>
        </div>

        {/* Tabla de datos */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('Codigo')}
                >
                  <div className="flex items-center gap-1">
                    Código {getSortIcon('Codigo')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('Cuenta')}
                >
                  <div className="flex items-center gap-1">
                    Cuenta Completa {getSortIcon('Cuenta')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('SaldoActual')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Saldo Actual {getSortIcon('SaldoActual')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('Debitos')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Débitos {getSortIcon('Debitos')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('Creditos')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Créditos {getSortIcon('Creditos')}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAndSortedData.map((item, index) => {
                const codigo = item.Codigo || '';
                const descripcion = item.Descripcion || '';
                const cuenta = item.Cuenta || `${codigo} - ${descripcion}`;
                const saldoActual = parseFloat(item.SaldoActual || item.Valor || 0);
                const debitos = parseFloat(item.Debitos || 0);
                const creditos = parseFloat(item.Creditos || 0);

                return (
                  <tr key={`${codigo}-${index}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {codigo}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="max-w-xs">
                        <div className="font-medium text-gray-900">{cuenta}</div>
                        {descripcion && descripcion !== cuenta && (
                          <div className="text-xs text-gray-500 mt-1">{descripcion}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      <span className={`font-medium ${
                        saldoActual >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(saldoActual)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {debitos !== 0 ? formatCurrency(debitos) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {creditos !== 0 ? formatCurrency(creditos) : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredAndSortedData.length === 0 && searchTerm && (
          <div className="text-center py-8">
            <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No se encontraron resultados
            </h3>
            <p className="text-gray-600">
              No hay registros que coincidan con "{searchTerm}"
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default ImportedDataTable;