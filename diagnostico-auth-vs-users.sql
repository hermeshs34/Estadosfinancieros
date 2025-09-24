-- DIAGNÓSTICO: Relación entre auth.users y tabla users personalizada
-- Ejecutar estas consultas en Supabase SQL Editor

-- 1. VERIFICAR USUARIOS EN AUTH.USERS (tabla de autenticación)
SELECT 
    id,
    email,
    created_at,
    email_confirmed_at,
    last_sign_in_at,
    raw_user_meta_data
FROM auth.users 
ORDER BY created_at DESC;

-- 2. VERIFICAR USUARIOS EN TABLA PERSONALIZADA 'users'
SELECT 
    id,
    email,
    full_name,
    company_id,
    role,
    is_active,
    created_at
FROM users 
ORDER BY created_at DESC;

-- 3. COMPARAR: Usuarios en auth.users que NO están en tabla users
SELECT 
    au.id,
    au.email,
    au.created_at as auth_created_at,
    au.last_sign_in_at,
    'FALTA EN TABLA USERS' as status
FROM auth.users au
LEFT JOIN users u ON au.id = u.id
WHERE u.id IS NULL
ORDER BY au.created_at DESC;

-- 4. COMPARAR: Usuarios en tabla users que NO están en auth.users
SELECT 
    u.id,
    u.email,
    u.full_name,
    u.created_at as users_created_at,
    'FALTA EN AUTH.USERS' as status
FROM users u
LEFT JOIN auth.users au ON u.id = au.id
WHERE au.id IS NULL
ORDER BY u.created_at DESC;

-- 5. USUARIOS SINCRONIZADOS (existen en ambas tablas)
SELECT 
    au.id,
    au.email as auth_email,
    u.email as users_email,
    u.full_name,
    u.company_id,
    u.role,
    au.created_at as auth_created,
    u.created_at as users_created,
    au.last_sign_in_at,
    u.last_login,
    'SINCRONIZADO' as status
FROM auth.users au
INNER JOIN users u ON au.id = u.id
ORDER BY au.created_at DESC;

-- 6. BUSCAR EL USUARIO ESPECÍFICO hersan_romero@yahoo.com
SELECT 
    'AUTH.USERS' as tabla,
    id,
    email,
    created_at,
    last_sign_in_at,
    raw_user_meta_data
FROM auth.users 
WHERE email = 'hersan_romero@yahoo.com'

UNION ALL

SELECT 
    'USERS' as tabla,
    id,
    email,
    created_at::text,
    last_login::text,
    (full_name || ' - ' || COALESCE(role, 'sin_rol'))::jsonb
FROM users 
WHERE email = 'hersan_romero@yahoo.com'
ORDER BY tabla, created_at;

-- 7. VERIFICAR DUPLICADOS EN AUTH.USERS
SELECT 
    email,
    COUNT(*) as total_duplicates,
    array_agg(id ORDER BY created_at) as user_ids,
    array_agg(created_at ORDER BY created_at) as creation_dates
FROM auth.users 
GROUP BY email 
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;

-- 8. VERIFICAR EMPRESAS DEL USUARIO AUTENTICADO
SELECT 
    c.id,
    c.name,
    c.tax_id,
    c.user_id as owner_id,
    au.email as owner_email,
    c.created_at
FROM companies c
INNER JOIN auth.users au ON c.user_id = au.id
WHERE au.email = 'hersan_romero@yahoo.com'
ORDER BY c.created_at DESC;

-- 9. RESUMEN DEL PROBLEMA
SELECT 
    'Total usuarios en auth.users' as descripcion,
    COUNT(*)::text as cantidad
FROM auth.users

UNION ALL

SELECT 
    'Total usuarios en tabla users' as descripcion,
    COUNT(*)::text as cantidad
FROM users

UNION ALL

SELECT 
    'Usuarios sincronizados' as descripcion,
    COUNT(*)::text as cantidad
FROM auth.users au
INNER JOIN users u ON au.id = u.id

UNION ALL

SELECT 
    'Usuarios solo en auth.users' as descripcion,
    COUNT(*)::text as cantidad
FROM auth.users au
LEFT JOIN users u ON au.id = u.id
WHERE u.id IS NULL

UNION ALL

SELECT 
    'Usuarios solo en tabla users' as descripcion,
    COUNT(*)::text as cantidad
FROM users u
LEFT JOIN auth.users au ON u.id = au.id
WHERE au.id IS NULL;

-- NOTAS:
-- 1. La tabla auth.users es gestionada por Supabase Auth
-- 2. La tabla users es personalizada para la aplicación
-- 3. Deben estar sincronizadas: cada usuario en auth.users debe tener un registro en users
-- 4. El ID debe ser el mismo en ambas tablas
-- 5. Si hay usuarios solo en auth.users, falta sincronización
-- 6. Si hay usuarios solo en users, hay registros huérfanos