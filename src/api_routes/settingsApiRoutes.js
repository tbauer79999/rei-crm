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
  const settings = req.body; // Expects an object like { setting_key: { value: 'val', tenant_id: 'id' }, ... }

  try {
    const upserts = [];
    for (const [key, setting] of Object.entries(settings)) {
      if (typeof setting !== 'object' || setting === null || typeof setting.value === 'undefined') {
        // Skip malformed setting entries
        console.warn(`Skipping malformed setting for key: ${key}`);
        continue;
      }

      const value = typeof setting.value === 'boolean' ? String(setting.value) : setting.value;
      
      // All settings processed here are assumed to be tenant-specific
      // and thus must have a tenant_id.
      if (!setting.tenant_id) {
        console.error(`Error: tenant_id is missing for setting key: ${key}. This setting will not be saved.`);
        // Optionally, you could throw an error or collect errors to send in the response
        continue; // Skip this setting
      }
      
      upserts.push({ 
        key: key, 
        value: value, 
        tenant_id: setting.tenant_id 
      });
    }

    if (upserts.length > 0) {
      const { error } = await supabase
        .from('platform_settings')
        .upsert(upserts, { onConflict: 'key, tenant_id' }); // Use composite key for conflict resolution

      if (error) {
        // Check if the error is related to the ON CONFLICT specification
        if (error.message.includes("constraint matching the ON CONFLICT specification")) {
          // This specific error indicates the (key, tenant_id) constraint might not exist
          // or is not what's expected.
          console.error('Supabase upsert error: Potential issue with (key, tenant_id) unique constraint in platform_settings table.', error);
          return res.status(500).json({ 
            error: 'Failed to save settings due to a database constraint configuration issue. Please check if a unique constraint exists for (key, tenant_id) in the platform_settings table.' 
          });
        }
        throw error; // Re-throw other errors
      }
    } else {
      // It's not an error if there were no valid settings to save, 
      // but the client might expect a different response.
      // For now, a 200 is okay, or a 204 (No Content).
      return res.status(200).json({ message: 'No valid settings processed or provided.' });
    }

    res.status(200).json({ message: 'Settings saved successfully.' });
  } catch (err) {
    console.error('Error saving settings to Supabase:', err.message);
    res.status(500).json({ error: 'Failed to save one or more settings.' });
  }
});

module.exports = router;
