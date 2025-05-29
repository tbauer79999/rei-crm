const express = require('express');
const router = express.Router();

// Return top N keywords from recent inbound messages (mocked for now)
router.get('/', async (req, res) => {
  try {
    const keywords = ['demo', 'interested', 'price', 'timeline', 'not sure', 'call me'];
    res.json({ keywords });
  } catch (err) {
    console.error('Error fetching keywords:', err);
    res.status(500).json({ error: 'Failed to fetch keywords' });
  }
});

module.exports = router;
