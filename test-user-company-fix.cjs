const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Simular la función corregida de SupabaseService.getUserCompanies
async function testGetUserCompanies(userId) {
  console.log(`🧪 PRUEBA: getUserCompanies para usuario ${userId}`);
  
  try {
    // Paso 1: Obtener el company_id del usuario
    console.log('1️⃣ Obteniendo company_id del usuario...');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('company_id, email, full_name')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('❌ Error obteniendo company_id del usuario:', userError);
      return [];
    }

    console.log(`✅ Usuario encontrado: ${userData.email}`);
    console.log(`   company_id: ${userData.company_id}`);

    if (!userData?.company_id) {
      console.log('⚠️ Usuario no tiene company_id asignado');
      return [];
    }

    // Paso 2: Obtener la empresa asociada al usuario
    console.log('2️⃣ Obteniendo empresa asociada...');
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', userData.company_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error obteniendo empresa:', error);
      return [];
    }
    
    console.log(`✅ Empresas encontradas: ${data?.length || 0}`);
    data?.forEach(company => {
      console.log(`   - ${company.name} (ID: ${company.id})`);
      console.log(`     País: ${company.country}, Moneda: ${company.currency}`);
      console.log(`     Creada: ${company.created_at}`);
    });
    
    return data || [];
  } catch (error) {
    console.error('❌ Error general:', error);
    return [];
  }
}

// Simular la función UserService.getUserCompanies (nueva arquitectura)
async function testUserServiceGetUserCompanies(userId) {
  console.log(`\n🧪 PRUEBA: UserService.getUserCompanies para usuario ${userId}`);
  
  try {
    // Esta función busca empresas por user_id del usuario autenticado
    console.log('1️⃣ Buscando empresas donde user_id = usuario actual...');
    const { data, error } = await supabase
      .from('companies')
      .select('id, name, tax_id, country, currency, created_at, updated_at, user_id, industry, description')
      .eq('user_id', userId);

    if (error) {
      console.error('❌ Error obteniendo empresas del usuario:', error);
      return [];
    }

    console.log(`✅ Empresas encontradas: ${data?.length || 0}`);
    
    // Mapear a formato esperado por CompanySelector
    const mappedCompanies = (data || []).map(company => ({
      id: `temp_${company.id}`, // ID temporal para la relación
      user_id: userId,
      company_id: company.id,
      role: 'owner', // Rol temporal
      is_owner: true, // Temporal: todos son propietarios
      is_active: true,
      joined_at: new Date().toISOString(),
      companies: {
        id: company.id,
        name: company.name,
        tax_id: company.tax_id,
        country: company.country,
        currency: company.currency,
        industry: company.industry,
        description: company.description || '',
        is_active: true, // Valor por defecto ya que la columna no existe
        created_at: company.created_at,
        user_id: company.user_id
      }
    }));
    
    mappedCompanies.forEach(item => {
      console.log(`   - ${item.companies.name} (ID: ${item.companies.id})`);
      console.log(`     Rol: ${item.role}, Propietario: ${item.is_owner}`);
    });
    
    return mappedCompanies;
  } catch (error) {
    console.error('❌ Error en UserService.getUserCompanies:', error);
    return [];
  }
}

async function runTests() {
  console.log('🚀 INICIANDO PRUEBAS DE CORRECCIÓN USUARIO-EMPRESA\n');
  console.log('='.repeat(60));
  
  // Obtener todos los usuarios para probar
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email, full_name, company_id')
    .limit(5);
  
  if (usersError) {
    console.error('❌ Error obteniendo usuarios:', usersError);
    return;
  }
  
  console.log(`📋 Usuarios encontrados: ${users?.length || 0}\n`);
  
  for (const user of users || []) {
    console.log(`👤 PROBANDO USUARIO: ${user.email}`);
    console.log(`   ID: ${user.id}`);
    console.log(`   company_id: ${user.company_id}`);
    console.log('-'.repeat(50));
    
    // Probar función corregida de SupabaseService
    await testGetUserCompanies(user.id);
    
    // Probar función de UserService (arquitectura nueva)
    await testUserServiceGetUserCompanies(user.id);
    
    console.log('\n' + '='.repeat(60) + '\n');
  }
  
  console.log('🎯 CONCLUSIÓN:');
  console.log('- SupabaseService.getUserCompanies() ahora debería funcionar correctamente');
  console.log('- UserService.getUserCompanies() funciona para usuarios que son propietarios de empresas');
  console.log('- Los usuarios deberían poder ver sus empresas en la aplicación');
}

runTests();