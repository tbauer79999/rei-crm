// conversationFlowSparklineCard.js
const express = require('express');
const router = express.Router();
const supabase = require('../../src/lib/supabaseClient');

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('timestamp');

    if (error) throw error;

    const days = {};

    data.forEach(({ timestamp }) => {
      const date = new Date(timestamp).toISOString().split('T')[0];
      days[date] = (days[date] || 0) + 1;
    });

    const sorted = Object.entries(days)
      .sort((a, b) => new Date(a[0]) - new Date(b[0]))
      .map(([date, count]) => ({ date, count }));

    res.json({ trend: sorted });
  } catch (err) {
    console.error('Error in conversationFlowSparklineCard API:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
