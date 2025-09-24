-- IMPLEMENTACIÓN COMPLETA: Sistema Multicompañía
-- Ejecutar en Supabase SQL Editor paso a paso

-- =====================================================
-- FASE 1: CREAR NUEVA ARQUITECTURA MULTICOMPAÑÍA
-- =====================================================

-- PASO 1: Modificar tabla users (remover company_id, será manejado por user_companies)
ALTER TABLE users DROP COLUMN IF EXISTS company_id;

-- Agregar columnas faltantes si no existen
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- PASO 2: Crear tabla de relación usuario-empresa (muchos a muchos)
CREATE TABLE IF NOT EXISTS user_companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'accountant', 'read_only')),
    is_active BOOLEAN DEFAULT true,
    is_owner BOOLEAN DEFAULT false,
    invited_by UUID REFERENCES users(id),
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    joined_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, company_id)
);

-- PASO 3: Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_user_companies_user_id ON user_companies(user_id);
CREATE INDEX IF NOT EXISTS idx_user_companies_company_id ON user_companies(company_id);
CREATE INDEX IF NOT EXISTS idx_user_companies_active ON user_companies(is_active);
CREATE INDEX IF NOT EXISTS idx_user_companies_owner ON user_companies(is_owner);

-- PASO 4: Crear función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- PASO 5: Crear triggers para updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_companies_updated_at ON user_companies;
CREATE TRIGGER update_user_companies_updated_at
    BEFORE UPDATE ON user_companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- FASE 2: MIGRAR DATOS EXISTENTES
-- =====================================================

-- PASO 6: Crear tabla temporal para backup de datos existentes
CREATE TABLE IF NOT EXISTS migration_backup AS
SELECT 
    u.id as user_id,
    u.email,
    u.full_name,
    u.role,
    c.id as company_id,
    c.name as company_name,
    c.user_id as company_owner_id,
    CASE WHEN c.user_id = u.id THEN true ELSE false END as is_owner
FROM users u
LEFT JOIN companies c ON c.user_id = u.id OR c.id::text = u.id::text; -- Intentar relacionar por diferentes criterios

-- PASO 7: Migrar propietarios de empresas a user_companies
INSERT INTO user_companies (
    user_id,
    company_id,
    role,
    is_active,
    is_owner,
    joined_at,
    created_at
)
SELECT DISTINCT
    c.user_id,
    c.id,
    'admin' as role,
    true as is_active,
    true as is_owner,
    c.created_at as joined_at,
    c.created_at
FROM companies c
INNER JOIN users u ON c.user_id = u.id
ON CONFLICT (user_id, company_id) DO UPDATE SET
    is_owner = true,
    role = 'admin',
    updated_at = NOW();

-- PASO 8: Asignar usuarios a empresas basado en el contexto actual
-- (Todos los usuarios activos se asignan a todas las empresas como read_only por defecto)
INSERT INTO user_companies (
    user_id,
    company_id,
    role,
    is_active,
    is_owner,
    joined_at
)
SELECT 
    u.id as user_id,
    c.id as company_id,
    CASE 
        WHEN c.user_id = u.id THEN 'admin'
        ELSE 'read_only'
    END as role,
    true as is_active,
    CASE WHEN c.user_id = u.id THEN true ELSE false END as is_owner,
    NOW() as joined_at
FROM users u
CROSS JOIN companies c
WHERE u.is_active = true
ON CONFLICT (user_id, company_id) DO NOTHING;

-- =====================================================
-- FASE 3: FUNCIONES Y VISTAS PARA EL NUEVO SISTEMA
-- =====================================================

-- PASO 9: Crear vista para obtener usuarios de una empresa
CREATE OR REPLACE VIEW v_company_users AS
SELECT 
    uc.company_id,
    u.id as user_id,
    u.email,
    u.full_name,
    u.phone,
    uc.role,
    uc.is_active,
    uc.is_owner,
    uc.joined_at,
    u.last_login,
    u.created_at as user_created_at,
    uc.created_at as relationship_created_at
FROM user_companies uc
INNER JOIN users u ON uc.user_id = u.id
WHERE uc.is_active = true AND u.is_active = true;

-- PASO 10: Crear vista para obtener empresas de un usuario
CREATE OR REPLACE VIEW v_user_companies AS
SELECT 
    uc.user_id,
    c.id as company_id,
    c.name as company_name,
    c.tax_id,
    c.industry,
    c.country,
    c.currency,
    uc.role,
    uc.is_active,
    uc.is_owner,
    uc.joined_at,
    c.created_at as company_created_at
FROM user_companies uc
INNER JOIN companies c ON uc.company_id = c.id
WHERE uc.is_active = true;

-- PASO 11: Función para invitar usuario a empresa
CREATE OR REPLACE FUNCTION invite_user_to_company(
    p_user_email TEXT,
    p_company_id UUID,
    p_role TEXT,
    p_invited_by UUID
)
RETURNS UUID AS $$
DECLARE
    v_user_id UUID;
    v_invitation_id UUID;
