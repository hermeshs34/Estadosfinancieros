const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuración de Supabase
const supabaseUrl = 'https://ixmjkbmwrakgkqpnqvqr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4bWprYm13cmFrZ2txcG5xdnFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU2NzE0NzEsImV4cCI6MjA1MTI0NzQ3MX0.Ej_2Ej5-Ej5-Ej5-Ej5-Ej5-Ej5-Ej5-Ej5-Ej5-Ej5-Ej5';

const supabase = createClient(supabaseUrl, supabaseKey);

async function crearRespaldoCompleto() {
  console.log('🔄 Iniciando respaldo completo de la estructura actual...');
  
  const respaldo = {
    fecha: new Date().toISOString(),
    version: '1.0.0',
    descripcion: 'Respaldo completo antes de implementar multicompañía',
    estructura: {},
    datos: {},
    configuracion: {}
  };

  try {
    // 1. Obtener información de tablas principales
    console.log('📊 Obteniendo estructura de tablas...');
    
    // Tabla users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*');
    
    if (usersError) {
      console.error('❌ Error obteniendo usuarios:', usersError);
    } else {
      respaldo.datos.users = users;
      console.log(`✅ Respaldados ${users.length} usuarios`);
    }

    // Tabla companies
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('*');
    
    if (companiesError) {
      console.error('❌ Error obteniendo empresas:', companiesError);
    } else {
      respaldo.datos.companies = companies;
      console.log(`✅ Respaldadas ${companies.length} empresas`);
    }

    // Tabla financial_statements
    const { data: statements, error: statementsError } = await supabase
      .from('financial_statements')
      .select('*');
    
    if (statementsError) {
      console.error('❌ Error obteniendo estados financieros:', statementsError);
    } else {
      respaldo.datos.financial_statements = statements;
      console.log(`✅ Respaldados ${statements.length} estados financieros`);
    }

    // Tabla accounts
    const { data: accounts, error: accountsError } = await supabase
      .from('accounts')
      .select('*');
    
    if (accountsError) {
      console.error('❌ Error obteniendo cuentas:', accountsError);
    } else {
      respaldo.datos.accounts = accounts;
      console.log(`✅ Respaldadas ${accounts.length} cuentas`);
    }

    // 2. Obtener estructura de esquema (usando información del sistema)
    console.log('🏗️ Obteniendo estructura del esquema...');
    
    // Información de columnas de tablas principales
    const tablasPrincipales = ['users', 'companies', 'financial_statements', 'accounts'];
    
    for (const tabla of tablasPrincipales) {
      try {
        // Obtener una fila de muestra para ver la estructura
        const { data: muestra } = await supabase
          .from(tabla)
          .select('*')
          .limit(1);
        
        if (muestra && muestra.length > 0) {
          respaldo.estructura[tabla] = {
            columnas: Object.keys(muestra[0]),
            tiposMuestra: muestra[0]
          };
        }
      } catch (error) {
        console.warn(`⚠️ No se pudo obtener estructura de ${tabla}:`, error.message);
      }
    }

    // 3. Configuración actual del sistema
    respaldo.configuracion = {
      supabaseUrl: supabaseUrl,
      relacionActual: {
        descripcion: 'Relación actual: users.company_id -> companies.id (uno a uno)',
        campoRelacion: 'company_id',
        tipoRelacion: 'one-to-one'
      },
      limitacionesActuales: [
        'Un usuario solo puede pertenecer a una empresa',
        'No hay interfaz para cambiar empresa de usuario',
        'No hay historial de cambios de empresa',
        'No hay sistema de roles por empresa'
      ]
    };

    // 4. Análisis de relaciones actuales
    console.log('🔗 Analizando relaciones actuales...');
    
    if (users && companies) {
      const relacionesUsuarioEmpresa = users.map(user => ({
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        companyId: user.company_id,
        companyName: companies.find(c => c.id === user.company_id)?.name || 'Sin empresa'
      }));
      
      respaldo.datos.relacionesActuales = relacionesUsuarioEmpresa;
      console.log(`✅ Analizadas ${relacionesUsuarioEmpresa.length} relaciones usuario-empresa`);
    }

    // 5. Estadísticas del respaldo
    respaldo.estadisticas = {
      totalUsuarios: users?.length || 0,
      totalEmpresas: companies?.length || 0,
      totalEstadosFinancieros: statements?.length || 0,
      totalCuentas: accounts?.length || 0,
      usuariosSinEmpresa: users?.filter(u => !u.company_id).length || 0,
      empresasSinUsuarios: companies?.filter(c => !users?.some(u => u.company_id === c.id)).length || 0
    };

    // 6. Guardar respaldo en archivo
    const nombreArchivo = `respaldo-estructura-${new Date().toISOString().split('T')[0]}.json`;
    const rutaArchivo = path.join(__dirname, nombreArchivo);
    
    fs.writeFileSync(rutaArchivo, JSON.stringify(respaldo, null, 2), 'utf8');
    
    console.log('\n📋 RESUMEN DEL RESPALDO:');
    console.log('========================');
    console.log(`📅 Fecha: ${respaldo.fecha}`);
    console.log(`👥 Usuarios: ${respaldo.estadisticas.totalUsuarios}`);
    console.log(`🏢 Empresas: ${respaldo.estadisticas.totalEmpresas}`);
    console.log(`📊 Estados Financieros: ${respaldo.estadisticas.totalEstadosFinancieros}`);
    console.log(`💰 Cuentas: ${respaldo.estadisticas.totalCuentas}`);
    console.log(`⚠️ Usuarios sin empresa: ${respaldo.estadisticas.usuariosSinEmpresa}`);
    console.log(`⚠️ Empresas sin usuarios: ${respaldo.estadisticas.empresasSinUsuarios}`);
    console.log(`💾 Archivo guardado: ${nombreArchivo}`);
    
    console.log('\n🔍 ESTRUCTURA ACTUAL:');
    console.log('=====================');
    Object.keys(respaldo.estructura).forEach(tabla => {
      console.log(`📋 ${tabla}: ${respaldo.estructura[tabla].columnas.join(', ')}`);
    });
    
    console.log('\n👥 RELACIONES USUARIO-EMPRESA ACTUALES:');
    console.log('=======================================');
    if (respaldo.datos.relacionesActuales) {
      respaldo.datos.relacionesActuales.forEach(rel => {
        console.log(`👤 ${rel.userName} (${rel.userEmail}) -> 🏢 ${rel.companyName}`);
      });
    }
    
    console.log('\n✅ Respaldo completado exitosamente!');
    console.log('📁 Archivo de respaldo creado:', nombreArchivo);
    console.log('🚀 Listo para proceder con la implementación de multicompañía');
    
    return respaldo;
    
  } catch (error) {
    console.error('❌ Error durante el respaldo:', error);
    throw error;
  }
}

// Ejecutar respaldo
crearRespaldoCompleto()
  .then(() => {
    console.log('\n🎉 Proceso de respaldo finalizado');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Error fatal en el respaldo:', error);
    process.exit(1);
  });