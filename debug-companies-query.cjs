// Script para debuggear la consulta a la tabla companies
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('VITE_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
  console.log('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Set' : 'Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testCompaniesQuery() {
  console.log('🔍 Testing companies query...');
  console.log('🔗 Supabase URL:', supabaseUrl);
  
  try {
    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('👤 User:', user ? user.id : 'No user');
    if (authError) {
      console.error('❌ Auth error:', authError);
    }
    
    if (!user) {
      console.log('⚠️ No authenticated user - testing without auth');
    }
    
    // Consulta directa a companies sin filtro de usuario
    console.log('🏢 Querying companies table (no user filter)...');
    const { data: allCompanies, error: allError } = await supabase
      .from('companies')
      .select('*')
      .limit(5);
    
    if (allError) {
      console.error('❌ All companies query error:', allError);
    } else {
      console.log('✅ All companies data (first 5):', allCompanies);
    }
    
    if (user) {
      // Consulta directa a companies con filtro de usuario
      console.log('🏢 Querying companies table (with user filter)...');
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', user.id);
      
      if (error) {
        console.error('❌ User companies query error:', error);
      } else {
        console.log('✅ User companies data:', data);
      }
      
      // Consulta a user_companies
      console.log('🔗 Querying user_companies table...');
      const { data: userCompanies, error: ucError } = await supabase
        .from('user_companies')
        .select(`
          id,
          role,
          is_owner,
          joined_at,
          companies (
            id,
            name,
            tax_id,
            country,
            currency,
            created_at
          )
        `)
        .eq('user_id', user.id);
      
      if (ucError) {
        console.error('❌ User companies query error:', ucError);
      } else {
        console.log('✅ User companies data:', userCompanies);
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testCompaniesQuery();