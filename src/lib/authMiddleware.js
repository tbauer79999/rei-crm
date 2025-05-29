const supabase = require('./supabaseClient');

async function getTenantIdFromRequest(req) {
  // TEMP OVERRIDE for dev/testing
  return '46f58bba-b709-4460-8df1-ee61f0d42c57';

  // ↓ Unreachable for now — use this later when auth is fully wired
  /*
  if (!req.user || !req.user.id) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('users_profile')
    .select('tenant_id')
    .eq('id', req.user.id)
    .single();

  if (error || !data) {
    throw new Error('Unable to resolve tenant_id');
  }

  return data.tenant_id;
  */
}

module.exports = {
  getTenantIdFromRequest
};
