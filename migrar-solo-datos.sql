-- MIGRACIÓN SIMPLIFICADA DE DATOS MULTICOMPAÑÍA
-- Solo migra los datos, omite índices que ya existen

-- Deshabilitar RLS temporalmente para la migración
ALTER TABLE user_companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions DISABLE ROW LEVEL SECURITY;

-- Migrar relaciones usuario-empresa
INSERT INTO user_companies (user_id, company_id, role, is_active, created_at)
SELECT
  u.id as user_id,
  u.company_id,
  'admin' as role,
  true as is_active,
  u.created_at
FROM users u
WHERE u.company_id IS NOT NULL
ON CONFLICT (user_id, company_id) DO NOTHING;

-- Migrar sesiones de usuario
INSERT INTO user_sessions (user_id, active_company_id, created_at)
SELECT
  u.id as user_id,
  u.company_id as active_company_id,
  u.created_at
FROM users u
WHERE u.company_id IS NOT NULL
ON CONFLICT (user_id) DO UPDATE SET
  active_company_id = EXCLUDED.active_company_id,
  updated_at = NOW();

-- Rehabilitar RLS
ALTER TABLE user_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Verificar migración
SELECT 'user_companies' as tabla, COUNT(*) as registros FROM user_companies
UNION ALL
SELECT 'user_sessions' as tabla, COUNT(*) as registros FROM user_sessions;

-- Consulta de verificación final
SELECT 
  u.email,
  c.name as empresa_actual,
  uc.role as rol,
  CASE WHEN us.active_company_id IS NOT NULL THEN 'Activa' ELSE 'Sin sesión' END as estado_sesion
FROM users u
LEFT JOIN companies c ON c.id = u.company_id
LEFT JOIN user_companies uc ON uc.user_id = u.id AND uc.company_id = u.company_id
LEFT JOIN user_sessions us ON us.user_id = u.id
WHERE u.company_id IS NOT NULL
ORDER BY u.email;