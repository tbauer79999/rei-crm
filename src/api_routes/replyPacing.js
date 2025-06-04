// replyPacing.js
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

    // Security check
    if (!tenant_id && role !== 'global_admin') {
      return res.status(403).json({ error: 'No tenant access configured' });
    }

    // Build query based on role
    let query = supabase
      .from('messages')
      .select('timestamp')
      .order('timestamp', { ascending: true });

    // Apply tenant filtering
    if (role === 'global_admin') {
      // Global admin can see all messages
    } else if (role === 'enterprise_admin' || role === 'business_admin') {
      // Filter to only this tenant's messages
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

    if (!data || data.length === 0) {
      return res.json({ 
        pace: '0.00',
        meta: { role, tenant_id, total_messages: 0 }
      });
    }

    const first = new Date(data[0]?.timestamp);
    const last = new Date(data[data.length - 1]?.timestamp);
    const hours = (last - first) / (1000 * 60 * 60);
    const repliesPerHour = data.length / (hours || 1);

    res.json({ 
      pace: repliesPerHour.toFixed(2),
      meta: { 
        role, 
        tenant_id, 
        total_messages: data.length,
        time_span_hours: hours.toFixed(2)
      }
    });
  } catch (err) {
    console.error('Error fetching reply pacing stats:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;