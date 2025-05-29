const express = require('express');
const router = express.Router();
const twilio = require('twilio');
const supabase = require('../supabaseClient'); // adjust path if needed

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

router.post('/', async (req, res) => {
  const { tenant_id, to, message } = req.body;

  if (!tenant_id || !to || !message) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  try {
    // Step 1: Lookup tenant's assigned Twilio number
    const { data, error } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('tenant_id', tenant_id)
      .eq('key', 'twilio_phone_number')
      .single();

    if (error || !data?.value) {
      return res.status(400).json({ error: 'Twilio number not found for tenant.' });
    }

    const from = data.value;

    // Step 2: Send SMS
    const result = await client.messages.create({
      body: message,
      from,
      to,
    });

    return res.json({ success: true, sid: result.sid, status: result.status });
  } catch (err) {
    console.error('SMS send error:', err);
    return res.status(500).json({ error: 'Failed to send SMS.' });
  }
});

module.exports = router;
