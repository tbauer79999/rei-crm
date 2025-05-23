// src/lib/supabaseService.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const fetchRecordById = async (table, id) => {
  const { data, error } = await supabase.from(table).select('*').eq('id', id).single();
  if (error) throw error;
  return data;
};

const fetchAllRecords = async (table) => {
  const { data, error } = await supabase.from(table).select('*');
  if (error) throw error;
  return data;
};

const fetchSettingValue = async (key) => {
  const { data, error } = await supabase
    .from('platform_settings')
    .select('value')
    .eq('key', key)
    .single();
  if (error) throw error;
  return data?.value;
};

module.exports = {
  supabase,
  fetchRecordById,
  fetchAllRecords,
  fetchSettingValue,
};
