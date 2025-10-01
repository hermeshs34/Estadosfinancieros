const fs = require('fs');

console.log('💰 ANÁLISIS EXPERTO: Identificación de TODAS las Cuentas de Efectivo');
console.log('====================================================================');

console.log('\n🔍 REVISIÓN DEL CSV ACTUAL:');
console.log('===========================');

// Leer el CSV actual
const csvContent = fs.readFileSync('balance_consolidado_formato_estandar.csv', 'utf8');
const lines = csvContent.split('\n');

console.log('\n📋 CUENTAS DE EFECTIVO IDENTIFICADAS EN EL CSV:');
console.log('===============================================');

const cuentasEfectivo = [];
let totalEfectivo = 0;

lines.forEach((line, index) => {
  if (index === 0) return; // Skip header
  
  const columns = line.split(',');
  if (columns.length < 6) return;
  
  const codigo = columns[0]?.trim();
  const descripcion = columns[1]?.trim();
  const saldoActual = parseFloat(columns[5]?.trim()) || 0;
  
  // Identificar cuentas de efectivo según estándares contables
  const esEfectivo = 
    // 1. DISPONIBLE (201-01)
    codigo.startsWith('201-01') ||
    codigo.startsWith('2.201.01') ||
    
    // 2. EFECTIVOS DEPOSITADOS EN BANCOS (202-01)
    codigo.startsWith('202-01') ||
    
    // 3. BANCOS E INVERSIONES EN EL EXTRANJERO (203-06)
    codigo.startsWith('203-06') ||
    
    // 4. DISPONIBLE Y CAJA CHICA (203-11)
    codigo.startsWith('203-11') ||
    
    // 5. Por descripción (palabras clave)
    descripcion.toLowerCase().includes('caja') ||
    descripcion.toLowerCase().includes('banco') ||
    descripcion.toLowerCase().includes('efectivo') ||
    descripcion.toLowerCase().includes('disponible') ||
    descripcion.toLowerCase().includes('deposito');
  
  if (esEfectivo && saldoActual !== 0) {
    cuentasEfectivo.push({
      codigo,
      descripcion,
      saldo: saldoActual,
      categoria: getCategoriaEfectivo(codigo, descripcion)
    });
    totalEfectivo += saldoActual;
  }
});

function getCategoriaEfectivo(codigo, descripcion) {
  if (codigo.startsWith('201-01')) return '🏦 DISPONIBLE (Seguros)';
  if (codigo.startsWith('202-01')) return '🏛️ EFECTIVOS EN BANCOS';
  if (codigo.startsWith('203-06')) return '🌍 INVERSIONES EXTRANJERO';
  if (codigo.startsWith('203-11')) return '💵 CAJA CHICA';
  return '💰 OTROS EFECTIVOS';
}

// Mostrar resultados
console.log('\n📊 RESUMEN DE CUENTAS DE EFECTIVO:');
console.log('==================================');

const categorias = {};
cuentasEfectivo.forEach(cuenta => {
  if (!categorias[cuenta.categoria]) {
    categorias[cuenta.categoria] = [];
  }
  categorias[cuenta.categoria].push(cuenta);
});

Object.keys(categorias).forEach(categoria => {
  console.log(`\n${categoria}:`);
  console.log('─'.repeat(50));
  
  let subtotal = 0;
  categorias[categoria].forEach(cuenta => {
    console.log(`   ${cuenta.codigo.padEnd(15)} ${cuenta.descripcion.substring(0, 40).padEnd(42)} ${cuenta.saldo.toLocaleString().padStart(15)}`);
    subtotal += cuenta.saldo;
  });
  
  console.log(`   ${''.padEnd(57)} ${'─'.repeat(15)}`);
  console.log(`   ${'SUBTOTAL:'.padEnd(57)} ${subtotal.toLocaleString().padStart(15)}`);
});

console.log('\n💰 TOTAL EFECTIVO Y EQUIVALENTES:');
console.log('=================================');
console.log(`   TOTAL: Bs ${totalEfectivo.toLocaleString()}`);

console.log('\n🔍 ANÁLISIS EXPERTO - CUENTAS FALTANTES:');
console.log('========================================');

// Verificar si hay cuentas tradicionales de efectivo que podrían faltar
const cuentasTradicionales = [
  { codigo: '101', nombre: 'CAJA' },
  { codigo: '102', nombre: 'BANCOS' },
  { codigo: '103', nombre: 'CAJA CHICA' },
  { codigo: '1101', nombre: 'CAJA GENERAL' },
  { codigo: '1102', nombre: 'BANCOS NACIONALES' },
  { codigo: '1103', nombre: 'BANCOS EXTRANJEROS' },
  { codigo: '1104', nombre: 'CAJA CHICA' }
];

