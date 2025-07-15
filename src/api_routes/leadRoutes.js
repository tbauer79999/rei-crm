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
    } // This closing brace was missing!

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

    // Get the lead field configuration for this tenant
    let fieldConfigQuery = supabase
      .from('lead_field_config')
      .select('*')
      .eq('is_required', true);

    if (role !== 'global_admin') {
      fieldConfigQuery = fieldConfigQuery.eq('tenant_id', tenant_id);
    }

    const { data: fieldConfig, error: fieldError } = await fieldConfigQuery;

    if (fieldError) {
      throw new Error('Failed to retrieve field configuration');
    }

    // Get list of required field names
    const requiredFields = fieldConfig.map(f => f.field_name);
    console.log('Required fields for tenant:', requiredFields);

    // Get campaigns for validation and ID mapping (if campaign field exists)
    let allowedCampaigns = [];
    let campaignNameToId = {};
    
    if (fieldConfig.some(f => f.field_name === 'campaign')) {
      let campaignsQuery = supabase
        .from('campaigns')
        .select('id, name')
        .eq('is_active', true);

      if (role !== 'global_admin') {
        campaignsQuery = campaignsQuery.eq('tenant_id', tenant_id);
      }

      const { data: campaignsData, error: campaignsError } = await campaignsQuery;
      
      if (!campaignsError && campaignsData) {
        campaignsData.forEach(c => {
          allowedCampaigns.push(c.name);
          campaignNameToId[c.name] = c.id;
        });
        console.log('Allowed campaigns:', allowedCampaigns);
        console.log('Campaign name to ID mapping:', campaignNameToId);
      }
    }

    console.log('Campaign mapping setup:', {
      allowedCampaigns,
      campaignNameToId,
      hasCampaignField: fieldConfig.some(f => f.field_name === 'campaign')
    });

    // Validate records based on dynamic field configuration
    const validRecords = records.filter(r => {
      // Check if all required fields are present
      const hasRequiredFields = requiredFields.every(fieldName => {
        const value = r.fields?.[fieldName];
        return value !== undefined && value !== null && value !== '';
      });
      
      if (!hasRequiredFields) {
        console.log('Record missing required fields:', r.fields);
      }
      
      return hasRequiredFields;
    });

    if (validRecords.length === 0) {
      return res.status(400).json({
        error: `No valid records. Required fields: ${requiredFields.join(', ')}`,
        uploaded: records.length,
        skipped: records.length,
        added: 0,
        requiredFields
      });
    }

    // Validate campaigns if applicable
    if (allowedCampaigns.length > 0) {
      const invalidCampaigns = validRecords.filter(r => {
        const campaign = r.fields?.campaign;
        return campaign && !allowedCampaigns.includes(campaign);
      });

      if (invalidCampaigns.length > 0) {
        return res.status(422).json({
          error: 'One or more records use invalid Campaign values.',
          allowedCampaigns,
          uploaded: records.length,
          skipped: records.length,
          added: 0
        });
      }
    }

    // Check for existing records (deduplication)
    // Determine which fields to use for deduplication
    const dedupeFields = fieldConfig
      .filter(f => f.is_unique || ['name', 'email', 'property_address'].includes(f.field_name))
      .map(f => f.field_name);

    // If no dedupe fields configured, use name as default
    if (dedupeFields.length === 0) {
      dedupeFields.push('name');
    }

    console.log('Using fields for deduplication:', dedupeFields);

    let existingQuery = supabase
      .from('leads')
      .select(dedupeFields.join(', '));

    if (role !== 'global_admin') {
      existingQuery = existingQuery.eq('tenant_id', tenant_id);
    }

    const { data: existingData, error: existingError } = await existingQuery;

    if (existingError) {
      throw existingError;
    }

    // Create deduplication key based on available fields
    const createDedupeKey = (record) => {
      return dedupeFields
        .map(field => record[field]?.toLowerCase()?.trim() || '')
        .filter(v => v)
        .join('|');
    };

    const existingSet = new Set(
      existingData.map(e => createDedupeKey(e))
    );

    const deduplicated = validRecords.filter(r => {
      const key = createDedupeKey(r.fields);
      return key && !existingSet.has(key);
    });

    console.log(`Deduplication: ${validRecords.length} valid, ${deduplicated.length} after deduplication`);

    // Prepare records for insertion
    const today = new Date().toISOString().split('T')[0];
    const enrichedRecords = deduplicated.map(r => {
      console.log('Processing record with fields:', r.fields);
      
      const record = {
        ...r.fields, // Include all fields as-is
        created_at: new Date().toISOString()
      };

      // Convert campaign name to campaign_id if campaign field exists
      if (r.fields.campaign && campaignNameToId[r.fields.campaign]) {
        record.campaign_id = campaignNameToId[r.fields.campaign];
        delete record.campaign; // Remove the campaign name field
        console.log('Mapped campaign name to campaign_id:', record.campaign_id);
      }
      
      // If campaign_id is directly provided, use it
      if (r.fields.campaign_id) {
        record.campaign_id = r.fields.campaign_id;
        delete record.campaign; // Remove campaign name if both exist
        console.log('Using provided campaign_id:', record.campaign_id);
      }

      // Add status history if status field exists
      if (r.fields.status) {
        record.status_history = `${today}: ${r.fields.status}`;
      } else if (fieldConfig.some(f => f.field_name === 'status')) {
        // If status field is configured but not provided, set default
        record.status = 'New Lead';
        record.status_history = `${today}: New Lead`;
      }

      // Add tenant_id unless global admin
      if (role !== 'global_admin') {
        record.tenant_id = tenant_id;
      }

      console.log('Final record to insert:', record);
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

    console.log(`Inserting ${enrichedRecords.length} records`);

    const { error: insertError } = await supabase
      .from('leads')
      .insert(enrichedRecords);

    if (insertError) {
      console.error('Insert error:', insertError);
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
    res.status(500).json({ error: 'Bulk upload failed: ' + err.message });
  }
});

// ✅ ADDITION: POST /api/leads/import — supports extension push (single or batch)
router.post('/import', async (req, res) => {
  try {
    const { role, tenant_id } = req.user || {};
    const records = Array.isArray(req.body) ? req.body : [req.body];

    if (!tenant_id && role !== 'global_admin') {
      return res.status(403).json({ error: 'No tenant access configured' });
    }

    const enriched = records.map(r => ({
      ...r,
      tenant_id: tenant_id,
      created_at: new Date().toISOString(),
      status: 'New Lead',
      status_history: `${new Date().toISOString().split('T')[0]}: New Lead`
    }));

    const { error } = await supabase.from('leads').insert(enriched);
    if (error) throw error;

    res.status(200).json({ message: `✅ ${records.length} lead(s) added.` });
  } catch (err) {
    console.error('Import error:', err.message);
    res.status(500).json({ error: '❌ Failed to import lead(s).' });
  }
});


module.exports = router;