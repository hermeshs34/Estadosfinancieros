import { supabase } from './src/lib/supabase.ts';

// Script para verificar la estructura de la tabla financial_entries
async function debugSupabaseTable() {
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
    } else {
      console.log('Número de registros encontrados:', entries?.length || 0);
      if (entries && entries.length > 0) {
        console.log('Estructura del primer registro:');
        console.log(JSON.stringify(entries[0], null, 2));
        
        console.log('\nCampos disponibles:');
        console.log(Object.keys(entries[0]));
      } else {
        console.log('No se encontraron registros en financial_entries');
      }
    }
    
    // 2. Verificar períodos financieros
    console.log('\n2. Consultando períodos financieros...');
    const { data: periods, error: periodsError } = await supabase
      .from('financial_periods')
      .select('*')
      .limit(5);
    
    if (periodsError) {
      console.error('Error consultando financial_periods:', periodsError);
    } else {
      console.log('Períodos encontrados:', periods?.length || 0);
      if (periods && periods.length > 0) {
        console.log('Primer período:');
        console.log(JSON.stringify(periods[0], null, 2));
      }
    }
    
    // 3. Verificar empresas
    console.log('\n3. Consultando empresas...');
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('*')
      .limit(5);
    
    if (companiesError) {
      console.error('Error consultando companies:', companiesError);
    } else {
      console.log('Empresas encontradas:', companies?.length || 0);
      if (companies && companies.length > 0) {
        console.log('Primera empresa:');
        console.log(JSON.stringify(companies[0], null, 2));
      }
    }
    
    // 4. Verificar si hay datos para enero 2025
    console.log('\n4. Buscando datos para enero 2025...');
    const { data: jan2025, error: jan2025Error } = await supabase
      .from('financial_periods')
      .select('*, financial_entries(*)')
      .ilike('period_name', '%enero%')
      .or('period_name.ilike.%january%,period_name.ilike.%2025%');
    
    if (jan2025Error) {
      console.error('Error buscando enero 2025:', jan2025Error);
    } else {
      console.log('Períodos de enero 2025 encontrados:', jan2025?.length || 0);
      if (jan2025 && jan2025.length > 0) {
        jan2025.forEach((period, index) => {
          console.log(`Período ${index + 1}:`, {
            id: period.id,
            name: period.period_name,
            start_date: period.start_date,
            end_date: period.end_date,
            entries_count: period.financial_entries?.length || 0
          });
        });
      }
    }
    
  } catch (error) {
    console.error('Error general:', error);
  }
}

// Ejecutar el debug
debugSupabaseTable();