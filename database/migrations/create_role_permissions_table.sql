-- Crear tabla para almacenar permisos de roles
CREATE TABLE IF NOT EXISTS role_permissions (
  id SERIAL PRIMARY KEY,
  role VARCHAR(50) NOT NULL,
  permissions TEXT[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role)
);

-- Crear índice para búsquedas por rol
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);

-- Insertar permisos por defecto
INSERT INTO role_permissions (role, permissions) VALUES
('admin', ARRAY[
  'users.create',
  'users.read', 
  'users.update',
  'users.delete',
  'companies.manage',
  'financial_data.full_access',
  'reports.full_access',
  'settings.manage'
]),
('senior_analyst', ARRAY[
  'users.read',
  'financial_data.full_access',
  'reports.full_access', 
  'companies.read'
]),
('junior_analyst', ARRAY[
  'financial_data.read',
  'financial_data.create',
  'reports.read',
  'companies.read'
]),
('read_only', ARRAY[
  'financial_data.read',
  'reports.read',
  'companies.read'
])
ON CONFLICT (role) DO NOTHING;

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_role_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS trigger_update_role_permissions_updated_at ON role_permissions;
CREATE TRIGGER trigger_update_role_permissions_updated_at
  BEFORE UPDATE ON role_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_role_permissions_updated_at();