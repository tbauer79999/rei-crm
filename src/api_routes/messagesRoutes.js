// src/api_routes/messagesRoutes.js
const express = require('express');
// Assuming supabase client and helpers will be exported from server.js eventually
const { supabase } = require('../../server'); // Changed to import from server.js
// const { supabase } = require('../../supabaseClient'); // Adjusted to current supabaseClient path

const router = express.Router();

// GET /api/messages
router.get('/', async (req, res) => {
  try {
    // const { data, error } = await supabase // If using server.js exports
    const { data, error } = await supabase // Direct usage for now
      .from('messages')
      .select('*')
      .order('timestamp', { ascending: true });

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error('Supabase error:', err.message);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// GET /api/messages/:id
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // const { data, error } = await supabase // If using server.js exports
    const { data, error } = await supabase // Direct usage for now
      .from('messages')
      .select('*')
      .eq('property_id', id)
      .order('timestamp', { ascending: true });

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error('Supabase error:', err.message);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

module.exports = router;
