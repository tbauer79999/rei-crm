// escalationStats.js
const express = require('express');
const router = express.Router();
const supabase = require('../../src/lib/supabaseClient');

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('action_taken');

    if (error) throw error;

    const escalated = data.filter(d => d.action_taken === 'Escalated').length;
    const total = data.length;

    res.json({ escalated, total });
  } catch (err) {
    console.error('Error fetching escalation stats:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
