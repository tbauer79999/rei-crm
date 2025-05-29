const express = require('express');
const router = express.Router();
const supabase = require('../../src/lib/supabaseClient');

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('timestamp, direction')
      .order('timestamp', { ascending: true });

    if (error) throw error;

    let pairs = [];
    for (let i = 1; i < data.length; i++) {
      const prev = data[i - 1];
      const curr = data[i];
      if (prev.direction === 'inbound' && curr.direction === 'outbound') {
        const diff = new Date(curr.timestamp) - new Date(prev.timestamp);
        if (diff > 0 && diff < 1000 * 60 * 60 * 6) {
          pairs.push(diff);
        }
      }
    }

    const avgMs = pairs.length > 0 ? pairs.reduce((a, b) => a + b, 0) / pairs.length : 0;
    const avgMin = Math.round(avgMs / 60000);
    res.json({ averageMinutes: avgMin });
  } catch (err) {
    console.error('Error fetching response time metrics:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
