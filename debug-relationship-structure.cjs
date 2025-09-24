const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function debugRelationshipStructure() {
  console.log('🔍 DIAGNÓSTICO: Estructura de relaciones Usuario-Empresa\n');
  
  try {
    // 1. Verificar estructura de tabla users
    console.log('1️⃣ ESTRUCTURA DE TABLA USERS:');
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, email, full_name, company_id')
      .limit(5);
    
    if (usersError) {
      console.error('❌ Error consultando users:', usersError);
    } else {
      console.log('✅ Usuarios encontrados:', usersData?.length || 0);
      usersData?.forEach(user => {
        console.log(`   - ${user.email} (ID: ${user.id}) -> company_id: ${user.company_id}`);
      });
    }
    
    console.log('\n2️⃣ ESTRUCTURA DE TABLA COMPANIES:');
    const { data: companiesData, error: companiesError } = await supabase
      .from('companies')
      .select('id, name, user_id')
      .limit(5);
    
    if (companiesError) {
      console.error('❌ Error consultando companies:', companiesError);
    } else {
      console.log('✅ Empresas encontradas:', companiesData?.length || 0);
      companiesData?.forEach(company => {
        console.log(`   - ${company.name} (ID: ${company.id}) -> user_id: ${company.user_id}`);
      });
    }
    
    console.log('\n3️⃣ VERIFICAR RELACIÓN ACTUAL:');
    // Intentar hacer JOIN de users con companies usando company_id
    const { data: joinData, error: joinError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        full_name,
        company_id,
        companies!inner(
          id,
          name,
          user_id
        )
      `)
      .limit(5);
    
    if (joinError) {
      console.error('❌ Error en JOIN users->companies:', joinError);
      console.log('   Esto indica que la relación users.company_id -> companies.id no está funcionando');
    } else {
      console.log('✅ JOIN exitoso users->companies:', joinData?.length || 0);
      joinData?.forEach(item => {
        console.log(`   - Usuario: ${item.email} -> Empresa: ${item.companies.name}`);
      });
    }
    
    console.log('\n4️⃣ VERIFICAR RELACIÓN INVERSA:');
    // Intentar hacer JOIN de companies con users usando user_id
    const { data: inverseJoinData, error: inverseJoinError } = await supabase
      .from('companies')
      .select(`
        id,
        name,
        user_id,
        users!inner(
          id,
          email,
          full_name
        )
      `)
      .limit(5);
    
    if (inverseJoinError) {
      console.error('❌ Error en JOIN companies->users:', inverseJoinError);
      console.log('   Esto indica que la relación companies.user_id -> users.id no está funcionando');
    } else {
      console.log('✅ JOIN exitoso companies->users:', inverseJoinData?.length || 0);
      inverseJoinData?.forEach(item => {
        console.log(`   - Empresa: ${item.name} -> Propietario: ${item.users.email}`);
      });
    }
    
    console.log('\n5️⃣ VERIFICAR TABLA USER_COMPANIES (si existe):');
    const { data: userCompaniesData, error: userCompaniesError } = await supabase
      .from('user_companies')
      .select('*')
      .limit(5);
    
    if (userCompaniesError) {
      console.log('ℹ️ Tabla user_companies no existe o no es accesible:', userCompaniesError.message);
    } else {
      console.log('✅ Tabla user_companies encontrada:', userCompaniesData?.length || 0, 'registros');
      userCompaniesData?.forEach(item => {
        console.log(`   - user_id: ${item.user_id} -> company_id: ${item.company_id} (role: ${item.role})`);
      });
    }
    
    console.log('\n📋 RESUMEN DEL DIAGNÓSTICO:');
    console.log('='.repeat(50));
    
    if (usersData && usersData.length > 0 && usersData[0].company_id) {
      console.log('✅ Los usuarios TIENEN campo company_id');
    } else {
      console.log('❌ Los usuarios NO TIENEN campo company_id o está vacío');
    }
    
    if (companiesData && companiesData.length > 0 && companiesData[0].user_id) {
      console.log('✅ Las empresas TIENEN campo user_id');
    } else {
      console.log('❌ Las empresas NO TIENEN campo user_id o está vacío');
    }
    
    if (!joinError) {
      console.log('✅ Relación users.company_id -> companies.id FUNCIONA');
    } else {
      console.log('❌ Relación users.company_id -> companies.id NO FUNCIONA');
    }
    
    if (!inverseJoinError) {
      console.log('✅ Relación companies.user_id -> users.id FUNCIONA');
    } else {
      console.log('❌ Relación companies.user_id -> users.id NO FUNCIONA');
    }
    
    if (!userCompaniesError) {
      console.log('✅ Tabla user_companies EXISTE (arquitectura multicompañía)');
    } else {
      console.log('ℹ️ Tabla user_companies NO EXISTE (arquitectura simple)');
    }
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

debugRelationshipStructure();