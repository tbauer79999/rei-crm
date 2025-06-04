// supabaseClient.js (root-level, backend version)
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // 🔥 use the service role key here
);

module.exports = { supabase };