console.log('\n🔎 VERIFICACIÓN DE CUENTAS TRADICIONALES:');
console.log('=========================================');

cuentasTradicionales.forEach(cuenta => {
  const encontrada = cuentasEfectivo.some(c => c.codigo.startsWith(cuenta.codigo));
  if (encontrada) {
    console.log(`   ✅ ${cuenta.codigo} - ${cuenta.nombre}: ENCONTRADA`);
  } else {
    console.log(`   ❌ ${cuenta.codigo} - ${cuenta.nombre}: NO ENCONTRADA`);
  }
});

console.log('\n📋 RECOMENDACIONES EXPERTAS:');
console.log('============================');

console.log('\n1. 🎯 CUENTAS ACTUALMENTE INCLUIDAS:');
console.log('   ✅ 201-01: DISPONIBLE (Seguros) - Bs', categorias['🏦 DISPONIBLE (Seguros)']?.reduce((sum, c) => sum + c.saldo, 0)?.toLocaleString() || '0');
console.log('   ✅ 202-01: EFECTIVOS EN BANCOS - Bs', categorias['🏛️ EFECTIVOS EN BANCOS']?.reduce((sum, c) => sum + c.saldo, 0)?.toLocaleString() || '0');
console.log('   ✅ 203-06: INVERSIONES EXTRANJERO - Bs', categorias['🌍 INVERSIONES EXTRANJERO']?.reduce((sum, c) => sum + c.saldo, 0)?.toLocaleString() || '0');
console.log('   ✅ 203-11: CAJA CHICA - Bs', categorias['💵 CAJA CHICA']?.reduce((sum, c) => sum + c.saldo, 0)?.toLocaleString() || '0');

console.log('\n2. 🔧 VERIFICACIÓN EN DataContext.tsx:');
console.log('   • Revisar que TODAS estas cuentas estén incluidas en la lógica de clasificación');
console.log('   • Especialmente las cuentas 201-01 y 202-01 que tienen valores significativos');

console.log('\n3. 🎯 VALOR ESPERADO TOTAL:');
console.log(`   • Efectivo Total: Bs ${totalEfectivo.toLocaleString()}`);
console.log('   • Este debería ser el valor mostrado en "Efectivo y Equivalentes"');

console.log('\n4. 🔍 CUENTAS PRINCIPALES POR VALOR:');
console.log('   ================================');

// Ordenar por valor descendente
const cuentasOrdenadas = [...cuentasEfectivo].sort((a, b) => b.saldo - a.saldo);
cuentasOrdenadas.slice(0, 10).forEach((cuenta, index) => {
  console.log(`   ${(index + 1).toString().padStart(2)}. ${cuenta.codigo.padEnd(15)} ${cuenta.saldo.toLocaleString().padStart(15)} - ${cuenta.descripcion.substring(0, 30)}`);
});

console.log('\n🚀 PRÓXIMOS PASOS:');
console.log('==================');
console.log('1. Verificar que DataContext.tsx incluya TODAS las cuentas identificadas');
console.log('2. Especialmente revisar las cuentas 201-01 y 202-01');
console.log('3. El total de efectivo debería ser:', totalEfectivo.toLocaleString());
console.log('4. Recargar la aplicación y verificar el balance');

// Generar código de verificación
console.log('\n💻 CÓDIGO PARA VERIFICAR EN DataContext.tsx:');
console.log('============================================');
console.log(`
// TODAS las cuentas de efectivo identificadas:
const esEfectivo = 
  // Disponible (Seguros)
  codigoStr.startsWith('201-01') ||
  codigoStr.startsWith('2.201.01') ||
  
  // Efectivos depositados en bancos
  codigoStr.startsWith('202-01') ||
  
  // Bancos e inversiones en el extranjero
  codigoStr.startsWith('203-06') ||
  
  // Disponible y caja chica
  codigoStr.startsWith('203-11') ||
  
  // Por descripción
  description.toLowerCase().includes('caja') ||
  description.toLowerCase().includes('banco') ||
  description.toLowerCase().includes('efectivo') ||
  description.toLowerCase().includes('disponible') ||
  description.toLowerCase().includes('deposito');
`);

console.log('\n✅ ANÁLISIS COMPLETADO');
console.log('======================');
console.log(`Total de cuentas de efectivo encontradas: ${cuentasEfectivo.length}`);
console.log(`Valor total de efectivo: Bs ${totalEfectivo.toLocaleString()}`);