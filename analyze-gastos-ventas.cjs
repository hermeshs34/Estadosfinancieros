const fs = require('fs');
const Papa = require('papaparse');

// Leer el CSV
const csvContent = fs.readFileSync('balance_consolidado_formato_estandar.csv', 'utf8');

console.log('🔍 Analizando códigos de gastos de ventas...');

// Parsear CSV
const parsed = Papa.parse(csvContent, {
  header: true,
  skipEmptyLines: true,
  transformHeader: (header) => header.trim()
});

const data = parsed.data;
console.log(`📊 Total de registros: ${data.length}`);

if (data.length > 0) {
  console.log('📋 Headers disponibles:', Object.keys(data[0]));
}

// Buscar códigos que podrían ser gastos de ventas
const gastosVentasCodes = [];
const allCodes = new Set();

for (const row of data) {
  const codigo = row.Codigo || row.codigo || row.Code || row.code || '';
  const descripcion = (row.Descripcion || row.descripcion || row.Description || row.description || '').toLowerCase();
  
  if (codigo) {
    allCodes.add(codigo);
    
    // Buscar códigos que empiecen con 6 o contengan "venta", "comercial", "marketing"
    if (codigo.toString().startsWith('6') || 
        descripcion.includes('venta') || 
        descripcion.includes('comercial') || 
        descripcion.includes('marketing') ||
        descripcion.includes('publicidad') ||
        descripcion.includes('promocion')) {
      
      const saldoActual = row.SaldoActual || row.saldoactual || '0';
      gastosVentasCodes.push({
        codigo: codigo,
        descripcion: row.Descripcion || row.descripcion || '',
        saldoActual: saldoActual
      });
    }
  }
}

console.log('\n🎯 Códigos relacionados con gastos de ventas encontrados:');
gastosVentasCodes.forEach(item => {
  console.log(`  ${item.codigo} - ${item.descripcion} (Saldo: ${item.saldoActual})`);
});

console.log('\n📝 Todos los códigos únicos (primeros 50):');
const sortedCodes = Array.from(allCodes).sort();
sortedCodes.slice(0, 50).forEach(code => {
  console.log(`  ${code}`);
});

console.log(`\n📊 Total de códigos únicos: ${allCodes.size}`);
console.log(`🎯 Códigos de gastos de ventas encontrados: ${gastosVentasCodes.length}`);

// Guardar resultados
fs.writeFileSync('gastos-ventas-analysis.json', JSON.stringify({
  totalRegistros: data.length,
  totalCodigosUnicos: allCodes.size,
  gastosVentasEncontrados: gastosVentasCodes.length,
  gastosVentasCodes: gastosVentasCodes,
  todosLosCodigos: sortedCodes
}, null, 2));

console.log('\n✅ Análisis guardado en gastos-ventas-analysis.json');