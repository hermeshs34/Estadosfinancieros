// Función exacta de DataImport.tsx
const hasSignificantValue = (value) => {
  if (value === undefined || value === null || value === '') return false;
  const numValue = parseFloat(String(value).replace(/[^\d.,-]/g, '').replace(',', '.'));
  return !isNaN(numValue) && Math.abs(numValue) > 0.001;
};

// Probar con valores reales del CSV
const testValues = ['309979.43', '0.0', '0', '', null, undefined];

console.log('🧪 Probando función hasSignificantValue:');
testValues.forEach(val => {
  const result = hasSignificantValue(val);
  console.log(`Valor: "${val}" -> hasSignificantValue: ${result}`);
});

console.log('\n🔍 Probando con datos reales de cuentas 302-:');

const fs = require('fs');
const Papa = require('papaparse');

const csvContent = fs.readFileSync('balance_consolidado_formato_estandar.csv', 'utf8');
const parsed = Papa.parse(csvContent, { header: true, skipEmptyLines: true });

// Buscar una cuenta 302- específica que sabemos que tiene valores
const cuenta302Test = parsed.data.find(row => {
  const codigo = row.Codigo || row.codigo;
  return codigo === '302-03-01-02-01-01';
});

if (cuenta302Test) {
  console.log('Cuenta encontrada:', cuenta302Test.Codigo);
  console.log('Descripción:', cuenta302Test.Descripcion);
  console.log('SaldoActual:', cuenta302Test.SaldoActual);
  console.log('Créditos:', cuenta302Test.Creditos);
  console.log('Débitos:', cuenta302Test.Debitos);
  
  console.log('\nProbando hasSignificantValue:');
  console.log('hasSignificantValue(SaldoActual):', hasSignificantValue(cuenta302Test.SaldoActual));
  console.log('hasSignificantValue(Créditos):', hasSignificantValue(cuenta302Test.Creditos));
  console.log('hasSignificantValue(Débitos):', hasSignificantValue(cuenta302Test.Debitos));
  
  const hasAnyValue = (
    hasSignificantValue(cuenta302Test.SaldoActual) ||
    hasSignificantValue(cuenta302Test.Creditos) ||
    hasSignificantValue(cuenta302Test.Debitos)
  );
  
  console.log('hasAnyValue FINAL:', hasAnyValue);
}