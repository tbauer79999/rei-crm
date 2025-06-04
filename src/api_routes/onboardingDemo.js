const express = require('express');
const router = express.Router();
const { supabase } = require('../lib/supabaseService');
const { addUserProfile, filterByTenant } = require('../lib/authMiddleware');

// Apply security middleware
router.use(addUserProfile);
router.use(filterByTenant);

router.post('/demo', async (req, res) => {
  const { role, tenant_id } = req.user || {}; // Get from authenticated user, not request body

  try {
    // Security check
    if (!tenant_id && role !== 'global_admin') {
      return res.status(403).json({ error: 'No tenant access configured' });
    }

    // For global admin, they might specify tenant_id in body for creating demo data for other tenants
    let targetTenantId = tenant_id;
    if (role === 'global_admin' && req.body.tenant_id) {
      targetTenantId = req.body.tenant_id;
    }

    if (!targetTenantId) {
      return res.status(400).json({ error: 'Missing tenant_id' });
    }

    // Verify user has permission to create demo data for this tenant
    if (role !== 'global_admin' && targetTenantId !== tenant_id) {
      return res.status(403).json({ error: 'Cannot create demo data for different tenant' });
    }

    // Create demo leads with proper tenant assignment
    const leads = Array.from({ length: 10 }).map((_, i) => ({
      tenant_id: targetTenantId, // Use the verified tenant_id
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

    return res.status(200).json({ 
      message: 'Demo leads created',
      meta: { 
        role, 
        user_tenant_id: tenant_id, 
        target_tenant_id: targetTenantId,
        leads_created: leads.length 
      }
    });
  } catch (err) {
    console.error('Demo load error:', err.message);
    return res.status(500).json({ error: 'Failed to load demo leads' });
  }
});

module.exports = router;