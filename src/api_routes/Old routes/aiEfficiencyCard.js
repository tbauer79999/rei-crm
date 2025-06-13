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
      .select('direction');

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

    const total = data.length;
    const aiMessages = data.filter(m => m.direction === 'outbound').length;
    const humanMessages = data.filter(m => m.direction === 'inbound').length;

    const efficiency = total > 0 ? ((aiMessages / total) * 100).toFixed(1) : 0;

    res.json({
      aiMessages,
      humanMessages,
      efficiencyPercent: efficiency,
      meta: { role, tenant_id, total_messages: total } // Debug info
    });
  } catch (err) {
    console.error('Error in aiEfficiencyCard API:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;