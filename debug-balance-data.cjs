const fs = require('fs');
const path = require('path');

// Simular la función createFinancialAnalysis para ver qué estructura genera
function debugBalanceData() {
  console.log('🔍 Verificando estructura de datos del balance...');
  
  // Cargar el archivo CSV que está siendo usado
  const csvPath = path.join(__dirname, 'balance_consolidado_formato_estandar.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.log('❌ No se encontró el archivo balance_consolidado_formato_estandar.csv');
    return;
  }
  
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n').filter(line => line.trim());
  
  console.log(`📄 Archivo CSV cargado: ${lines.length} líneas`);
  
  // Parsear el CSV
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  console.log('📋 Headers encontrados:', headers);
  
  const data = [];
  for (let i = 1; i < Math.min(lines.length, 20); i++) { // Solo primeros 20 registros para debug
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    const record = {};
    headers.forEach((header, index) => {
      record[header] = values[index] || '';
    });
    data.push(record);
  }
  
  console.log('\n📊 Primeros 5 registros:');
  data.slice(0, 5).forEach((record, index) => {
    console.log(`${index + 1}.`, record);
  });
  
  // Simular la función extractBalanceSheetData
  console.log('\n🔄 Simulando extractBalanceSheetData...');
  
  const balanceSheet = {
    currentAssets: 0,
    nonCurrentAssets: 0,
    totalAssets: 0,
    currentLiabilities: 0,
    longTermDebt: 0,
    totalLiabilities: 0,
    totalEquity: 0,
    efectivo: 0,
    inventory: 0,
    accountsReceivable: 0,
    totalCurrentAssets: 0,
    totalNonCurrentAssets: 0,
    fixedAssets: 0,
    intangibleAssets: 0,
    totalCurrentAssets: 0,
    totalNonCurrentAssets: 0,
    accountsPayable: 0,
    shortTermDebt: 0,
    totalCurrentLiabilities: 0,
    totalNonCurrentLiabilities: 0,
    equity: 0,
    retainedEarnings: 0
  };
  
  let processedCount = 0;
  
  data.forEach((item) => {
    const description = (item.Descripcion || item.descripcion || item.Description || item.Cuenta || item.cuenta || item['Descripción'] || '').toLowerCase();
    const codigo = item.Codigo || item.codigo || item.Code || item['Código'] || '';
    
    let value = 0;
    // Buscar múltiples formatos de columnas de saldo
    if (item.SaldoActual) value = parseFloat(item.SaldoActual.replace(/[^\d.,-]/g, '').replace(',', '.')) || 0;
    else if (item.saldoactual) value = parseFloat(item.saldoactual.replace(/[^\d.,-]/g, '').replace(',', '.')) || 0;
    else if (item.Saldo) value = parseFloat(item.Saldo.replace(/[^\d.,-]/g, '').replace(',', '.')) || 0;
    else if (item.Valor) value = parseFloat(item.Valor.replace(/[^\d.,-]/g, '').replace(',', '.')) || 0;
    else if (item.Value) value = parseFloat(item.Value.replace(/[^\d.,-]/g, '').replace(',', '.')) || 0;
    else if (item['Saldo Actual']) value = parseFloat(item['Saldo Actual'].replace(/[^\d.,-]/g, '').replace(',', '.')) || 0;
    
    if (value !== 0) {
      processedCount++;
      console.log(`✅ Procesando: ${codigo} - ${description} = ${value}`);
      
      const codigoStr = codigo.toString();
      
      // Clasificar según código del plan contable venezolano
      // ACTIVOS (Códigos 201-xxx para el plan contable venezolano)
      if (codigoStr.startsWith('201')) {
        // Activos corrientes - Disponible (201-01)
        if (codigoStr.startsWith('201-01')) {
          console.log(`💰 Clasificando como Efectivo: ${codigoStr} - ${description} = ${value}`);
          balanceSheet.efectivo += value;
          balanceSheet.currentAssets += value;
          balanceSheet.totalCurrentAssets += value;
        }
        // Cuentas por cobrar (201-02)
        else if (codigoStr.startsWith('201-02')) {
          console.log(`📝 Clasificando como Cuentas por Cobrar: ${codigoStr} - ${description} = ${value}`);
          balanceSheet.accountsReceivable += value;
          balanceSheet.currentAssets += value;
          balanceSheet.totalCurrentAssets += value;
        }
        // Inventarios (201-03)
        else if (codigoStr.startsWith('201-03')) {
          console.log(`📦 Clasificando como Inventarios: ${codigoStr} - ${description} = ${value}`);
          balanceSheet.inventory += value;
          balanceSheet.currentAssets += value;
          balanceSheet.totalCurrentAssets += value;
        }
        // Otros activos corrientes (201-04, 201-05, etc.)
        else if (codigoStr.startsWith('201-04') || codigoStr.startsWith('201-05') || codigoStr.startsWith('201-06') || codigoStr.startsWith('201-07') || codigoStr.startsWith('201-08') || codigoStr.startsWith('201-09')) {
          console.log(`📊 Clasificando como Otros Activos Corrientes: ${codigoStr} - ${description} = ${value}`);
          balanceSheet.currentAssets += value;
          balanceSheet.totalCurrentAssets += value;
        }
        // Cualquier otro código 201 que no sea específicamente clasificado
        else {
          console.log(`⚠️ Código 201 no clasificado específicamente: ${codigoStr} - ${description} = ${value}`);
          balanceSheet.currentAssets += value;
          balanceSheet.totalCurrentAssets += value;
        }
      }
      // Activos no corrientes (202-xxx)
      else if (codigoStr.startsWith('202')) {
        balanceSheet.nonCurrentAssets += value;
        balanceSheet.totalNonCurrentAssets += value;
        
        if (description.includes('edificio') || description.includes('terreno') || description.includes('maquinaria') || description.includes('equipo')) {
          balanceSheet.fixedAssets += value;
        } else if (description.includes('intangible') || description.includes('marca') || description.includes('patente')) {
          balanceSheet.intangibleAssets += value;
        }
      }
      
      // PASIVOS (Códigos 301-xxx)
      else if (codigoStr.startsWith('301')) {
        // Pasivos corrientes
        if (codigoStr.startsWith('301-01') || description.includes('cuenta') && description.includes('pagar')) {
          balanceSheet.currentLiabilities += value;
          balanceSheet.totalCurrentLiabilities += value;
          balanceSheet.accountsPayable += value;
        }
        // Deudas a corto plazo
        else if (codigoStr.startsWith('301-02') || description.includes('prestamo') || description.includes('deuda')) {
          balanceSheet.currentLiabilities += value;
          balanceSheet.totalCurrentLiabilities += value;
          balanceSheet.shortTermDebt += value;
        }
      }
      // Pasivos no corrientes (302-xxx)
      else if (codigoStr.startsWith('302')) {
        balanceSheet.longTermDebt += value;
        balanceSheet.totalNonCurrentLiabilities += value;
      }
      
      // PATRIMONIO (Códigos 401-xxx)
      else if (codigoStr.startsWith('401')) {
        balanceSheet.totalEquity += value;
        if (description.includes('capital')) {
          balanceSheet.equity += value;
        } else if (description.includes('utilidad') || description.includes('ganancia') || description.includes('resultado')) {
          balanceSheet.retainedEarnings += value;
        }
      }
    }
  });
  
  // Calcular totales
  balanceSheet.totalAssets = balanceSheet.currentAssets + balanceSheet.nonCurrentAssets;
  balanceSheet.totalLiabilities = balanceSheet.currentLiabilities + balanceSheet.longTermDebt;
  
  console.log(`\n📊 Registros procesados con valores: ${processedCount}`);
  console.log('\n🏦 Balance Sheet generado:');
  console.log(JSON.stringify(balanceSheet, null, 2));
  
  // Verificar si hay valores
  const hasValues = Object.values(balanceSheet).some(val => val !== 0);
  console.log(`\n${hasValues ? '✅' : '❌'} ¿Tiene valores el balance? ${hasValues}`);
  
  if (!hasValues) {
    console.log('\n🔍 Analizando por qué no hay valores...');
    console.log('Headers disponibles:', headers);
    console.log('Ejemplo de registro:', data[0]);
    
    // Buscar columnas que podrían contener valores
    const sampleRecord = data[0];
    Object.keys(sampleRecord).forEach(key => {
      const value = sampleRecord[key];
      if (value && !isNaN(parseFloat(value))) {
        console.log(`💡 Columna con números: ${key} = ${value}`);
      }
    });
  }
}

// Ejecutar debug
debugBalanceData();