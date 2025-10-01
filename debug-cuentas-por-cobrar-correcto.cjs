const fs = require('fs');
const path = require('path');

// Función para parsear valores numéricos
function parseValue(value) {
  if (!value || value === '') return 0;
  const cleanValue = value.toString().replace(/[^\d.-]/g, '');
  return parseFloat(cleanValue) || 0;
}

// Función para leer y procesar el CSV
function processCSV() {
  const csvPath = path.join(__dirname, 'Balance de Comprobacion Enero 31 2025 Consolidado1.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.error('❌ Archivo CSV no encontrado:', csvPath);
    return;
  }

  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n');
  
  console.log('📊 ANÁLISIS DE CUENTAS POR COBRAR');
  console.log('='.repeat(50));
  console.log(`📁 Archivo: ${csvPath}`);
  console.log(`📄 Total de líneas: ${lines.length}`);
  console.log('');

  let totalCuentasPorCobrar = 0;
  let cuentasEncontradas = [];
  let cuentasSinClasificar = [];

  // Procesar cada línea
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('"Profit Plus') || line.startsWith('*BALANCE') || 
        line.startsWith('Origen') || line.startsWith('Tabla 1,Código')) continue;

    // Parsear la línea CSV
    const parts = line.split(',');
    if (parts.length < 8) continue;

    const codigo = parts[1] ? parts[1].replace(/"/g, '').trim() : '';
    const descripcion = parts[2] ? parts[2].replace(/"/g, '').trim() : '';
    const saldoActual = parseValue(parts[8]);

    if (!codigo || saldoActual === 0) continue;

    const codigoStr = codigo.toString();
    const description = descripcion.toLowerCase();

    // Lógica de clasificación basada en DataContext.tsx
    let esCuentaPorCobrar = false;

    // Criterios específicos para empresas de seguros
    if (codigoStr.startsWith('205-')) {
      esCuentaPorCobrar = true;
      console.log('🎯 REASEGUROS:', codigoStr, descripcion, `Bs.S ${saldoActual.toLocaleString()}`);
    }
    // Criterios generales
    else if (description.includes('cuenta') && description.includes('cobrar')) {
      esCuentaPorCobrar = true;
      console.log('🎯 CUENTA COBRAR:', codigoStr, descripcion, `Bs.S ${saldoActual.toLocaleString()}`);
    }
    else if (description.includes('cliente')) {
      esCuentaPorCobrar = true;
      console.log('🎯 CLIENTE:', codigoStr, descripcion, `Bs.S ${saldoActual.toLocaleString()}`);
    }
    else if (description.includes('deudor')) {
      esCuentaPorCobrar = true;
      console.log('🎯 DEUDOR:', codigoStr, descripcion, `Bs.S ${saldoActual.toLocaleString()}`);
    }
    else if (description.includes('reaseguros') || description.includes('intermediarios') || description.includes('retrocesionarios')) {
      esCuentaPorCobrar = true;
      console.log('🎯 SEGUROS:', codigoStr, descripcion, `Bs.S ${saldoActual.toLocaleString()}`);
    }
    // Códigos específicos
    else if (codigoStr === '201-02' || codigoStr === '1102' || codigoStr === '1.102') {
      esCuentaPorCobrar = true;
      console.log('🎯 CÓDIGO ESPECÍFICO:', codigoStr, descripcion, `Bs.S ${saldoActual.toLocaleString()}`);
    }

    if (esCuentaPorCobrar) {
      totalCuentasPorCobrar += saldoActual;
      cuentasEncontradas.push({
        codigo: codigoStr,
        descripcion: descripcion,
        valor: saldoActual
      });
    } else if (saldoActual > 1000) { // Solo mostrar cuentas significativas sin clasificar
      cuentasSinClasificar.push({
        codigo: codigoStr,
        descripcion: descripcion,
        valor: saldoActual
      });
    }
  }

  console.log('\n📋 RESUMEN DE CUENTAS POR COBRAR:');
  console.log('='.repeat(50));
  console.log(`💰 Total Cuentas por Cobrar: Bs.S ${totalCuentasPorCobrar.toLocaleString()}`);
  console.log(`📊 Número de cuentas: ${cuentasEncontradas.length}`);

  console.log('\n📝 DETALLE DE CUENTAS CLASIFICADAS:');
  console.log('-'.repeat(50));
  cuentasEncontradas.forEach(cuenta => {
    console.log(`${cuenta.codigo.padEnd(15)} | ${cuenta.descripcion.substring(0, 40).padEnd(40)} | Bs.S ${cuenta.valor.toLocaleString()}`);
  });

  console.log('\n🔍 CUENTAS SIGNIFICATIVAS SIN CLASIFICAR (>1000):');
  console.log('-'.repeat(50));
  cuentasSinClasificar.slice(0, 20).forEach(cuenta => {
    console.log(`${cuenta.codigo.padEnd(15)} | ${cuenta.descripcion.substring(0, 40).padEnd(40)} | Bs.S ${cuenta.valor.toLocaleString()}`);
  });

  console.log('\n✅ ANÁLISIS COMPLETADO');
  console.log(`🎯 Valor esperado en sistema: Bs.S 263.283.256,85`);
  console.log(`📊 Valor calculado: Bs.S ${totalCuentasPorCobrar.toLocaleString()}`);
  console.log(`📈 Diferencia: Bs.S ${(263283256.85 - totalCuentasPorCobrar).toLocaleString()}`);
}

// Ejecutar el análisis
processCSV();