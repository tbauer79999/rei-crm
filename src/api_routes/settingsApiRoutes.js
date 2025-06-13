// src/api_routes/settingsApiRoutes.js
const express = require('express');
const {
  supabase,
  fetchRecordById,
  fetchAllRecords,
  fetchSettingValue
} = require('../lib/supabaseService');
const { buildInstructionBundle } = require('../lib/instructionBuilder');
const { generateKnowledgeBundleString } = require('../lib/knowledgeService');
const { addUserProfile, filterByTenant } = require('../lib/authMiddleware');

const router = express.Router();

// Apply security middleware
router.use(addUserProfile);
router.use(filterByTenant);

// GET /api/settings
router.get('/', async (req, res) => {
  const { role, tenant_id } = req.user || {}; // Get from authenticated user, not query params

  try {
    // Security check
    if (!tenant_id && role !== 'global_admin') {
      return res.status(403).json({ error: 'No tenant access configured' });
    }

    // Build query based on role
    let query = supabase
      .from('platform_settings')
      .select('*');

    // Apply tenant filtering
    if (role === 'global_admin') {
      // Global admin can see all settings, but should specify target tenant in query
      const targetTenantId = req.query.target_tenant_id;
      if (targetTenantId) {
        query = query.eq('tenant_id', targetTenantId);
      }
      // If no target specified, they get all settings (for global management)
    } else {
      // Regular users only see their tenant's settings
      query = query.eq('tenant_id', tenant_id);
    }

    const { data, error } = await query;

    if (error) throw error;

    const settings = {};
    for (const row of data) {
      settings[row.key] = {
        value: row.value,
        id: row.id,
        tenant_id: row.tenant_id
      };
    }

    res.json({
      ...settings,
      meta: { 
        role, 
        tenant_id, 
        target_tenant_id: req.query.target_tenant_id,
        settings_count: Object.keys(settings).length
      }
    });
  } catch (err) {
    console.error('Error fetching settings from Supabase:', err.message);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// POST /api/settings
router.post('/', async (req, res) => {
  const { key, value } = req.body;
  const { role, tenant_id } = req.user || {};

  try {
    // Security check
    if (!tenant_id && role !== 'global_admin') {
      return res.status(403).json({ error: 'No tenant access configured' });
    }

    // For global admin, they might specify target_tenant_id in body
    let targetTenantId = tenant_id;
    if (role === 'global_admin' && req.body.target_tenant_id) {
      targetTenantId = req.body.target_tenant_id;
    }

    // Verify user has permission to modify settings for this tenant
    if (role !== 'global_admin' && targetTenantId !== tenant_id) {
      return res.status(403).json({ error: 'Cannot modify settings for different tenant' });
    }

    // Use upsert instead of manual check and insert/update
    const upsertData = { 
      key: key.trim().toLowerCase(), 
      value,
      tenant_id: targetTenantId,
      updated_at: new Date().toISOString()
    };

    console.log('Upserting setting:', upsertData);

    const { error: upsertError } = await supabase
      .from('platform_settings')
      .upsert(upsertData, { 
        onConflict: 'key,tenant_id',
        ignoreDuplicates: false 
      });

    if (upsertError) {
      console.error('Upsert error:', upsertError);
      throw upsertError;
    }

    res.status(200).json({ 
      success: true,
      meta: { 
        role, 
        user_tenant_id: tenant_id, 
        target_tenant_id: targetTenantId,
        key: key.trim().toLowerCase()
      }
    });
  } catch (err) {
    console.error('Error saving setting to Supabase:', err.message || err);
    res.status(500).json({ error: 'Failed to save setting' });
  }
});

// POST /api/settings/instructions
router.post('/instructions', async (req, res) => {
  const { tone, persona, industry, role: userRole } = req.body; // Note: role here is user role in AI context, not auth role
  const { role, tenant_id } = req.user || {}; // Get auth role and tenant from authenticated user

  try {
    // Security check
    if (!tenant_id && role !== 'global_admin') {
      return res.status(403).json({ error: 'No tenant access configured' });
    }

    // For global admin, they might specify target_tenant_id in body
    let targetTenantId = tenant_id;
    if (role === 'global_admin' && req.body.target_tenant_id) {
      targetTenantId = req.body.target_tenant_id;
    }

    if (!targetTenantId) {
      return res.status(400).json({ error: 'Missing tenant_id' });
    }

    // Verify user has permission to modify instructions for this tenant
    if (role !== 'global_admin' && targetTenantId !== tenant_id) {
      return res.status(403).json({ error: 'Cannot modify instructions for different tenant' });
    }

    const knowledgeBlock = await generateKnowledgeBundleString(targetTenantId, role);

    const finalBundle = buildInstructionBundle({
      tone,
      persona,
      industry,
      role: userRole, // This is the AI role (e.g., "sales rep"), not auth role
      knowledgeBlock
    });

    const { error } = await supabase
      .from('platform_settings')
      .upsert([
        {
          key: 'aiinstruction_bundle',
          value: finalBundle,
          tenant_id: targetTenantId,
          updated_at: new Date().toISOString()
        }
      ], {
        onConflict: 'key,tenant_id',
        ignoreDuplicates: false
      });

    if (error) throw error;

    res.status(200).json({ 
      success: true,
      meta: { 
        role, 
        user_tenant_id: tenant_id, 
        target_tenant_id: targetTenantId
      }
    });
  } catch (err) {
    console.error('Error saving aiinstruction_bundle:', err.message);
    res.status(500).json({ error: 'Failed to save aiinstruction_bundle' });
  }
});

// PUT /api/settings - FIXED VERSION
router.put('/', async (req, res) => {
  const { settings } = req.body;
  const { role, tenant_id } = req.user || {};

  try {
    console.log('🔥 PUT /api/settings called');
    console.log('🔥 req.user:', JSON.stringify(req.user, null, 2));
    console.log('🔥 settings:', JSON.stringify(settings, null, 2));
    console.log('🔥 Request body tenant_id:', req.body.tenant_id);

    // Security check
    if (!tenant_id && role !== 'global_admin') {
      return res.status(403).json({ error: 'No tenant access configured' });
    }

    // For global admin, they might specify target_tenant_id in body
    let targetTenantId = tenant_id;
    if (role === 'global_admin' && req.body.target_tenant_id) {
      targetTenantId = req.body.target_tenant_id;
    }

    if (!targetTenantId || !settings) {
      return res.status(400).json({ error: 'Missing tenant_id or settings in request body.' });
    }

    // Verify user has permission to modify settings for this tenant
    if (role !== 'global_admin' && targetTenantId !== tenant_id) {
      return res.status(403).json({ error: 'Cannot modify settings for different tenant' });
    }

    const upserts = Object.entries(settings).map(([key, setting]) => {
      const raw = setting?.value ?? '';
      const value = typeof raw === 'boolean' ? String(raw) : raw;

      if (!key || typeof value !== 'string') {
        console.warn(`Skipping malformed setting for key: ${key}`);
        return null;
      }

      const upsertObj = {
        key,
        value,
        tenant_id: targetTenantId,
        updated_at: new Date().toISOString()
      };
      
      console.log(`🔥 Building upsert for key ${key}:`, upsertObj);
      return upsertObj;
    }).filter(Boolean);

    console.log('🔥 Final prepared upserts:', JSON.stringify(upserts, null, 2));

    // FIXED: Force timestamp update by adding microseconds to make it unique
    const { error, data } = await supabase
      .from('platform_settings')
      .upsert(upserts, { 
        onConflict: 'tenant_id,key',
        ignoreDuplicates: false 
      })
      .select();

    // Force update the timestamp separately if the upsert didn't update it
    if (data && data.length > 0) {
      const forceUpdatePromises = data.map(record => 
        supabase
          .from('platform_settings')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', record.id)
      );
      
      await Promise.all(forceUpdatePromises);
      console.log('🔥 Forced timestamp updates completed');
    }

    if (error) {
      console.error('🔥 [Supabase upsert error]', error);
      return res.status(500).json({ error: 'Failed to save settings to Supabase.' });
    }

    console.log('🔥 Upsert successful, affected rows:', data?.length || 0);
    console.log('🔥 Returned data:', JSON.stringify(data, null, 2));

    return res.status(200).json({ 
      message: 'Settings saved successfully.',
      meta: { 
        role, 
        user_tenant_id: tenant_id, 
        target_tenant_id: targetTenantId,
        settings_updated: upserts.length,
        affected_rows: data?.length || 0
      }
    });
  } catch (err) {
    console.error('🔥 [Server error]', err);
    return res.status(500).json({ error: 'Unexpected error in settings save.' });
  }
});

module.exports = router;