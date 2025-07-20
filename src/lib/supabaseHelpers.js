const { supabase } = require('./supabaseService');
const { getFeatureValue } = require('./plans'); // Import plan utilities

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
    throw new Error(`Failed to fetch record from ${table} with id ${id}: ${error.message}`);
  }

  return data;
};

// Add new function to get tenant's plan
const getTenantPlan = async (tenantId) => {
  const { data, error } = await supabase
    .from('tenants')
    .select('plan')
    .eq('id', tenantId)
    .single();
    
  if (error || !data) {
    console.warn('Could not fetch tenant plan, defaulting to starter');
    return 'starter';
  }
  
  return data.plan || 'starter';
};

// Updated function with plan-based limits
const getRecommendedToneFromScores = async (tenantId) => {
  // Get tenant's plan
  const tenantPlan = await getTenantPlan(tenantId);
  
  // Get conversation memory limit from plan
  const conversationLimit = getFeatureValue(tenantPlan, 'conversationMemory');
  
  // If starter plan (limit = 0), return default tone
  if (conversationLimit === 0) {
    console.log(`🎯 Tenant ${tenantId} on ${tenantPlan} plan - no AI learning, using default tone`);
    return 'Friendly & Casual';
  }
  
  // Build query with plan-based limit
  let query = supabase
    .from('lead_scores')
    .select('motivation_score, hesitation_score, urgency_score, interest_level_score')
    .eq('tenant_id', tenantId)
    .order('updated_at', { ascending: false });
  
  // Apply limit based on plan (unless unlimited)
  if (conversationLimit !== -1) {
    query = query.limit(conversationLimit);
  }
  
  const { data: recentScores, error } = await query;

  console.log(`🎯 AI Learning: ${tenantPlan} plan analyzing ${recentScores?.length || 0} conversations (limit: ${conversationLimit === -1 ? 'unlimited' : conversationLimit})`);

  if (error || !recentScores || recentScores.length === 0) {
    console.warn('No lead_scores data found or error occurred:', error);
    return 'Friendly & Casual';
  }

  const highPerformers = recentScores.filter(
    (row) =>
      row.interest_level_score >= 7 &&
      row.motivation_score >= 70 &&
      row.hesitation_score <= 50
  );

  if (highPerformers.length === 0) return 'Friendly & Casual';

  const avgUrgency = highPerformers.reduce((sum, r) => sum + (r.urgency_score || 0), 0) / highPerformers.length;
  const avgHesitation = highPerformers.reduce((sum, r) => sum + (r.hesitation_score || 0), 0) / highPerformers.length;

  if (avgUrgency > 75 && avgHesitation < 30) return 'Direct Closer';
  if (avgHesitation > 60) return 'Soft & Trust-Building';
  return 'Friendly & Casual';
};

const fetchSettingValue = async (key) => {
  const { data, error } = await supabase
    .from('platform_settings')
    .select('value')
    .eq('key', key)
    .single();

  if (error) {
    console.error(`Error fetching setting "${key}":`, error.message);
    return '';
  }

  return data?.value || '';
};

const callEdgeFunction = async (functionName, options = {}) => {
  const { query = {}, body = {}, method = 'POST' } = options;

  const session = await supabase.auth.getSession();
  const token = session?.data?.session?.access_token;
  if (!token) throw new Error('Missing Supabase auth token');

  const url = new URL(`https://${process.env.REACT_APP_SUPABASE_URL}/functions/v1/${functionName}`);
  Object.entries(query).forEach(([key, value]) => url.searchParams.append(key, value));

  const res = await fetch(url.toString(), {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: method === 'POST' ? JSON.stringify(body) : undefined
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Edge function error: ${res.status} ${errText}`);
  }

  return await res.json();
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
  fetchTenantSetting,
  callEdgeFunction,
  getRecommendedToneFromScores,
  getTenantPlan
};