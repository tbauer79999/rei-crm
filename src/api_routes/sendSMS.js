const express = require('express');
const router = express.Router();
const twilio = require('twilio');
const supabase = require('../supabaseClient');
const { addUserProfile, filterByTenant } = require('../lib/authMiddleware');

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Apply security middleware
router.use(addUserProfile);
router.use(filterByTenant);

router.post('/', async (req, res) => {
  const { to, message } = req.body; // Remove tenant_id from body - get from authenticated user
  const { role, tenant_id } = req.user || {}; // Get from authenticated user

  try {
    // Security check
    if (!tenant_id && role !== 'global_admin') {
      return res.status(403).json({ error: 'No tenant access configured' });
    }

    // For global admin, they might specify target_tenant_id in body for sending on behalf of other tenants
    let targetTenantId = tenant_id;
    if (role === 'global_admin' && req.body.target_tenant_id) {
      targetTenantId = req.body.target_tenant_id;
    }

    if (!targetTenantId || !to || !message) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    // Verify user has permission to send SMS for this tenant
    if (role !== 'global_admin' && targetTenantId !== tenant_id) {
      return res.status(403).json({ error: 'Cannot send SMS for different tenant' });
    }

    // Step 1: Lookup tenant's assigned Twilio number with security filter
    let settingsQuery = supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'twilio_phone_number');

    // Apply tenant filtering
    if (role === 'global_admin') {
      settingsQuery = settingsQuery.eq('tenant_id', targetTenantId);
    } else {
      settingsQuery = settingsQuery.eq('tenant_id', tenant_id);
    }

    const { data, error } = await settingsQuery.single();

    if (error || !data?.value) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Twilio number not found for tenant or access denied.' });
      }
      throw error;
    }

    const from = data.value;

    // Step 2: Send SMS
    const result = await client.messages.create({
      body: message,
      from,
      to,
    });

    return res.json({ 
      success: true, 
      sid: result.sid, 
      status: result.status,
      meta: { 
        role, 
        user_tenant_id: tenant_id, 
        target_tenant_id: targetTenantId,
        from_number: from
      }
    });
  } catch (err) {
    console.error('SMS send error:', err);
    return res.status(500).json({ error: 'Failed to send SMS.' });
  }
});

module.exports = router;