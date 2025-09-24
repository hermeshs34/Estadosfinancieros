const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Variables de entorno de Supabase no encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verificarEstadoFinal() {
  console.log('🔍 VERIFICACIÓN FINAL DEL ESTADO DE LA MIGRACIÓN');
  console.log('='.repeat(60));
  
  try {
    // 1. Verificar usuarios
    console.log('\n📊 1. USUARIOS:');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, company_id')
      .not('company_id', 'is', null);
    
    if (usersError) {
      console.error('❌ Error al consultar usuarios:', usersError.message);
      return;
    }
    
    console.log(`✅ Usuarios con empresa: ${users.length}`);
    users.forEach(user => {
      console.log(`   • ${user.email} -> Empresa ID: ${user.company_id}`);
    });
    
    // 2. Verificar empresas
    console.log('\n🏢 2. EMPRESAS:');
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, name');
    
    if (companiesError) {
      console.error('❌ Error al consultar empresas:', companiesError.message);
      return;
    }
    
    console.log(`✅ Empresas encontradas: ${companies.length}`);
    companies.forEach(company => {
      console.log(`   • ${company.name} -> ID: ${company.id}`);
    });
    
    // 3. Verificar relaciones user_companies
    console.log('\n🔗 3. RELACIONES USER_COMPANIES:');
    const { data: userCompanies, error: ucError } = await supabase
      .from('user_companies')
      .select('*');
    
    if (ucError) {
      console.error('❌ Error al consultar user_companies:', ucError.message);
    } else {
      console.log(`📊 Relaciones existentes: ${userCompanies.length}`);
      if (userCompanies.length > 0) {
        userCompanies.forEach(rel => {
          console.log(`   • Usuario: ${rel.user_id} -> Empresa: ${rel.company_id} (${rel.role})`);
        });
      }
    }
    
    // 4. Verificar sesiones user_sessions
    console.log('\n🎯 4. SESIONES USER_SESSIONS:');
    const { data: userSessions, error: usError } = await supabase
      .from('user_sessions')
      .select('*');
    
    if (usError) {
      console.error('❌ Error al consultar user_sessions:', usError.message);
    } else {
      console.log(`📊 Sesiones existentes: ${userSessions.length}`);
      if (userSessions.length > 0) {
        userSessions.forEach(session => {
          console.log(`   • Usuario: ${session.user_id} -> Empresa activa: ${session.active_company_id}`);
        });
      }
    }
    
    // 5. Consulta de verificación final
    console.log('\n🔍 5. CONSULTA DE VERIFICACIÓN FINAL:');
    const { data: finalCheck, error: finalError } = await supabase
      .from('users')
      .select(`
        email,
        companies!users_company_id_fkey(name),
        user_companies(role),
        user_sessions(active_company_id)
      `)
      .not('company_id', 'is', null);
    
    if (finalError) {
      console.error('❌ Error en consulta final:', finalError.message);
    } else {
      console.log('✅ Consulta final exitosa:');
      finalCheck.forEach(user => {
        console.log(`   • ${user.email}:`);
        console.log(`     - Empresa: ${user.companies?.name || 'N/A'}`);
        console.log(`     - Rol: ${user.user_companies?.[0]?.role || 'N/A'}`);
        console.log(`     - Sesión activa: ${user.user_sessions?.[0]?.active_company_id ? 'Sí' : 'No'}`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
    
    // Resumen del estado
    const totalUsers = users.length;
    const totalCompanies = companies.length;
    const totalRelations = userCompanies?.length || 0;
    const totalSessions = userSessions?.length || 0;
    
    console.log('📋 RESUMEN DEL ESTADO:');
    console.log(`   • Usuarios con empresa: ${totalUsers}`);
    console.log(`   • Empresas: ${totalCompanies}`);
    console.log(`   • Relaciones user_companies: ${totalRelations}`);
    console.log(`   • Sesiones user_sessions: ${totalSessions}`);
    
    if (totalRelations === 0 || totalSessions === 0) {
      console.log('\n⚠️  MIGRACIÓN PENDIENTE:');
      console.log('   Los datos aún no se han migrado correctamente.');
      console.log('   Debes ejecutar el SQL manualmente en Supabase SQL Editor.');
    } else {
      console.log('\n✅ MIGRACIÓN COMPLETADA:');
      console.log('   Todos los datos se han migrado correctamente.');
    }
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

// Ejecutar verificación
verificarEstadoFinal();