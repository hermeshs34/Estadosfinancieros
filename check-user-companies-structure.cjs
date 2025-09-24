const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkUserCompaniesStructure() {
  try {
    console.log('🔍 Verificando estructura de la tabla user_companies...');
    
    // Obtener una relación para ver la estructura
    const { data, error } = await supabase
      .from('user_companies')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Error:', error);
      return;
    }
    
    if (data && data.length > 0) {
      console.log('✅ Columnas disponibles en user_companies:');
      console.log(Object.keys(data[0]));
      console.log('\n📋 Ejemplo de datos:');
      console.log(data[0]);
    } else {
      console.log('⚠️ No hay datos en la tabla user_companies');
    }
    
  } catch (error) {
    console.error('❌ Error inesperado:', error);
  }
}

checkUserCompaniesStructure();