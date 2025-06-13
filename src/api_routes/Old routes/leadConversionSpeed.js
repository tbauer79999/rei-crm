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
      .select('lead_id, direction, timestamp')
      .not('lead_id', 'is', null);

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

    // Group messages by lead_id
    const groupedByLead = {};
    data.forEach(msg => {
      const leadId = msg.lead_id;
      if (!groupedByLead[leadId]) groupedByLead[leadId] = [];
      groupedByLead[leadId].push({
        direction: msg.direction,
        timestamp: new Date(msg.timestamp),
      });
    });

    const delays = [];

    Object.values(groupedByLead).forEach(messages => {
      const inbound = messages
        .filter(m => m.direction === 'inbound')
        .sort((a, b) => a.timestamp - b.timestamp);
      const outbound = messages
        .filter(m => m.direction === 'outbound')
        .sort((a, b) => a.timestamp - b.timestamp);

      for (let i = 0; i < Math.min(inbound.length, outbound.length); i++) {
        const delay = (outbound[i].timestamp - inbound[i].timestamp) / 1000 / 60;
        if (delay > 0) delays.push(delay);
      }
    });

    const avgDelay = delays.length > 0
      ? delays.reduce((sum, d) => sum + d, 0) / delays.length
      : 0;

    res.json({ 
      averageResponseMinutes: avgDelay.toFixed(2),
      meta: { 
        role, 
        tenant_id, 
        total_messages: data.length,
        response_pairs: delays.length
      }
    });
  } catch (err) {
    console.error('Error fetching lead conversion speed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;