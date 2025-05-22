// src/api_routes/propertiesRoutes.js
const express = require('express');
// const { supabase } = require('../../supabaseClient'); // No longer needed
const { supabase, fetchRecordById, fetchAllRecords, fetchSettingValue } = require('../../server');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error('Supabase error:', err.message);
    res.status(500).json({ error: 'Failed to fetch properties' });
  }
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error('Supabase error:', err.message);
    res.status(500).json({ error: 'Failed to fetch property' });
  }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const id = req.params.id;
    const today = new Date().toISOString().split('T')[0];

    // Note: fetchRecordById is assumed to be imported or defined elsewhere
    const existing = await fetchRecordById('properties', id); // Changed 'Properties' to 'properties'
    const oldStatus = existing?.fields?.Status || existing?.status || ''; // Adjusted to check existing.status as well
    const history = existing?.fields?.['Status History'] || existing?.status_history || ''; // Adjusted to check existing.status_history

    let updatedHistory = history;
    if (status && status !== oldStatus) {
      const newLine = `${today}: ${status}`;
      updatedHistory = history ? `${history}\n${newLine}` : newLine;
    }

    const { data: updatedRecords, error } = await supabase // Renamed resUpdate to updatedRecords for clarity
  .from('properties')
  .update({
    status: status,
    status_history: updatedHistory
  })
  .eq('id', id)
  .select(); // Added select() to get the updated record

if (error) {
  throw new Error(`Failed to update property status: ${error.message}`);
}

    // .select() without .single() returns an array. Send the first element if it exists.
    if (updatedRecords && updatedRecords.length > 0) {
      res.json(updatedRecords[0]); 
    } else {
      // Fallback if no record is returned, though .select() should return the updated one
      res.status(404).json({ error: 'Property not found after update or no data returned.' });
    }
  } catch (err) {
    console.error('Error updating status:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

router.post('/bulk', async (req, res) => {
  try {
    const records = req.body.records || [];

    const { data: settingsData, error: settingsError } = await supabase
      .from('platform_settings')
      .select('value') // Corrected 'Value' to 'value'
      .eq('key', 'Campaigns') // Corrected 'Key' to 'key'
      .single();

    if (settingsError || !settingsData?.value) {
      throw new Error('Failed to retrieve allowed campaigns');
    }

    const allowedCampaigns = settingsData.value
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);

    const validRecords = records.filter(r =>
      r.fields?.["Owner Name"] &&
      r.fields?.["Property Address"] &&
      r.fields?.["Campaign"]
    );

    if (validRecords.length === 0) {
      return res.status(400).json({
        error: 'No valid records with Campaign provided.',
        uploaded: records.length,
        skipped: records.length,
        added: 0
      });
    }

    const invalidCampaigns = validRecords.filter(r =>
      !allowedCampaigns.includes(r.fields["Campaign"])
    );

    if (invalidCampaigns.length > 0) {
      return res.status(422).json({
        error: 'One or more records use invalid Campaign values.',
        allowedCampaigns,
        uploaded: records.length,
        skipped: records.length,
        added: 0
      });
    }

    const { data: existingData, error: existingError } = await supabase
      .from('properties')
      .select('owner_name, property_address');

    if (existingError) {
      throw existingError;
    }

    const existingSet = new Set(
      existingData.map(e =>
        `${e.owner_name?.toLowerCase().trim()}|${e.property_address?.toLowerCase().trim()}`
      )
    );

    const deduplicated = validRecords.filter(r => {
      const key = `${r.fields["Owner Name"].toLowerCase().trim()}|${r.fields["Property Address"].toLowerCase().trim()}`;
      return !existingSet.has(key);
    });

    const enrichedRecords = deduplicated.map(r => {
      const f = r.fields;
      const today = new Date().toISOString().split('T')[0];
      return {
        owner_name: f["Owner Name"],
        property_address: f["Property Address"],
        city: f.City || '',
        state: f.State || '',
        zip_code: f["Zip Code"] || '',
        phone: f.Phone || '',
        email: f.Email || '',
        bedrooms: f.Bedrooms || '',
        bathrooms: f.Bathrooms || '',
        square_footage: f["Square Footage"] || '',
        notes: f.Notes || '',
        campaign: f.Campaign,
        status: f.Status || 'New Lead',
        status_history: `${today}: ${f.Status || 'New Lead'}`
      };
    });

    if (enrichedRecords.length === 0) {
      return res.status(409).json({
        error: 'All records are duplicates or missing required fields.',
        uploaded: records.length,
        skipped: records.length,
        added: 0
      });
    }

    const { error: insertError } = await supabase
      .from('properties')
      .insert(enrichedRecords);

    if (insertError) {
      throw insertError;
    }

    res.status(200).json({
      message: 'Upload successful',
      uploaded: records.length,
      skipped: records.length - enrichedRecords.length,
      added: enrichedRecords.length
    });
  } catch (err) {
    console.error('Bulk upload failed:', err.message);
    res.status(500).json({ error: 'Bulk upload failed' });
  }
});

module.exports = router;
