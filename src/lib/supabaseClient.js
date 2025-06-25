// src/lib/supabaseClient.js
/* global globalThis */
const { createClient } = require('@supabase/supabase-js');

// Determine the appropriate global scope depending on the environment
const globalScope =
  typeof globalThis !== 'undefined'
    ? globalThis
    : typeof window !== 'undefined'
      ? window
      : global;

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Singleton pattern to ensure only one instance
if (!globalScope._supabaseClient) {
  console.log('✨ Creating new Supabase client instance');

  globalScope._supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
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

module.exports = globalScope._supabaseClient;
