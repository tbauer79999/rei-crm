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

    // Check for existing setting with tenant filtering
    let existingQuery = supabase
      .from('platform_settings')
      .select('id')
      .eq('key', key.trim().toLowerCase());

    if (targetTenantId) {
      existingQuery = existingQuery.eq('tenant_id', targetTenantId);
    }

    const { data: existing, error: fetchError } = await existingQuery.single();

    // PGRST116 indicates no rows found, which is fine for insert.
    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    if (existing) {
      // Update existing setting
      const { error: updateError } = await supabase
        .from('platform_settings')
        .update({ value })
        .eq('id', existing.id);

      if (updateError) throw updateError;
    } else {
      // Insert new setting
      const insertData = { 
        key: key.trim().toLowerCase(), 
        value 
      };
      
      if (targetTenantId) {
        insertData.tenant_id = targetTenantId;
      }

      const { error: insertError } = await supabase
        .from('platform_settings')
        .insert(insertData);

      if (insertError) throw insertError;
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

// PUT /api/settings
router.put('/', async (req, res) => {
  const { settings } = req.body; // Remove tenant_id from body - get from authenticated user
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

      return {
        key,
        value,
        tenant_id: targetTenantId
      };
    }).filter(Boolean); // Remove invalid rows

    const { error } = await supabase
      .from('platform_settings')
      .upsert(upserts, { onConflict: ['key', 'tenant_id'] });

    if (error) {
      console.error('[Supabase error]', error);
      return res.status(500).json({ error: 'Failed to save settings to Supabase.' });
    }

    return res.status(200).json({ 
      message: 'Settings saved successfully.',
      meta: { 
        role, 
        user_tenant_id: tenant_id, 
        target_tenant_id: targetTenantId,
        settings_updated: upserts.length
      }
    });
  } catch (err) {
    console.error('[Server error]', err);
    return res.status(500).json({ error: 'Unexpected error in settings save.' });
  }
});

module.exports = router;