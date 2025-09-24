# Análisis del Problema: Usuarios Duplicados No Visibles en Sistema Multicompañía

## Problema Identificado
Un usuario aparece creado 3 veces en la tabla `users` de Supabase pero no se muestra en el sistema de gestión de usuarios.

## Arquitectura Actual del Sistema

### Flujo de Autenticación y Selección de Empresa
1. **Login del Usuario**: El usuario se autentica con email/password
2. **Carga de Empresas**: Se cargan las empresas donde `user_id = usuario_autenticado.id`
3. **Selección de Empresa**: El usuario selecciona una empresa (o se selecciona automáticamente la primera)
4. **Gestión de Usuarios**: Se muestran usuarios donde `company_id = empresa_seleccionada.id`

### Estructura de Datos
```sql
-- Tabla companies
CREATE TABLE companies (
  id UUID PRIMARY KEY,
  name TEXT,
  tax_id TEXT,
  user_id UUID -- Propietario de la empresa
);

-- Tabla users (usuarios del sistema)
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  company_id UUID, -- Empresa a la que pertenece el usuario
  role TEXT,
  phone TEXT,
  last_login TIMESTAMP
);
```

## Posibles Causas del Problema

### 1. **Company_ID Incorrecto o NULL**
- Los usuarios duplicados pueden tener `company_id` NULL
- Los usuarios pueden estar asociados a una empresa diferente
- Error en el proceso de creación que no asigna correctamente el `company_id`

### 2. **Problema de Contexto de Empresa**
- La empresa seleccionada no es la correcta
- El `currentCompanyId` no coincide con el `company_id` de los usuarios creados

### 3. **Duplicación en Diferentes Empresas**
- Los usuarios pueden estar creados en empresas diferentes
- Un usuario puede pertenecer a múltiples empresas (no contemplado en el diseño actual)

## Logs de Depuración Actuales
```
UserManagement - selectedCompany: 
Object { id: "79a9d723-1954-4f6e-b38a-d15bcd620477", name: "Inversiones Katheriel 1222" }

🔍 UserService.getUsers - Buscando usuarios para company_id: 79a9d723-1954-4f6e-b38a-d15bcd620477
✅ UserService.getUsers - Usuarios encontrados: 0
```

**Conclusión de los logs**: El sistema está buscando usuarios para la empresa correcta pero no encuentra ninguno.

## Consultas de Diagnóstico Recomendadas

### 1. Verificar usuarios duplicados
```sql
SELECT email, COUNT(*) as duplicates, 
       array_agg(id) as user_ids,
       array_agg(company_id) as company_ids
FROM users 
GROUP BY email 
HAVING COUNT(*) > 1;
```

### 2. Verificar usuarios sin empresa
```sql
SELECT id, email, full_name, company_id 
FROM users 
WHERE company_id IS NULL;
```

### 3. Verificar relación usuarios-empresas
```sql
SELECT u.id, u.email, u.company_id, c.name as company_name, c.user_id as company_owner
FROM users u
LEFT JOIN companies c ON u.company_id = c.id
WHERE u.email = 'email_del_usuario_duplicado';
```

## Soluciones Propuestas

### Opción 1: Limpieza de Datos (Recomendada)
1. Identificar usuarios duplicados
2. Consolidar información en un solo registro
3. Eliminar duplicados
4. Asegurar que el `company_id` sea correcto

### Opción 2: Mejora del Sistema Multicompañía
1. **Tabla de Relación Usuario-Empresa**:
```sql
CREATE TABLE user_companies (
  user_id UUID REFERENCES users(id),
  company_id UUID REFERENCES companies(id),
  role TEXT,
  is_active BOOLEAN,
  PRIMARY KEY (user_id, company_id)
);
```

2. **Modificar lógica de autenticación**:
   - Después del login, mostrar selector de empresa
   - Permitir que un usuario pertenezca a múltiples empresas
   - Cambiar contexto de empresa sin re-autenticarse

### Opción 3: Flujo de Selección de Empresa en Login
1. **Login con Selección de Empresa**:
   - Usuario ingresa email/password
   - Sistema muestra empresas disponibles para ese usuario
   - Usuario selecciona empresa antes de acceder al sistema
   - Se establece el contexto de empresa para toda la sesión

## Recomendación Final

**Para el problema inmediato**: Ejecutar las consultas de diagnóstico y limpiar los datos duplicados.

**Para el futuro del sistema**: Considerar implementar la Opción 2 (tabla de relación) para un verdadero sistema multicompañía que permita:
- Un usuario en múltiples empresas
- Diferentes roles por empresa
- Cambio de contexto de empresa sin re-login
- Mejor escalabilidad

## Pasos Inmediatos
1. Ejecutar `debug-users-issue.sql` en Supabase
2. Revisar logs de depuración en la consola del navegador
3. Identificar la causa específica del problema
4. Aplicar la solución de limpieza de datos correspondiente