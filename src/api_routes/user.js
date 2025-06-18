// src/api_routes/user.js
const express = require('express');
const router = express.Router();
const { supabase } = require('../lib/supabaseService');
const { addUserProfile, filterByTenant } = require('../lib/authMiddleware');

// Apply security middleware
router.use(addUserProfile);
router.use(filterByTenant);

// GET /api/user/profile - Get current user's profile
router.get('/profile', async (req, res) => {
  const { id, email, role, tenant_id } = req.user || {};
  
  try {
    console.log('=== USER PROFILE ENDPOINT ===');
    console.log('user id:', id);
    console.log('user email:', email);
    console.log('user role:', role);
    console.log('user tenant_id:', tenant_id);

    // The middleware already attached the user profile, so just return it
    if (req.user) {
      return res.json({
        id: id,
        email: email,
        role: role,
        tenant_id: tenant_id,
        is_active: true
      });
    }

    // If somehow no user (shouldn't happen with middleware)
    return res.status(401).json({ error: 'No user profile found' });

  } catch (err) {
    console.error('User profile error:', err.message);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// GET /api/user/profile/:email - Get profile by email (admin only)
router.get('/profile/:email', async (req, res) => {
  const { role, tenant_id } = req.user || {};
  const { email } = req.params;
  
  try {
    console.log('=== USER PROFILE BY EMAIL ENDPOINT ===');
    console.log('Requesting user role:', role);
    console.log('Looking for email:', email);

    // Only admins can look up other users
    if (!['business_admin', 'global_admin'].includes(role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Build query
    let query = supabase
      .from('users_profile')
      .select('id, email, role, tenant_id, is_active')
      .eq('email', email);

    // Non-global admins can only see users in their tenant
    if (role !== 'global_admin') {
      query = query.eq('tenant_id', tenant_id);
    }

    const { data: profile, error } = await query.single();

    if (error) {
      console.error('Profile lookup error:', error);
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(profile);

  } catch (err) {
    console.error('Profile lookup error:', err.message);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

module.exports = router;