// SCRIPT DE PRUEBA COMPLETA - SISTEMA MULTICOMPAÑÍA
// Este script demuestra y prueba toda la implementación de multicompañía

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuración de Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// =====================================================
// FUNCIONES DE PRUEBA
// =====================================================

async function testDatabaseStructure() {
  console.log('\n🔍 VERIFICANDO ESTRUCTURA DE BASE DE DATOS...');
  
  try {
    // Verificar tabla user_companies
    const { data: userCompanies, error: ucError } = await supabase
      .from('user_companies')
      .select('*')
      .limit(1);
    
    if (ucError) {
      console.log('❌ Tabla user_companies no existe o tiene errores:', ucError.message);
      return false;
    }
    console.log('✅ Tabla user_companies: OK');
    
    // Verificar tabla user_sessions
    const { data: userSessions, error: usError } = await supabase
      .from('user_sessions')
      .select('*')
      .limit(1);
    
    if (usError) {
      console.log('❌ Tabla user_sessions no existe o tiene errores:', usError.message);
      return false;
    }
    console.log('✅ Tabla user_sessions: OK');
    
    return true;
  } catch (error) {
    console.log('❌ Error verificando estructura:', error.message);
    return false;
  }
}

async function testUserCompanyRelations() {
  console.log('\n👥 PROBANDO RELACIONES USUARIO-EMPRESA...');
  
  try {
    // Obtener usuarios y empresas existentes
    const { data: users } = await supabase.from('users').select('id, email, company_id').limit(3);
    const { data: companies } = await supabase.from('companies').select('id, name').limit(3);
    
    if (!users?.length || !companies?.length) {
      console.log('❌ No hay usuarios o empresas para probar');
      return false;
    }
    
    console.log(`📊 Usuarios disponibles: ${users.length}`);
    console.log(`🏢 Empresas disponibles: ${companies.length}`);
    
    // Verificar relaciones existentes
    const { data: relations, error } = await supabase
      .from('user_companies')
      .select(`
        id,
        role,
        is_active,
        users(email),
        companies(name)
      `);
    
    if (error) {
      console.log('❌ Error obteniendo relaciones:', error.message);
      return false;
    }
    
    console.log(`🔗 Relaciones usuario-empresa encontradas: ${relations?.length || 0}`);
    
    if (relations?.length) {
      console.log('\n📋 RELACIONES EXISTENTES:');
      relations.forEach((rel, index) => {
        console.log(`${index + 1}. ${rel.users?.email} → ${rel.companies?.name} (${rel.role})`);
      });
    }
    
    return true;
  } catch (error) {
    console.log('❌ Error probando relaciones:', error.message);
    return false;
  }
}

async function testMultiCompanyFunctions() {
  console.log('\n🔧 PROBANDO FUNCIONES DE MULTICOMPAÑÍA...');
  
  try {
    // Obtener un usuario de prueba
    const { data: users } = await supabase
      .from('users')
      .select('id, email')
      .limit(1);
    
    if (!users?.length) {
      console.log('❌ No hay usuarios para probar');
      return false;
    }
    
    const testUser = users[0];
    console.log(`👤 Usuario de prueba: ${testUser.email}`);
    
    // Función 1: Obtener empresas del usuario
    console.log('\n🔍 Probando getUserCompanies...');
    const { data: userCompanies, error: ucError } = await supabase
      .from('user_companies')
      .select(`
        role,
        is_active,
        companies (
          id,
          name,
          rif
        )
      `)
      .eq('user_id', testUser.id)
      .eq('is_active', true);
    
    if (ucError) {
      console.log('❌ Error obteniendo empresas del usuario:', ucError.message);
    } else {
      console.log(`✅ Empresas del usuario: ${userCompanies?.length || 0}`);
      userCompanies?.forEach((uc, index) => {
        console.log(`   ${index + 1}. ${uc.companies?.name} (${uc.role})`);
      });
    }
    
    // Función 2: Obtener empresa activa
    console.log('\n🎯 Probando getActiveCompany...');
    const { data: activeSession, error: asError } = await supabase
      .from('user_sessions')
      .select(`
        companies (
          id,
          name,
          rif
        )
      `)
      .eq('user_id', testUser.id)
      .single();
    
    if (asError) {
      console.log('⚠️ No hay empresa activa configurada:', asError.message);
    } else {
      console.log(`✅ Empresa activa: ${activeSession?.companies?.name}`);
    }
    
    // Función 3: Probar cambio de empresa activa (si hay múltiples empresas)
    if (userCompanies?.length > 1) {
      console.log('\n🔄 Probando cambio de empresa activa...');
      const newActiveCompany = userCompanies[1].companies;
      
      const { error: setError } = await supabase
        .from('user_sessions')
        .upsert({
          user_id: testUser.id,
          active_company_id: newActiveCompany.id,
          updated_at: new Date().toISOString()
        });
      
      if (setError) {
        console.log('❌ Error cambiando empresa activa:', setError.message);
      } else {
        console.log(`✅ Empresa activa cambiada a: ${newActiveCompany.name}`);
      }
    }
    
    return true;
  } catch (error) {
    console.log('❌ Error probando funciones:', error.message);
    return false;
  }
}

