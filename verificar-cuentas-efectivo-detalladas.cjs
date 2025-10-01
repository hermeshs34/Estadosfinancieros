const fs = require('fs');
const path = require('path');

console.log('🔍 VERIFICACIÓN DETALLADA DE CUENTAS DE EFECTIVO');
console.log('='.repeat(60));

// Leer el CSV
const csvPath = path.join(__dirname, 'balance_consolidado_formato_estandar.csv');

if (!fs.existsSync(csvPath)) {
  console.log('❌ No se encontró el archivo CSV:', csvPath);
  process.exit(1);
}

const csvContent = fs.readFileSync(csvPath, 'utf-8');
const lines = csvContent.split('\n').filter(line => line.trim());

console.log(`📊 Archivo CSV cargado: ${lines.length} líneas`);
console.log('');

// Cuentas específicas a verificar (usando formato con puntos como en el CSV)
const cuentasEspecificas = [
  '2.201.01',         // DISPONIBLE (principal)
  '2.201.01.01',      // DEPÓSITOS A LA VISTA (equivale a CAJA PRINCIPAL)
  '2.201.01.01.01',   // BANCOS
  '2.201.01.01.01.01', // MONEDA NACIONAL
  '2.201.01.01.01.02', // MONEDA EXTRANJERA
  '2.201.01.02',      // DEPÓSITOS A PLAZO FIJO
  '203-11',           // DISPONIBLE (formato con guiones)
  '203-11-02',        // CAJA CHICA
  '202-01'            // EFECTIVOS DEPOSITADOS EN BANCOS
];

console.log('🎯 CUENTAS ESPECÍFICAS A VERIFICAR:');
console.log('='.repeat(40));
cuentasEspecificas.forEach((cuenta, index) => {
  console.log(`${index + 1}. ${cuenta}`);
});
console.log('');

// Analizar cada línea
const cuentasEncontradas = [];
let totalEfectivo = 0;

lines.forEach((line, index) => {
  if (index === 0) return; // Skip header
  
  const columns = line.split(',');
  if (columns.length < 3) return;
  
  const codigo = columns[0]?.trim().replace(/"/g, '');
  const descripcion = columns[1]?.trim().replace(/"/g, '');
  const valorStr = columns[2]?.trim().replace(/"/g, '');
  
  if (!codigo || !valorStr) return;
  
  const valor = parseFloat(valorStr.replace(/[^\d.-]/g, '')) || 0;
  
  // Verificar si coincide con alguna cuenta específica
  const coincide = cuentasEspecificas.some(cuentaEspecifica => {
    return codigo.startsWith(cuentaEspecifica) || codigo === cuentaEspecifica;
  }) || 
  // También buscar por descripción de efectivo
  descripcion.toLowerCase().includes('disponible') ||
  descripcion.toLowerCase().includes('caja') ||
  descripcion.toLowerCase().includes('banco') ||
  descripcion.toLowerCase().includes('efectivo') ||
  descripcion.toLowerCase().includes('depósito');
  
  if (coincide && valor !== 0) {
    cuentasEncontradas.push({
      codigo,
      descripcion,
      valor,
      valorFormateado: new Intl.NumberFormat('es-VE', {
        style: 'currency',
        currency: 'VES',
        minimumFractionDigits: 2
      }).format(valor)
    });
    totalEfectivo += valor;
  }
});

// Ordenar por valor descendente
cuentasEncontradas.sort((a, b) => b.valor - a.valor);

console.log('✅ CUENTAS DE EFECTIVO ENCONTRADAS:');
console.log('='.repeat(50));

if (cuentasEncontradas.length === 0) {
  console.log('❌ No se encontraron cuentas de efectivo');
} else {
  cuentasEncontradas.forEach((cuenta, index) => {
    console.log(`${index + 1}. ${cuenta.codigo.padEnd(20)} | ${cuenta.valorFormateado.padStart(20)} | ${cuenta.descripcion}`);
  });
}

console.log('');
console.log('💰 RESUMEN TOTAL:');
console.log('='.repeat(30));
console.log(`Total de cuentas encontradas: ${cuentasEncontradas.length}`);
console.log(`Valor total de efectivo: ${new Intl.NumberFormat('es-VE', {
  style: 'currency',
  currency: 'VES',
  minimumFractionDigits: 2
}).format(totalEfectivo)}`);

console.log('');
console.log('🔍 VERIFICACIÓN POR CATEGORÍA:');
console.log('='.repeat(35));

// Verificar cada categoría específica
const categorias = {
  '2.201.01': 'DISPONIBLE (Principal)',
  '2.201.01.01': 'DEPÓSITOS A LA VISTA',
  '2.201.01.01.01': 'BANCOS',
  '2.201.01.01.01.01': 'MONEDA NACIONAL',
  '2.201.01.01.01.02': 'MONEDA EXTRANJERA',
  '2.201.01.02': 'DEPÓSITOS A PLAZO FIJO',
  '203-11': 'DISPONIBLE (203)',
  '203-11-02': 'CAJA CHICA',
  '202-01': 'EFECTIVOS DEPOSITADOS EN BANCOS'
};

Object.entries(categorias).forEach(([codigo, descripcion]) => {
  const cuentasCategoria = cuentasEncontradas.filter(cuenta => 
    cuenta.codigo.startsWith(codigo)
  );
  
  const totalCategoria = cuentasCategoria.reduce((sum, cuenta) => sum + cuenta.valor, 0);
  
  if (cuentasCategoria.length > 0) {
    console.log(`✅ ${descripcion}: ${cuentasCategoria.length} cuenta(s) - ${new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'VES',
      minimumFractionDigits: 2
    }).format(totalCategoria)}`);
    
    cuentasCategoria.forEach(cuenta => {
      console.log(`   └─ ${cuenta.codigo}: ${cuenta.valorFormateado}`);
    });
  } else {
    console.log(`❌ ${descripcion}: No encontrada`);
  }
});

console.log('');
console.log('🚀 PRÓXIMOS PASOS:');
console.log('='.repeat(20));
console.log('1. Verificar que DataContext.tsx incluya TODAS estas cuentas');
console.log('2. El total de efectivo debería ser:', new Intl.NumberFormat('es-VE', {
  style: 'currency',
  currency: 'VES',
  minimumFractionDigits: 2
}).format(totalEfectivo));
console.log('3. Recargar la aplicación y verificar el balance');