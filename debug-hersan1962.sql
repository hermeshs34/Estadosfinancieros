-- Script para verificar inconsistencia de empresas para usuario hersan1962

-- 1. Buscar el usuario hersan1962
SELECT id, email, full_name, company_id 
FROM users 
WHERE email LIKE '%hersan1962%' OR full_name LIKE '%hersan%';

-- 2. Buscar empresas creadas por hersan1962 (user_id)
SELECT id, name, tax_id, user_id, created_at
FROM companies 
WHERE user_id IN (
  SELECT id FROM users WHERE email LIKE '%hersan1962%' OR full_name LIKE '%hersan%'
);

-- 3. Buscar empresas donde hersan1962 está asignado (company_id en users)
SELECT c.id, c.name, c.tax_id, c.user_id, c.created_at
FROM companies c
INNER JOIN users u ON c.id = u.company_id
WHERE u.email LIKE '%hersan1962%' OR u.full_name LIKE '%hersan%';

-- 4. Buscar relaciones en user_companies (nueva arquitectura)
SELECT uc.*, c.name as company_name, c.tax_id, u.email
FROM user_companies uc
INNER JOIN companies c ON uc.company_id = c.id
INNER JOIN users u ON uc.user_id = u.id
WHERE u.email LIKE '%hersan1962%' OR u.full_name LIKE '%hersan%';

-- 5. Buscar sesiones activas
SELECT us.*, c.name as active_company_name, u.email
FROM user_sessions us
INNER JOIN users u ON us.user_id = u.id
LEFT JOIN companies c ON us.active_company_id = c.id
WHERE u.email LIKE '%hersan1962%' OR u.full_name LIKE '%hersan%';