// messageQuality.js
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
      .select('response_score')
      .not('response_score', 'is', null);

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

    const total = data.length;
    const avgScore =
      total > 0
        ? data.reduce((sum, m) => sum + (parseFloat(m['response_score']) || 0), 0) / total
        : 0;

    res.json({ 
      average: avgScore.toFixed(2), 
      total,
      meta: { role, tenant_id, messages_with_scores: total }
    });
  } catch (err) {
    console.error('Error fetching message quality metrics:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;