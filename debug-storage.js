// Script de debug para verificar datos en localStorage
console.log('=== DEBUG STORAGE ===');

// Verificar datos importados
const importedData = localStorage.getItem('financial_imported_data');
console.log('📊 Datos importados en localStorage:');
if (importedData) {
  try {
    const parsed = JSON.parse(importedData);
    console.log('- Cantidad de registros:', parsed.length);
    console.log('- Primeros 3 registros:', parsed.slice(0, 3));
  } catch (e) {
    console.error('- Error parseando datos:', e);
  }
} else {
  console.log('- No hay datos en localStorage');
}

// Verificar empresa seleccionada
const selectedCompany = localStorage.getItem('financial_selected_company');
console.log('🏢 Empresa seleccionada:');
if (selectedCompany) {
  try {
    const parsed = JSON.parse(selectedCompany);
    console.log('- Empresa:', parsed.name);
    console.log('- ID:', parsed.id);
  } catch (e) {
    console.error('- Error parseando empresa:', e);
  }
} else {
  console.log('- No hay empresa seleccionada');
}

// Verificar período seleccionado
const selectedPeriod = localStorage.getItem('financial_selected_period');
console.log('📅 Período seleccionado:');
if (selectedPeriod) {
  try {
    const parsed = JSON.parse(selectedPeriod);
    console.log('- Período:', parsed.name);
    console.log('- ID:', parsed.id);
  } catch (e) {
    console.error('- Error parseando período:', e);
  }
} else {
  console.log('- No hay período seleccionado');
}

console.log('=== FIN DEBUG ===');