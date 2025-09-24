const fs = require('fs');
const Papa = require('papaparse');

// Función corregida para verificar valores significativos
function hasSignificantValue(value) {
  if (value === undefined || value === null || value === '') return false;
  const numValue = parseFloat(String(value).replace(/[^\d.,-]/g, '').replace(',', '.'));
  return !isNaN(numValue) && Math.abs(numValue) > 0.001;
}

// Leer el CSV
const csvContent = fs.readFileSync('balance_consolidado_formato_estandar.csv', 'utf8');

console.log('🔧 VERIFICANDO LA CORRECCIÓN DEL FILTRADO');
console.log('='.repeat(50));

Papa.parse(csvContent, {
  header: true,
  skipEmptyLines: true,
  complete: (results) => {
    const data = results.data;
    
    console.log('📊 Total registros parseados:', data.length);
    
    // Aplicar el filtro corregido
    const filteredData = data.filter(row => {
      const codigo = String(row.Codigo || row.codigo || '').trim();
      const descripcion = String(row.Descripcion || row.descripcion || '').toLowerCase().trim();
      
      const isEmptyRow = !codigo && !descripcion;
      const isSoftwareHeader = descripcion.includes('profit plus') || descripcion.includes('usuario:');
      
      const hasCode = codigo.length > 0;
      const hasDescription = descripcion.length > 2;
      const hasAnyValue = (
        hasSignificantValue(row.SaldoActual) ||
        hasSignificantValue(row.Debitos) ||
        hasSignificantValue(row.Creditos) ||
        hasSignificantValue(row.SaldoInicial)
      );
      
      return !isEmptyRow && !isSoftwareHeader && (hasCode || hasDescription || hasAnyValue);
    });
    
    console.log('✅ Total registros después del filtro:', filteredData.length);
    
    // Analizar registros con valores significativos
    const recordsWithValues = filteredData.filter(row => 
      hasSignificantValue(row.SaldoActual) ||
      hasSignificantValue(row.Debitos) ||
      hasSignificantValue(row.Creditos) ||
      hasSignificantValue(row.SaldoInicial)
    );
    
    console.log('💰 Registros con valores significativos:', recordsWithValues.length);
    
    // Mostrar algunos ejemplos
    console.log('\n📋 EJEMPLOS DE REGISTROS CON VALORES:');
    console.log('='.repeat(50));
    
    recordsWithValues.slice(0, 10).forEach((row, i) => {
      console.log(`\n${i + 1}. ${row.Codigo} - ${row.Descripcion}`);
      console.log(`   SaldoActual: ${row.SaldoActual} (significativo: ${hasSignificantValue(row.SaldoActual)})`);
      console.log(`   Débitos: ${row.Debitos} (significativo: ${hasSignificantValue(row.Debitos)})`);
      console.log(`   Créditos: ${row.Creditos} (significativo: ${hasSignificantValue(row.Creditos)})`);
    });
    
    // Verificar que los códigos de activos están incluidos
    const activoCodes = recordsWithValues.filter(row => 
      row.Codigo && row.Codigo.startsWith('201-01-')
    );
    
    console.log('\n🏦 CÓDIGOS DE ACTIVO ENCONTRADOS:');
    console.log('='.repeat(50));
    console.log('Total códigos 201-01-*:', activoCodes.length);
    
    activoCodes.slice(0, 5).forEach(row => {
      console.log(`${row.Codigo}: ${row.SaldoActual}`);
    });
    
    console.log('\n🎯 RESUMEN DE LA CORRECCIÓN:');
    console.log('='.repeat(50));
    console.log('✅ Problema identificado: Comparación incorrecta de strings vs números');
    console.log('✅ Solución aplicada: Función hasSignificantValue() que parsea valores');
    console.log('✅ Registros recuperados:', recordsWithValues.length, 'de', data.length, 'totales');
    console.log('✅ Los saldos ya NO deberían estar en cero en la aplicación');
  },
  error: (error) => {
    console.error('❌ Error:', error.message);
  }
});