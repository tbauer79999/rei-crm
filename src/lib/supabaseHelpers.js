const { supabase } = require('./supabaseService');


// Helper functions (to be exported)
const fetchAllRecords = async (table) => {
  const { data, error } = await supabase
    .from(table)
    .select('*');

  if (error) {
    throw new Error(`Failed to fetch records from ${table}: ${error.message}`);
  }

  return data;
};

const fetchRecordById = async (table, id) => {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    // Log the error or handle it as per application's needs
    // console.error(`Error in fetchRecordById for table ${table}, id ${id}: ${error.message}`);
    // Rethrow or return null/undefined based on how callers expect to handle it
    throw new Error(`Failed to fetch record from ${table} with id ${id}: ${error.message}`);
  }

  return data;
};

const fetchSettingValue = async (key) => {
  const { data, error } = await supabase
    .from('platform_settings')
    .select('value') // Corrected 'Value' to 'value'
    .eq('key', key)   // Corrected 'Key' to 'key'
    .single();

  if (error) {
    console.error(`Error fetching setting "${key}":`, error.message);
    return ''; // Default value or error handling as appropriate
  }

  return data?.value || ''; // Corrected data.Value to data.value
};

const fetchTenantSetting = async (key, tenantId) => {
  const { data, error } = await supabase
    .from('platform_settings')
    .select('value')
    .eq('key', key)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (error) {
    console.error(`Error fetching tenant setting "${key}" for tenant ${tenantId}:`, error.message);
    return '';
  }

  return data?.value || '';
};

module.exports = {
  fetchAllRecords,
  fetchRecordById,
  fetchSettingValue,
  fetchTenantSetting 
};
