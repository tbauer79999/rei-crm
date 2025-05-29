// src/api_routes/failureRate.js
const express = require('express');
const router = express.Router();
const supabase = require('../../src/lib/supabaseClient');

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('direction, action_taken');

    if (error) throw error;

    const outbound = data.filter(m => m.direction === 'outbound');
    const failed = outbound.filter(m => m.action_taken && m.action_taken.toLowerCase().includes('fail')).length;
    const override = outbound.filter(m => m.action_taken && m.action_taken.toLowerCase().includes('override')).length;
    const total = outbound.length;

    res.json({
      failureRate: total > 0 ? ((failed + override) / total * 100).toFixed(2) : '0.00',
      failed,
      override,
      total
    });
  } catch (err) {
    console.error('Error calculating failure rate:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
