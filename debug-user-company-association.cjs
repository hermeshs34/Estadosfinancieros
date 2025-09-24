const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function debugUserCompanyAssociation() {
  console.log('🔍 Analizando asociación usuario-empresa...');
  
  try {
    // 1. Verificar estructura de tabla users
    console.log('\n1. Verificando estructura de tabla users:');
    const { data: usersStructure, error: structureError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (structureError) {
      console.error('❌ Error al verificar estructura:', structureError);
      return;
    }
    
    if (usersStructure && usersStructure.length > 0) {
      console.log('✅ Campos disponibles en users:', Object.keys(usersStructure[0]));
    }
    
    // 2. Contar usuarios totales
    const { count: totalUsers, error: countError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ Error al contar usuarios:', countError);
      return;
    }
    
    console.log(`\n2. Total de usuarios en la tabla: ${totalUsers}`);
    
    // 3. Verificar usuarios sin company_id
    const { data: usersWithoutCompany, error: noCompanyError } = await supabase
      .from('users')
      .select('id, email, full_name, company_id')
      .is('company_id', null);
    
    if (noCompanyError) {
      console.error('❌ Error al buscar usuarios sin empresa:', noCompanyError);
      return;
    }
    
    console.log(`\n3. Usuarios sin company_id: ${usersWithoutCompany?.length || 0}`);
    if (usersWithoutCompany && usersWithoutCompany.length > 0) {
      console.log('Usuarios sin empresa:');
      usersWithoutCompany.forEach(user => {
        console.log(`  - ${user.email} (${user.full_name}) - ID: ${user.id}`);
      });
    }
    
    // 4. Verificar empresas disponibles
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, name, user_id');
    
    if (companiesError) {
      console.error('❌ Error al obtener empresas:', companiesError);
      return;
    }
    
    console.log(`\n4. Empresas disponibles: ${companies?.length || 0}`);
    if (companies && companies.length > 0) {
      console.log('Lista de empresas:');
      companies.forEach(company => {
        console.log(`  - ${company.name} (ID: ${company.id}) - Propietario: ${company.user_id}`);
      });
    }
    
    // 5. Verificar usuarios con company_id
    const { data: usersWithCompany, error: withCompanyError } = await supabase
      .from('users')
      .select('id, email, full_name, company_id')
      .not('company_id', 'is', null);
    
    if (withCompanyError) {
      console.error('❌ Error al buscar usuarios con empresa:', withCompanyError);
      return;
    }
    
    console.log(`\n5. Usuarios con company_id asignado: ${usersWithCompany?.length || 0}`);
    if (usersWithCompany && usersWithCompany.length > 0) {
      console.log('Usuarios con empresa:');
      usersWithCompany.forEach(user => {
        console.log(`  - ${user.email} (${user.full_name}) - Company ID: ${user.company_id}`);
      });
    }
    
    // 6. Verificar relación usuarios-empresas
    const { data: userCompanyRelation, error: relationError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        full_name,
        company_id,
        companies!inner(
          id,
          name
        )
      `);
    
    if (relationError) {
      console.error('❌ Error al verificar relación usuario-empresa:', relationError);
    } else {
      console.log(`\n6. Usuarios con relación válida empresa: ${userCompanyRelation?.length || 0}`);
      if (userCompanyRelation && userCompanyRelation.length > 0) {
        console.log('Relaciones válidas:');
        userCompanyRelation.forEach(user => {
          console.log(`  - ${user.email} → ${user.companies.name}`);
        });
      }
    }
    
    // 7. Proponer solución
    console.log('\n🔧 PROPUESTA DE SOLUCIÓN:');
    
    if (usersWithoutCompany && usersWithoutCompany.length > 0 && companies && companies.length > 0) {
      console.log('\n✅ Se pueden asignar usuarios sin empresa a empresas existentes.');
      console.log('\nOpciones:');
      console.log('1. Asignar todos los usuarios a la primera empresa disponible');
      console.log('2. Asignar cada usuario a la empresa de la cual es propietario (si existe)');
      console.log('3. Crear una interfaz para asignar manualmente usuarios a empresas');
      
      // Mostrar script de asignación automática
      console.log('\n📝 Script de asignación automática (opción 1):');
      console.log(`
UPDATE users 
SET company_id = '${companies[0].id}'
WHERE company_id IS NULL;`);
      
    } else if (companies && companies.length === 0) {
      console.log('\n⚠️  No hay empresas en el sistema. Primero debe crear al menos una empresa.');
    } else {
      console.log('\n✅ Todos los usuarios ya tienen empresa asignada.');
    }
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Ejecutar el análisis
debugUserCompanyAssociation();