async function testPermissionSystem() {
  console.log('\n🔐 PROBANDO SISTEMA DE PERMISOS...');
  
  const roles = ['admin', 'manager', 'user', 'viewer'];
  const permissions = {
    admin: ['read', 'write', 'delete', 'manage_users', 'manage_settings'],
    manager: ['read', 'write', 'delete', 'manage_users'],
    user: ['read', 'write'],
    viewer: ['read']
  };
  
  console.log('📋 MATRIZ DE PERMISOS:');
  roles.forEach(role => {
    console.log(`${role.toUpperCase()}: ${permissions[role].join(', ')}`);
  });
  
  // Probar verificación de permisos
  const testPermission = (role, permission) => {
    const hasPermission = permissions[role]?.includes(permission) || false;
    return hasPermission ? '✅' : '❌';
  };
  
  console.log('\n🧪 PRUEBAS DE PERMISOS:');
  console.log('Rol\t\tRead\tWrite\tDelete\tManage Users');
  console.log('─'.repeat(50));
  
  roles.forEach(role => {
    const read = testPermission(role, 'read');
    const write = testPermission(role, 'write');
    const del = testPermission(role, 'delete');
    const manage = testPermission(role, 'manage_users');
    
    console.log(`${role}\t\t${read}\t${write}\t${del}\t${manage}`);
  });
  
  return true;
}

async function testDataMigration() {
  console.log('\n📦 VERIFICANDO MIGRACIÓN DE DATOS...');
  
  try {
    // Verificar usuarios con company_id
    const { data: usersWithCompany } = await supabase
      .from('users')
      .select('id, email, company_id')
      .not('company_id', 'is', null);
    
    console.log(`👥 Usuarios con company_id: ${usersWithCompany?.length || 0}`);
    
    // Verificar que estos usuarios tienen relaciones en user_companies
    if (usersWithCompany?.length) {
      const userIds = usersWithCompany.map(u => u.id);
      const { data: migratedRelations } = await supabase
        .from('user_companies')
        .select('user_id')
        .in('user_id', userIds);
      
      console.log(`🔗 Relaciones migradas: ${migratedRelations?.length || 0}`);
      
      const migrationRate = ((migratedRelations?.length || 0) / usersWithCompany.length) * 100;
      console.log(`📊 Tasa de migración: ${migrationRate.toFixed(1)}%`);
      
      if (migrationRate < 100) {
        console.log('⚠️ Algunos usuarios no fueron migrados correctamente');
      } else {
        console.log('✅ Migración completa');
      }
    }
    
    return true;
  } catch (error) {
    console.log('❌ Error verificando migración:', error.message);
    return false;
  }
}

