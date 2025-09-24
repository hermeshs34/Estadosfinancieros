const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Usar el service role key para bypasear RLS
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Necesitamos esta clave para bypasear RLS
);

// Cliente normal para verificaciones
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function migrarDatosConPrivilegios() {
  console.log('🔄 MIGRANDO DATOS CON PRIVILEGIOS ADMINISTRATIVOS');
  console.log('='.repeat(60));

  try {
    // 1. Verificar usuarios existentes
    console.log('\n📊 1. OBTENIENDO USUARIOS CON EMPRESA:');
    const { data: usuarios, error: errorUsuarios } = await supabase
      .from('users')
      .select('id, email, company_id, created_at')
      .not('company_id', 'is', null);

    if (errorUsuarios) {
      console.error('❌ Error al consultar usuarios:', errorUsuarios.message);
      return;
    }

    console.log(`✅ Usuarios encontrados: ${usuarios.length}`);
    usuarios.forEach(user => {
      console.log(`   • ${user.email} -> ${user.company_id}`);
    });

    if (usuarios.length === 0) {
      console.log('⚠️  No hay usuarios con empresa para migrar');
      return;
    }

    // 2. Verificar si ya existen relaciones
    console.log('\n🔗 2. VERIFICANDO RELACIONES EXISTENTES:');
    const { data: relacionesExistentes } = await supabase
      .from('user_companies')
      .select('user_id, company_id');

    console.log(`📊 Relaciones existentes: ${relacionesExistentes?.length || 0}`);

    // 3. Migrar usando privilegios administrativos
    console.log('\n🔄 3. MIGRANDO CON PRIVILEGIOS ADMINISTRATIVOS:');
    
    const relacionesParaInsertar = [];
    const sesionesParaInsertar = [];

    for (const usuario of usuarios) {
      // Verificar si ya existe la relación
      const yaExiste = relacionesExistentes?.some(rel => 
        rel.user_id === usuario.id && rel.company_id === usuario.company_id
      );

      if (!yaExiste) {
        relacionesParaInsertar.push({
          user_id: usuario.id,
          company_id: usuario.company_id,
          role: 'admin',
          is_active: true,
          created_at: usuario.created_at
        });

        sesionesParaInsertar.push({
          user_id: usuario.id,
          active_company_id: usuario.company_id,
          created_at: usuario.created_at
        });
      }
    }

    if (relacionesParaInsertar.length === 0) {
      console.log('✅ Todas las relaciones ya existen');
    } else {
      console.log(`📝 Insertando ${relacionesParaInsertar.length} relaciones...`);
      
      // Insertar relaciones usando supabaseAdmin
      const { data: nuevasRelaciones, error: errorRelaciones } = await supabaseAdmin
        .from('user_companies')
        .insert(relacionesParaInsertar)
        .select();

      if (errorRelaciones) {
        console.error('❌ Error al insertar relaciones:', errorRelaciones.message);
        console.error('Detalles:', errorRelaciones);
      } else {
        console.log(`✅ ${nuevasRelaciones.length} relaciones creadas exitosamente`);
      }

      // Insertar sesiones usando supabaseAdmin
      console.log(`📝 Insertando ${sesionesParaInsertar.length} sesiones...`);
      const { data: nuevasSesiones, error: errorSesiones } = await supabaseAdmin
        .from('user_sessions')
        .insert(sesionesParaInsertar)
        .select();

      if (errorSesiones) {
        console.error('❌ Error al insertar sesiones:', errorSesiones.message);
        console.error('Detalles:', errorSesiones);
      } else {
        console.log(`✅ ${nuevasSesiones.length} sesiones creadas exitosamente`);
      }
    }

    // 4. Verificación final
    console.log('\n🎯 4. VERIFICACIÓN FINAL:');
    
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

    console.log(`✅ Total relaciones user_companies: ${relacionesFinales?.length || 0}`);
    relacionesFinales?.forEach(rel => {
      console.log(`   • ${rel.users.email} -> ${rel.companies.name} (${rel.role})`);
    });

    console.log(`✅ Total sesiones user_sessions: ${sesionesFinales?.length || 0}`);
    sesionesFinales?.forEach(ses => {
      console.log(`   • ${ses.users.email} -> ${ses.companies.name} (activa)`);
    });

    console.log('\n' + '='.repeat(60));
    if (relacionesFinales?.length > 0 && sesionesFinales?.length > 0) {
      console.log('✅ MIGRACIÓN COMPLETADA EXITOSAMENTE');
      console.log('🎯 PRÓXIMO PASO: Ejecutar implementar-multicompania-paso2.ts');
    } else {
      console.log('❌ MIGRACIÓN INCOMPLETA - Revisar errores arriba');
    }
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Error general:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Verificar variables de entorno
if (!process.env.VITE_SUPABASE_URL) {
  console.error('❌ VITE_SUPABASE_URL no está configurada');
  process.exit(1);
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY no está configurada');
  console.log('💡 Necesitas agregar esta clave al archivo .env');
  console.log('   Puedes encontrarla en: Supabase Dashboard > Settings > API > service_role key');
  process.exit(1);
}

migrarDatosConPrivilegios();