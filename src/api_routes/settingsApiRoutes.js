// src/api_routes/settingsApiRoutes.js
const express = require('express');
const { supabase, fetchSettingValue } = require('../../server'); // Import from server.js
const { buildInstructionBundle } = require('../lib/instructionBuilder');
// const fetch = require('node-fetch'); // No longer needed for knowledge bundle
const { generateKnowledgeBundleString } = require('../lib/knowledgeService'); // Import new service

// Placeholder for helper functions that will eventually be imported from server.js
// const { fetchSettingValue } = require('../../server'); // Keep for reference if needed

const router = express.Router();

// GET /api/settings
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('platform_settings')
      .select('*');

    if (error) throw error;

    const settings = {};
    for (const row of data) {
      settings[row.key] = { // Assuming 'key' and 'value' are the column names
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
  const { tone, persona, industry, role } = req.body;

  try {
    // Assuming the knowledge-bundle endpoint will be available or refactored.
    // For now, this might require the server to be running to respond.
    // const bundleRes = await fetch('http://localhost:5000/api/knowledge-bundle'); // Removed
    // const bundleData = await bundleRes.json(); // Removed
    // const knowledgeBlock = bundleData.bundle; // Removed
    const knowledgeBlock = await generateKnowledgeBundleString(); // Use the service directly


    const finalBundle = buildInstructionBundle({
      tone,
      persona,
      industry,
      role,
      knowledgeBlock
    });

    const { error } = await supabase
      .from('platform_settings')
      .upsert(
        [{
          key: 'aiInstruction_bundle',
          value: finalBundle,
          updated_at: new Date().toISOString()
        }],
        {
          onConflict: 'key',
          ignoreDuplicates: false
        }
      );

    if (error) throw error;

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error saving aiInstruction_bundle to Supabase:', err.message);
    res.status(500).json({ error: 'Failed to save aiInstruction_bundle' });
  }
});

// PUT /api/settings
router.put('/', async (req, res) => {
  const settings = req.body; // Expects an object of settings { key: { value: 'val' }, ... }

  try {
    const upserts = [];
    for (const [key, setting] of Object.entries(settings)) {
      // Ensure value is a string if it's a boolean, as Supabase might store booleans differently
      const value = typeof setting.value === 'boolean' ? String(setting.value) : setting.value;
      upserts.push({ key, value }); // Assumes 'key' is the unique column for onConflict
    }

    if (upserts.length > 0) {
      const { error } = await supabase
        .from('platform_settings')
        .upsert(upserts, { onConflict: 'key' }); // Make sure 'key' has a unique constraint in DB

      if (error) throw error;
    }

    res.status(200).json({ message: 'All settings saved.' });
  } catch (err) {
    console.error('Error saving settings to Supabase:', err.message);
    res.status(500).json({ error: 'Failed to save one or more settings' });
  }
});

module.exports = router;
