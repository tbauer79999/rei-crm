// src/api_routes/failureRate.js
const express = require('express');
const router = express.Router();
const supabase = require('../../src/lib/supabaseClient');
const { addUserProfile, filterByTenant } = require('../lib/authMiddleware');

// Apply security middleware
router.use(addUserProfile);
router.use(filterByTenant);

router.get('/', async (req, res) => {
  try {
    const { role, tenant_id } = req.user || {};
    
    // Build query based on user role
    let query = supabase
      .from('messages')
      .select('direction, action_taken');

    // Apply tenant filtering based on role
    if (role === 'global_admin') {
      // Global admin can see all messages
    } else if (role === 'enterprise_admin' || role === 'business_admin') {
      // Enterprise and business admins see only their tenant's messages
      if (tenant_id) {
        query = query.eq('tenant_id', tenant_id);
      } else {
        return res.status(403).json({ error: 'No tenant access configured' });
      }
    } else {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { data, error } = await query;

    if (error) throw error;

    const outbound = data.filter(m => m.direction === 'outbound');
    const failed = outbound.filter(m => m.action_taken && m.action_taken.toLowerCase().includes('fail')).length;
    const override = outbound.filter(m => m.action_taken && m.action_taken.toLowerCase().includes('override')).length;
    const total = outbound.length;

    res.json({
      failureRate: total > 0 ? ((failed + override) / total * 100).toFixed(2) : '0.00',
      failed,
      override,
      total,
      meta: { role, tenant_id, total_messages: data.length } // Debug info
    });
  } catch (err) {
    console.error('Error calculating failure rate:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;