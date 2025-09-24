-- Migración para unificar arquitectura multicompañía
-- Basado en los resultados del debug-hersan1962.sql

-- PASO 1: Crear relaciones en user_companies para empresas existentes
-- Migrar empresas creadas por usuarios (user_id en companies)
INSERT INTO user_companies (user_id, company_id, role, is_active, joined_at)
SELECT 
    c.user_id,
    c.id as company_id,
    'ADMIN' as role,  -- El creador es admin
    true as is_active,
    c.created_at as joined_at
FROM companies c
WHERE c.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM user_companies uc 
    WHERE uc.user_id = c.user_id AND uc.company_id = c.id
  );

-- PASO 2: Crear relaciones para usuarios asignados a empresas (company_id en users)
INSERT INTO user_companies (user_id, company_id, role, is_active, joined_at)
SELECT 
    u.id as user_id,
    u.company_id,
    'USER' as role,  -- Usuario asignado
    true as is_active,
    NOW() as joined_at
FROM users u
WHERE u.company_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM user_companies uc 
    WHERE uc.user_id = u.id AND uc.company_id = u.company_id
  );

-- PASO 3: Establecer empresa activa en user_sessions
-- Para usuarios que tienen company_id asignado
INSERT INTO user_sessions (user_id, active_company_id, updated_at)
SELECT 
    u.id as user_id,
    u.company_id as active_company_id,
    NOW() as updated_at
FROM users u
WHERE u.company_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM user_sessions us 
    WHERE us.user_id = u.id
  )
ON CONFLICT (user_id) DO UPDATE SET
    active_company_id = EXCLUDED.active_company_id,
    updated_at = EXCLUDED.updated_at;

-- Para usuarios que crearon empresas pero no tienen company_id
INSERT INTO user_sessions (user_id, active_company_id, updated_at)
SELECT 
    c.user_id,
    c.id as active_company_id,
    NOW() as updated_at
FROM companies c
INNER JOIN users u ON c.user_id = u.id
WHERE c.user_id IS NOT NULL
  AND u.company_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM user_sessions us 
    WHERE us.user_id = c.user_id
  )
  -- Tomar la empresa más reciente si hay varias
  AND c.id = (
    SELECT c2.id FROM companies c2 
    WHERE c2.user_id = c.user_id 
    ORDER BY c2.created_at DESC 
    LIMIT 1
  )
ON CONFLICT (user_id) DO NOTHING;

-- PASO 4: Verificar resultados de la migración
SELECT 'user_companies' as tabla, COUNT(*) as registros FROM user_companies
UNION ALL
SELECT 'user_sessions' as tabla, COUNT(*) as registros FROM user_sessions
UNION ALL
SELECT 'companies' as tabla, COUNT(*) as registros FROM companies
UNION ALL
SELECT 'users' as tabla, COUNT(*) as registros FROM users;

-- PASO 5: Mostrar relaciones para hersan1962 después de la migración
SELECT 
    'Relaciones user_companies' as tipo,
    u.email,
    c.name as empresa,
    c.tax_id as rif,
    uc.role,
    uc.is_active
FROM user_companies uc
INNER JOIN users u ON uc.user_id = u.id
INNER JOIN companies c ON uc.company_id = c.id
WHERE u.email LIKE '%hersan1962%'
ORDER BY c.created_at;

-- PASO 6: Mostrar sesiones activas
SELECT 
    'Sesión activa' as tipo,
    u.email,
    c.name as empresa_activa,
    c.tax_id as rif_activo
FROM user_sessions us
INNER JOIN users u ON us.user_id = u.id
INNER JOIN companies c ON us.active_company_id = c.id
WHERE u.email LIKE '%hersan1962%';