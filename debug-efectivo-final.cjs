const fs = require('fs');
const path = require('path');

// Leer el archivo CSV correcto
const csvPath = path.join(__dirname, 'public', 'Balance de Comprobacion Enero 31 2025 Consolidado.csv');

console.log('=== VERIFICACIÓN FINAL DE EFECTIVO DESPUÉS DE CORRECCIÓN ===\n');

try {
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n');
  
  let totalEfectivo = 0;
  const cuentasIncluidas = [];
  const cuentasExcluidas = [];
  
  for (const line of lines) {
    if (line.trim() === '') continue;
    
    const columns = line.split(',');
    if (columns.length < 8) continue;
    
    const codigo = columns[0]?.trim();
    const descripcion = columns[1]?.trim();
    const saldoFinal = parseFloat(columns[7]) || 0;
    
    if (saldoFinal <= 0) continue;
    
    const codigoStr = codigo.toString();
    const description = descripcion;
    
    // Lógica EXACTA de DataContext.tsx DESPUÉS de la corrección
    let esEfectivo = false;
    let razon = '';
    
    // Primero verificar si NO es cuenta de patrimonio (317-)
    const noEsPatrimonio = !codigoStr.startsWith('317-');
    
    if (noEsPatrimonio) {
      // Códigos específicos
      if (codigoStr.startsWith('201-01') || codigoStr.startsWith('2.201.01')) {
        esEfectivo = true;
        razon = 'Código 201-01/2.201.01';
      } else if (codigoStr.startsWith('202-01')) {
        esEfectivo = true;
        razon = 'Código 202-01';
      } else if (codigoStr.startsWith('203-06')) {
        esEfectivo = true;
        razon = 'Código 203-06';
      } else if (codigoStr.startsWith('203-11')) {
        esEfectivo = true;
        razon = 'Código 203-11';
      } else if (codigoStr.startsWith('1101') || codigoStr.startsWith('1.101')) {
        esEfectivo = true;
        razon = 'Código 1101/1.101';
      }
      // Por descripción (solo si no es patrimonio)
      else if (
        description.includes('caja') || description.includes('banco') || description.includes('efectivo') ||
        description.includes('disponible') || description.includes('DEPOSITOS A LA VISTA') ||
        description.includes('DISPONIBLE') || description.includes('CAJA CHICA') ||
        description.includes('INVERSIONES EN EL EXTRANJERO') || description.includes('BANCOS') ||
        description.includes('DEPÓSITOS A PLAZO FIJO') || description.includes('MONEDA NACIONAL') ||
        description.includes('MONEDA EXTRANJERA')
      ) {
        esEfectivo = true;
        razon = 'Por descripción';
      }
    } else {
      // Es cuenta de patrimonio, verificar si antes se incluía
      if (
        description.includes('caja') || description.includes('banco') || description.includes('efectivo') ||
        description.includes('disponible') || description.includes('DEPOSITOS A LA VISTA') ||
        description.includes('DISPONIBLE') || description.includes('CAJA CHICA') ||
        description.includes('INVERSIONES EN EL EXTRANJERO') || description.includes('BANCOS') ||
        description.includes('DEPÓSITOS A PLAZO FIJO') || description.includes('MONEDA NACIONAL') ||
        description.includes('MONEDA EXTRANJERA')
      ) {
        cuentasExcluidas.push({
          codigo,
          descripcion,
          saldo: saldoFinal,
          razon: 'Excluida por ser patrimonio (317-)'
        });
      }
    }
    
    if (esEfectivo) {
      totalEfectivo += saldoFinal;
      cuentasIncluidas.push({
        codigo,
        descripcion,
        saldo: saldoFinal,
        razon
      });
    }
  }
  
  console.log('=== CUENTAS INCLUIDAS COMO EFECTIVO ===');
  cuentasIncluidas.forEach(cuenta => {
    console.log(`✓ ${cuenta.codigo} - ${cuenta.descripcion}`);
    console.log(`  Saldo: Bs.S ${cuenta.saldo.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`);
    console.log(`  Razón: ${cuenta.razon}\n`);
  });
  
  console.log('=== CUENTAS EXCLUIDAS (PATRIMONIO) ===');
  cuentasExcluidas.forEach(cuenta => {
    console.log(`✗ ${cuenta.codigo} - ${cuenta.descripcion}`);
    console.log(`  Saldo: Bs.S ${cuenta.saldo.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`);
    console.log(`  Razón: ${cuenta.razon}\n`);
  });
  
  console.log('=== RESUMEN FINAL ===');
  console.log(`Total de cuentas incluidas: ${cuentasIncluidas.length}`);
  console.log(`Total de cuentas excluidas: ${cuentasExcluidas.length}`);
  console.log(`Total de Efectivo calculado: Bs.S ${totalEfectivo.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`);
  console.log(`Valor en aplicación: Bs.S 404,527,705.35`);
  
  const diferencia = 404527705.35 - totalEfectivo;
  console.log(`Diferencia: Bs.S ${diferencia.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`);
  
  if (Math.abs(diferencia) < 1) {
    console.log('✅ Los valores coinciden!');
  } else {
    console.log('❌ Aún hay diferencia. Investigando...');
    
    // Buscar otras posibles cuentas
    console.log('\n=== POSIBLES CUENTAS ADICIONALES ===');
    for (const line of lines) {
      if (line.trim() === '') continue;
      
      const columns = line.split(',');
      if (columns.length < 8) continue;
      
      const codigo = columns[0]?.trim();
      const descripcion = columns[1]?.trim();
      const saldoFinal = parseFloat(columns[7]) || 0;
      
      if (saldoFinal > 1000000 && !cuentasIncluidas.find(c => c.codigo === codigo)) {
        console.log(`${codigo} - ${descripcion}: Bs.S ${saldoFinal.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`);
      }
    }
  }
  
} catch (error) {
  console.error('Error al leer el archivo:', error.message);
}