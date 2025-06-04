// src/api_routes/messagesRoutes.js
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

// GET /api/messages
router.get('/', async (req, res) => {
  try {
    const { role, tenant_id } = req.user || {};

    // Security check
    if (!tenant_id && role !== 'global_admin') {
      return res.status(403).json({ error: 'No tenant access configured' });
    }

    // Build query based on role
    let query = supabase
      .from('messages')
      .select('*')
      .order('timestamp', { ascending: true });

    // Apply tenant filtering
    if (role !== 'global_admin') {
      query = query.eq('tenant_id', tenant_id);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({
      data,
      meta: { role, tenant_id, messages_count: data?.length || 0 }
    });
  } catch (err) {
    console.error('Supabase error:', err.message);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// GET /api/messages/:id
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const { role, tenant_id } = req.user || {};

  try {
    // Security check
    if (!tenant_id && role !== 'global_admin') {
      return res.status(403).json({ error: 'No tenant access configured' });
    }

    // First, verify the property/lead exists and user has access to it
    let propertyCheckQuery = supabase
      .from('leads')
      .select('id, tenant_id')
      .eq('id', id);

    // Apply tenant filtering for property check
    if (role !== 'global_admin') {
      propertyCheckQuery = propertyCheckQuery.eq('tenant_id', tenant_id);
    }

    const { data: propertyCheck, error: propertyError } = await propertyCheckQuery.single();

    if (propertyError) {
      if (propertyError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Property not found or access denied' });
      }
      throw propertyError;
    }

    // Now get messages for this property
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('property_id', id)
      .order('timestamp', { ascending: true });

    if (error) throw error;

    res.json({
      data,
      meta: { role, tenant_id, property_id: id, messages_count: data?.length || 0 }
    });
  } catch (err) {
    console.error('Supabase error:', err.message);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

module.exports = router;