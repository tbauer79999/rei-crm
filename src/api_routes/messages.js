// /api_routes/messages.js
const express = require('express');
const router = express.Router();
const { supabase } = require('../lib/supabaseService');

// Search messages by keyword
router.get('/search', async (req, res) => {
  const keyword = req.query.keyword;

  if (!keyword) {
    return res.status(400).json({ error: 'Keyword query parameter is required' });
  }

  try {
    const { data, error } = await supabase
      .from('messages')
      .select('id, message_body, direction, timestamp, lead_id') // Return full objects now
      .not('message_body', 'is', null)
      .neq('message_body', '')
      .ilike('message_body', `%${keyword}%`)
      .order('timestamp', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Supabase error:', error.message);
      return res.status(500).json({ error: 'Failed to search messages' });
    }

    // Return full message objects instead of just message_body
    res.json({ matches: data || [] });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Server error during keyword search' });
  }
});

// Get all messages for a specific lead
router.get('/lead/:leadId', async (req, res) => {
  const leadId = req.params.leadId;

  try {
    const { data, error } = await supabase
      .from('messages')
      .select('id, message_body, direction, timestamp, lead_id')
      .eq('lead_id', leadId)
      .not('message_body', 'is', null)
      .neq('message_body', '')
      .order('timestamp', { ascending: true }); // Oldest first for conversation flow

    if (error) {
      console.error('Supabase error:', error.message);
      return res.status(500).json({ error: 'Failed to fetch messages' });
    }

    res.json({ messages: data || [] });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Server error fetching messages' });
  }
});

module.exports = router;