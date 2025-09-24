// Script para diagnosticar el problema de parsing de CSV
const fs = require('fs');
const Papa = require('papaparse');

// Función de limpieza de números como en el código actual
function parseFloatCurrent(value) {
  const cleaned = String(value).replace(/[^\d.-]/g, '');
  const num = parseFloat(cleaned);
  console.log(`Valor original: "${value}" -> Limpiado: "${cleaned}" -> Número: ${num}`);
  return isNaN(num) ? 0 : num;
}

// Función de limpieza mejorada
function parseFloatImproved(value) {
  if (!value || value === '') return 0;
  
  // Convertir a string y limpiar espacios
  let cleaned = String(value).trim();
  
  // Manejar paréntesis como números negativos
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    cleaned = '-' + cleaned.slice(1, -1);
  }
  
  // Remover caracteres no numéricos excepto punto, coma y guión
  cleaned = cleaned.replace(/[^\d.,-]/g, '');
  
  // Si tiene tanto punto como coma, determinar cuál es el separador decimal
  if (cleaned.includes('.') && cleaned.includes(',')) {
    // Si el punto está después de la coma, la coma es separador de miles
    if (cleaned.lastIndexOf('.') > cleaned.lastIndexOf(',')) {
      cleaned = cleaned.replace(/,/g, '');
    } else {
      // Si la coma está después del punto, el punto es separador de miles
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    }
  } else if (cleaned.includes(',')) {
    // Solo coma: podría ser separador decimal o de miles
    const parts = cleaned.split(',');
    if (parts.length === 2 && parts[1].length <= 3) {
      // Probablemente separador decimal
      cleaned = cleaned.replace(',', '.');
    } else {
      // Probablemente separador de miles
      cleaned = cleaned.replace(/,/g, '');
    }
  }
  
  const num = parseFloat(cleaned);
  console.log(`Valor original: "${value}" -> Limpiado: "${cleaned}" -> Número: ${num}`);
  return isNaN(num) ? 0 : num;
}

// Leer y parsear el CSV
const csvContent = fs.readFileSync('balance_consolidado_formato_estandar.csv', 'utf8');

Papa.parse(csvContent, {
  header: true,
  skipEmptyLines: true,
  complete: (results) => {
    console.log('=== ANÁLISIS DE PARSING CSV ===');
    console.log(`Total de filas: ${results.data.length}`);
    
    // Analizar las primeras 5 filas
    console.log('\n=== PRIMERAS 5 FILAS ===');
    results.data.slice(0, 5).forEach((row, index) => {
      console.log(`\n--- Fila ${index + 1} ---`);
      console.log('Código:', row.Codigo);
      console.log('Descripción:', row.Descripcion);
      
      console.log('\n--- Parsing ACTUAL ---');
      console.log('SaldoInicial:', parseFloatCurrent(row.SaldoInicial));
      console.log('Debitos:', parseFloatCurrent(row.Debitos));
      console.log('Creditos:', parseFloatCurrent(row.Creditos));
      console.log('SaldoActual:', parseFloatCurrent(row.SaldoActual));
      
      console.log('\n--- Parsing MEJORADO ---');
      console.log('SaldoInicial:', parseFloatImproved(row.SaldoInicial));
      console.log('Debitos:', parseFloatImproved(row.Debitos));
      console.log('Creditos:', parseFloatImproved(row.Creditos));
      console.log('SaldoActual:', parseFloatImproved(row.SaldoActual));
    });
    
    // Calcular totales
    let totalActual = 0;
    let totalMejorado = 0;
    
    results.data.forEach(row => {
      totalActual += parseFloatCurrent(row.SaldoActual);
      totalMejorado += parseFloatImproved(row.SaldoActual);
    });
    
    console.log('\n=== TOTALES ===');
    console.log('Total con parsing actual:', totalActual);
    console.log('Total con parsing mejorado:', totalMejorado);
  },
  error: (error) => {
    console.error('Error parsing CSV:', error);
  }
});