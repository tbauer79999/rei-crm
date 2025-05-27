// src/api_routes/settingsApiRoutes.js
const express = require('express');
const {
  supabase,
  fetchRecordById,
  fetchAllRecords,
  fetchSettingValue
} = require('../lib/supabaseService'); // adjust path if needed
const { buildInstructionBundle } = require('../lib/instructionBuilder');
// const fetch = require('node-fetch'); // No longer needed for knowledge bundle
const { generateKnowledgeBundleString } = require('../lib/knowledgeService'); // Import new service

// Placeholder for helper functions that will eventually be imported from server.js
// const { fetchSettingValue } = require('../../server'); // Keep for reference if needed

const router = express.Router();

// GET /api/settings
// GET /api/settings
router.get('/', async (req, res) => {
  const tenantId = req.query.tenant_id || null;

  try {
    let query = supabase
      .from('platform_settings')
      .select('*');

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query;

    if (error) throw error;

    const settings = {};
    for (const row of data) {
      settings[row.key] = {
        value: row.value,
        id: row.id
      };
    }

    res.json(settings);
  } catch (err) {
    console.error('Error fetching settings from Supabase:', err.message);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});


// POST /api/settings
router.post('/', async (req, res) => {
  const { key, value } = req.body;

  try {
    const { data: existing, error: fetchError } = await supabase
      .from('platform_settings')
      .select('id')
      .eq('key', key.trim().toLowerCase())
      .single();

    // PGRST116 indicates no rows found, which is fine for insert.
    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    if (existing) {
      const { error: updateError } = await supabase
        .from('platform_settings')
        .update({ value })
        .eq('id', existing.id);

      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase
        .from('platform_settings')
        .insert({ key: key.trim().toLowerCase(), value });

      if (insertError) throw insertError;
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error saving setting to Supabase:', err.message || err);
    res.status(500).json({ error: 'Failed to save setting' });
  }
});

// POST /api/settings/instructions
router.post('/instructions', async (req, res) => {
  const { tone, persona, industry, role, tenant_id } = req.body;

  if (!tenant_id) {
    return res.status(400).json({ error: 'Missing tenant_id' });
  }

  try {
    const knowledgeBlock = await generateKnowledgeBundleString(tenant_id);

    const finalBundle = buildInstructionBundle({
      tone,
      persona,
      industry,
      role,
      knowledgeBlock
    });

    const { error } = await supabase
  .from('platform_settings')
  .upsert([
    {
      key: 'aiinstruction_bundle',
      value: finalBundle,
      tenant_id,
      updated_at: new Date().toISOString()
    }
  ], {
    onConflict: 'key,tenant_id',
    ignoreDuplicates: false
  });


    if (error) throw error;

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error saving aiinstruction_bundle:', err.message);
    res.status(500).json({ error: 'Failed to save aiinstruction_bundle' });
  }
});



// PUT /api/settings
router.put('/', async (req, res) => {
  const { settings, tenant_id } = req.body;

  try {
    if (!tenant_id || !settings) {
      return res.status(400).json({ error: 'Missing tenant_id or settings in request body.' });
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
        tenant_id
      };
    }).filter(Boolean); // Remove invalid rows

    const { error } = await supabase
      .from('platform_settings')
      .upsert(upserts, { onConflict: ['key', 'tenant_id'] });

    if (error) {
      console.error('[Supabase error]', error);
      return res.status(500).json({ error: 'Failed to save settings to Supabase.' });
    }

    return res.status(200).json({ message: 'Settings saved successfully.' });
  } catch (err) {
    console.error('[Server error]', err);
    return res.status(500).json({ error: 'Unexpected error in settings save.' });
  }
});

module.exports = router;
