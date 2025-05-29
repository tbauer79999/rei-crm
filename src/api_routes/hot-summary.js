// api_routes/hot-summary.js
const express = require('express');
const router = express.Router();
const { supabase } = require('../lib/supabaseService');

router.get('/', async (req, res) => {
  const { data: leads, error } = await supabase
    .from('leads')
    .select('id, name, status, created_at, phone, summary, marked_hot_at, call_logged')
    .gte('marked_hot_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString());

  if (error) {
    console.error('Error fetching hot leads:', error);
    return res.status(500).json({ error: 'Error fetching hot lead summary' });
  }

  const hot = leads.filter((l) => l.status === 'Hot Lead');
  const noCall = hot.filter((l) => !l.call_logged);
  const preview = noCall.slice(0, 3).map((l) => ({
  name: l.name,
  summary: l.status || 'Hot Lead',
  minutesAgo: Math.max(0, Math.floor((Date.now() - new Date(l.marked_hot_at)) / 60000)),
}));


  return res.json({
    markedHot: hot.length,
    noCallLogged: noCall.length,
    preview,
  });
});

module.exports = router;
