// src/lib/supabaseClient.js  
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Singleton pattern to ensure only one instance
if (!global._supabaseClient) {
  console.log('✨ Creating new Supabase client instance');
  
  global._supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      storageKey: 'supabase.auth.token',
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      detectSessionInUrl: true,
      autoRefreshToken: true
    }
  });
} else {
  console.log('♻️  Reusing existing Supabase client instance');
}

module.exports = global._supabaseClient;