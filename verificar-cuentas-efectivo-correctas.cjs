const fs = require('fs');
const path = require('path');

// Leer el archivo CSV correcto
const csvPath = path.join(__dirname, 'public', 'Balance de Comprobacion Enero 31 2025 Consolidado.csv');

console.log('=== VERIFICACIÓN DE CUENTAS DE EFECTIVO ESPECÍFICAS ===\n');
console.log('Archivo CSV:', csvPath);

try {
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n');
  
  let totalEfectivo = 0;
  const cuentasEncontradas = [];
  
  // Cuentas específicas a verificar según el usuario
  const cuentasEspecificas = [
    '203-11',     // DISPONIBLE, CAJA CHICA
    '203-11-02',  // CAJA CHICA
    '202-01',     // EFECTIVOS DEPOSITADOS EN BANCOS
    '202-11',     // Si existe
    '2.201.01',   // DISPONIBLE (formato con puntos)
    '201-01'      // DISPONIBLE (formato con guiones)
  ];
  
  console.log('Buscando cuentas específicas:', cuentasEspecificas.join(', '));
  console.log('\n=== RESULTADOS DE BÚSQUEDA ===\n');
  
  for (const line of lines) {
    if (line.trim() === '') continue;
    
    const columns = line.split(',');
    if (columns.length < 8) continue;
    
    const codigo = columns[0]?.trim();
    const descripcion = columns[1]?.trim();
    const saldoFinal = parseFloat(columns[7]) || 0;
    
    // Verificar si es una cuenta específica que buscamos
    let esEfectivo = false;
    let categoria = '';
    
    // Verificar cuentas específicas
    for (const cuentaEspecifica of cuentasEspecificas) {
      if (codigo.startsWith(cuentaEspecifica)) {
        esEfectivo = true;
        categoria = cuentaEspecifica;
        break;
      }
    }
    
    // También verificar por descripción para cuentas de efectivo
    if (!esEfectivo) {
      const desc = descripcion.toLowerCase();
      if (desc.includes('disponible') || 
          desc.includes('caja') || 
          desc.includes('banco') || 
          desc.includes('efectivo') ||
          desc.includes('depósito')) {
        esEfectivo = true;
        categoria = 'Por descripción';
      }
    }
    
    if (esEfectivo && saldoFinal > 0) {
      totalEfectivo += saldoFinal;
      cuentasEncontradas.push({
        codigo,
        descripcion,
        saldo: saldoFinal,
        categoria
      });
      
      console.log(`✓ ${codigo} - ${descripcion}`);
      console.log(`  Saldo: Bs.S ${saldoFinal.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`);
      console.log(`  Categoría: ${categoria}\n`);
    }
  }
  
  console.log('=== RESUMEN ===');
  console.log(`Total de cuentas encontradas: ${cuentasEncontradas.length}`);
  console.log(`Total de Efectivo: Bs.S ${totalEfectivo.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`);
  
  console.log('\n=== DESGLOSE POR CATEGORÍA ===');
  const categorias = {};
  cuentasEncontradas.forEach(cuenta => {
    if (!categorias[cuenta.categoria]) {
      categorias[cuenta.categoria] = 0;
    }
    categorias[cuenta.categoria] += cuenta.saldo;
  });
  
  Object.entries(categorias).forEach(([categoria, total]) => {
    console.log(`${categoria}: Bs.S ${total.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`);
  });
  
  console.log('\n=== VERIFICACIÓN ESPECÍFICA DE CUENTAS MENCIONADAS ===');
  
  // Verificar específicamente las cuentas que el usuario menciona
  const cuentasUsuario = ['203-11', '203-11-02', '202-01'];
  cuentasUsuario.forEach(cuenta => {
    const encontrada = cuentasEncontradas.find(c => c.codigo.startsWith(cuenta));
    if (encontrada) {
      console.log(`✓ ${cuenta}: ENCONTRADA - ${encontrada.descripcion} (Bs.S ${encontrada.saldo.toLocaleString('es-VE', { minimumFractionDigits: 2 })})`);
    } else {
      console.log(`✗ ${cuenta}: NO ENCONTRADA`);
    }
  });
  
} catch (error) {
  console.error('Error al leer el archivo:', error.message);
}