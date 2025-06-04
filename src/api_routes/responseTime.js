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
      .select('timestamp, direction')
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

    let pairs = [];
    for (let i = 1; i < data.length; i++) {
      const prev = data[i - 1];
      const curr = data[i];
      if (prev.direction === 'inbound' && curr.direction === 'outbound') {
        const diff = new Date(curr.timestamp) - new Date(prev.timestamp);
        if (diff > 0 && diff < 1000 * 60 * 60 * 6) { // within 6 hours
          pairs.push(diff);
        }
      }
    }

    const avgMs = pairs.length > 0 ? pairs.reduce((a, b) => a + b, 0) / pairs.length : 0;
    const avgMin = Math.round(avgMs / 60000);
    
    res.json({ 
      averageMinutes: avgMin,
      meta: { 
        role, 
        tenant_id, 
        total_messages: data.length,
        response_pairs: pairs.length
      }
    });
  } catch (err) {
    console.error('Error fetching response time metrics:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;