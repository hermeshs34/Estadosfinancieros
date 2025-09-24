const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function verificarYCorregirMigracion() {
  console.log('🔍 VERIFICANDO Y CORRIGIENDO MIGRACIÓN DE DATOS');
  console.log('='.repeat(60));

  try {
    // 1. Verificar usuarios existentes
    console.log('\n📊 1. VERIFICANDO USUARIOS EXISTENTES:');
    const { data: usuarios, error: errorUsuarios } = await supabase
      .from('users')
      .select('id, email, company_id, created_at')
      .not('company_id', 'is', null);

    if (errorUsuarios) {
      console.error('❌ Error al consultar usuarios:', errorUsuarios.message);
      return;
    }

    console.log(`✅ Usuarios con empresa asignada: ${usuarios.length}`);
    usuarios.forEach(user => {
      console.log(`   • ${user.email} -> Empresa ID: ${user.company_id}`);
    });

    // 2. Verificar empresas existentes
    console.log('\n🏢 2. VERIFICANDO EMPRESAS EXISTENTES:');
    const { data: empresas, error: errorEmpresas } = await supabase
      .from('companies')
      .select('id, name');

    if (errorEmpresas) {
      console.error('❌ Error al consultar empresas:', errorEmpresas.message);
      return;
    }

    console.log(`✅ Empresas encontradas: ${empresas.length}`);
    empresas.forEach(company => {
      console.log(`   • ${company.name} -> ID: ${company.id}`);
    });

    // 3. Verificar relaciones user_companies existentes
    console.log('\n🔗 3. VERIFICANDO RELACIONES USER_COMPANIES:');
    const { data: relaciones, error: errorRelaciones } = await supabase
      .from('user_companies')
      .select('*');

    if (errorRelaciones) {
      console.error('❌ Error al consultar user_companies:', errorRelaciones.message);
      return;
    }

    console.log(`📊 Relaciones existentes: ${relaciones.length}`);

    // 4. Verificar sesiones existentes
    console.log('\n🎯 4. VERIFICANDO SESIONES USER_SESSIONS:');
    const { data: sesiones, error: errorSesiones } = await supabase
      .from('user_sessions')
      .select('*');

    if (errorSesiones) {
      console.error('❌ Error al consultar user_sessions:', errorSesiones.message);
      return;
    }

    console.log(`📊 Sesiones existentes: ${sesiones.length}`);

    // 5. Migrar datos si es necesario
    if (usuarios.length > 0 && relaciones.length === 0) {
      console.log('\n🔄 5. MIGRANDO DATOS FALTANTES:');
      
      for (const usuario of usuarios) {
        console.log(`\n   Migrando usuario: ${usuario.email}`);
        
        // Insertar relación user_companies
        const { data: nuevaRelacion, error: errorInsertRelacion } = await supabase
          .from('user_companies')
          .insert({
            user_id: usuario.id,
            company_id: usuario.company_id,
            role: 'admin',
            is_active: true,
            created_at: usuario.created_at
          })
          .select();

        if (errorInsertRelacion) {
          console.error(`   ❌ Error al crear relación:`, errorInsertRelacion.message);
          continue;
        }

        console.log(`   ✅ Relación creada: ${usuario.email} -> ${usuario.company_id}`);

        // Insertar sesión user_sessions
        const { data: nuevaSesion, error: errorInsertSesion } = await supabase
          .from('user_sessions')
          .insert({
            user_id: usuario.id,
            active_company_id: usuario.company_id,
            created_at: usuario.created_at
          })
          .select();

        if (errorInsertSesion) {
          console.error(`   ❌ Error al crear sesión:`, errorInsertSesion.message);
          continue;
        }

        console.log(`   ✅ Sesión creada: ${usuario.email} -> ${usuario.company_id}`);
      }
    } else if (relaciones.length > 0) {
      console.log('\n✅ 5. MIGRACIÓN YA COMPLETADA ANTERIORMENTE');
    } else {
      console.log('\n⚠️  5. NO HAY USUARIOS CON EMPRESA PARA MIGRAR');
    }

    // 6. Verificación final
    console.log('\n🎯 6. VERIFICACIÓN FINAL:');
    
    const { data: relacionesFinales } = await supabase
      .from('user_companies')
      .select(`
        *,
        users!inner(email),
        companies!inner(name)
      `);

    const { data: sesionesFinales } = await supabase
      .from('user_sessions')
      .select(`
        *,
        users!inner(email),
        companies!inner(name)
      `);

    console.log(`✅ Relaciones user_companies: ${relacionesFinales?.length || 0}`);
    relacionesFinales?.forEach(rel => {
      console.log(`   • ${rel.users.email} -> ${rel.companies.name} (${rel.role})`);
    });

    console.log(`✅ Sesiones user_sessions: ${sesionesFinales?.length || 0}`);
    sesionesFinales?.forEach(ses => {
      console.log(`   • ${ses.users.email} -> ${ses.companies.name} (activa)`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('✅ VERIFICACIÓN Y MIGRACIÓN COMPLETADA');
    console.log('='.repeat(60));
    
    if (relacionesFinales?.length > 0 && sesionesFinales?.length > 0) {
      console.log('🎯 PRÓXIMO PASO: Ejecutar implementar-multicompania-paso2.ts');
    } else {
      console.log('⚠️  ATENCIÓN: Revisar por qué no se migraron los datos');
    }

  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

verificarYCorregirMigracion();