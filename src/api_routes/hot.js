// /api_routes/hot.js
const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabaseClient');


router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .gte('timestamp', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
      .eq('action_taken', null)
      .order('timestamp', { ascending: false });

    if (error) throw error;

    const leadsMap = new Map();
    data.forEach((msg) => {
      if (msg.property_id && !leadsMap.has(msg.property_id)) {
        leadsMap.set(msg.property_id, {
          id: msg.property_id,
          snippet: msg.message_body?.slice(0, 80),
          timestamp: msg.timestamp,
        });
      }
    });

    res.json({ hotLeads: Array.from(leadsMap.values()) });
  } catch (err) {
    console.error('Hot Leads error:', err.message);
    res.status(500).json({ error: 'Failed to fetch hot leads' });
  }
});

module.exports = router;
