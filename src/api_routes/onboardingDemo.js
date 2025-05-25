const express = require('express');
const router = express.Router();
const { supabase } = require('../lib/supabaseService');

router.post('/demo', async (req, res) => {
  const { tenant_id } = req.body;
  if (!tenant_id) return res.status(400).json({ error: 'Missing tenant_id' });

  try {
    const leads = Array.from({ length: 10 }).map((_, i) => ({
      tenant_id,
      name: `Demo Lead ${i + 1}`,
      phone: `555-000${i}`,
      email: `lead${i}@demo.com`,
      status: 'Cold Lead',
      ai_status: 'Unengaged',
      created_at: new Date().toISOString(),
      campaign: 'Demo Campaign',
      custom_fields: {},
    }));

    const { error } = await supabase.from('leads').insert(leads);
    if (error) throw error;

    return res.status(200).json({ message: 'Demo leads created' });
  } catch (err) {
    console.error('Demo load error:', err.message);
    return res.status(500).json({ error: 'Failed to load demo leads' });
  }
});

module.exports = router;