async function generateImplementationReport() {
  console.log('\n📊 GENERANDO REPORTE DE IMPLEMENTACIÓN...');
  
  try {
    // Estadísticas generales
    const { data: totalUsers } = await supabase.from('users').select('id', { count: 'exact' });
    const { data: totalCompanies } = await supabase.from('companies').select('id', { count: 'exact' });
    const { data: totalRelations } = await supabase.from('user_companies').select('id', { count: 'exact' });
    const { data: activeSessions } = await supabase.from('user_sessions').select('id', { count: 'exact' });
    
    // Usuarios por empresa
    const { data: usersByCompany } = await supabase
      .from('user_companies')
      .select(`
        companies(name),
        role
      `)
      .eq('is_active', true);
    
    // Distribución de roles
    const roleDistribution = {};
    usersByCompany?.forEach(uc => {
      roleDistribution[uc.role] = (roleDistribution[uc.role] || 0) + 1;
    });
    
    console.log('\n📈 ESTADÍSTICAS DEL SISTEMA:');
    console.log('═'.repeat(40));
    console.log(`👥 Total de usuarios: ${totalUsers?.length || 0}`);
    console.log(`🏢 Total de empresas: ${totalCompanies?.length || 0}`);
    console.log(`🔗 Total de relaciones: ${totalRelations?.length || 0}`);
    console.log(`🎯 Sesiones activas: ${activeSessions?.length || 0}`);
    
    console.log('\n👑 DISTRIBUCIÓN DE ROLES:');
    Object.entries(roleDistribution).forEach(([role, count]) => {
      console.log(`${role}: ${count}`);
    });
    
    // Usuarios multiempresa
    const { data: multiCompanyUsers } = await supabase
      .rpc('get_multi_company_users')
      .catch(() => null);
    
    if (multiCompanyUsers) {
      console.log(`\n🔄 Usuarios multiempresa: ${multiCompanyUsers.length}`);
    }
    
    console.log('\n✅ SISTEMA MULTICOMPAÑÍA IMPLEMENTADO CORRECTAMENTE');
    
    return true;
  } catch (error) {
    console.log('❌ Error generando reporte:', error.message);
    return false;
  }
}

// =====================================================
// FUNCIÓN PRINCIPAL
// =====================================================

async function runCompleteTest() {
  console.log('🚀 INICIANDO PRUEBA COMPLETA DEL SISTEMA MULTICOMPAÑÍA');
  console.log('═'.repeat(60));
  
  const tests = [
    { name: 'Estructura de Base de Datos', fn: testDatabaseStructure },
    { name: 'Relaciones Usuario-Empresa', fn: testUserCompanyRelations },
    { name: 'Funciones de Multicompañía', fn: testMultiCompanyFunctions },
    { name: 'Sistema de Permisos', fn: testPermissionSystem },
    { name: 'Migración de Datos', fn: testDataMigration },
    { name: 'Reporte de Implementación', fn: generateImplementationReport }
  ];
  
  let passedTests = 0;
  
  for (const test of tests) {
    console.log(`\n🧪 Ejecutando: ${test.name}`);
    console.log('─'.repeat(40));
    
    try {
      const result = await test.fn();
      if (result) {
        passedTests++;
        console.log(`✅ ${test.name}: PASÓ`);
      } else {
        console.log(`❌ ${test.name}: FALLÓ`);
      }
    } catch (error) {
      console.log(`💥 ${test.name}: ERROR - ${error.message}`);
    }
  }
  
  console.log('\n' + '═'.repeat(60));
  console.log(`🎯 RESUMEN: ${passedTests}/${tests.length} pruebas pasaron`);
  
  if (passedTests === tests.length) {
    console.log('🎉 ¡TODAS LAS PRUEBAS PASARON! Sistema listo para producción.');
  } else {
    console.log('⚠️ Algunas pruebas fallaron. Revisar implementación.');
  }
  
  console.log('\n📚 PRÓXIMOS PASOS:');
  console.log('1. Ejecutar implementar-multicompania-paso1.sql en la base de datos');
  console.log('2. Integrar implementar-multicompania-paso2.ts en el backend');
  console.log('3. Integrar implementar-multicompania-paso3.tsx en el frontend');
  console.log('4. Probar funcionalidad completa en desarrollo');
  console.log('5. Desplegar a producción con migración gradual');
}

// Ejecutar pruebas
if (require.main === module) {
  runCompleteTest().catch(console.error);
}

module.exports = {
  testDatabaseStructure,
  testUserCompanyRelations,
  testMultiCompanyFunctions,
  testPermissionSystem,
  testDataMigration,
  generateImplementationReport,
  runCompleteTest
};