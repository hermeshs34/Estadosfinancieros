-- SCRIPT DE SINCRONIZACIÓN: auth.users <-> tabla users
-- Ejecutar en Supabase SQL Editor

-- PASO 1: Crear función para sincronizar usuario desde auth.users a tabla users
CREATE OR REPLACE FUNCTION sync_user_from_auth()
RETURNS TRIGGER AS $$
BEGIN
    -- Cuando se crea un nuevo usuario en auth.users, crear registro en tabla users
    IF TG_OP = 'INSERT' THEN
        INSERT INTO users (
            id,
            email,
            full_name,
            company_id,
            role,
            is_active,
            created_at
        ) VALUES (
            NEW.id,
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
            (NEW.raw_user_meta_data->>'company_id')::UUID,
            COALESCE(NEW.raw_user_meta_data->>'role', 'read_only'),
            true,
            NEW.created_at
        )
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            full_name = COALESCE(EXCLUDED.full_name, users.full_name),
            updated_at = NOW();
        
        RETURN NEW;
    END IF;
    
    -- Cuando se actualiza un usuario en auth.users, actualizar tabla users
    IF TG_OP = 'UPDATE' THEN
        UPDATE users SET
            email = NEW.email,
            full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', users.full_name),
            updated_at = NOW()
        WHERE id = NEW.id;
        
        RETURN NEW;
    END IF;
    
    -- Cuando se elimina un usuario en auth.users, desactivar en tabla users
    IF TG_OP = 'DELETE' THEN
        UPDATE users SET
            is_active = false,
            updated_at = NOW()
        WHERE id = OLD.id;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PASO 2: Crear trigger para sincronización automática
DROP TRIGGER IF EXISTS trigger_sync_user_from_auth ON auth.users;
CREATE TRIGGER trigger_sync_user_from_auth
    AFTER INSERT OR UPDATE OR DELETE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION sync_user_from_auth();

-- PASO 3: Sincronizar usuarios existentes en auth.users que no están en tabla users
INSERT INTO users (
    id,
    email,
    full_name,
    company_id,
    role,
    is_active,
    created_at
)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', au.email) as full_name,
    (au.raw_user_meta_data->>'company_id')::UUID as company_id,
    COALESCE(au.raw_user_meta_data->>'role', 'read_only') as role,
    true as is_active,
    au.created_at
FROM auth.users au
LEFT JOIN users u ON au.id = u.id
WHERE u.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- PASO 4: Actualizar usuarios existentes con información de auth.users
UPDATE users 
SET 
    email = au.email,
    full_name = COALESCE(au.raw_user_meta_data->>'full_name', users.full_name),
    updated_at = NOW()
FROM auth.users au
WHERE users.id = au.id
    AND (users.email != au.email OR users.full_name IS NULL);

-- PASO 5: Función para asignar empresa por defecto a usuarios sin company_id
CREATE OR REPLACE FUNCTION assign_default_company_to_users()
RETURNS INTEGER AS $$
DECLARE
    users_updated INTEGER := 0;
    user_record RECORD;
    default_company_id UUID;
BEGIN
    -- Para cada usuario sin company_id
    FOR user_record IN 
        SELECT u.id, u.email 
        FROM users u 
        WHERE u.company_id IS NULL
    LOOP
        -- Buscar si el usuario tiene empresas como propietario
        SELECT c.id INTO default_company_id
        FROM companies c
        WHERE c.user_id = user_record.id
        LIMIT 1;
        
        -- Si no tiene empresas como propietario, buscar la primera empresa disponible
        IF default_company_id IS NULL THEN
            SELECT c.id INTO default_company_id
            FROM companies c
            ORDER BY c.created_at ASC
            LIMIT 1;
        END IF;
        
        -- Asignar la empresa encontrada
        IF default_company_id IS NOT NULL THEN
            UPDATE users 
            SET company_id = default_company_id,
                updated_at = NOW()
            WHERE id = user_record.id;
            
            users_updated := users_updated + 1;
        END IF;
    END LOOP;
    
    RETURN users_updated;
END;
$$ LANGUAGE plpgsql;

-- PASO 6: Ejecutar asignación de empresa por defecto
SELECT assign_default_company_to_users() as usuarios_actualizados;

-- PASO 7: Función para actualizar último login desde auth.users
CREATE OR REPLACE FUNCTION update_last_login_from_auth()
RETURNS TRIGGER AS $$
BEGIN
    -- Actualizar last_login cuando cambia last_sign_in_at en auth.users
    IF TG_OP = 'UPDATE' AND OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at THEN
        UPDATE users 
        SET last_login = NEW.last_sign_in_at
        WHERE id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PASO 8: Crear trigger para actualizar último login
DROP TRIGGER IF EXISTS trigger_update_last_login ON auth.users;
CREATE TRIGGER trigger_update_last_login
    AFTER UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION update_last_login_from_auth();

-- PASO 9: Sincronizar last_login existente
UPDATE users 
SET last_login = au.last_sign_in_at
FROM auth.users au
WHERE users.id = au.id
    AND au.last_sign_in_at IS NOT NULL
    AND (users.last_login IS NULL OR users.last_login != au.last_sign_in_at);

-- PASO 10: Verificar sincronización
SELECT 
    'Usuarios sincronizados correctamente' as resultado,
    COUNT(*) as cantidad
FROM auth.users au
INNER JOIN users u ON au.id = u.id;

-- PASO 11: Mostrar usuarios que aún necesitan atención
SELECT 
    u.id,
    u.email,
    u.full_name,
    u.company_id,
    u.role,
    CASE 
        WHEN u.company_id IS NULL THEN 'SIN EMPRESA ASIGNADA'
        WHEN u.full_name IS NULL THEN 'SIN NOMBRE COMPLETO'
        ELSE 'OK'
    END as estado
FROM users u
WHERE u.company_id IS NULL OR u.full_name IS NULL
ORDER BY u.created_at DESC;

-- NOTAS IMPORTANTES:
-- 1. Este script crea sincronización automática bidireccional
-- 2. Los triggers se ejecutan automáticamente en futuras operaciones
-- 3. Se sincronizan usuarios existentes
-- 4. Se asignan empresas por defecto a usuarios sin company_id
-- 5. Se mantiene actualizado el último login
-- 6. Ejecutar paso a paso y verificar resultados