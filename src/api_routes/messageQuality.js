// messageQuality.js
const express = require('express');
const router = express.Router();
const supabase = require('../../src/lib/supabaseClient');

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('response_score')
      .not('response_score', 'is', null);

    if (error) throw error;

    const total = data.length;
    const avgScore =
      total > 0
        ? data.reduce((sum, m) => sum + (parseFloat(m['response_score']) || 0), 0) / total
        : 0;

    res.json({ average: avgScore.toFixed(2), total });
  } catch (err) {
    console.error('Error fetching message quality metrics:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
