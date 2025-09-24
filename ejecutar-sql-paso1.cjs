// SCRIPT PARA EJECUTAR SQL DEL PASO 1 - MULTICOMPAÑÍA
// Este script proporciona instrucciones para ejecutar el SQL en Supabase

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configuración de Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables de entorno de Supabase no encontradas');
  console.log('VITE_SUPABASE_URL:', supabaseUrl ? 'Definida' : 'No definida');
  console.log('VITE_SUPABASE_ANON_KEY:', supabaseKey ? 'Definida' : 'No definida');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function mostrarInstruccionesSQL() {
  console.log('🚀 IMPLEMENTACIÓN MULTICOMPAÑÍA - PASO 1\n');
  
  try {
    // Leer el archivo SQL
    const sqlFilePath = path.join(__dirname, 'implementar-multicompania-paso1.sql');
    
    if (!fs.existsSync(sqlFilePath)) {
      throw new Error(`Archivo SQL no encontrado: ${sqlFilePath}`);
    }
    
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    console.log('📄 Archivo SQL leído correctamente');
    console.log(`📏 Tamaño: ${sqlContent.length} caracteres\n`);
    
    console.log('📋 INSTRUCCIONES PARA EJECUTAR EN SUPABASE:');
    console.log('=' .repeat(60));
    console.log('1. Abrir Supabase Dashboard');
    console.log('2. Ir a SQL Editor');
    console.log('3. Copiar y pegar el siguiente SQL:');
    console.log('4. Ejecutar paso a paso o todo junto');
    console.log('=' .repeat(60));
    console.log('\n📝 CONTENIDO SQL A EJECUTAR:');
    console.log('\n' + '='.repeat(80));
    console.log(sqlContent);
    console.log('='.repeat(80));
    
    // Intentar verificar conexión
    await verificarConexion();
    
    // Intentar verificar si las tablas ya existen
    await verificarEstructuraExistente();
    
    console.log('\n🎯 DESPUÉS DE EJECUTAR EL SQL:');
    console.log('1. ✅ Verificar que las tablas se crearon correctamente');
    console.log('2. 🔄 Ejecutar Paso 2 - Integrar servicios backend');
    console.log('3. 🔄 Ejecutar Paso 3 - Integrar componentes frontend');
    console.log('4. 🔄 Ejecutar pruebas completas');
    
    return true;
    
  } catch (error) {
    console.error('💥 Error:', error.message);
    return false;
  }
}

async function verificarConexion() {
  console.log('\n🔍 VERIFICANDO CONEXIÓN CON SUPABASE:');
  
  try {
    const { data, error } = await supabase
      .from('companies')
      .select('count')
      .limit(1);
    
    if (error) {
      console.log('❌ Error de conexión:', error.message);
    } else {
      console.log('✅ Conexión exitosa con Supabase');
    }
  } catch (error) {
    console.log('❌ Error de conexión:', error.message);
  }
}

async function verificarEstructuraExistente() {
  console.log('\n🔍 VERIFICANDO ESTRUCTURA ACTUAL:');
  
  try {
    // Verificar si user_companies ya existe
    const { data: userCompanies, error: ucError } = await supabase
      .from('user_companies')
      .select('*')
      .limit(1);
    
    if (ucError) {
      if (ucError.message.includes('does not exist')) {
        console.log('📋 Tabla user_companies: No existe (se creará)');
      } else {
        console.log('❓ Tabla user_companies:', ucError.message);
      }
    } else {
      console.log('✅ Tabla user_companies: Ya existe');
      console.log(`📊 Registros encontrados: ${userCompanies?.length || 0}`);
    }
    
    // Verificar si user_sessions ya existe
    const { data: userSessions, error: usError } = await supabase
      .from('user_sessions')
      .select('*')
      .limit(1);
    
    if (usError) {
      if (usError.message.includes('does not exist')) {
        console.log('📋 Tabla user_sessions: No existe (se creará)');
      } else {
        console.log('❓ Tabla user_sessions:', usError.message);
      }
    } else {
      console.log('✅ Tabla user_sessions: Ya existe');
      console.log(`📊 Registros encontrados: ${userSessions?.length || 0}`);
    }
    
    // Verificar estructura de users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (usersError) {
      console.log('❌ Error consultando users:', usersError.message);
    } else {
      console.log('✅ Tabla users: Accesible');
      console.log(`📊 Usuarios encontrados: ${users?.length || 0}`);
    }
    
    // Verificar estructura de companies
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('*')
      .limit(1);
    
    if (companiesError) {
      console.log('❌ Error consultando companies:', companiesError.message);
    } else {
      console.log('✅ Tabla companies: Accesible');
      console.log(`📊 Empresas encontradas: ${companies?.length || 0}`);
    }
    
  } catch (error) {
    console.error('Error verificando estructura:', error.message);
  }
}

async function verificarEstructuraCompleta() {
  console.log('\n🔍 VERIFICANDO IMPLEMENTACIÓN COMPLETA:');
  
  try {
    // Verificar tabla user_companies
    const { data: userCompanies, error: ucError } = await supabase
      .from('user_companies')
      .select('*')
      .limit(1);
    
    if (ucError) {
      console.log('❌ Tabla user_companies:', ucError.message);
      return false;
    } else {
      console.log('✅ Tabla user_companies: Implementada correctamente');
    }
    
    // Verificar tabla user_sessions
    const { data: userSessions, error: usError } = await supabase
      .from('user_sessions')
      .select('*')
      .limit(1);
    
    if (usError) {
      console.log('❌ Tabla user_sessions:', usError.message);
      return false;
    } else {
      console.log('✅ Tabla user_sessions: Implementada correctamente');
    }
    
    console.log('\n🎉 ¡Estructura de multicompañía implementada exitosamente!');
    return true;
    
  } catch (error) {
    console.error('Error verificando implementación:', error.message);
    return false;
  }
}

// Ejecutar el script
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--verificar')) {
    // Solo verificar si ya está implementado
    verificarEstructuraCompleta()
      .then(success => {
        process.exit(success ? 0 : 1);
      })
      .catch(error => {
        console.error('Error:', error);
        process.exit(1);
      });
  } else {
    // Mostrar instrucciones
    mostrarInstruccionesSQL()
      .then(success => {
        process.exit(success ? 0 : 1);
      })
      .catch(error => {
        console.error('Error:', error);
        process.exit(1);
      });
  }
}

module.exports = {
  mostrarInstruccionesSQL,
  verificarConexion,
  verificarEstructuraExistente,
  verificarEstructuraCompleta
};