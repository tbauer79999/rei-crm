const express = require('express');
const router = express.Router();
const supabase = require('../../src/lib/supabaseClient');

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('direction');

    if (error) throw error;

    const ai = data.filter(m => m.direction === 'outbound').length;
    const human = data.filter(m => m.direction === 'inbound').length;

    res.json({ ai, human });
  } catch (err) {
    console.error('Error in aiVsHumanToggleCard API:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
