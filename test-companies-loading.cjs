const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testCompaniesLoading() {
  try {
    console.log('🔍 Verificando carga de empresas...');
    
    // 1. Verificar todas las empresas en la tabla companies
    console.log('\n📋 1. EMPRESAS EN LA TABLA COMPANIES:');
    const { data: allCompanies, error: companiesError } = await supabase
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (companiesError) {
      console.error('❌ Error consultando companies:', companiesError);
    } else {
      console.log(`✅ Total empresas encontradas: ${allCompanies?.length || 0}`);
      allCompanies?.forEach((company, index) => {
        console.log(`   ${index + 1}. ${company.name} (ID: ${company.id})`);
        console.log(`      - Tax ID: ${company.tax_id}`);
        console.log(`      - User ID: ${company.user_id}`);
        console.log(`      - Industry: ${company.industry}`);
        console.log(`      - Country: ${company.country}`);
        console.log('');
      });
    }
    
    // 2. Verificar tabla user_companies
    console.log('\n👥 2. RELACIONES EN USER_COMPANIES:');
    const { data: userCompanies, error: ucError } = await supabase
      .from('user_companies')
      .select(`
        id,
        user_id,
        company_id,
        role,
        is_active,
        joined_at,
        companies (
          id,
          name,
          tax_id,
          industry,
          country,
          currency,
          created_at,
          updated_at,
          user_id
        )
      `)
      .eq('is_active', true)
      .order('joined_at', { ascending: false });
    
    if (ucError) {
      console.error('❌ Error consultando user_companies:', ucError);
    } else {
      console.log(`✅ Total relaciones activas: ${userCompanies?.length || 0}`);
      userCompanies?.forEach((relation, index) => {
        console.log(`   ${index + 1}. Usuario: ${relation.user_id}`);
        console.log(`      - Empresa: ${relation.companies?.name || 'N/A'}`);
        console.log(`      - Rol: ${relation.role}`);
        console.log(`      - Company ID: ${relation.company_id}`);
        console.log('');
      });
    }
    
    // 3. Buscar específicamente la empresa Katheriel
    console.log('\n🔍 3. BUSCANDO EMPRESA KATHERIEL:');
    const { data: katheriel, error: katherielError } = await supabase
      .from('companies')
      .select('*')
      .ilike('name', '%katheriel%');
    
    if (katherielError) {
      console.error('❌ Error buscando Katheriel:', katherielError);
    } else if (katheriel && katheriel.length > 0) {
      console.log('✅ Empresa Katheriel encontrada:');
      katheriel.forEach(company => {
        console.log(`   - Nombre: ${company.name}`);
        console.log(`   - ID: ${company.id}`);
        console.log(`   - Tax ID: ${company.tax_id}`);
        console.log(`   - User ID: ${company.user_id}`);
        
        // Verificar si está en user_companies
        console.log('\n   🔗 Verificando relación en user_companies...');
        supabase
          .from('user_companies')
          .select('*')
          .eq('company_id', company.id)
          .then(({ data: relations, error: relError }) => {
            if (relError) {
              console.error('   ❌ Error verificando relación:', relError);
            } else if (relations && relations.length > 0) {
              console.log(`   ✅ Encontradas ${relations.length} relaciones`);
              relations.forEach(rel => {
                console.log(`      - Usuario: ${rel.user_id}, Rol: ${rel.role}, Activo: ${rel.is_active}`);
              });
            } else {
              console.log('   ⚠️ NO hay relaciones en user_companies para esta empresa');
            }
          });
      });
    } else {
      console.log('⚠️ No se encontró empresa Katheriel');
    }
    
  } catch (error) {
    console.error('❌ Error inesperado:', error);
  }
}

testCompaniesLoading();