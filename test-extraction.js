// Script temporal para probar la extracción de datos
const testData = [
  {
    "Codigo": "1105",
    "Descripcion": "CAJA GENERAL",
    "SaldoInicial": "50000.00",
    "Debitos": "25000.00",
    "Creditos": "15000.00",
    "SaldoActual": "60000.00"
  },
  {
    "Codigo": "1110",
    "Descripcion": "BANCOS",
    "SaldoInicial": "100000.00",
    "Debitos": "50000.00",
    "Creditos": "30000.00",
    "SaldoActual": "120000.00"
  },
  {
    "Codigo": "4135",
    "Descripcion": "INGRESOS POR VENTAS",
    "SaldoInicial": "0.00",
    "Debitos": "0.00",
    "Creditos": "500000.00",
    "SaldoActual": "500000.00"
  }
];

console.log('=== TESTING DATA EXTRACTION ===');
console.log('Test data:', testData);

// Simular la lógica de extracción
testData.forEach((item, index) => {
  console.log(`Processing item ${index}:`, item);
  Object.keys(item).forEach(key => {
    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const value = parseFloat(item[key]) || 0;
    
    if (value > 0) {
      console.log(`Found value: ${key} -> ${normalizedKey} = ${value}`);
      
      // Verificar patrones de ingresos
      if (normalizedKey.includes('ingreso') || normalizedKey.includes('venta') || normalizedKey.includes('revenue')) {
        console.log(`MATCH: Revenue pattern found for ${key}`);
      }
      
      // Verificar patrones de activos
      if (normalizedKey.includes('activo') || normalizedKey.includes('asset')) {
        console.log(`MATCH: Asset pattern found for ${key}`);
      }
    }
  });
});

console.log('=== END TEST ===');