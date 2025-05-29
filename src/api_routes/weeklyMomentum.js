// weeklyMomentum.js
const express = require('express');
const router = express.Router();
const supabase = require('../../src/lib/supabaseClient');

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('timestamp');

    if (error) throw error;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const count = data.filter(m => new Date(m.timestamp) >= sevenDaysAgo).length;

    res.json({ messagesThisWeek: count });
  } catch (err) {
    console.error('Error fetching weekly momentum stats:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
