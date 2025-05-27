const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');

// Route to assign Twilio number after Step 1 completes
router.post('/complete', async (req, res) => {
  const { tenant_id } = req.body;

  if (!tenant_id) {
    return res.status(400).json({ error: 'Missing tenant_id' });
  }

  try {
    // Get preferred area code from tenants table
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('preferred_area_code')
      .eq('id', tenant_id)
      .single();

    if (tenantError || !tenant?.preferred_area_code) {
      return res.status(404).json({ error: 'Tenant not found or missing area code' });
    }

    const areaCode = tenant.preferred_area_code;

    // Look for available Twilio number
    const { data: number, error: numberError } = await supabase
      .from('twilio_numbers')
      .select('*')
      .eq('area_code', areaCode)
      .is('assigned_to', null)
      .limit(1)
      .single();

    if (numberError || !number?.number) {
      return res.status(404).json({ error: 'No available Twilio numbers for area code' });
    }

    // Assign number to tenant
    await supabase
      .from('twilio_numbers')
      .update({ assigned_to: tenant_id })
      .eq('number', number.number);

    // Store it in platform_settings
    await supabase
      .from('platform_settings')
      .insert({
        tenant_id,
        key: 'twilio_phone_number',
        value: number.number
      });

    return res.json({ success: true, assigned: number.number });
  } catch (err) {
    console.error('Onboarding complete error:', err);
    return res.status(500).json({ error: 'Failed to assign Twilio number' });
  }
});

module.exports = router;
