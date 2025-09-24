// EXPLICACIÓN: ¿Dónde se define a qué empresa pertenece un usuario?
// ================================================================

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function explicarAsignacionEmpresaUsuario() {
  console.log('🔍 EXPLICACIÓN: ¿Dónde se define a qué empresa pertenece un usuario?');
  console.log('='.repeat(80));
  
  try {
    // 1. Mostrar la estructura actual
    console.log('\n📋 1. ESTRUCTURA ACTUAL DEL SISTEMA:');
    console.log('   - Tabla `users` tiene campo `company_id`');
    console.log('   - Tabla `companies` tiene campo `user_id` (propietario)');
    console.log('   - Un usuario pertenece a UNA empresa (relación 1:1)');
    console.log('   - Una empresa puede tener MUCHOS usuarios');
    
    // 2. Obtener usuarios
    console.log('\n👥 2. USUARIOS Y SUS EMPRESAS ASIGNADAS:');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, full_name, company_id')
      .order('email');
    
    if (usersError) {
      console.error('❌ Error obteniendo usuarios:', usersError);
      return;
    }
    
    // 3. Obtener empresas
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, name, user_id')
      .order('name');
    
    if (companiesError) {
      console.error('❌ Error obteniendo empresas:', companiesError);
      return;
    }
    
    // Crear mapa de empresas para búsqueda rápida
    const companyMap = {};
    companies?.forEach(company => {
      companyMap[company.id] = company;
    });
    
    // Mostrar usuarios con sus empresas
    users?.forEach(user => {
      const company = user.company_id ? companyMap[user.company_id] : null;
      const companyName = company ? company.name : 'SIN EMPRESA ASIGNADA';
      console.log(`   📧 ${user.email} (${user.full_name || 'Sin nombre'})`);
      console.log(`      └── Empresa: ${companyName} (ID: ${user.company_id || 'NULL'})`);
    });
    
    // 4. Mostrar dónde se asigna la empresa
    console.log('\n🎯 3. ¿DÓNDE SE ASIGNA LA EMPRESA A UN USUARIO?');
    console.log('\n   A) DURANTE LA CREACIÓN DEL USUARIO:');
    console.log('      📁 Archivo: src/components/users/UserForm.tsx');
    console.log('      📝 Línea ~123: company_id: companyId');
    console.log('      🔧 El companyId viene del contexto de la empresa seleccionada');
    console.log('\n   B) FLUJO DE CREACIÓN:');
    console.log('      1. Admin selecciona una empresa (CompanySelector)');
    console.log('      2. Admin va a Gestión de Usuarios');
    console.log('      3. Admin crea nuevo usuario');
    console.log('      4. El sistema asigna automáticamente company_id = empresa_seleccionada.id');
    
    // 5. Mostrar cómo cambiar la empresa de un usuario
    console.log('\n🔄 4. ¿CÓMO CAMBIAR LA EMPRESA DE UN USUARIO?');
    console.log('\n   OPCIÓN A - MANUAL (Base de datos):');
    console.log('   UPDATE users SET company_id = \'nueva_empresa_id\' WHERE email = \'usuario@email.com\';');
    
    console.log('\n   OPCIÓN B - PROGRAMÁTICA (Recomendada):');
    console.log('   📁 Crear función en UserService.ts:');
    console.log(`
   static async changeUserCompany(userId: string, newCompanyId: string): Promise<void> {
     const { error } = await supabase
       .from('users')
       .update({ company_id: newCompanyId })
       .eq('id', userId);
     
     if (error) throw error;
   }`);
    
    // 6. Ejemplo práctico
    console.log('\n💡 5. EJEMPLO PRÁCTICO:');
    console.log('   Para asignar usuario "Hersan" a empresa "B":');
    
    if (companies && companies.length > 0) {
      console.log('\n   📋 Empresas disponibles:');
      companies.forEach((company, index) => {
        const letter = String.fromCharCode(65 + index); // A, B, C...
        console.log(`      ${letter}) ${company.name} (ID: ${company.id})`);
      });
      
      // Buscar usuario Hersan
      const hersanUser = users?.find(user => 
        user.full_name?.toLowerCase().includes('hersan') || 
        user.email?.toLowerCase().includes('hersan')
      );
      
      if (hersanUser) {
        const currentCompany = hersanUser.company_id ? companyMap[hersanUser.company_id] : null;
        console.log(`\n   👤 Usuario encontrado: ${hersanUser.full_name} (${hersanUser.email})`);
        console.log(`      Empresa actual: ${currentCompany ? currentCompany.name : 'SIN ASIGNAR'} (${hersanUser.company_id || 'NULL'})`);
        
        if (companies.length >= 2) {
          const empresaB = companies[1]; // Segunda empresa (índice 1 = letra B)
          console.log(`\n   🔧 Para asignar a empresa "${empresaB.name}" (empresa B):`);
          console.log(`      UPDATE users SET company_id = '${empresaB.id}' WHERE id = '${hersanUser.id}';`);
          console.log(`\n   📝 O usando la función programática:`);
          console.log(`      await UserService.changeUserCompany('${hersanUser.id}', '${empresaB.id}');`);
        }
      } else {
        console.log('\n   ⚠️  Usuario "Hersan" no encontrado');
        console.log('   📋 Usuarios disponibles:');
        users?.forEach(user => {
          console.log(`      - ${user.full_name || 'Sin nombre'} (${user.email})`);
        });
      }
    }
    
    // 7. Limitaciones actuales
    console.log('\n⚠️  6. LIMITACIONES DEL SISTEMA ACTUAL:');
    console.log('   - Un usuario solo puede pertenecer a UNA empresa');
    console.log('   - No hay interfaz gráfica para cambiar empresa de usuario');
    console.log('   - No hay historial de cambios de empresa');
    console.log('   - No hay validación de permisos para cambio de empresa');
    
    // 8. Recomendaciones
    console.log('\n💡 7. RECOMENDACIONES PARA MEJORAR:');
    console.log('   A) Implementar tabla user_companies (relación muchos a muchos)');
    console.log('   B) Crear interfaz para cambiar empresa de usuario');
    console.log('   C) Agregar validaciones y permisos');
    console.log('   D) Implementar historial de cambios');
    
    console.log('\n✅ RESUMEN:');
    console.log('   El campo `company_id` en la tabla `users` define a qué empresa pertenece cada usuario.');
    console.log('   Este valor se asigna automáticamente cuando se crea un usuario desde la interfaz.');
    console.log('   Para cambiar la empresa de un usuario, se debe actualizar este campo manualmente.');
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Ejecutar la explicación
explicarAsignacionEmpresaUsuario();