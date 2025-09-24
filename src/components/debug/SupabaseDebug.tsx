import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface DebugInfo {
  entries: any[];
  periods: any[];
  companies: any[];
  jan2025Periods: any[];
}

const SupabaseDebug: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const debugSupabaseTable = async () => {
      console.log('=== DEBUG: Estructura y datos de financial_entries ===');
      
      try {
        // 1. Obtener algunos registros para ver la estructura
        console.log('\n1. Consultando registros existentes...');
        const { data: entries, error: entriesError } = await supabase
          .from('financial_entries')
          .select('*')
          .limit(5);
        
        if (entriesError) {
          console.error('Error consultando financial_entries:', entriesError);
          throw entriesError;
        }
        
        console.log('Número de registros encontrados:', entries?.length || 0);
        if (entries && entries.length > 0) {
          console.log('Estructura del primer registro:');
          console.log(JSON.stringify(entries[0], null, 2));
          
          console.log('\nCampos disponibles:');
          console.log(Object.keys(entries[0]));
        } else {
          console.log('No se encontraron registros en financial_entries');
        }
        
        // 2. Verificar períodos financieros
        console.log('\n2. Consultando períodos financieros...');
        const { data: periods, error: periodsError } = await supabase
          .from('financial_periods')
          .select('*')
          .limit(10);
        
        if (periodsError) {
          console.error('Error consultando financial_periods:', periodsError);
          throw periodsError;
        }
        
        console.log('Períodos encontrados:', periods?.length || 0);
        if (periods && periods.length > 0) {
          console.log('Períodos disponibles:');
          periods.forEach((period, index) => {
            console.log(`${index + 1}. ${period.period_name} (${period.start_date} - ${period.end_date})`);
          });
        }
        
        // 3. Verificar empresas
        console.log('\n3. Consultando empresas...');
        const { data: companies, error: companiesError } = await supabase
          .from('companies')
          .select('*')
          .limit(5);
        
        if (companiesError) {
          console.error('Error consultando companies:', companiesError);
          throw companiesError;
        }
        
        console.log('Empresas encontradas:', companies?.length || 0);
        if (companies && companies.length > 0) {
          console.log('Empresas disponibles:');
          companies.forEach((company, index) => {
            console.log(`${index + 1}. ${company.name} (ID: ${company.id})`);
          });
        }
        
        // 4. Verificar si hay datos para enero 2025
        console.log('\n4. Buscando datos para enero 2025...');
        const { data: jan2025, error: jan2025Error } = await supabase
          .from('financial_periods')
          .select('*')
          .or('period_name.ilike.%enero%,period_name.ilike.%january%,period_name.ilike.%2025%');
        
        if (jan2025Error) {
          console.error('Error buscando enero 2025:', jan2025Error);
          throw jan2025Error;
        }
        
        console.log('Períodos relacionados con enero/2025 encontrados:', jan2025?.length || 0);
        if (jan2025 && jan2025.length > 0) {
          jan2025.forEach((period, index) => {
            console.log(`Período ${index + 1}:`, {
              id: period.id,
              name: period.period_name,
              start_date: period.start_date,
              end_date: period.end_date,
              company_id: period.company_id
            });
          });
        }
        
        // 5. Verificar datos financieros para cada período encontrado
        if (jan2025 && jan2025.length > 0) {
          console.log('\n5. Verificando datos financieros para períodos de enero 2025...');
          for (const period of jan2025) {
            const { data: periodEntries, error: periodEntriesError } = await supabase
              .from('financial_entries')
              .select('*')
              .eq('period_id', period.id)
              .limit(3);
            
            if (periodEntriesError) {
              console.error(`Error consultando datos para período ${period.period_name}:`, periodEntriesError);
            } else {
              console.log(`Período "${period.period_name}" tiene ${periodEntries?.length || 0} registros financieros`);
              if (periodEntries && periodEntries.length > 0) {
                console.log('Muestra de datos:', periodEntries[0]);
              }
            }
          }
        }
        
        setDebugInfo({
          entries: entries || [],
          periods: periods || [],
          companies: companies || [],
          jan2025Periods: jan2025 || []
        });
        
      } catch (error: any) {
        console.error('Error general:', error);
        setError(error.message || 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    debugSupabaseTable();
  }, []);

  if (loading) {
    return (
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">🔍 Debug de Supabase</h3>
        <p className="text-blue-600">Cargando información de la base de datos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="text-lg font-semibold text-red-800 mb-2">❌ Error en Debug</h3>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">🔍 Debug de Supabase</h3>
      
      <div className="space-y-4">
        <div>
          <h4 className="font-medium text-gray-700">📊 Registros Financieros</h4>
          <p className="text-sm text-gray-600">
            Total encontrados: {debugInfo?.entries.length || 0}
          </p>
          {debugInfo?.entries.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                Ver estructura del primer registro
              </summary>
              <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                {JSON.stringify(debugInfo.entries[0], null, 2)}
              </pre>
            </details>
          )}
        </div>
        
        <div>
          <h4 className="font-medium text-gray-700">📅 Períodos Financieros</h4>
          <p className="text-sm text-gray-600">
            Total encontrados: {debugInfo?.periods.length || 0}
          </p>
          {debugInfo?.periods.length > 0 && (
            <div className="mt-2 space-y-1">
              {debugInfo.periods.map((period, index) => (
                <div key={period.id} className="text-xs bg-gray-100 p-2 rounded">
                  <strong>{period.period_name}</strong> ({period.start_date} - {period.end_date})
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div>
          <h4 className="font-medium text-gray-700">🏢 Empresas</h4>
          <p className="text-sm text-gray-600">
            Total encontradas: {debugInfo?.companies.length || 0}
          </p>
          {debugInfo?.companies.length > 0 && (
            <div className="mt-2 space-y-1">
              {debugInfo.companies.map((company, index) => (
                <div key={company.id} className="text-xs bg-gray-100 p-2 rounded">
                  <strong>{company.name}</strong> (ID: {company.id})
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div>
          <h4 className="font-medium text-gray-700">🗓️ Períodos Enero 2025</h4>
          <p className="text-sm text-gray-600">
            Encontrados: {debugInfo?.jan2025Periods.length || 0}
          </p>
          {debugInfo?.jan2025Periods.length > 0 && (
            <div className="mt-2 space-y-1">
              {debugInfo.jan2025Periods.map((period, index) => (
                <div key={period.id} className="text-xs bg-yellow-100 p-2 rounded">
                  <strong>{period.period_name}</strong><br/>
                  Fechas: {period.start_date} - {period.end_date}<br/>
                  Empresa: {period.company_id}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-4 p-3 bg-blue-50 rounded">
        <p className="text-sm text-blue-700">
          💡 <strong>Tip:</strong> Revisa la consola del navegador (F12) para ver información detallada.
        </p>
      </div>
    </div>
  );
};

export default SupabaseDebug;