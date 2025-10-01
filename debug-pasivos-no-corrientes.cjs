const fs = require('fs');
const path = require('path');

// Leer el archivo CSV
const csvPath = path.join(__dirname, 'public', 'Balance de Comprobacion Enero 31 2025 Consolidado.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');

console.log('🔍 ANÁLISIS DE PASIVOS NO CORRIENTES');
console.log('=====================================\n');

// Parsear CSV
const lines = csvContent.split('\n');
const headers = lines[0].split(',');

console.log('📋 Headers del CSV:', headers);
console.log('');

// Simular la lógica actual de DataContext.tsx para Pasivos No Corrientes
let pasivosCorrientes = [];
let pasivosNoCorrientes = [];
let cuentas304 = [];
let otrosPasivos = [];

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  
  const columns = line.split(',');
  if (columns.length < 4) continue;
  
  const codigo = columns[0]?.trim() || '';
  const description = columns[1]?.trim() || '';
  const saldoActual = parseFloat(columns[4]?.replace(/[^\d.-]/g, '') || '0');
  
  if (!codigo || saldoActual === 0) continue;
  
  const codigoStr = codigo.toString();
  const value = Math.abs(saldoActual);
  
  // Verificar si es cuenta 304- (Reservas Técnicas)
  if (codigoStr.startsWith('304-')) {
    cuentas304.push({
      codigo: codigoStr,
      description,
      value,
      clasificacion: 'RESERVAS TÉCNICAS (304-)'
    });
  }
  
  // Lógica actual de DataContext.tsx para Pasivos Corrientes
  else if (
    codigoStr.startsWith('301') || codigoStr.startsWith('302-') || codigoStr.startsWith('21') || codigoStr.startsWith('2.1') ||
    description.includes('cuenta') && description.includes('pagar') ||
    description.includes('proveedor') || description.includes('acreedor') ||
    description.includes('nomina') || description.includes('nómina') || description.includes('salario') ||
    description.includes('GASTOS DE ADQUISICION') || description.includes('COMISIONES') ||
    description.includes('IMPUESTOS') || description.includes('PARTICIPACION DE CEDENTES')
  ) {
    pasivosCorrientes.push({
      codigo: codigoStr,
      description,
      value,
      clasificacion: 'PASIVO CORRIENTE'
    });
  }
  
  // Lógica actual de DataContext.tsx para Pasivos No Corrientes
  else if (
    codigoStr.startsWith('22') || codigoStr.startsWith('2.2') ||
    codigoStr.startsWith('402-') || // Códigos específicos para seguros
    description.includes('prestamo') && description.includes('largo') ||
    description.includes('credito') && description.includes('largo') ||
    description.includes('hipoteca') || description.includes('deuda') && description.includes('largo') ||
    description.includes('RESERVAS TECNICAS') || description.includes('PROVISIONES') ||
    description.includes('OBLIGACIONES LABORALES')
  ) {
    pasivosNoCorrientes.push({
      codigo: codigoStr,
      description,
      value,
      clasificacion: 'PASIVO NO CORRIENTE'
    });
  }
  
  // Otras cuentas que podrían ser pasivos pero no se clasifican
  else if (codigoStr.startsWith('3') || codigoStr.startsWith('4') || codigoStr.startsWith('5')) {
    otrosPasivos.push({
      codigo: codigoStr,
      description,
      value,
      clasificacion: 'OTRO PASIVO/PATRIMONIO'
    });
  }
}

console.log('📊 RESULTADOS DEL ANÁLISIS:');
console.log('===========================\n');

console.log('🔴 CUENTAS 304- (RESERVAS TÉCNICAS) ENCONTRADAS:');
console.log('------------------------------------------------');
let total304 = 0;
cuentas304.forEach(cuenta => {
  console.log(`✓ ${cuenta.codigo} - ${cuenta.description}`);
  console.log(`  Saldo: Bs.S ${cuenta.value.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`);
  console.log(`  Estado: NO SE CLASIFICA como Pasivo No Corriente`);
  console.log('');
  total304 += cuenta.value;
});

console.log(`💰 TOTAL CUENTAS 304-: Bs.S ${total304.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`);
console.log('');

console.log('✅ PASIVOS NO CORRIENTES ACTUALMENTE CLASIFICADOS:');
console.log('--------------------------------------------------');
let totalPasivosNoCorrientes = 0;
if (pasivosNoCorrientes.length === 0) {
  console.log('❌ NO HAY CUENTAS CLASIFICADAS COMO PASIVOS NO CORRIENTES');
} else {
  pasivosNoCorrientes.forEach(cuenta => {
    console.log(`✓ ${cuenta.codigo} - ${cuenta.description}`);
    console.log(`  Saldo: Bs.S ${cuenta.value.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`);
    totalPasivosNoCorrientes += cuenta.value;
  });
}
console.log(`💰 TOTAL PASIVOS NO CORRIENTES: Bs.S ${totalPasivosNoCorrientes.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`);
console.log('');

console.log('📋 PASIVOS CORRIENTES (MUESTRA):');
console.log('--------------------------------');
let totalPasivosCorrientes = 0;
pasivosCorrientes.slice(0, 5).forEach(cuenta => {
  console.log(`✓ ${cuenta.codigo} - ${cuenta.description}`);
  console.log(`  Saldo: Bs.S ${cuenta.value.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`);
  totalPasivosCorrientes += cuenta.value;
});
if (pasivosCorrientes.length > 5) {
  console.log(`... y ${pasivosCorrientes.length - 5} cuentas más`);
  pasivosCorrientes.slice(5).forEach(cuenta => {
    totalPasivosCorrientes += cuenta.value;
  });
}
console.log(`💰 TOTAL PASIVOS CORRIENTES: Bs.S ${totalPasivosCorrientes.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`);
console.log('');

console.log('🔍 DIAGNÓSTICO:');
console.log('===============');
console.log('❌ PROBLEMA IDENTIFICADO:');
console.log('  Las cuentas 304- (RESERVAS TÉCNICAS) NO se están clasificando como Pasivos No Corrientes');
console.log('  porque la lógica actual solo busca:');
console.log('  - Códigos que empiecen con "22", "2.2", "402-"');
console.log('  - Descripciones con "RESERVAS TECNICAS" (pero las 304- tienen "RESERVAS DE PRIMAS")');
console.log('');
console.log('✅ SOLUCIÓN PROPUESTA:');
console.log('  Agregar codigoStr.startsWith("304-") a la condición de Pasivos No Corrientes');
console.log('');
console.log('💡 IMPACTO ESPERADO:');
console.log(`  Pasivos No Corrientes cambiarían de Bs.S ${totalPasivosNoCorrientes.toLocaleString('es-VE', { minimumFractionDigits: 2 })} a Bs.S ${(totalPasivosNoCorrientes + total304).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`);
console.log(`  Incremento: Bs.S ${total304.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`);