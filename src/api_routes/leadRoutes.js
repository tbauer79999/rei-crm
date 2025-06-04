const express = require('express');
const {
  supabase,
  fetchRecordById,
  fetchAllRecords,
  fetchSettingValue
} = require('../lib/supabaseService');
const { addUserProfile, filterByTenant } = require('../lib/authMiddleware');

const router = express.Router();

// Apply security middleware
router.use(addUserProfile);
router.use(filterByTenant);

router.get('/', async (req, res) => {
  try {
    const { role, tenant_id } = req.user || {};

    // Security check
    if (!tenant_id && role !== 'global_admin') {
      return res.status(403).json({ error: 'No tenant access configured' });
    }

    // Build query based on role
    let query = supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply tenant filtering
    if (role !== 'global_admin') {
      query = query.eq('tenant_id', tenant_id);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({
      ...data,
      meta: { role, tenant_id, leads_count: data?.length || 0 }
    });
  } catch (err) {
    console.error('Supabase error:', err.message);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const { role, tenant_id } = req.user || {};

  try {
    // Security check
    if (!tenant_id && role !== 'global_admin') {
      return res.status(403).json({ error: 'No tenant access configured' });
    }

    // Build query with security filter
    let query = supabase
      .from('leads')
      .select('*')
      .eq('id', id);

    // Apply tenant filtering
    if (role !== 'global_admin') {
      query = query.eq('tenant_id', tenant_id);
    }

    const { data, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Lead not found or access denied' });
      }
      throw error;
    }

    res.json({
      ...data,
      meta: { role, tenant_id }
    });
  } catch (err) {
    console.error('Supabase error:', err.message);
    res.status(500).json({ error: 'Failed to fetch lead' });
  }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const id = req.params.id;
    const { role, tenant_id } = req.user || {};
    const today = new Date().toISOString().split('T')[0];

    // Security check
    if (!tenant_id && role !== 'global_admin') {
      return res.status(403).json({ error: 'No tenant access configured' });
    }

    // First, verify the lead exists and user has access
    let checkQuery = supabase
      .from('leads')
      .select('*')
      .eq('id', id);

    // Apply tenant filtering
    if (role !== 'global_admin') {
      checkQuery = checkQuery.eq('tenant_id', tenant_id);
    }

    const { data: existing, error: checkError } = await checkQuery.single();

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Lead not found or access denied' });
      }
      throw checkError;
    }

    const oldStatus = existing?.status || '';
    const history = existing?.status_history || '';

    let updatedHistory = history;
    if (status && status !== oldStatus) {
      const newLine = `${today}: ${status}`;
      updatedHistory = history ? `${history}\n${newLine}` : newLine;
    }

    const updatePayload = {
      status: status,
      status_history: updatedHistory
    };

    if (status === 'Hot Lead' && !existing?.marked_hot_at) {
      updatePayload.marked_hot_at = new Date().toISOString();
    }

    // Update with same security filter
    let updateQuery = supabase
      .from('leads')
      .update(updatePayload)
      .eq('id', id);

    if (role !== 'global_admin') {
      updateQuery = updateQuery.eq('tenant_id', tenant_id);
    }

    const { data: updatedRecords, error } = await updateQuery.select();

    if (error) {
      throw new Error(`Failed to update property status: ${error.message}`);
    }

    if (updatedRecords && updatedRecords.length > 0) {
      res.json({
        ...updatedRecords[0],
        meta: { role, tenant_id }
      });
    } else {
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
    const { role, tenant_id } = req.user || {};

    // Security check
    if (!tenant_id && role !== 'global_admin') {
      return res.status(403).json({ error: 'No tenant access configured' });
    }

    // Get platform settings with tenant filtering
    let settingsQuery = supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'Campaigns');

    // Apply tenant filtering for settings
    if (role !== 'global_admin') {
      settingsQuery = settingsQuery.eq('tenant_id', tenant_id);
    }

    const { data: settingsData, error: settingsError } = await settingsQuery.single();

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

    // Check for existing records with tenant filtering
    let existingQuery = supabase
      .from('leads')
      .select('owner_name, property_address');

    if (role !== 'global_admin') {
      existingQuery = existingQuery.eq('tenant_id', tenant_id);
    }

    const { data: existingData, error: existingError } = await existingQuery;

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
      const record = {
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

      // Add tenant_id unless global admin (for global records)
      if (role !== 'global_admin') {
        record.tenant_id = tenant_id;
      }

      return record;
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
      .from('leads')
      .insert(enrichedRecords);

    if (insertError) {
      throw insertError;
    }

    res.status(200).json({
      message: 'Upload successful',
      uploaded: records.length,
      skipped: records.length - enrichedRecords.length,
      added: enrichedRecords.length,
      meta: { role, tenant_id }
    });
  } catch (err) {
    console.error('Bulk upload failed:', err.message);
    res.status(500).json({ error: 'Bulk upload failed' });
  }
});

module.exports = router;