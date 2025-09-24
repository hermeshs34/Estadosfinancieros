-- IMPLEMENTACIÓN MULTICOMPAÑÍA - PASO 1: ESTRUCTURA DE BASE DE DATOS
-- Este script implementa la base de datos para el sistema multicompañía

-- =====================================================
-- 1. CREAR TABLA DE RELACIÓN USUARIO-EMPRESA
-- =====================================================

CREATE TABLE IF NOT EXISTS user_companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'user', 'viewer')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraint para evitar duplicados
  UNIQUE(user_id, company_id)
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_user_companies_user_id ON user_companies(user_id);
CREATE INDEX IF NOT EXISTS idx_user_companies_company_id ON user_companies(company_id);
CREATE INDEX IF NOT EXISTS idx_user_companies_active ON user_companies(user_id, is_active);

-- =====================================================
-- 2. CREAR TABLA DE SESIONES DE USUARIO
-- =====================================================

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  active_company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Un usuario solo puede tener una sesión activa
  UNIQUE(user_id)
);

-- Índice para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);

-- =====================================================
-- 3. MIGRAR DATOS EXISTENTES
-- =====================================================

-- Migrar relaciones existentes de users.company_id a user_companies
INSERT INTO user_companies (user_id, company_id, role, created_at)
SELECT 
  u.id as user_id,
  u.company_id,
  'admin' as role,  -- Asignar rol admin a usuarios existentes
  u.created_at
FROM users u 
WHERE u.company_id IS NOT NULL
ON CONFLICT (user_id, company_id) DO NOTHING;

-- Crear sesiones iniciales para usuarios existentes
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

-- =====================================================
-- 4. FUNCIONES DE UTILIDAD
-- =====================================================

-- Función para obtener empresas de un usuario
CREATE OR REPLACE FUNCTION get_user_companies(p_user_id UUID)
RETURNS TABLE (
  company_id UUID,
  company_name VARCHAR,
  company_rif VARCHAR,
  user_role VARCHAR,
  is_active BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.rif,
    uc.role,
    uc.is_active
  FROM user_companies uc
  JOIN companies c ON c.id = uc.company_id
  WHERE uc.user_id = p_user_id
    AND uc.is_active = true
  ORDER BY c.name;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener empresa activa de un usuario
CREATE OR REPLACE FUNCTION get_active_company(p_user_id UUID)
RETURNS TABLE (
  company_id UUID,
  company_name VARCHAR,
  company_rif VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.rif
  FROM user_sessions us
  JOIN companies c ON c.id = us.active_company_id
  WHERE us.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Función para cambiar empresa activa
CREATE OR REPLACE FUNCTION set_active_company(p_user_id UUID, p_company_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_has_access BOOLEAN;
BEGIN
  -- Verificar que el usuario tiene acceso a la empresa
  SELECT EXISTS(
    SELECT 1 FROM user_companies 
    WHERE user_id = p_user_id 
      AND company_id = p_company_id 
      AND is_active = true
  ) INTO user_has_access;
  
  IF NOT user_has_access THEN
    RAISE EXCEPTION 'Usuario no tiene acceso a esta empresa';
  END IF;
  
  -- Actualizar o insertar sesión
  INSERT INTO user_sessions (user_id, active_company_id, updated_at)
  VALUES (p_user_id, p_company_id, NOW())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    active_company_id = EXCLUDED.active_company_id,
    updated_at = NOW();
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. POLÍTICAS DE SEGURIDAD (RLS)
-- =====================================================

-- Habilitar RLS en las nuevas tablas
ALTER TABLE user_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Política para user_companies: usuarios solo ven sus propias relaciones
CREATE POLICY "Users can view their own company relationships" ON user_companies
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own company relationships" ON user_companies
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own company relationships" ON user_companies
  FOR UPDATE USING (auth.uid() = user_id);

-- Política para user_sessions: usuarios solo ven su propia sesión
CREATE POLICY "Users can view their own session" ON user_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own session" ON user_sessions
  FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- 6. TRIGGERS PARA AUDITORÍA
-- =====================================================

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_companies_updated_at
  BEFORE UPDATE ON user_companies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_sessions_updated_at
  BEFORE UPDATE ON user_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 7. VERIFICACIÓN DE LA MIGRACIÓN
-- =====================================================

-- Mostrar resumen de la migración
DO $$
DECLARE
  total_users INTEGER;
  migrated_relationships INTEGER;
  migrated_sessions INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_users FROM users WHERE company_id IS NOT NULL;
  SELECT COUNT(*) INTO migrated_relationships FROM user_companies;
  SELECT COUNT(*) INTO migrated_sessions FROM user_sessions;
  
  RAISE NOTICE '=== RESUMEN DE MIGRACIÓN ===';
  RAISE NOTICE 'Usuarios con empresa: %', total_users;
  RAISE NOTICE 'Relaciones migradas: %', migrated_relationships;
  RAISE NOTICE 'Sesiones creadas: %', migrated_sessions;
  RAISE NOTICE '================================';
END $$;

-- Consulta para verificar datos migrados
SELECT 
  u.email,
  c.name as empresa_actual,
  uc.role as rol,
  ac.name as empresa_activa
FROM users u
LEFT JOIN companies c ON c.id = u.company_id
LEFT JOIN user_companies uc ON uc.user_id = u.id AND uc.company_id = u.company_id
LEFT JOIN user_sessions us ON us.user_id = u.id
LEFT JOIN companies ac ON ac.id = us.active_company_id
ORDER BY u.email;

-- =====================================================
-- COMENTARIOS FINALES
-- =====================================================

/*
Este script ha creado:

1. Tabla user_companies: Relación muchos a muchos entre usuarios y empresas
2. Tabla user_sessions: Gestión de empresa activa por usuario
3. Migración de datos existentes desde users.company_id
4. Funciones de utilidad para consultas comunes
5. Políticas de seguridad RLS
6. Triggers para auditoría

Próximos pasos:
1. Ejecutar implementar-multicompania-paso2.ts (servicios backend)
2. Ejecutar implementar-multicompania-paso3.tsx (componentes frontend)
3. Probar funcionalidad completa

NOTA: Este script es seguro de ejecutar múltiples veces (idempotente)
*/