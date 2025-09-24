import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://olxkqysvmxzzbbjxwlyl.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9seGtxeXN2bXh6emJianh3bHlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0ODc4NjMsImV4cCI6MjA3MjA2Mzg2M30.EkbIW23rr3NXjYcs1L8PoYA-7uf0a5Axe7j9kd8K2Qc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSupabaseConnection() 
  console.log('🔍 Probando conexión con Supabase...');
  
  try {
    console.log('📋 Configuración:');
    console.log('URL:', supabaseUrl);
    console.log('Key:', supabaseAnonKey ? 'Definida' : 'No definida');
    
    // Probar conexión básica
    const { data, error } = await supabase.from('companies').select('*').limit(1);
    
    if (error) {
      console.error('❌ Error de conexión:', error.message);
      console.error('Detalles:', error);
      return false;
    }
    
    console.log('✅ Conexión exitosa con Supabase');
    console.log('📊 Datos encontrados:', data ? data.length : 0, 'registros');
    
    // Probar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.log('⚠️ Sin usuario autenticado:', authError.message);
    } else {
      console.log('👤 Usuario actual:', user ? user.email : 'No autenticado');
    }
    
    return true;
    
  } catch (error) {
    console.error('💥 Error inesperado:', error.message);
    return false;
  }
}

testSupabaseConnection().then(success => {
  console.log(success ? '🎉 Prueba completada exitosamente' : '💔 Prueba falló');
  process.exit(success ? 0 : 1);
});