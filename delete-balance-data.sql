-- =====================================================
-- SCRIPT PARA ELIMINAR DATOS DEL BALANCE
-- =====================================================
-- ADVERTENCIA: Este script eliminará SOLO los datos del balance
-- NO elimina empresas ni períodos financieros
-- Solo elimina registros de la tabla financial_entries
-- Úsalo solo para depuración y asegúrate de tener respaldos
-- =====================================================

-- 1. VERIFICAR DATOS ACTUALES ANTES DE ELIMINAR
-- =====================================================

-- Contar registros en financial_entries
SELECT 
    'financial_entries' as tabla,
    COUNT(*) as total_registros
FROM financial_entries;

-- Ver distribución por empresa y período
SELECT 
    c.name as empresa,
    fp.period_name as periodo,
    COUNT(fe.id) as registros_balance
FROM financial_entries fe
JOIN companies c ON fe.company_id = c.id
JOIN financial_periods fp ON fe.period_id = fp.id
GROUP BY c.name, fp.period_name
ORDER BY c.name, fp.period_name;

-- Ver últimos registros creados
SELECT 
    fe.id,
    c.name as empresa,
    fp.period_name as periodo,
    fe.account_code,
    fe.description,
    fe.amount,
    fe.created_at
FROM financial_entries fe
JOIN companies c ON fe.company_id = c.id
JOIN financial_periods fp ON fe.period_id = fp.id
ORDER BY fe.created_at DESC
LIMIT 10;

-- =====================================================
-- 2. OPCIONES DE ELIMINACIÓN
-- =====================================================

-- OPCIÓN A: Eliminar TODOS los datos del balance (CUIDADO!)
-- Descomenta la siguiente línea solo si estás seguro:
-- DELETE FROM financial_entries;

-- OPCIÓN B: Eliminar datos de una empresa específica
-- Reemplaza 'TU_COMPANY_ID' con el ID real de la empresa
-- DELETE FROM financial_entries WHERE company_id = 'TU_COMPANY_ID';

-- OPCIÓN C: Eliminar datos de un período específico
-- Reemplaza 'TU_PERIOD_ID' con el ID real del período
-- DELETE FROM financial_entries WHERE period_id = 'TU_PERIOD_ID';

-- OPCIÓN D: Eliminar datos de empresa Y período específicos (RECOMENDADO)
-- Reemplaza con los IDs reales
-- DELETE FROM financial_entries 
-- WHERE company_id = 'TU_COMPANY_ID' AND period_id = 'TU_PERIOD_ID';

-- =====================================================
-- 3. VERIFICAR ELIMINACIÓN
-- =====================================================

-- Verificar que los datos fueron eliminados
SELECT 
    'financial_entries' as tabla,
    COUNT(*) as registros_restantes
FROM financial_entries;

-- Si eliminaste datos específicos, verificar:
-- SELECT COUNT(*) FROM financial_entries WHERE company_id = 'TU_COMPANY_ID';
-- SELECT COUNT(*) FROM financial_entries WHERE period_id = 'TU_PERIOD_ID';

-- =====================================================
-- 4. INFORMACIÓN ADICIONAL
-- =====================================================

-- Ver todas las empresas disponibles
SELECT id, name, tax_id, created_at FROM companies ORDER BY name;

-- Ver todos los períodos disponibles
SELECT 
    fp.id,
    fp.period_name,
    c.name as empresa,
    fp.start_date,
    fp.end_date,
    fp.is_published
FROM financial_periods fp
JOIN companies c ON fp.company_id = c.id
ORDER BY c.name, fp.start_date;

-- =====================================================
-- INSTRUCCIONES DE USO:
-- =====================================================
-- 1. Ejecuta primero las consultas de verificación (sección 1)
-- 2. Identifica los IDs de empresa y período que quieres eliminar
-- 3. Descomenta y modifica UNA de las opciones de eliminación (sección 2)
-- 4. Ejecuta la consulta de eliminación
-- 5. Verifica que la eliminación fue exitosa (sección 3)
-- =====================================================

-- EJEMPLO PRÁCTICO:
-- Si quieres eliminar datos de "Mi Empresa" para "Enero 2025":
-- 1. Busca el company_id en la tabla companies
-- 2. Busca el period_id en la tabla financial_periods
-- 3. Usa la OPCIÓN D con esos IDs específicos

-- =====================================================
-- NOTAS IMPORTANTES:
-- =====================================================
-- • Este script SOLO elimina datos de la tabla financial_entries (balance)
-- • NO toca las tablas companies ni financial_periods
-- • Los períodos y empresas se mantienen intactos
-- • Solo se eliminan los registros de balance asociados
-- • Los datos eliminados NO se pueden recuperar sin un respaldo
-- • Siempre verifica los datos antes de eliminar
-- • Usa la opción más específica posible (empresa + período)
-- =====================================================