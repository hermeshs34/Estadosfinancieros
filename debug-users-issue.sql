-- DIAGNÓSTICO COMPLETO: Problema de Usuarios Duplicados No Visibles
-- Ejecutar estas consultas en Supabase SQL Editor

-- 1. VERIFICAR USUARIOS DUPLICADOS POR EMAIL
SELECT 
    email,
    COUNT(*) as total_duplicates,
    array_agg(id ORDER BY created_at) as user_ids,
    array_agg(company_id ORDER BY created_at) as company_ids,
    array_agg(full_name ORDER BY created_at) as names,
    array_agg(created_at ORDER BY created_at) as creation_dates
FROM users 
GROUP BY email 
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;

-- 2. VERIFICAR USUARIOS SIN COMPANY_ID (NULL)
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

-- 3. VERIFICAR LA EMPRESA ESPECÍFICA DEL LOG
SELECT 
    id,
    name,
    tax_id,
    user_id as owner_user_id,
    created_at
FROM companies 
WHERE id = '79a9d723-1954-4f6e-b38a-d15bcd620477';

-- 4. BUSCAR USUARIOS EN LA EMPRESA ESPECÍFICA
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

-- 5. VERIFICAR TODAS LAS EMPRESAS Y SUS USUARIOS
SELECT 
    c.id as company_id,
    c.name as company_name,
    c.user_id as company_owner,
    COUNT(u.id) as total_users,
    array_agg(u.email) FILTER (WHERE u.email IS NOT NULL) as user_emails
FROM companies c
LEFT JOIN users u ON c.id = u.company_id
GROUP BY c.id, c.name, c.user_id
ORDER BY COUNT(u.id) DESC;

-- 6. BUSCAR USUARIOS HUÉRFANOS (con company_id que no existe)
SELECT 
    u.id,
    u.email,
    u.full_name,
    u.company_id,
    u.created_at
FROM users u
LEFT JOIN companies c ON u.company_id = c.id
WHERE u.company_id IS NOT NULL AND c.id IS NULL;

-- 7. VERIFICAR USUARIOS RECIENTES (últimos 7 días)
SELECT 
    u.id,
    u.email,
    u.full_name,
    u.company_id,
    c.name as company_name,
    u.role,
    u.is_active,
    u.created_at
FROM users u
LEFT JOIN companies c ON u.company_id = c.id
WHERE u.created_at >= NOW() - INTERVAL '7 days'
ORDER BY u.created_at DESC;

-- 8. CONTAR USUARIOS POR EMPRESA
SELECT 
    c.name as company_name,
    c.id as company_id,
    COUNT(u.id) as user_count,
    COUNT(CASE WHEN u.is_active THEN 1 END) as active_users,
    COUNT(CASE WHEN NOT u.is_active THEN 1 END) as inactive_users
FROM companies c
LEFT JOIN users u ON c.id = u.company_id
GROUP BY c.id, c.name
ORDER BY user_count DESC;

-- 9. VERIFICAR ESTRUCTURA DE TABLA USERS
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- 10. BUSCAR PATRONES EN EMAILS DUPLICADOS
WITH duplicated_emails AS (
    SELECT email
    FROM users 
    GROUP BY email 
    HAVING COUNT(*) > 1
)
SELECT 
    u.email,
    u.id,
    u.full_name,
    u.company_id,
    c.name as company_name,
    u.role,
    u.phone,
    u.created_at,
    ROW_NUMBER() OVER (PARTITION BY u.email ORDER BY u.created_at) as duplicate_order
FROM users u
LEFT JOIN companies c ON u.company_id = c.id
WHERE u.email IN (SELECT email FROM duplicated_emails)
ORDER BY u.email, u.created_at;

-- CONSULTAS DE LIMPIEZA (EJECUTAR SOLO DESPUÉS DE REVISAR LOS RESULTADOS ANTERIORES)

-- SCRIPT PARA ELIMINAR DUPLICADOS (MANTENER EL MÁS RECIENTE)
/*
WITH duplicated_users AS (
    SELECT 
        id,
        email,
        ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at DESC) as rn
    FROM users
    WHERE email IN (
        SELECT email 
        FROM users 
        GROUP BY email 
        HAVING COUNT(*) > 1
    )
)
DELETE FROM users 
WHERE id IN (
    SELECT id 
    FROM duplicated_users 
    WHERE rn > 1
);
*/

-- SCRIPT PARA ACTUALIZAR COMPANY_ID DE USUARIOS HUÉRFANOS
/*
UPDATE users 
SET company_id = '79a9d723-1954-4f6e-b38a-d15bcd620477'
WHERE company_id IS NULL 
AND email = 'email_del_usuario_problema';
*/