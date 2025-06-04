// /api_routes/messages.js
const express = require('express');
const router = express.Router();
const { supabase } = require('../lib/supabaseService');
const { addUserProfile, filterByTenant } = require('../lib/authMiddleware');

// Apply security middleware
router.use(addUserProfile);
router.use(filterByTenant);

// Search messages by keyword
router.get('/search', async (req, res) => {
  const keyword = req.query.keyword;
  const { role, tenant_id } = req.user || {};

  if (!keyword) {
    return res.status(400).json({ error: 'Keyword query parameter is required' });
  }

  try {
    // Security check
    if (!tenant_id && role !== 'global_admin') {
      return res.status(403).json({ error: 'No tenant access configured' });
    }

    // Build query based on role
    let query = supabase
      .from('messages')
      .select('id, message_body, direction, timestamp, lead_id')
      .not('message_body', 'is', null)
      .neq('message_body', '')
      .ilike('message_body', `%${keyword}%`)
      .order('timestamp', { ascending: false })
      .limit(50);

    // Apply tenant filtering
    if (role !== 'global_admin') {
      query = query.eq('tenant_id', tenant_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase error:', error.message);
      return res.status(500).json({ error: 'Failed to search messages' });
    }

    res.json({ 
      matches: data || [],
      meta: { 
        role, 
        tenant_id, 
        keyword, 
        results_count: data?.length || 0 
      }
    });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Server error during keyword search' });
  }
});

// Get all messages for a specific lead
router.get('/lead/:leadId', async (req, res) => {
  const leadId = req.params.leadId;
  const { role, tenant_id } = req.user || {};

  try {
    // Security check
    if (!tenant_id && role !== 'global_admin') {
      return res.status(403).json({ error: 'No tenant access configured' });
    }

    // First, verify the lead exists and user has access to it
    let leadCheckQuery = supabase
      .from('leads')
      .select('id, tenant_id')
      .eq('id', leadId);

    // Apply tenant filtering for lead check
    if (role !== 'global_admin') {
      leadCheckQuery = leadCheckQuery.eq('tenant_id', tenant_id);
    }

    const { data: leadCheck, error: leadError } = await leadCheckQuery.single();

    if (leadError) {
      if (leadError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Lead not found or access denied' });
      }
      throw leadError;
    }

    // Now get messages for this lead
    const { data, error } = await supabase
      .from('messages')
      .select('id, message_body, direction, timestamp, lead_id')
      .eq('lead_id', leadId)
      .not('message_body', 'is', null)
      .neq('message_body', '')
      .order('timestamp', { ascending: true }); // Oldest first for conversation flow

    if (error) {
      console.error('Supabase error:', error.message);
      return res.status(500).json({ error: 'Failed to fetch messages' });
    }

    res.json({ 
      messages: data || [],
      meta: { 
        role, 
        tenant_id, 
        lead_id: leadId, 
        messages_count: data?.length || 0 
      }
    });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Server error fetching messages' });
  }
});

module.exports = router;