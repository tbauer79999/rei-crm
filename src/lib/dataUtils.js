const { supabase } = require('./src/lib/supabaseService'); // ✅


const fetchPlatformSetting = async (key) => {
  const { data, error } = await supabase
    .from('platform_settings')
    .select('value')
    .eq('key', key)
    .single();

  if (error) {
    console.error(`Error fetching setting for key "${key}":`, error.message);
    return null;
  }

  return data?.value || null;
};

module.exports = {
  fetchPlatformSetting
};
