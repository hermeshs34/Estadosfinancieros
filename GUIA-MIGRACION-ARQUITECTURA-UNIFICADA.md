# Guía de Migración a Arquitectura Multicompañía Unificada

## 📋 Resumen del Problema

Se identificó una **inconsistencia en la visualización de empresas** entre:
- **CompanySelector**: Usa `UserService.getUserCompanies()` → Busca por `user_id` en tabla `companies`
- **CompanyManagement**: Usa `SupabaseService.getUserCompanies()` → Busca por `company_id` en tabla `users`

Esto causaba que las empresas aparecieran en un lugar pero no en el otro para el mismo usuario.

## 🎯 Solución Implementada

### 1. Nuevo Servicio Unificado
- ✅ **Creado**: `UnifiedCompanyService` que usa la tabla `user_companies`
- ✅ **Arquitectura**: Multicompañía correcta con roles y permisos
- ✅ **Fallback**: Método legacy para compatibilidad durante la transición

### 2. Componentes Actualizados
- ✅ **DataContext**: Funciones `loadCompanies()` y `loadUserCompanies()` ahora usan `UnifiedCompanyService`
- ✅ **CompanySelector**: Actualizado para usar el servicio unificado
- ⏳ **CompanyManagement**: Pendiente de actualización

### 3. Scripts de Migración
- ✅ **debug-hersan1962.sql**: Script para verificar datos del usuario
- ✅ **migrar-a-arquitectura-unificada.sql**: Script completo de migración

## 🚀 Pasos de Implementación

### Paso 1: Ejecutar Script de Migración

```sql
-- Ejecutar en Supabase SQL Editor
-- Archivo: migrar-a-arquitectura-unificada.sql

-- Este script:
-- 1. Migra empresas creadas por usuarios a user_companies
-- 2. Migra usuarios asignados a empresas a user_companies  
-- 3. Establece empresas activas en user_sessions
-- 4. Verifica los resultados
```

### Paso 2: Verificar Migración

```sql
-- Verificar que hersan1962 ahora tiene empresas en ambos lugares
SELECT 
    'Después de migración' as estado,
    u.email,
    c.name as empresa,
    c.tax_id as rif,
    uc.role,
    uc.is_active
FROM user_companies uc
INNER JOIN users u ON uc.user_id = u.id
INNER JOIN companies c ON uc.company_id = c.id
WHERE u.email LIKE '%hersan1962%';
```

### Paso 3: Probar la Aplicación

1. **Reiniciar el servidor de desarrollo**:
   ```bash
   npm run dev
   ```

2. **Verificar en la aplicación**:
   - ✅ CompanySelector debe mostrar las empresas
   - ✅ CompanyManagement debe mostrar las mismas empresas
   - ✅ No debe haber inconsistencias

### Paso 4: Monitorear Logs

Buscar en la consola del navegador:
```
🏢 UnifiedCompanyService - Cargando empresas para usuario: [user_id]
✅ UnifiedCompanyService - Empresas encontradas: [número]
🏢 CompanySelector - Empresas cargadas (unificado): [número]
🏢 DataContext - Empresas cargadas (compatibilidad unificada): [número]
```

## 🔧 Arquitectura Nueva vs Antigua

### ❌ Arquitectura Antigua (Inconsistente)
```
CompanySelector:
users.id → companies.user_id (busca empresas creadas por el usuario)

CompanyManagement:
users.company_id → companies.id (busca empresa asignada al usuario)
```

### ✅ Arquitectura Nueva (Unificada)
```
Ambos componentes:
users.id → user_companies.user_id → companies.id
+ Roles (ADMIN, MANAGER, USER, VIEWER)
+ Empresa activa en user_sessions
```

## 📊 Beneficios de la Nueva Arquitectura

1. **Consistencia**: Ambos componentes ven las mismas empresas
2. **Multicompañía**: Un usuario puede pertenecer a múltiples empresas
3. **Roles**: Diferentes niveles de acceso por empresa
4. **Sesiones**: Empresa activa por usuario
5. **Escalabilidad**: Preparado para equipos y colaboración

## 🛡️ Compatibilidad y Fallbacks

### Método Legacy
Si falla el nuevo servicio, automáticamente usa:
```typescript
UnifiedCompanyService.getLegacyCompanies()
// Busca en companies.user_id como antes
```

### Logs de Fallback
```
⚠️ Intentando con método legacy...
✅ Empresas cargadas con método legacy: [número]
```

## 🔍 Troubleshooting

### Problema: No se ven empresas
**Solución**: Verificar que la migración se ejecutó correctamente
```sql
SELECT COUNT(*) FROM user_companies;
-- Debe ser > 0
```

### Problema: Error en UnifiedCompanyService
**Solución**: El sistema automáticamente usa el método legacy
- Revisar logs en consola
- Verificar conexión a Supabase

### Problema: Empresas duplicadas
**Solución**: La migración incluye verificaciones `NOT EXISTS`
```sql
-- El script evita duplicados con:
AND NOT EXISTS (
  SELECT 1 FROM user_companies uc 
  WHERE uc.user_id = u.id AND uc.company_id = u.company_id
)
```

## 📝 Próximos Pasos

1. ⏳ **Actualizar CompanyManagement** para usar `UnifiedCompanyService`
2. 🔄 **Probar exhaustivamente** todos los flujos de empresas
3. 🗑️ **Deprecar métodos antiguos** una vez confirmado que todo funciona
4. 📚 **Documentar** la nueva arquitectura para el equipo

## 🎉 Resultado Esperado

Después de la migración:
- ✅ hersan1962 verá sus empresas en CompanySelector
- ✅ hersan1962 verá las mismas empresas en CompanyManagement
- ✅ No habrá más inconsistencias entre componentes
- ✅ La aplicación estará preparada para multicompañía real

---

**Nota**: Esta migración es **no destructiva**. Los datos originales se mantienen intactos, solo se crean nuevas relaciones en `user_companies` y `user_sessions`.