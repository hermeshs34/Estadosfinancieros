const fs = require('fs');
const Papa = require('papaparse');

// Función para normalizar texto (copiada del utils)
function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

// Función para limpiar valores numéricos (copiada de DataImport)
function cleanNumericValue(value) {
  if (!value || value === '') return 0;
  
  let cleaned = String(value).trim();
  
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    cleaned = '-' + cleaned.slice(1, -1);
  }
  
  cleaned = cleaned.replace(/[^\d.,-]/g, '');
  
  if (cleaned.includes('.') && cleaned.includes(',')) {
    if (cleaned.lastIndexOf('.') > cleaned.lastIndexOf(',')) {
      cleaned = cleaned.replace(/,/g, '');
    } else {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    }
  } else if (cleaned.includes(',')) {
    const parts = cleaned.split(',');
    if (parts.length === 2 && parts[1].length <= 3) {
      cleaned = cleaned.replace(',', '.');
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
  }
  
  const num = parseFloat(cleaned);
  console.log(`🔢 Parsing: "${value}" -> "${cleaned}" -> ${num}`);
  return isNaN(num) ? 0 : num;
}

// Función de filtrado (copiada de DataImport)
function filterFinancialData(data) {
  console.log('🔍 Datos antes del filtro:', data.length);
  console.log('📋 Ejemplo de datos sin filtrar:', data.slice(0, 3));
  
  const filteredData = data.filter(row => {
    const codigo = String(row.codigo || row.Codigo || row.code || row.Code || row.cuenta || row.Cuenta || '').trim();
    const descripcion = String(
      row.descripcion || row.Descripcion || row.Description || row.cuenta || row.Cuenta || ''
    ).toLowerCase().trim();

    const isEmptyRow = !codigo && !descripcion && 
      !row.saldoactual && !row.SaldoActual && !row.Saldo && !row.Valor && !row.debitos && !row.Debitos && !row.creditos && !row.Creditos;
    
    const isSoftwareHeader = (
      descripcion.includes('profit plus') ||
      descripcion.includes('usuario:') ||
      descripcion.includes('página:') ||
      descripcion.includes('r.i.f.:') ||
      descripcion.includes('fecha:') ||
      descripcion.includes('hora:') ||
      descripcion.includes('contabilidad')
    );

    const hasCode = codigo.length > 0;
    const hasDescription = descripcion.length > 2;
    const hasAnyValue = (
      (row.saldoactual !== undefined && row.saldoactual !== '' && row.saldoactual !== null && row.saldoactual !== '0.0') ||
      (row.SaldoActual !== undefined && row.SaldoActual !== '' && row.SaldoActual !== null && row.SaldoActual !== '0.0') ||
      (row.Saldo !== undefined && row.Saldo !== '' && row.Saldo !== null && row.Saldo !== '0.0') ||
      (row.Valor !== undefined && row.Valor !== '' && row.Valor !== null && row.Valor !== '0.0') ||
      (row.debitos !== undefined && row.debitos !== '' && row.debitos !== null && row.debitos !== '0.0') ||
      (row.Debitos !== undefined && row.Debitos !== '' && row.Debitos !== null && row.Debitos !== '0.0') ||
      (row.creditos !== undefined && row.creditos !== '' && row.creditos !== null && row.creditos !== '0.0') ||
      (row.Creditos !== undefined && row.Creditos !== '' && row.Creditos !== null && row.Creditos !== '0.0') ||
      (row.saldoinicial !== undefined && row.saldoinicial !== '' && row.saldoinicial !== null && row.saldoinicial !== '0.0') ||
      (row.SaldoInicial !== undefined && row.SaldoInicial !== '' && row.SaldoInicial !== null && row.SaldoInicial !== '0.0')
    );

    const shouldInclude = !isEmptyRow && !isSoftwareHeader && (hasCode || hasDescription || hasAnyValue);
    
    if (!shouldInclude) {
      console.log('🚫 Fila filtrada:', { codigo, descripcion, hasCode, hasDescription, hasAnyValue });
    } else {
      console.log('✅ Fila incluida:', { codigo, descripcion, hasCode, hasDescription, hasAnyValue });
    }
    
    return shouldInclude;
  }).map(row => {
    const cleanedRow = { ...row };
    
    const numericFields = ['saldoactual', 'SaldoActual', 'Saldo', 'Valor', 'Value', 'debitos', 'Debitos', 'creditos', 'Creditos', 'saldoinicial', 'SaldoInicial'];
    numericFields.forEach(field => {
      if (cleanedRow[field] !== undefined && cleanedRow[field] !== null) {
        const numValue = cleanNumericValue(cleanedRow[field]);
        if (!isNaN(numValue)) {
          cleanedRow[field] = numValue;
        }
      }
    });
    
    return cleanedRow;
  });
  
  console.log('✅ Datos después del filtro:', filteredData.length);
  console.log('📊 Ejemplo de datos filtrados:', filteredData.slice(0, 3));
  
  return filteredData;
}

// Leer y procesar el CSV
const csvContent = fs.readFileSync('balance_consolidado_formato_estandar.csv', 'utf8');

console.log('🚀 INICIANDO DEPURACIÓN DEL PROCESAMIENTO CSV');
console.log('='.repeat(50));

Papa.parse(csvContent, {
  header: true,
  skipEmptyLines: true,
  transformHeader: (header) => normalizeText(header.trim()),
  complete: (results) => {
    console.log('📊 Datos parseados del CSV:', results.data.length);
    console.log('📋 Primeros 3 registros parseados:');
    results.data.slice(0, 3).forEach((row, i) => {
      console.log(`Registro ${i + 1}:`, row);
    });
    
    const jsonData = results.data;
    const filteredData = filterFinancialData(jsonData);
    
    console.log('\n💰 ANÁLISIS DE VALORES NUMÉRICOS:');
    console.log('='.repeat(50));
    
    filteredData.slice(0, 5).forEach((row, i) => {
      console.log(`\nRegistro ${i + 1}:`);
      console.log('  Código:', row.codigo || row.Codigo);
      console.log('  Descripción:', row.descripcion || row.Descripcion);
      console.log('  SaldoActual:', row.saldoactual || row.SaldoActual, '(tipo:', typeof (row.saldoactual || row.SaldoActual), ')');
      console.log('  Débitos:', row.debitos || row.Debitos, '(tipo:', typeof (row.debitos || row.Debitos), ')');
      console.log('  Créditos:', row.creditos || row.Creditos, '(tipo:', typeof (row.creditos || row.Creditos), ')');
    });
    
    console.log('\n🎯 RESUMEN FINAL:');
    console.log('='.repeat(50));
    console.log('Total registros parseados:', results.data.length);
    console.log('Total registros filtrados:', filteredData.length);
    console.log('Registros con SaldoActual > 0:', filteredData.filter(r => (r.saldoactual || r.SaldoActual || 0) > 0).length);
    console.log('Registros con valores numéricos:', filteredData.filter(r => 
      (r.saldoactual || r.SaldoActual || 0) !== 0 || 
      (r.debitos || r.Debitos || 0) !== 0 || 
      (r.creditos || r.Creditos || 0) !== 0
    ).length);
  },
  error: (error) => {
    console.error('❌ Error parsing CSV:', error.message);
  }
});