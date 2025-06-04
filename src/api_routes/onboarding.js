const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');
const { addUserProfile, filterByTenant } = require('../lib/authMiddleware');

// Apply security middleware
router.use(addUserProfile);
router.use(filterByTenant);

// Route to assign Twilio number after Step 1 completes
router.post('/complete', async (req, res) => {
  const { role, tenant_id } = req.user || {}; // Get from authenticated user, not request body

  try {
    // Security check
    if (!tenant_id && role !== 'global_admin') {
      return res.status(403).json({ error: 'No tenant access configured' });
    }

    // For global admin, they might specify tenant_id in body for onboarding other tenants
    let targetTenantId = tenant_id;
    if (role === 'global_admin' && req.body.tenant_id) {
      targetTenantId = req.body.tenant_id;
    }

    if (!targetTenantId) {
      return res.status(400).json({ error: 'Missing tenant_id' });
    }

    // Verify user has permission to complete onboarding for this tenant
    if (role !== 'global_admin' && targetTenantId !== tenant_id) {
      return res.status(403).json({ error: 'Cannot complete onboarding for different tenant' });
    }

    // Get preferred area code from tenants table
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('preferred_area_code')
      .eq('id', targetTenantId)
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
      .update({ assigned_to: targetTenantId })
      .eq('number', number.number);

    // Store it in platform_settings
    await supabase
      .from('platform_settings')
      .insert({
        tenant_id: targetTenantId,
        key: 'twilio_phone_number',
        value: number.number
      });

    return res.json({ 
      success: true, 
      assigned: number.number,
      meta: { role, user_tenant_id: tenant_id, target_tenant_id: targetTenantId }
    });
  } catch (err) {
    console.error('Onboarding complete error:', err);
    return res.status(500).json({ error: 'Failed to assign Twilio number' });
  }
});

module.exports = router;