const fs = require('fs');
const path = require('path');

// Función para parsear valores numéricos
function parseNumericValue(value) {
  if (!value || value === '') return 0;
  
  // Convertir a string y limpiar
  let cleanValue = value.toString().trim();
  
  // Remover comas y espacios
  cleanValue = cleanValue.replace(/,/g, '').replace(/\s/g, '');
  
  // Convertir a número
  const num = parseFloat(cleanValue);
  return isNaN(num) ? 0 : num;
}

// Leer el archivo CSV
const csvPath = path.join(__dirname, 'Balance de Comprobacion Enero 31 2025 Consolidado1.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');
const lines = csvContent.split('\n');

console.log('=== ANÁLISIS COMPARATIVO DE CUENTAS POR COBRAR ===\n');

let totalCuentasPorCobrarActual = 0;
let totalCuentasPorCobrarEsperado = 0;
let cuentasIncluidas = [];
let cuentasExcluidas = [];

// Procesar cada línea
lines.forEach((line, index) => {
  if (line.trim() === '') return;
  
  const columns = line.split(',');
  if (columns.length < 8) return;
  
  const codigo = columns[1]?.trim() || '';
  const descripcion = columns[2]?.trim() || '';
  const saldoActual = parseNumericValue(columns[7]);
  
  if (!codigo || codigo === 'Código' || saldoActual === 0) return;
  
  const codigoStr = codigo.toString().trim();
  const descripcionStr = descripcion.toLowerCase();
  
  // Lógica ACTUAL del sistema (la que está en DataContext.tsx)
  const esActualCuentaPorCobrar = 
    codigoStr.startsWith('205-') || // Cuentas deudoras por reaseguros
    codigoStr === '201-02' ||
    codigoStr === '1102' ||
    codigoStr === '1.102' ||
    descripcionStr.includes('cuenta') && descripcionStr.includes('cobrar') ||
    descripcionStr.includes('cliente') ||
    descripcionStr.includes('deudor') ||
    descripcionStr.includes('reaseguros') ||
    descripcionStr.includes('intermediarios') ||
    descripcionStr.includes('retrocesionarios');
  
  // Lógica ESPERADA (solo las cuentas que realmente deberían ser Cuentas por Cobrar)
  const esEsperadaCuentaPorCobrar = 
    // Solo cuentas específicas de clientes y deudores comerciales
    (descripcionStr.includes('cuenta') && descripcionStr.includes('cobrar')) ||
    descripcionStr.includes('cliente') ||
    descripcionStr.includes('deudor') ||
    codigoStr === '201-02' ||
    codigoStr === '1102' ||
    codigoStr === '1.102';
  
  if (esActualCuentaPorCobrar) {
    totalCuentasPorCobrarActual += saldoActual;
    cuentasIncluidas.push({
      codigo: codigoStr,
      descripcion: descripcion,
      saldo: saldoActual,
      esEsperada: esEsperadaCuentaPorCobrar
    });
  }
  
  if (esEsperadaCuentaPorCobrar && !esActualCuentaPorCobrar) {
    totalCuentasPorCobrarEsperado += saldoActual;
    cuentasExcluidas.push({
      codigo: codigoStr,
      descripcion: descripcion,
      saldo: saldoActual
    });
  }
  
  if (esEsperadaCuentaPorCobrar) {
    totalCuentasPorCobrarEsperado += saldoActual;
  }
});

console.log('TOTALES:');
console.log(`Total Actual (sistema): Bs.S ${totalCuentasPorCobrarActual.toLocaleString('es-ES', {minimumFractionDigits: 2})}`);
console.log(`Total Esperado (solo clientes): Bs.S ${totalCuentasPorCobrarEsperado.toLocaleString('es-ES', {minimumFractionDigits: 2})}`);
console.log(`Diferencia: Bs.S ${(totalCuentasPorCobrarActual - totalCuentasPorCobrarEsperado).toLocaleString('es-ES', {minimumFractionDigits: 2})}\n`);

console.log('=== CUENTAS INCLUIDAS EN EL CÁLCULO ACTUAL ===');
cuentasIncluidas.forEach(cuenta => {
  const marca = cuenta.esEsperada ? '✓' : '⚠️';
  console.log(`${marca} ${cuenta.codigo} - ${cuenta.descripcion}: Bs.S ${cuenta.saldo.toLocaleString('es-ES', {minimumFractionDigits: 2})}`);
});

console.log('\n=== ANÁLISIS POR CATEGORÍAS ===');

// Agrupar por categorías
let totalReaseguros = 0;
let totalIntermediarios = 0;
let totalClientesReales = 0;
let totalOtros = 0;

cuentasIncluidas.forEach(cuenta => {
  const desc = cuenta.descripcion.toLowerCase();
  if (cuenta.codigo.startsWith('205-')) {
    if (desc.includes('reaseguros') || desc.includes('reaseguradas')) {
      totalReaseguros += cuenta.saldo;
    } else if (desc.includes('intermediarios')) {
      totalIntermediarios += cuenta.saldo;
    } else {
      totalOtros += cuenta.saldo;
    }
  } else if (desc.includes('cliente') || desc.includes('deudor') || (desc.includes('cuenta') && desc.includes('cobrar'))) {
    totalClientesReales += cuenta.saldo;
  } else {
    totalOtros += cuenta.saldo;
  }
});

console.log(`Reaseguros: Bs.S ${totalReaseguros.toLocaleString('es-ES', {minimumFractionDigits: 2})}`);
console.log(`Intermediarios: Bs.S ${totalIntermediarios.toLocaleString('es-ES', {minimumFractionDigits: 2})}`);
console.log(`Clientes Reales: Bs.S ${totalClientesReales.toLocaleString('es-ES', {minimumFractionDigits: 2})}`);
console.log(`Otros: Bs.S ${totalOtros.toLocaleString('es-ES', {minimumFractionDigits: 2})}`);

console.log('\n=== RECOMENDACIÓN ===');
if (totalCuentasPorCobrarActual > totalCuentasPorCobrarEsperado) {
  console.log('El sistema está incluyendo cuentas de reaseguros e intermediarios que NO son Cuentas por Cobrar tradicionales.');
  console.log('Para una empresa de seguros, esto puede ser correcto según las normas contables del sector.');
  console.log(`Si quieres solo clientes comerciales: Bs.S ${totalClientesReales.toLocaleString('es-ES', {minimumFractionDigits: 2})}`);
  console.log(`Si incluyes operaciones de seguros: Bs.S ${totalCuentasPorCobrarActual.toLocaleString('es-ES', {minimumFractionDigits: 2})}`);
}