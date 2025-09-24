-- Script para agregar las columnas 'phone' y 'last_login' a la tabla 'users' en Supabase
-- Ejecutar este script en el SQL Editor de Supabase

-- Agregar columna phone
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- Agregar columna last_login
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;

-- Opcional: Agregar comentarios a las columnas
COMMENT ON COLUMN users.phone IS 'Número de teléfono del usuario';
COMMENT ON COLUMN users.last_login IS 'Fecha y hora del último inicio de sesión';

-- Verificar que las columnas se agregaron correctamente
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name IN ('phone', 'last_login');