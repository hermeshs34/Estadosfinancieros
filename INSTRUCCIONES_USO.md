# Instrucciones de Uso - Financial Analytics

## Acceso a la Aplicación

### Opción 1: Crear Nueva Cuenta
1. Abre la aplicación en tu navegador
2. Haz clic en "No tienes cuenta? Regístrate"
3. Completa el formulario con:
   - Nombre completo
   - Email válido
   - Contraseña (mínimo 6 caracteres)
4. Haz clic en "Crear Cuenta"
5. Una vez creada la cuenta, cambia a modo login e inicia sesión

### Opción 2: Credenciales de Demostración
Si las credenciales de demo funcionan, puedes usar:
- **Email:** admin@demo.com
- **Password:** 123456

**Nota:** Si las credenciales de demo no funcionan, es recomendable crear una cuenta nueva.

## Funcionalidades Disponibles

Una vez que hayas iniciado sesión, tendrás acceso a:

### 1. Dashboard
- Vista general de métricas financieras
- Gráficos y análisis resumidos

### 2. Data Import (Importación de Datos)
- **Formatos soportados:** CSV, Excel (.xlsx), PDF
- **Métodos de carga:**
  - Arrastrar y soltar archivos
  - Hacer clic en "Select Files" para elegir archivos
- **Proceso:**
  1. Ve a la sección "Data Import"
  2. Arrastra tu archivo o haz clic para seleccionarlo
  3. El sistema procesará automáticamente el archivo
  4. Verás el estado: procesando, éxito o error

### 3. Financial Statements
- Análisis de estados financieros
- Visualización de datos importados

### 4. Ratio Analysis
- Cálculo automático de ratios financieros
- Análisis de tendencias

### 5. Comparative Analysis
- Comparación entre períodos
- Análisis de variaciones

### 6. Import History
- Historial de archivos importados
- Estado de cada importación

## Archivos de Prueba Disponibles

En el directorio del proyecto encontrarás:
- `test-financial-data.csv` - Datos financieros de prueba en formato CSV
- `test-pdf-data.txt` - Datos de prueba (renombrar a .pdf si es necesario)

## Solución de Problemas

### Si no puedes iniciar sesión:
1. Verifica que el email y contraseña sean correctos
2. Si usas credenciales de demo y no funcionan, crea una cuenta nueva
3. Asegúrate de que tu conexión a internet esté funcionando

### Si la importación de archivos no funciona:
1. Verifica que el archivo esté en formato CSV, Excel o PDF
2. Asegúrate de que el archivo no esté corrupto
3. Intenta con un archivo más pequeño primero
4. Revisa la consola del navegador para errores específicos

### Si ves errores en la aplicación:
1. Recarga la página (F5)
2. Verifica la consola del navegador (F12)
3. Asegúrate de que el servidor de desarrollo esté ejecutándose

## Configuración Técnica

### Variables de Entorno Requeridas
- `VITE_SUPABASE_URL` - URL de tu proyecto Supabase
- `VITE_SUPABASE_ANON_KEY` - Clave anónima de Supabase

### Comandos de Desarrollo
```bash
# Instalar dependencias
npm install

# Ejecutar servidor de desarrollo
npm run dev

# Construir para producción
npm run build
```

## Contacto y Soporte

Si experimentas problemas persistentes:
1. Verifica que todas las dependencias estén instaladas
2. Asegúrate de que las variables de entorno estén configuradas
3. Revisa los logs del servidor en la terminal
4. Verifica la configuración de Supabase

---

**Última actualización:** Enero 2025
**Versión:** 1.0.0