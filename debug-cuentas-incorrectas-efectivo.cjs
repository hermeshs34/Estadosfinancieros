const fs = require('fs');
const path = require('path');

// Leer el archivo CSV correcto
const csvPath = path.join(__dirname, 'public', 'Balance de Comprobacion Enero 31 2025 Consolidado.csv');

console.log('=== IDENTIFICACIÓN DE CUENTAS MAL CLASIFICADAS COMO EFECTIVO ===\n');

try {
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n');
  
  let totalEfectivoCorrect = 0;
  let totalEfectivoIncorrect = 0;
  const cuentasCorrectas = [];
  const cuentasIncorrectas = [];
  
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
    
    // Lógica EXACTA de DataContext.tsx
    let esEfectivoPorCodigo = false;
    let esEfectivoPorDescripcion = false;
    
    // Códigos específicos (CORRECTOS)
    if (
      codigoStr.startsWith('201-01') || codigoStr.startsWith('2.201.01') ||
      codigoStr.startsWith('202-01') ||
      codigoStr.startsWith('203-06') ||
      codigoStr.startsWith('203-11') ||
      codigoStr.startsWith('1101') || codigoStr.startsWith('1.101')
    ) {
      esEfectivoPorCodigo = true;
    }
    
    // Por descripción (PROBLEMÁTICAS)
    if (
      description.includes('caja') || description.includes('banco') || description.includes('efectivo') ||
      description.includes('disponible') || description.includes('DEPOSITOS A LA VISTA') ||
      description.includes('DISPONIBLE') || description.includes('CAJA CHICA') ||
      description.includes('INVERSIONES EN EL EXTRANJERO') || description.includes('BANCOS') ||
      description.includes('DEPÓSITOS A PLAZO FIJO') || description.includes('MONEDA NACIONAL') ||
      description.includes('MONEDA EXTRANJERA')
    ) {
      esEfectivoPorDescripcion = true;
    }
    
    const esEfectivo = esEfectivoPorCodigo || esEfectivoPorDescripcion;
    
    if (esEfectivo) {
      if (esEfectivoPorCodigo) {
        // Cuenta correctamente clasificada
        totalEfectivoCorrect += saldoFinal;
        cuentasCorrectas.push({
          codigo,
          descripcion,
          saldo: saldoFinal,
          razon: 'Código correcto'
        });
      } else {
        // Cuenta incorrectamente clasificada (solo por descripción)
        totalEfectivoIncorrect += saldoFinal;
        cuentasIncorrectas.push({
          codigo,
          descripcion,
          saldo: saldoFinal,
          razon: 'Solo por descripción'
        });
      }
    }
  }
  
  console.log('=== CUENTAS CORRECTAMENTE CLASIFICADAS (POR CÓDIGO) ===');
  cuentasCorrectas.forEach(cuenta => {
    console.log(`✓ ${cuenta.codigo} - ${cuenta.descripcion}`);
    console.log(`  Saldo: Bs.S ${cuenta.saldo.toLocaleString('es-VE', { minimumFractionDigits: 2 })}\n`);
  });
  
  console.log('=== CUENTAS INCORRECTAMENTE CLASIFICADAS (SOLO POR DESCRIPCIÓN) ===');
  cuentasIncorrectas.forEach(cuenta => {
    console.log(`✗ ${cuenta.codigo} - ${cuenta.descripcion}`);
    console.log(`  Saldo: Bs.S ${cuenta.saldo.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`);
    
    // Identificar qué palabra clave la clasificó
    const desc = cuenta.descripcion;
    const palabrasProblematicas = [];
    if (desc.includes('INVERSIONES EN EL EXTRANJERO')) palabrasProblematicas.push('INVERSIONES EN EL EXTRANJERO');
    if (desc.includes('BANCOS')) palabrasProblematicas.push('BANCOS');
    if (desc.includes('MONEDA NACIONAL')) palabrasProblematicas.push('MONEDA NACIONAL');
    if (desc.includes('MONEDA EXTRANJERA')) palabrasProblematicas.push('MONEDA EXTRANJERA');
    if (desc.includes('banco')) palabrasProblematicas.push('banco');
    if (desc.includes('disponible')) palabrasProblematicas.push('disponible');
    
    console.log(`  Clasificada por: ${palabrasProblematicas.join(', ')}\n`);
  });
  
  console.log('=== RESUMEN ===');
  console.log(`Cuentas correctas: ${cuentasCorrectas.length}`);
  console.log(`Total correcto: Bs.S ${totalEfectivoCorrect.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`);
  console.log(`Cuentas incorrectas: ${cuentasIncorrectas.length}`);
  console.log(`Total incorrecto: Bs.S ${totalEfectivoIncorrect.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`);
  console.log(`Total general: Bs.S ${(totalEfectivoCorrect + totalEfectivoIncorrect).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`);
  
  const diferencia = 404527705.35 - (totalEfectivoCorrect + totalEfectivoIncorrect);
  console.log(`Diferencia con aplicación: Bs.S ${diferencia.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`);
  
} catch (error) {
  console.error('Error al leer el archivo:', error.message);
}