BEGIN
    -- Buscar usuario por email
    SELECT id INTO v_user_id FROM users WHERE email = p_user_email AND is_active = true;
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario con email % no encontrado o inactivo', p_user_email;
    END IF;
    
    -- Crear o actualizar relación usuario-empresa
    INSERT INTO user_companies (
        user_id,
        company_id,
        role,
        is_active,
        is_owner,
        invited_by,
        invited_at
    ) VALUES (
        v_user_id,
        p_company_id,
        p_role,
        true,
        false,
        p_invited_by,
        NOW()
    )
    ON CONFLICT (user_id, company_id) DO UPDATE SET
        role = EXCLUDED.role,
        is_active = true,
        invited_by = EXCLUDED.invited_by,
        invited_at = EXCLUDED.invited_at,
        updated_at = NOW()
    RETURNING id INTO v_invitation_id;
    
    RETURN v_invitation_id;
END;
$$ LANGUAGE plpgsql;

-- PASO 12: Función para cambiar rol de usuario en empresa
CREATE OR REPLACE FUNCTION change_user_role_in_company(
    p_user_id UUID,
    p_company_id UUID,
    p_new_role TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE user_companies 
    SET role = p_new_role,
        updated_at = NOW()
    WHERE user_id = p_user_id 
        AND company_id = p_company_id 
        AND is_active = true;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- PASO 13: Función para remover usuario de empresa
CREATE OR REPLACE FUNCTION remove_user_from_company(
    p_user_id UUID,
    p_company_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    -- No permitir remover al propietario
    IF EXISTS (SELECT 1 FROM user_companies WHERE user_id = p_user_id AND company_id = p_company_id AND is_owner = true) THEN
        RAISE EXCEPTION 'No se puede remover al propietario de la empresa';
    END IF;
    
    UPDATE user_companies 
    SET is_active = false,
        updated_at = NOW()
    WHERE user_id = p_user_id 
        AND company_id = p_company_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FASE 4: POLÍTICAS DE SEGURIDAD (RLS)
-- =====================================================

-- PASO 14: Habilitar RLS en user_companies
ALTER TABLE user_companies ENABLE ROW LEVEL SECURITY;

-- PASO 15: Política para que usuarios solo vean sus propias relaciones
CREATE POLICY "Users can view their own company relationships" ON user_companies
    FOR SELECT USING (user_id = auth.uid());

-- PASO 16: Política para que administradores de empresa vean todos los usuarios de su empresa
CREATE POLICY "Company admins can view all company users" ON user_companies
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_companies uc
            WHERE uc.user_id = auth.uid()
                AND uc.company_id = user_companies.company_id
                AND uc.role IN ('admin', 'manager')
                AND uc.is_active = true
        )
    );

-- =====================================================
-- FASE 5: VERIFICACIÓN Y LIMPIEZA
-- =====================================================

-- PASO 17: Verificar migración
SELECT 
    'Total usuarios' as descripcion,
    COUNT(*) as cantidad
FROM users
WHERE is_active = true

UNION ALL

SELECT 
    'Total empresas' as descripcion,
    COUNT(*) as cantidad
FROM companies

UNION ALL

SELECT 
    'Total relaciones usuario-empresa' as descripcion,
    COUNT(*) as cantidad
FROM user_companies
WHERE is_active = true

UNION ALL

SELECT 
    'Propietarios de empresas' as descripcion,
    COUNT(*) as cantidad
FROM user_companies
WHERE is_owner = true AND is_active = true;

-- PASO 18: Mostrar resumen por empresa
SELECT 
    c.name as empresa,
    COUNT(uc.user_id) as total_usuarios,
    COUNT(CASE WHEN uc.is_owner THEN 1 END) as propietarios,
    COUNT(CASE WHEN uc.role = 'admin' THEN 1 END) as administradores,
    COUNT(CASE WHEN uc.role = 'manager' THEN 1 END) as gerentes,
    COUNT(CASE WHEN uc.role = 'accountant' THEN 1 END) as contadores,
    COUNT(CASE WHEN uc.role = 'read_only' THEN 1 END) as solo_lectura
FROM companies c
LEFT JOIN user_companies uc ON c.id = uc.company_id AND uc.is_active = true
GROUP BY c.id, c.name
ORDER BY c.name;

-- PASO 19: Limpiar tabla de backup (opcional)
-- DROP TABLE IF EXISTS migration_backup;

-- NOTAS IMPORTANTES:
-- 1. Esta migración es IRREVERSIBLE - hacer backup antes de ejecutar
-- 2. Ejecutar paso a paso y verificar resultados
-- 3. La tabla users ya no tiene company_id - se maneja por user_companies
-- 4. Un usuario puede pertenecer a múltiples empresas con diferentes roles
-- 5. Los propietarios de empresas tienen rol 'admin' y is_owner = true
-- 6. Se crean vistas y funciones para facilitar las consultas
-- 7. Se implementan políticas de seguridad RLS