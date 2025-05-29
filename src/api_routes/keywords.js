// /api_routes/keywords.js
const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabaseClient');

// Return top N keywords from recent inbound messages (mocked for now)
router.get('/', async (req, res) => {

  try {
    // In the future, this should analyze message content dynamically
    // For now, return a static array of high-intent keywords
    const keywords = ['demo', 'interested', 'price', 'timeline', 'not sure', 'call me'];
    res.json({ keywords });
  } catch (err) {
    console.error('Error fetching keywords:', err);
    res.status(500).json({ error: 'Failed to fetch keywords' });
  }
});

module.exports = router;
