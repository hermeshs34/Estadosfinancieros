const fs = require('fs');
const Papa = require('papaparse');

console.log('📁 Verificando archivo: balance_consolidado_formato_estandar.csv');

const csvContent = fs.readFileSync('balance_consolidado_formato_estandar.csv', 'utf8');
const parsed = Papa.parse(csvContent, { header: true, skipEmptyLines: true });

console.log('📊 Total de filas:', parsed.data.length);

// Mostrar las primeras columnas para entender la estructura
console.log('\n📋 Columnas disponibles:');
if (parsed.data.length > 0) {
  console.log(Object.keys(parsed.data[0]));
}

// Buscar cuentas 302-
const cuentas302 = parsed.data.filter(row => {
  const codigo = row.Codigo || row.codigo || '';
  return codigo.startsWith('302-');
});

console.log('\n🔍 Cuentas 302- encontradas:', cuentas302.length);

// Mostrar las primeras 5 cuentas 302- con sus valores
console.log('\n📋 Primeras 5 cuentas 302-:');
cuentas302.slice(0, 5).forEach((row, index) => {
  console.log(`${index + 1}. ${row.Codigo} - ${row.Descripcion}`);
  console.log(`   SaldoActual: '${row.SaldoActual}' (tipo: ${typeof row.SaldoActual})`);
  console.log(`   Créditos: '${row.Creditos}' (tipo: ${typeof row.Creditos})`);
  console.log(`   Débitos: '${row.Debitos}' (tipo: ${typeof row.Debitos})`);
  console.log('');
});

// Verificar si hay cuentas 302- con valores significativos
const hasSignificantValue = (value) => {
  if (value === undefined || value === null || value === '') return false;
  const numValue = parseFloat(String(value).replace(/[^\d.,-]/g, '').replace(',', '.'));
  return !isNaN(numValue) && Math.abs(numValue) > 0.001;
};

const cuentas302ConValores = cuentas302.filter(row => {
  return hasSignificantValue(row.SaldoActual) || 
         hasSignificantValue(row.Creditos) || 
         hasSignificantValue(row.Debitos);
});

console.log(`\n💰 Cuentas 302- con valores significativos: ${cuentas302ConValores.length}`);

if (cuentas302ConValores.length > 0) {
  console.log('\n📊 Cuentas 302- con valores:');
  cuentas302ConValores.forEach((row, index) => {
    console.log(`${index + 1}. ${row.Codigo} - ${row.Descripcion}`);
    console.log(`   SaldoActual: ${row.SaldoActual}`);
    console.log(`   Créditos: ${row.Creditos}`);
    console.log(`   Débitos: ${row.Debitos}`);
    console.log('');
  });
  
  // Calcular total de créditos
  const totalCreditos = cuentas302ConValores.reduce((sum, row) => {
    const creditos = parseFloat(String(row.Creditos || '0').replace(/[^\d.,-]/g, '').replace(',', '.')) || 0;
    return sum + creditos;
  }, 0);
  
  console.log(`💵 Total de créditos en cuentas 302-: ${totalCreditos.toLocaleString()}`);
}