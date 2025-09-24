const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function debugMultiCompanyIssue() {
  console.log('🔍 Investigando el problema de multicompañía...');
  
  try {
    // 1. Obtener el usuario actual
    console.log('\n1. Obteniendo información del usuario...');
    const { data: userData, error: userError } = await supabase
      .from('companies')
      .select('user_id')
      .limit(1)
      .single();
    
    if (userError || !userData) {
      console.error('❌ Error obteniendo usuario:', userError);
      return;
    }
    
    const userId = userData.user_id;
    console.log(`✅ Usuario ID: ${userId}`);
    
    // 2. Verificar todas las empresas en la tabla companies
    console.log('\n2. Empresas en la tabla companies:');
    const { data: allCompanies, error: companiesError } = await supabase
      .from('companies')
      .select('*')
      .eq('user_id', userId);
    
    if (companiesError) {
      console.error('❌ Error obteniendo empresas:', companiesError);
    } else {
      console.log(`📊 Total empresas: ${allCompanies?.length || 0}`);
      allCompanies?.forEach((company, index) => {
        console.log(`   ${index + 1}. ${company.name} (ID: ${company.id})`);
        console.log(`      - Creada: ${company.created_at}`);
        console.log(`      - Usuario: ${company.user_id}`);
      });
    }
    
    // 3. Verificar relaciones en user_companies
    console.log('\n3. Relaciones en user_companies:');
    const { data: userCompanies, error: userCompaniesError } = await supabase
      .from('user_companies')
      .select('*')
      .eq('user_id', userId);
    
    if (userCompaniesError) {
      console.error('❌ Error obteniendo relaciones:', userCompaniesError);
    } else {
      console.log(`🔗 Total relaciones: ${userCompanies?.length || 0}`);
      userCompanies?.forEach((relation, index) => {
        console.log(`   ${index + 1}. Empresa ID: ${relation.company_id}`);
        console.log(`      - Rol: ${relation.role}`);
        console.log(`      - Activo: ${relation.is_active}`);
        console.log(`      - Creado: ${relation.created_at}`);
      });
    }
    
    // 4. Identificar empresas sin relación
    console.log('\n4. Análisis de inconsistencias:');
    if (allCompanies && userCompanies) {
      const companyIds = allCompanies.map(c => c.id);
      const linkedCompanyIds = userCompanies.map(uc => uc.company_id);
      
      const unlinkedCompanies = allCompanies.filter(company => 
        !linkedCompanyIds.includes(company.id)
      );
      
      if (unlinkedCompanies.length > 0) {
        console.log('⚠️ Empresas SIN relación en user_companies:');
        unlinkedCompanies.forEach((company, index) => {
          console.log(`   ${index + 1}. ${company.name} (${company.id})`);
        });
      } else {
        console.log('✅ Todas las empresas tienen relación en user_companies');
      }
    }
    
    // 5. Verificar triggers o procedimientos automáticos
    console.log('\n5. Verificando si existen triggers automáticos...');
    const { data: triggers, error: triggersError } = await supabase
      .rpc('get_table_triggers', { table_name: 'companies' })
      .single();
    
    if (triggersError) {
      console.log('ℹ️ No se pudieron obtener triggers (función no existe)');
    } else {
      console.log('🔧 Triggers encontrados:', triggers);
    }
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

debugMultiCompanyIssue();