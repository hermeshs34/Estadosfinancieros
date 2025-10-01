const fs = require('fs');
const Papa = require('papaparse');

console.log('🔍 Verificando valores de cuentas 302- en el CSV...');

const csvContent = fs.readFileSync('balance_consolidado_formato_estandar.csv', 'utf8');
const parsed = Papa.parse(csvContent, { header: true, skipEmptyLines: true });

console.log('📊 Columnas disponibles:', Object.keys(parsed.data[0]));

const cuentas302 = parsed.data.filter(row => {
  const codigo = row.Codigo || row.codigo;
  return codigo && codigo.toString().startsWith('302-');
});

console.log('\n🎯 Total cuentas 302- encontradas:', cuentas302.length);

console.log('\n📋 Análisis detallado de las primeras 10 cuentas 302-:');
cuentas302.slice(0, 10).forEach((row, i) => {
  const codigo = row.Codigo || row.codigo;
  const saldoActual = row.SaldoActual || row.saldoactual;
  const creditos = row.Creditos || row.creditos;
  const debitos = row.Debitos || row.debitos;
  
  console.log(`\n${i+1}. ${codigo}:`);
  console.log(`   SaldoActual: "${saldoActual}" (tipo: ${typeof saldoActual})`);
  console.log(`   Créditos: "${creditos}" (tipo: ${typeof creditos})`);
  console.log(`   Débitos: "${debitos}" (tipo: ${typeof debitos})`);
  
  // Simular hasSignificantValue exactamente como en DataImport.tsx
  const hasSignificantValue = (val) => {
    if (!val || val === '' || val === '0' || val === '0.0' || val === '0.00') return false;
    const numValue = parseFloat(val.toString().replace(/[^\d.-]/g, ''));
    return !isNaN(numValue) && Math.abs(numValue) > 0.001;
  };
  
  const saldoSignificant = hasSignificantValue(saldoActual);
  const creditosSignificant = hasSignificantValue(creditos);
  const debitosSignificant = hasSignificantValue(debitos);
  
  console.log('   hasSignificantValue(SaldoActual):', saldoSignificant);
  console.log('   hasSignificantValue(Créditos):', creditosSignificant);
  console.log('   hasSignificantValue(Débitos):', debitosSignificant);
  
  const hasAnyValue = saldoSignificant || creditosSignificant || debitosSignificant;
  console.log('   hasAnyValue FINAL:', hasAnyValue);
});

// Contar cuántas tienen hasAnyValue = true
let conValor = 0;
let sinValor = 0;

cuentas302.forEach(row => {
  const saldoActual = row.SaldoActual || row.saldoactual;
  const creditos = row.Creditos || row.creditos;
  const debitos = row.Debitos || row.debitos;
  
  const hasSignificantValue = (val) => {
    if (!val || val === '' || val === '0' || val === '0.0' || val === '0.00') return false;
    const numValue = parseFloat(val.toString().replace(/[^\d.-]/g, ''));
    return !isNaN(numValue) && Math.abs(numValue) > 0.001;
  };
  
  const hasAnyValue = hasSignificantValue(saldoActual) || hasSignificantValue(creditos) || hasSignificantValue(debitos);
  
  if (hasAnyValue) {
    conValor++;
  } else {
    sinValor++;
  }
});

console.log(`\n📊 RESUMEN:`);
console.log(`   Cuentas 302- con hasAnyValue = true: ${conValor}`);
console.log(`   Cuentas 302- con hasAnyValue = false: ${sinValor}`);
console.log(`   Total: ${cuentas302.length}`);