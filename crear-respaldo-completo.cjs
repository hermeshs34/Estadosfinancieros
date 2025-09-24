const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuración del respaldo
const PROYECTO_ORIGEN = path.resolve(__dirname);
const FECHA = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
const CARPETA_RESPALDO = `respaldo-completo-${FECHA}`;
const RUTA_RESPALDO = path.join(path.dirname(PROYECTO_ORIGEN), CARPETA_RESPALDO);

// Archivos y carpetas a excluir del respaldo
const EXCLUIR = [
  'node_modules',
  '.git',
  'dist',
  '.env',
  '*.log',
  '.DS_Store',
  'Thumbs.db',
  '*.tmp',
  '*.temp',
  'respaldo-*',
  'backup-*'
];

console.log('🔄 CREANDO RESPALDO COMPLETO DEL PROYECTO');
console.log('=' .repeat(50));
console.log(`📂 Proyecto origen: ${PROYECTO_ORIGEN}`);
console.log(`💾 Carpeta respaldo: ${RUTA_RESPALDO}`);
console.log('=' .repeat(50));

// Función para copiar archivos recursivamente
function copiarDirectorio(origen, destino, nivel = 0) {
  const indent = '  '.repeat(nivel);
  
  if (!fs.existsSync(destino)) {
    fs.mkdirSync(destino, { recursive: true });
  }

  const elementos = fs.readdirSync(origen);
  let archivosCopiados = 0;
  let carpetasCopiadas = 0;

  for (const elemento of elementos) {
    // Verificar si debe excluirse
    const debeExcluir = EXCLUIR.some(patron => {
      if (patron.includes('*')) {
        const regex = new RegExp(patron.replace(/\*/g, '.*'));
        return regex.test(elemento);
      }
      return elemento === patron;
    });

    if (debeExcluir) {
      console.log(`${indent}⏭️  Excluyendo: ${elemento}`);
      continue;
    }

    const rutaOrigen = path.join(origen, elemento);
    const rutaDestino = path.join(destino, elemento);
    const stats = fs.statSync(rutaOrigen);

    if (stats.isDirectory()) {
      console.log(`${indent}📁 Copiando carpeta: ${elemento}`);
      const resultado = copiarDirectorio(rutaOrigen, rutaDestino, nivel + 1);
      archivosCopiados += resultado.archivos;
      carpetasCopiadas += resultado.carpetas + 1;
    } else {
      console.log(`${indent}📄 Copiando archivo: ${elemento}`);
      fs.copyFileSync(rutaOrigen, rutaDestino);
      archivosCopiados++;
    }
  }

  return { archivos: archivosCopiados, carpetas: carpetasCopiadas };
}

// Función para crear archivo de información del respaldo
function crearArchivoInfo() {
  const info = {
    fecha_respaldo: new Date().toISOString(),
    proyecto_origen: PROYECTO_ORIGEN,
    version_node: process.version,
    sistema_operativo: process.platform,
    usuario: process.env.USERNAME || process.env.USER || 'desconocido',
    proposito: 'Respaldo completo antes de implementar multicompañía',
    archivos_excluidos: EXCLUIR,
    instrucciones_restauracion: [
      '1. Copiar todo el contenido de este respaldo a una nueva carpeta',
      '2. Ejecutar: npm install',
      '3. Copiar archivo .env desde el proyecto original',
      '4. Ejecutar: npm run dev'
    ]
  };

  const rutaInfo = path.join(RUTA_RESPALDO, 'INFO-RESPALDO.json');
  fs.writeFileSync(rutaInfo, JSON.stringify(info, null, 2), 'utf8');
  console.log('📋 Archivo de información creado: INFO-RESPALDO.json');
}

// Función para crear script de restauración
function crearScriptRestauracion() {
  const scriptContent = `@echo off
echo Restaurando proyecto desde respaldo...
echo.
echo 1. Instalando dependencias...
npm install
echo.
echo 2. IMPORTANTE: Copie manualmente el archivo .env desde el proyecto original
echo.
echo 3. Para iniciar el proyecto:
echo    npm run dev
echo.
echo Restauracion completada!
pause
`;

  const rutaScript = path.join(RUTA_RESPALDO, 'RESTAURAR.bat');
  fs.writeFileSync(rutaScript, scriptContent, 'utf8');
  console.log('🔧 Script de restauración creado: RESTAURAR.bat');
}

try {
  console.log('\n🚀 Iniciando proceso de respaldo...');
  
  // Crear carpeta de respaldo
  if (fs.existsSync(RUTA_RESPALDO)) {
    console.log('⚠️  La carpeta de respaldo ya existe, eliminándola...');
    fs.rmSync(RUTA_RESPALDO, { recursive: true, force: true });
  }
  
  fs.mkdirSync(RUTA_RESPALDO, { recursive: true });
  console.log('✅ Carpeta de respaldo creada');

  // Copiar archivos
  console.log('\n📁 Copiando archivos y carpetas...');
  const resultado = copiarDirectorio(PROYECTO_ORIGEN, RUTA_RESPALDO);
  
  // Crear archivos adicionales
  console.log('\n📋 Creando archivos de información...');
  crearArchivoInfo();
  crearScriptRestauracion();

  // Resumen final
  console.log('\n' + '='.repeat(50));
  console.log('✅ RESPALDO COMPLETADO EXITOSAMENTE');
  console.log('='.repeat(50));
  console.log(`📊 Estadísticas:`);
  console.log(`   • Archivos copiados: ${resultado.archivos}`);
  console.log(`   • Carpetas copiadas: ${resultado.carpetas}`);
  console.log(`📂 Ubicación: ${RUTA_RESPALDO}`);
  console.log(`📋 Info: ${path.join(RUTA_RESPALDO, 'INFO-RESPALDO.json')}`);
  console.log(`🔧 Restaurar: ${path.join(RUTA_RESPALDO, 'RESTAURAR.bat')}`);
  console.log('\n🎯 Ahora puedes proceder con la implementación de multicompañía');
  console.log('   El proyecto original está completamente respaldado.');
  
} catch (error) {
  console.error('❌ Error durante el respaldo:', error.message);
  process.exit(1);
}