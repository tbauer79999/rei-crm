// conversationFlowSparklineCard.js
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
      .select('timestamp');

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

    const days = {};

    data.forEach(({ timestamp }) => {
      const date = new Date(timestamp).toISOString().split('T')[0];
      days[date] = (days[date] || 0) + 1;
    });

    const sorted = Object.entries(days)
      .sort((a, b) => new Date(a[0]) - new Date(b[0]))
      .map(([date, count]) => ({ date, count }));

    res.json({ 
      trend: sorted,
      meta: { role, tenant_id, message_count: data.length } // Debug info
    });
  } catch (err) {
    console.error('Error in conversationFlowSparklineCard API:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;