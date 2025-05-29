const express = require('express');
const router = express.Router();
const supabase = require('../../src/lib/supabaseClient');

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('lead_id, direction, timestamp')
      .not('lead_id', 'is', null);

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

    res.json({ averageResponseMinutes: avgDelay.toFixed(2) });
  } catch (err) {
    console.error('Error fetching lead conversion speed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
