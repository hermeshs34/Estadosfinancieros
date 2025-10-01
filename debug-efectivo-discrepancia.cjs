const fs = require('fs');
const path = require('path');

// Leer el archivo CSV correcto
const csvPath = path.join(__dirname, 'public', 'Balance de Comprobacion Enero 31 2025 Consolidado.csv');

console.log('=== INVESTIGACIÓN DE DISCREPANCIA EN EFECTIVO ===\n');
console.log('CSV real: Bs.S 256,623,878.69');
console.log('Aplicación: Bs.S 404,527,705.35');
console.log('Diferencia: Bs.S 147,903,826.66 DE MÁS\n');

try {
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n');
  
  let totalEfectivo = 0;
  const cuentasEfectivo = [];
  const cuentasSospechosas = [];
  
  console.log('=== ANÁLISIS COMPLETO DE CUENTAS QUE PODRÍAN SER CLASIFICADAS COMO EFECTIVO ===\n');
  
  for (const line of lines) {
    if (line.trim() === '') continue;
    
    const columns = line.split(',');
    if (columns.length < 8) continue;
    
    const codigo = columns[0]?.trim();
    const descripcion = columns[1]?.trim();
    const saldoFinal = parseFloat(columns[7]) || 0;
    
    if (saldoFinal <= 0) continue;
    
    // Lógica similar a DataContext.tsx para identificar efectivo
    let esEfectivo = false;
    let razon = '';
    
    // Códigos específicos
    if (codigo.startsWith('201-01') || codigo.startsWith('2.201.01')) {
      esEfectivo = true;
      razon = 'Código 201-01/2.201.01';
    } else if (codigo.startsWith('203-11')) {
      esEfectivo = true;
      razon = 'Código 203-11';
    } else if (codigo.startsWith('203-06')) {
      esEfectivo = true;
      razon = 'Código 203-06';
    } else if (codigo.startsWith('202-01')) {
      esEfectivo = true;
      razon = 'Código 202-01';
    } else if (codigo.startsWith('1101') || codigo.startsWith('1.101')) {
      esEfectivo = true;
      razon = 'Código 1101/1.101';
    }
    
    // Descripción
    const desc = descripcion.toLowerCase();
    if (!esEfectivo) {
      if (desc.includes('caja') || 
          desc.includes('banco') || 
          desc.includes('efectivo') ||
          desc.includes('disponible') ||
          desc.includes('depositos a la vista') ||
          desc.includes('caja chica') ||
          desc.includes('inversiones en el extranjero') ||
          desc.includes('depósitos a plazo fijo') ||
          desc.includes('moneda nacional') ||
          desc.includes('moneda extranjera')) {
        esEfectivo = true;
        razon = 'Por descripción';
      }
    }
    
    if (esEfectivo) {
      totalEfectivo += saldoFinal;
      cuentasEfectivo.push({
        codigo,
        descripcion,
        saldo: saldoFinal,
        razon
      });
    }
    
    // Buscar cuentas que podrían estar siendo mal clasificadas
    if (saldoFinal > 10000000) { // Más de 10 millones
      if (desc.includes('inversion') || 
          desc.includes('plazo') ||
          desc.includes('deposito') ||
          desc.includes('banco') ||
          desc.includes('disponible')) {
        cuentasSospechosas.push({
          codigo,
          descripcion,
          saldo: saldoFinal,
          esEfectivo
        });
      }
    }
  }
  
  console.log('=== CUENTAS CLASIFICADAS COMO EFECTIVO ===');
  cuentasEfectivo.forEach(cuenta => {
    console.log(`${cuenta.codigo} - ${cuenta.descripcion}`);
    console.log(`  Saldo: Bs.S ${cuenta.saldo.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`);
    console.log(`  Razón: ${cuenta.razon}\n`);
  });
  
  console.log(`Total calculado: Bs.S ${totalEfectivo.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`);
  
  console.log('\n=== CUENTAS SOSPECHOSAS (>10M) ===');
  cuentasSospechosas.forEach(cuenta => {
    const estado = cuenta.esEfectivo ? '✓ INCLUIDA' : '✗ NO INCLUIDA';
    console.log(`${estado} - ${cuenta.codigo} - ${cuenta.descripcion}`);
    console.log(`  Saldo: Bs.S ${cuenta.saldo.toLocaleString('es-VE', { minimumFractionDigits: 2 })}\n`);
  });
  
  // Buscar la diferencia
  const diferencia = 404527705.35 - totalEfectivo;
  console.log(`\n=== ANÁLISIS DE DIFERENCIA ===`);
  console.log(`Diferencia a explicar: Bs.S ${diferencia.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`);
  
  // Buscar cuentas que sumen aproximadamente la diferencia
  console.log('\n=== POSIBLES CUENTAS QUE EXPLICAN LA DIFERENCIA ===');
  for (const line of lines) {
    if (line.trim() === '') continue;
    
    const columns = line.split(',');
    if (columns.length < 8) continue;
    
    const codigo = columns[0]?.trim();
    const descripcion = columns[1]?.trim();
    const saldoFinal = parseFloat(columns[7]) || 0;
    
    // Buscar cuentas con valores cercanos a la diferencia o que sumadas podrían explicarla
    if (Math.abs(saldoFinal - diferencia) < 10000000 || saldoFinal > 50000000) {
      console.log(`${codigo} - ${descripcion}: Bs.S ${saldoFinal.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`);
    }
  }
  
} catch (error) {
  console.error('Error al leer el archivo:', error.message);
}