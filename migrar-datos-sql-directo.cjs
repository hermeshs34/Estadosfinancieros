const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function migrarDatosConSQL() {
  console.log('🔄 MIGRANDO DATOS CON SQL DIRECTO');
  console.log('='.repeat(50));

  try {
    // 1. Verificar usuarios existentes
    console.log('\n📊 1. VERIFICANDO USUARIOS:');
    const { data: usuarios, error: errorUsuarios } = await supabase
      .from('users')
      .select('id, email, company_id, created_at')
      .not('company_id', 'is', null);

    if (errorUsuarios) {
      console.error('❌ Error:', errorUsuarios.message);
      return;
    }

    console.log(`✅ Usuarios con empresa: ${usuarios.length}`);
    usuarios.forEach(user => {
      console.log(`   • ${user.email}`);
    });

    if (usuarios.length === 0) {
      console.log('⚠️  No hay usuarios para migrar');
      return;
    }

    // 2. Ejecutar migración con SQL que bypasea RLS
    console.log('\n🔄 2. EJECUTANDO MIGRACIÓN SQL:');
    
    const sqlMigracion = `
      -- Deshabilitar RLS temporalmente para la migración
      ALTER TABLE user_companies DISABLE ROW LEVEL SECURITY;
      ALTER TABLE user_sessions DISABLE ROW LEVEL SECURITY;
      
      -- Migrar relaciones usuario-empresa
      INSERT INTO user_companies (user_id, company_id, role, is_active, created_at)
      SELECT 
        u.id as user_id,
        u.company_id,
        'admin' as role,
        true as is_active,
        u.created_at
      FROM users u 
      WHERE u.company_id IS NOT NULL
      ON CONFLICT (user_id, company_id) DO NOTHING;
      
      -- Migrar sesiones de usuario
      INSERT INTO user_sessions (user_id, active_company_id, created_at)
      SELECT 
        u.id as user_id,
        u.company_id as active_company_id,
        u.created_at
      FROM users u 
      WHERE u.company_id IS NOT NULL
      ON CONFLICT (user_id) DO UPDATE SET
        active_company_id = EXCLUDED.active_company_id,
        updated_at = NOW();
      
      -- Rehabilitar RLS
      ALTER TABLE user_companies ENABLE ROW LEVEL SECURITY;
      ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
    `;

    console.log('📝 Ejecutando SQL de migración...');
    console.log('\n--- SQL A EJECUTAR EN SUPABASE ---');
    console.log(sqlMigracion);
    console.log('--- FIN DEL SQL ---\n');

    console.log('⚠️  IMPORTANTE: Debes ejecutar este SQL manualmente en Supabase SQL Editor');
    console.log('   1. Ve a tu dashboard de Supabase');
    console.log('   2. Abre el SQL Editor');
    console.log('   3. Copia y pega el SQL de arriba');
    console.log('   4. Ejecuta el script');
    console.log('   5. Vuelve a ejecutar este script para verificar');

    // 3. Verificar si ya se ejecutó la migración
    console.log('\n🔍 3. VERIFICANDO ESTADO ACTUAL:');
    
    const { data: relaciones } = await supabase
      .from('user_companies')
      .select('*');

    const { data: sesiones } = await supabase
      .from('user_sessions')
      .select('*');

    console.log(`📊 Relaciones user_companies: ${relaciones?.length || 0}`);
    console.log(`📊 Sesiones user_sessions: ${sesiones?.length || 0}`);

    if (relaciones?.length > 0 && sesiones?.length > 0) {
      console.log('\n✅ MIGRACIÓN YA COMPLETADA');
      
      // Mostrar detalles
      const { data: detalles } = await supabase
        .from('user_companies')
        .select(`
          *,
          users!inner(email),
          companies!inner(name)
        `);

      console.log('\n👥 USUARIOS MIGRADOS:');
      detalles?.forEach(rel => {
        console.log(`   • ${rel.users.email} -> ${rel.companies.name} (${rel.role})`);
      });

      console.log('\n🎯 PRÓXIMO PASO: Ejecutar implementar-multicompania-paso2.ts');
    } else {
      console.log('\n⏳ MIGRACIÓN PENDIENTE - Ejecuta el SQL en Supabase');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

migrarDatosConSQL();