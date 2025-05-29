// replyPacing.js
const express = require('express');
const router = express.Router();
const supabase = require('../../src/lib/supabaseClient');

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('timestamp')
      .order('timestamp', { ascending: true });

    if (error) throw error;

    const first = new Date(data[0]?.timestamp);
    const last = new Date(data[data.length - 1]?.timestamp);
    const hours = (last - first) / (1000 * 60 * 60);
    const repliesPerHour = data.length / (hours || 1);

    res.json({ pace: repliesPerHour.toFixed(2) });
  } catch (err) {
    console.error('Error fetching reply pacing stats:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
