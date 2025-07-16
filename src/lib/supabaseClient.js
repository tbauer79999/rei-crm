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

const isBrowser = typeof window !== 'undefined';

const supabaseUrl = isBrowser
  ? process.env.REACT_APP_SUPABASE_URL
  : process.env.SUPABASE_URL;

const supabaseKey = isBrowser
  ? process.env.REACT_APP_SUPABASE_ANON_KEY
  : process.env.SUPABASE_SERVICE_ROLE_KEY;

// Fail fast if env vars are missing
if (!supabaseUrl) throw new Error('supabaseUrl is required.');
if (!supabaseKey) throw new Error('supabaseKey is required.');

// Singleton pattern to ensure only one instance
if (!globalScope._supabaseClient) {
  console.log('✨ Creating new Supabase client instance');

 globalScope._supabaseClient = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    storageKey: 'supabase.auth.token',
    storage: isBrowser ? window.localStorage : undefined,
    detectSessionInUrl: true,
    autoRefreshToken: true
  },  // ← ADD THIS COMMA HERE
  realtime: {
    disabled: true
  }
});
} else {
  console.log('♻️  Reusing existing Supabase client instance');
}

module.exports = globalScope._supabaseClient;