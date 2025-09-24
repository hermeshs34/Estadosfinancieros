const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkCompaniesStructure() {
  try {
    console.log('🔍 Verificando estructura de la tabla companies...');
    
    // Obtener una empresa para ver la estructura
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Error:', error);
      return;
    }
    
    if (data && data.length > 0) {
      console.log('✅ Columnas disponibles en companies:');
      console.log(Object.keys(data[0]));
      console.log('\n📋 Ejemplo de datos:');
      console.log(data[0]);
    } else {
      console.log('⚠️ No hay datos en la tabla companies');
    }
    
  } catch (error) {
    console.error('❌ Error inesperado:', error);
  }
}

checkCompaniesStructure();