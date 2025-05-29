// /api_routes/messages.js
const express = require('express');
const router = express.Router();
const { supabase } = require('../lib/supabaseClient');

// Search messages by keyword
router.get('/search', async (req, res) => {
  const keyword = req.query.keyword;

  if (!keyword) {
    return res.status(400).json({ error: 'Keyword query parameter is required' });
  }

  try {
    const { data, error } = await supabase
      .from('messages')
      .select('message_body, timestamp')
      .not('message_body', 'is', null)
      .neq('message_body', '')
      .ilike('message_body', `%${keyword}%`)
      .order('timestamp', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Supabase error:', error.message);
      return res.status(500).json({ error: 'Failed to search messages' });
    }

    const matches = data.map((msg) => msg.message_body);
    res.json({ matches });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Server error during keyword search' });
  }
});

// You can add other message-related routes here as needed

module.exports = router;
