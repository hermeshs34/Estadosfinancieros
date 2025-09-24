const fs = require('fs');
const Papa = require('papaparse');

// Leer el CSV
const csvContent = fs.readFileSync('balance_consolidado_formato_estandar.csv', 'utf8');

console.log('Iniciando análisis del CSV...');

// Parsear con Papa Parse
Papa.parse(csvContent, {
  header: true,
  skipEmptyLines: true,
  complete: (results) => {
    const data = results.data;
    
    // Escribir resultados a archivo
    const output = {
      totalRecords: data.length,
      headers: Object.keys(data[0] || {}),
      firstThreeRecords: data.slice(0, 3),
      recordsWithValues: data.filter(row => {
        const saldoActual = row.SaldoActual || row.saldoactual || '0';
        return saldoActual !== '0' && saldoActual !== '0.0' && saldoActual !== '';
      }).slice(0, 5)
    };
    
    fs.writeFileSync('csv-analysis-results.json', JSON.stringify(output, null, 2));
    console.log('Análisis completado. Resultados guardados en csv-analysis-results.json');
    console.log('Total registros:', output.totalRecords);
    console.log('Registros con valores:', output.recordsWithValues.length);
  },
  error: (error) => {
    console.error('Error:', error.message);
  }
});