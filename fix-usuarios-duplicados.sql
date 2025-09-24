-- SCRIPT DE LIMPIEZA INMEDIATA: Usuarios Duplicados
-- IMPORTANTE: Ejecutar paso a paso y revisar resultados antes de continuar

-- PASO 1: IDENTIFICAR EL PROBLEMA
-- Ejecutar primero para entender qué usuarios están duplicados
SELECT 
    email,
    COUNT(*) as total_duplicates,
    array_agg(id ORDER BY created_at) as user_ids,
    array_agg(company_id ORDER BY created_at) as company_ids,
    array_agg(full_name ORDER BY created_at) as names,
    array_agg(created_at ORDER BY created_at) as creation_dates,
    array_agg(is_active ORDER BY created_at) as active_status
FROM users 
GROUP BY email 
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;

-- PASO 2: VERIFICAR USUARIOS SIN EMPRESA
SELECT 
    id, 
    email, 
    full_name, 
    company_id,
    role,
    is_active,
    created_at
FROM users 
WHERE company_id IS NULL
ORDER BY created_at DESC;

-- PASO 3: VERIFICAR LA EMPRESA ESPECÍFICA DEL PROBLEMA
SELECT 
    id,
    name,
    tax_id,
    user_id as owner_user_id,
    created_at
FROM companies 
WHERE id = '79a9d723-1954-4f6e-b38a-d15bcd620477';

-- PASO 4: ESTRATEGIA DE LIMPIEZA
-- Opción A: Consolidar información y eliminar duplicados
-- (Mantener el registro más reciente con la información más completa)

-- PASO 4A: CREAR TABLA TEMPORAL PARA BACKUP
CREATE TABLE users_backup AS 
SELECT * FROM users WHERE email IN (
    SELECT email 
    FROM users 
    GROUP BY email 
    HAVING COUNT(*) > 1
);

-- PASO 4B: IDENTIFICAR USUARIOS A MANTENER (más recientes y con más información)
WITH ranked_users AS (
    SELECT 
        *,
        ROW_NUMBER() OVER (
            PARTITION BY email 
            ORDER BY 
                CASE WHEN company_id IS NOT NULL THEN 1 ELSE 2 END, -- Priorizar los que tienen empresa
                CASE WHEN phone IS NOT NULL AND phone != '' THEN 1 ELSE 2 END, -- Priorizar los que tienen teléfono
                created_at DESC -- Más recientes
        ) as rn
    FROM users
    WHERE email IN (
        SELECT email 
        FROM users 
        GROUP BY email 
        HAVING COUNT(*) > 1
    )
)
SELECT 
    email,
    id as keep_user_id,
    full_name,
    company_id,
    phone,
    role,
    created_at,
    'MANTENER' as action
FROM ranked_users 
WHERE rn = 1
UNION ALL
SELECT 
    email,
    id as delete_user_id,
    full_name,
    company_id,
    phone,
    role,
    created_at,
    'ELIMINAR' as action
FROM ranked_users 
WHERE rn > 1
ORDER BY email, action;

