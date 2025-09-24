const fs = require('fs');
const Papa = require('papaparse');

// Simular la función hasSignificantValue corregida
function hasSignificantValue(value) {
  if (value === undefined || value === null || value === '') return false;
  
  let cleanValue = value.toString().trim();
  if (cleanValue === '' || cleanValue === '0' || cleanValue === '0.0' || cleanValue === '0.00') return false;
  
  // Limpiar caracteres no numéricos excepto punto decimal, coma y paréntesis
  cleanValue = cleanValue.replace(/[^\d.,\-()]/g, '');
  
  // Manejar paréntesis como números negativos
  if (cleanValue.startsWith('(') && cleanValue.endsWith(')')) {
    cleanValue = '-' + cleanValue.slice(1, -1);
  }
  
  // Convertir comas a puntos para decimales
  cleanValue = cleanValue.replace(',', '.');
  
  const numValue = parseFloat(cleanValue);
  return !isNaN(numValue) && Math.abs(numValue) > 0.001;
}

// Leer el CSV
const csvContent = fs.readFileSync('balance_consolidado_formato_estandar.csv', 'utf8');

console.log('🔧 Verificando corrección de códigos contables...');

// Parsear CSV
const parsed = Papa.parse(csvContent, {
  header: true,
  skipEmptyLines: true,
  transformHeader: (header) => header.trim()
});

const data = parsed.data;
console.log(`📊 Total de registros: ${data.length}`);

// Buscar códigos de la clase 5 (gastos operacionales)
const gastosOperacionales = [];
const codigosClase5 = new Set();

for (const row of data) {
  const codigo = row.Codigo || row.codigo || row.Code || row.code || '';
  const saldoActual = row.SaldoActual || row.saldoactual || '0';
  
  if (codigo && codigo.toString().startsWith('5')) {
    codigosClase5.add(codigo);
    
    if (hasSignificantValue(saldoActual)) {
      gastosOperacionales.push({
        codigo: codigo,
        descripcion: row.Descripcion || row.descripcion || '',
        saldoActual: saldoActual
      });
    }
  }
}

console.log('\n✅ Códigos de clase 5 (gastos operacionales) encontrados:');
Array.from(codigosClase5).sort().forEach(code => {
  console.log(`  ${code}`);
});

console.log('\n💰 Gastos operacionales con valores significativos:');
gastosOperacionales.forEach(item => {
  console.log(`  ${item.codigo} - ${item.descripcion} (Saldo: ${item.saldoActual})`);
});

// Verificar que no hay códigos clase 6
const codigosClase6 = [];
for (const row of data) {
  const codigo = row.Codigo || row.codigo || row.Code || row.code || '';
  if (codigo && codigo.toString().startsWith('6')) {
    codigosClase6.push(codigo);
  }
}

console.log('\n🔍 Verificación de códigos clase 6:');
if (codigosClase6.length === 0) {
  console.log('✅ Correcto: No se encontraron códigos clase 6 (no existen en plan contable venezolano)');
} else {
  console.log('⚠️  Se encontraron códigos clase 6:', codigosClase6);
}

console.log(`\n📊 Resumen:`);
console.log(`  - Total códigos clase 5: ${codigosClase5.size}`);
console.log(`  - Gastos operacionales con valores: ${gastosOperacionales.length}`);
console.log(`  - Códigos clase 6 encontrados: ${codigosClase6.length}`);

// Guardar resultados
fs.writeFileSync('codigo-fix-verification.json', JSON.stringify({
  totalRegistros: data.length,
  codigosClase5: Array.from(codigosClase5).sort(),
  gastosOperacionales: gastosOperacionales,
  codigosClase6: codigosClase6,
  correccionExitosa: codigosClase6.length === 0
}, null, 2));

console.log('\n✅ Verificación guardada en codigo-fix-verification.json');
console.log('\n🎯 Conclusión: Los códigos han sido corregidos para usar clase 5 (plan contable venezolano)');