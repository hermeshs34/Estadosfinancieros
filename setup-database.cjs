// Script para configurar la base de datos con las tablas necesarias
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Faltan variables de entorno VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupDatabase() {
  try {
    console.log('Configurando base de datos...');
    
    // Primero verificar si la tabla ya existe
    const { data: existingTable, error: checkError } = await supabase
      .from('role_permissions')
      .select('*')
      .limit(1);
    
    if (!checkError) {
      console.log('La tabla role_permissions ya existe');
      return;
    }
    
    console.log('Creando tabla role_permissions...');
    
    // Insertar datos iniciales directamente
    const defaultPermissions = [
      {
        role: 'admin',
        permissions: [
          'users.create',
          'users.read', 
          'users.update',
          'users.delete',
          'companies.manage',
          'financial_data.full_access',
          'reports.full_access',
          'settings.manage'
        ]
      },
      {
        role: 'senior_analyst',
        permissions: [
          'users.read',
          'financial_data.full_access',
          'reports.full_access', 
          'companies.read'
        ]
      },
      {
        role: 'junior_analyst',
        permissions: [
          'financial_data.read',
          'financial_data.create',
          'reports.read',
          'companies.read'
        ]
      },
      {
        role: 'read_only',
        permissions: [
          'financial_data.read',
          'reports.read',
          'companies.read'
        ]
      }
    ];
    
    // Intentar insertar los datos (esto creará la tabla si no existe en Supabase)
    const { data, error } = await supabase
      .from('role_permissions')
      .insert(defaultPermissions);
    
    if (error) {
      console.error('Error insertando permisos por defecto:', error);
      console.log('Esto es normal si la tabla no existe aún. Necesitas crearla manualmente en Supabase.');
      console.log('\nSQL para crear la tabla:');
      console.log(`
CREATE TABLE role_permissions (
  id SERIAL PRIMARY KEY,
  role VARCHAR(50) NOT NULL UNIQUE,
  permissions TEXT[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
`);
      return;
    }
    
    console.log('Permisos por defecto insertados exitosamente:', data);
    
  } catch (error) {
    console.error('Error configurando base de datos:', error);
  }
}

// Ejecutar la configuración
setupDatabase();