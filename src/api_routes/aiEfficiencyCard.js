const express = require('express');
const router = express.Router();
const supabase = require('../../src/lib/supabaseClient');

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('direction');

    if (error) throw error;

    const total = data.length;
    const aiMessages = data.filter(m => m.direction === 'outbound').length;
    const humanMessages = data.filter(m => m.direction === 'inbound').length;

    const efficiency = total > 0 ? ((aiMessages / total) * 100).toFixed(1) : 0;

    res.json({
      aiMessages,
      humanMessages,
      efficiencyPercent: efficiency,
    });
  } catch (err) {
    console.error('Error in aiEfficiencyCard API:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
