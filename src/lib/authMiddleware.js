//src/lib/authMiddleware.js - FIXED: Handles ID mismatch between auth and profile
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase clients
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getUserProfile(userId) {
  // First try to get profile by user ID
  let { data, error } = await supabaseAdmin
    .from('users_profile')
    .select('tenant_id, role, email')
    .eq('id', userId)
    .single();

  // If not found by ID, try to get user's email from auth and search by email
  if (error && error.code === 'PGRST116') {
    console.log('Profile not found by ID, trying by email...');
    
    try {
      // Get user's email from auth
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
      
      if (authUser?.user?.email) {
        console.log(`Searching profile by email: ${authUser.user.email}`);
        
        // Search by email instead
        const { data: profileByEmail, error: emailError } = await supabaseAdmin
          .from('users_profile')
          .select('tenant_id, role, email')
          .eq('email', authUser.user.email)
          .single();
        
        if (!emailError && profileByEmail) {
          console.log('✅ Found profile by email:', profileByEmail.email);
          return profileByEmail;
        } else {
          console.log('❌ Profile not found by email either:', emailError?.message);
        }
      }
    } catch (authError) {
      console.error('Error getting user from auth:', authError.message);
    }
  }

  if (error) {
    throw new Error(`Unable to fetch user profile: ${error.message}`);
  }

  return data;
}

async function getTenantIdFromRequest(req) {
  if (!req.user || !req.user.id) {
    throw new Error('User not authenticated');
  }

  const profile = await getUserProfile(req.user.id);
  return profile.tenant_id;
}

async function addUserProfile(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    console.log('🔍 Auth header:', authHeader ? 'Present' : 'Missing');

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);

      const { data: { user }, error } = await supabase.auth.getUser(token);
console.log(`🆔 Auth user ID from token: ${user.id}`); // ADD THIS LINE
      if (error || !user) {
        console.warn('❌ Invalid Supabase token:', error?.message);
        return res.status(401).json({ error: 'Invalid or expired token' });
      }

      console.log(`🔍 Looking up profile for user ID: ${user.id}`);
      const profile = await getUserProfile(user.id);

      req.user = {
        id: user.id,
        email: user.email,
        role: profile.role,
        tenant_id: profile.tenant_id
      };

      console.log(`✅ Authenticated user: ${req.user.email} (${req.user.role}) - Tenant: ${req.user.tenant_id}`);
      return next();
    }

    // 🔒 No valid token found
    console.warn('❌ No auth token provided');
    return res.status(401).json({
      error: 'Authentication required',
      hint: 'Include a valid Supabase token in Authorization header'
    });

  } catch (error) {
    console.error('🚨 Auth middleware error:', error.message);
    return res.status(500).json({
      error: 'Authentication middleware failed',
      details: error.message
    });
  }
}

function filterByTenant(req, res, next) {
  const { role, tenant_id } = req.user || {};

  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      hint: 'Please login or provide valid authentication token'
    });
  }

  if (role === 'global_admin') {
    req.tenantFilter = {};
  } else {
    req.tenantFilter = { tenant_id };
  }

  console.log(`✅ Tenant filter: ${role} ->`, req.tenantFilter);
  next();
}

function requireEnterpriseAccess(req, res, next) {
  const { role } = req.user || {};

  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!['global_admin', 'enterprise_admin'].includes(role)) {
    return res.status(403).json({
      error: 'Enterprise access required',
      current_role: role,
    });
  }

  console.log(`✅ Enterprise access granted for: ${req.user.email}`);
  next();
}

module.exports = {
  getTenantIdFromRequest,
  getUserProfile,
  addUserProfile,
  filterByTenant,
  requireEnterpriseAccess
};