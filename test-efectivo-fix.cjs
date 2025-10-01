const fs = require('fs');

console.log('🔧 PRUEBA: Corrección del Efectivo (Cuentas 203-06 y 203-11)');
console.log('===========================================================');

// Simular la lógica corregida de DataContext
function testEfectivoClassification() {
  console.log('\n🧪 SIMULANDO LÓGICA CORREGIDA:');
  console.log('==============================');
  
  // Datos de prueba basados en el CSV real
  const testData = [
    {
      Codigo: '203-06-001',
      Descripcion: 'INVERSIONES EN EL EXTRANJERO, BANCOS',
      SaldoActual: '84615090.17'
    },
    {
      Codigo: '203-11-001', 
      Descripcion: 'DISPONIBLE, CAJA CHICA',
      SaldoActual: '24569.52'
    },
    {
      Codigo: '203-01-001',
      Descripcion: 'CAPITAL SOCIAL',
      SaldoActual: '1000000.00'
    }
  ];
  
  let balanceSheet = {
    efectivo: 0,
    cash: 0,
    currentAssets: 0,
    totalCurrentAssets: 0,
    activosCorrientes: 0,
    patrimonio: 0
  };
  
  testData.forEach((item) => {
    const description = (item.Descripcion || '').toLowerCase();
    const codigoStr = item.Codigo || '';
    
    const parseValue = (val) => {
      if (val === null || val === undefined || val === '') return 0;
      if (typeof val === 'number') return val;
      if (typeof val === 'string') {
        return parseFloat(val.replace(/[^\d.,-]/g, '').replace(',', '.')) || 0;
      }
      return 0;
    };
    
    const value = parseValue(item.SaldoActual);
    
    console.log(`\n📋 Procesando: ${codigoStr} - ${item.Descripcion} - Valor: ${value}`);
    
    // LÓGICA CORREGIDA: Efectivo y Bancos
    if (
      codigoStr.startsWith('201-01') || codigoStr.startsWith('203-11') || codigoStr.startsWith('203-06') ||
      codigoStr.startsWith('1101') || codigoStr.startsWith('1.101') ||
      description.includes('caja') || description.includes('banco') || description.includes('efectivo') ||
      description.includes('disponible') || description.includes('DEPOSITOS A LA VISTA') ||
      description.includes('DISPONIBLE') || description.includes('CAJA CHICA') ||
      description.includes('INVERSIONES EN EL EXTRANJERO') || description.includes('BANCOS')
    ) {
      console.log('   ✅ CLASIFICADO COMO EFECTIVO');
      balanceSheet.efectivo += value;
      balanceSheet.cash += value;
      balanceSheet.currentAssets += value;
      balanceSheet.totalCurrentAssets += value;
      balanceSheet.activosCorrientes += value;
    }
    // Patrimonio
    else if (codigoStr.startsWith('203-01') || codigoStr.startsWith('203-02')) {
      console.log('   ✅ CLASIFICADO COMO PATRIMONIO');
      balanceSheet.patrimonio += value;
    }
    else {
      console.log('   ⚠️ NO CLASIFICADO');
    }
  });
  
  console.log('\n📊 RESULTADOS FINALES:');
  console.log('======================');
  console.log(`💰 Efectivo: ${balanceSheet.efectivo.toLocaleString()}`);
  console.log(`💰 Cash: ${balanceSheet.cash.toLocaleString()}`);
  console.log(`📈 Activos Corrientes: ${balanceSheet.currentAssets.toLocaleString()}`);
  console.log(`🏛️ Patrimonio: ${balanceSheet.patrimonio.toLocaleString()}`);
  
  // Verificar que el efectivo sea correcto
  const expectedEfectivo = 84615090.17 + 24569.52;
  if (Math.abs(balanceSheet.efectivo - expectedEfectivo) < 0.01) {
    console.log('\n✅ CORRECCIÓN EXITOSA: El efectivo se calcula correctamente');
    console.log(`   Esperado: ${expectedEfectivo.toLocaleString()}`);
    console.log(`   Obtenido: ${balanceSheet.efectivo.toLocaleString()}`);
  } else {
    console.log('\n❌ ERROR: El efectivo no se calcula correctamente');
    console.log(`   Esperado: ${expectedEfectivo.toLocaleString()}`);
    console.log(`   Obtenido: ${balanceSheet.efectivo.toLocaleString()}`);
  }
}

// Ejecutar prueba
testEfectivoClassification();

console.log('\n🎯 PRÓXIMOS PASOS:');
console.log('==================');
console.log('1. La lógica ha sido corregida en DataContext.tsx');
console.log('2. Las cuentas 203-06 y 203-11 ahora se clasifican como efectivo');
console.log('3. Se agregaron las descripciones específicas para mejor detección');
console.log('4. Recarga la aplicación para ver los cambios');
console.log('5. El efectivo debería mostrar el valor correcto en el balance');