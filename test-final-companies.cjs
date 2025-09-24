const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testCompaniesLoading() {
  console.log('🧪 Probando carga de empresas después de las correcciones...');
  
  try {
    // Primero obtener el UUID del usuario
    console.log('\n0. Obteniendo UUID del usuario...');
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
    
    // Simular getUserCompanies con el usuario real
    console.log('\n1. Probando getUserCompanies...');
    
    const { data: userCompaniesData, error: userCompaniesError } = await supabase
      .from('user_companies')
      .select(`
        id,
        role,
        is_active,
        created_at,
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
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (userCompaniesError) {
      console.error('❌ Error en getUserCompanies:', userCompaniesError);
    } else {
      console.log(`✅ Encontradas ${userCompaniesData?.length || 0} empresas del usuario`);
      userCompaniesData?.forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.companies.name} (${item.companies.id})`);
      });
    }
    
    // Simular getLegacyCompanies
    console.log('\n2. Probando getLegacyCompanies...');
    
    const { data: legacyData, error: legacyError } = await supabase
      .from('companies')
      .select('*')
      .eq('user_id', userId);
    
    if (legacyError) {
      console.error('❌ Error en getLegacyCompanies:', legacyError);
    } else {
      console.log(`✅ Encontradas ${legacyData?.length || 0} empresas legacy`);
      legacyData?.forEach((company, index) => {
        console.log(`   ${index + 1}. ${company.name} (${company.id})`);
      });
    }
    
    // Verificar empresa activa
    console.log('\n3. Verificando empresa activa...');
    
    const { data: sessionData, error: sessionError } = await supabase
      .from('user_sessions')
      .select(`
        active_company_id,
        updated_at,
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
      .eq('user_id', userId)
      .single();
    
    if (sessionError) {
      console.log('ℹ️ No hay empresa activa configurada:', sessionError.message);
    } else {
      console.log(`✅ Empresa activa: ${sessionData.companies?.name}`);
    }
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

testCompaniesLoading();