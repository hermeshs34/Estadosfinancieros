// Script de prueba para verificar el mapeo de códigos
const fs = require('fs');
const Papa = require('papaparse');

// Función de mapeo (copiada de financialAnalysis.ts)
function mapCsvCodeToTraditional(csvCode) {
  const code = csvCode.toString();
  const mappings = {
    // Activos (códigos que empiezan con 1 o 201)
    '201-01-': ['1', '11', '111'], // Activo Corriente
    '201-02-': ['1', '12', '121'], // Activo No Corriente
    '201-03-': ['1', '13', '131'], // Otros Activos
    
    // Pasivos (códigos que empiezan con 2 o 202)
    '202-01-': ['2', '21', '211'], // Pasivo Corriente
    '202-02-': ['2', '22', '221'], // Pasivo No Corriente
    
    // Patrimonio (códigos que empiezan con 3 o 203)
    '203-01-': ['3', '31', '311'], // Capital
    '203-02-': ['3', '32', '321'], // Resultados
    
    // Ingresos (códigos que empiezan con 4 o 204)
    '204-01-': ['4', '41', '411'], // Ingresos Operacionales
    '204-02-': ['4', '42', '421'], // Otros Ingresos
    
    // Gastos (códigos que empiezan con 5 o 205)
    '205-01-': ['5', '51', '511'], // Gastos Operacionales
    '205-02-': ['5', '52', '521'], // Gastos Financieros
  };
  
  // Buscar mapeo por prefijo
  for (const [prefix, traditionalCodes] of Object.entries(mappings)) {
    if (code.startsWith(prefix)) {
      return traditionalCodes;
    }
  }
  
  // Si no hay mapeo específico, usar el código tal como está
  return [code];
}

// Leer el CSV y probar el mapeo
const csvContent = fs.readFileSync('balance_consolidado_formato_estandar.csv', 'utf8');

Papa.parse(csvContent, {
  header: true,
  skipEmptyLines: true,
  complete: (results) => {
    console.log('📊 Probando mapeo de códigos...');
    
    // Tomar los primeros 10 registros con valores no cero
    const recordsWithValues = results.data.filter(row => {
      const saldoActual = parseFloat(row.SaldoActual || 0);
      return saldoActual !== 0;
    }).slice(0, 10);
    
    console.log(`\n🔍 Encontrados ${recordsWithValues.length} registros con valores no cero:`);
    
    recordsWithValues.forEach((row, i) => {
      const codigo = row.Codigo;
      const mappedCodes = mapCsvCodeToTraditional(codigo);
      const saldoActual = row.SaldoActual;
      
      console.log(`\n${i + 1}. Código original: ${codigo}`);
      console.log(`   Códigos mapeados: [${mappedCodes.join(', ')}]`);
      console.log(`   SaldoActual: ${saldoActual}`);
      console.log(`   Descripción: ${row.Descripcion}`);
      
      // Verificar si coincidiría con códigos que busca calculateActivoTotal
      const codigosBuscadosActivo = ['1101', '1102', '1103', '1104', '1301', '1302', '1303', '1201', '1202', '1203', '1401', '1402', '1403', '14', '1.1', '1.2', '1.3'];
      const coincidencias = codigosBuscadosActivo.filter(searchCode => {
        return mappedCodes.some(mappedCode => 
          mappedCode === searchCode || mappedCode.startsWith(searchCode) || searchCode.startsWith(mappedCode)
        );
      });
      
      if (coincidencias.length > 0) {
        console.log(`   ✅ COINCIDE con códigos de activo: [${coincidencias.join(', ')}]`);
      } else {
        console.log(`   ❌ NO coincide con códigos de activo buscados`);
      }
    });
  }
});