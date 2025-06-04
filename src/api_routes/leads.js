// /api_routes/leads.js
const express = require('express');
const router = express.Router();
const { supabase } = require('../lib/supabaseService');
const { addUserProfile, filterByTenant } = require('../lib/authMiddleware');

// Apply security middleware
router.use(addUserProfile);
router.use(filterByTenant);

// Get individual lead by ID
router.get('/:id', async (req, res) => {
  const leadId = req.params.id;
  const { role, tenant_id } = req.user || {};

  try {
    // Security check
    if (!tenant_id && role !== 'global_admin') {
      return res.status(403).json({ error: 'No tenant access configured' });
    }

    // Build query with security filter
    let query = supabase
      .from('leads')
      .select('id, name, phone, email, status, created_at, marked_hot_at, status_history')
      .eq('id', leadId);

    // Apply tenant filtering
    if (role !== 'global_admin') {
      query = query.eq('tenant_id', tenant_id);
    }

    const { data, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Lead not found or access denied' });
      }
      console.error('Supabase error:', error.message);
      return res.status(500).json({ error: 'Failed to fetch lead' });
    }

    if (!data) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Split name into first_name and last_name if needed
    const nameParts = data.name ? data.name.split(' ') : ['', ''];
    const response = {
      data: {
        ...data,
        first_name: nameParts[0] || '',
        last_name: nameParts.slice(1).join(' ') || ''
      },
      meta: { role, tenant_id }
    };

    res.json(response);
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Server error fetching lead' });
  }
});

module.exports = router;