-- PASO 5: CONSOLIDAR INFORMACIÓN ANTES DE ELIMINAR
-- Actualizar el usuario que se va a mantener con la mejor información disponible
WITH best_info AS (
    SELECT 
        email,
        MAX(CASE WHEN full_name IS NOT NULL AND full_name != '' THEN full_name END) as best_name,
        MAX(CASE WHEN phone IS NOT NULL AND phone != '' THEN phone END) as best_phone,
        MAX(CASE WHEN company_id IS NOT NULL THEN company_id END) as best_company_id,
        MIN(created_at) as earliest_created -- Mantener la fecha de creación más antigua
    FROM users
    WHERE email IN (
        SELECT email 
        FROM users 
        GROUP BY email 
        HAVING COUNT(*) > 1
    )
    GROUP BY email
),
users_to_keep AS (
    SELECT 
        u.id,
        u.email,
        bi.best_name,
        bi.best_phone,
        bi.best_company_id,
        bi.earliest_created
    FROM users u
    JOIN best_info bi ON u.email = bi.email
    WHERE u.id IN (
        SELECT id 
        FROM (
            SELECT 
                id,
                ROW_NUMBER() OVER (
                    PARTITION BY email 
                    ORDER BY 
                        CASE WHEN company_id IS NOT NULL THEN 1 ELSE 2 END,
                        CASE WHEN phone IS NOT NULL AND phone != '' THEN 1 ELSE 2 END,
                        created_at DESC
                ) as rn
            FROM users
            WHERE email IN (
                SELECT email 
                FROM users 
                GROUP BY email 
                HAVING COUNT(*) > 1
            )
        ) ranked
        WHERE rn = 1
    )
)
UPDATE users 
SET 
    full_name = COALESCE(utk.best_name, users.full_name),
    phone = COALESCE(utk.best_phone, users.phone),
    company_id = COALESCE(utk.best_company_id, users.company_id),
    created_at = utk.earliest_created,
    updated_at = NOW()
FROM users_to_keep utk
WHERE users.id = utk.id;

-- PASO 6: ELIMINAR USUARIOS DUPLICADOS
-- CUIDADO: Este paso es irreversible. Asegúrate de haber hecho backup
WITH users_to_delete AS (
    SELECT id 
    FROM (
        SELECT 
            id,
            ROW_NUMBER() OVER (
                PARTITION BY email 
                ORDER BY 
                    CASE WHEN company_id IS NOT NULL THEN 1 ELSE 2 END,
                    CASE WHEN phone IS NOT NULL AND phone != '' THEN 1 ELSE 2 END,
                    created_at DESC
            ) as rn
        FROM users
        WHERE email IN (
            SELECT email 
            FROM users 
            GROUP BY email 
            HAVING COUNT(*) > 1
        )
    ) ranked
    WHERE rn > 1
)
DELETE FROM users 
WHERE id IN (SELECT id FROM users_to_delete);

-- PASO 7: ASIGNAR EMPRESA A USUARIOS HUÉRFANOS
-- Si hay usuarios sin company_id, asignarlos a la empresa por defecto
UPDATE users 
SET 
    company_id = '79a9d723-1954-4f6e-b38a-d15bcd620477',
    updated_at = NOW()
WHERE company_id IS NULL;

-- PASO 8: VERIFICACIÓN FINAL
-- Confirmar que no hay más duplicados
SELECT 
    'Usuarios duplicados restantes' as check_type,
    COUNT(*) as count
FROM (
    SELECT email
    FROM users 
    GROUP BY email 
    HAVING COUNT(*) > 1
) duplicates
UNION ALL
SELECT 
    'Usuarios sin empresa' as check_type,
    COUNT(*) as count
FROM users 
WHERE company_id IS NULL
UNION ALL
SELECT 
    'Total usuarios' as check_type,
    COUNT(*) as count
FROM users;

-- PASO 9: VERIFICAR USUARIOS EN LA EMPRESA ESPECÍFICA
SELECT 
    u.id,
    u.email,
    u.full_name,
    u.company_id,
    u.role,
    u.is_active,
    u.phone,
    u.created_at,
    c.name as company_name
FROM users u
LEFT JOIN companies c ON u.company_id = c.id
WHERE u.company_id = '79a9d723-1954-4f6e-b38a-d15bcd620477'
ORDER BY u.created_at DESC;

-- PASO 10: LIMPIAR TABLA DE BACKUP (OPCIONAL)
-- DROP TABLE users_backup;

-- NOTAS IMPORTANTES:
-- 1. Ejecutar cada paso por separado y revisar resultados
-- 2. El PASO 4A crea un backup automático de usuarios duplicados
-- 3. Los PASOS 5 y 6 son irreversibles, asegúrate de estar conforme con los resultados
-- 4. Después de ejecutar, reinicia la aplicación para ver los cambios