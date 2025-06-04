// src/api_routes/call-logging.js
const express = require('express');
const router = express.Router();
const { supabase } = require('../lib/supabaseService');
const { addUserProfile, filterByTenant } = require('../lib/authMiddleware');

// Apply security middleware
router.use(addUserProfile);
router.use(filterByTenant);

// Log a call attempt
router.post('/log-call', async (req, res) => {
  const { lead_id } = req.body; // Only accept lead_id from request
  const { role, tenant_id } = req.user || {}; // Get tenant_id from authenticated user
  
  // Security check
  if (!tenant_id && role !== 'global_admin') {
    return res.status(403).json({ error: 'No tenant access configured' });
  }

  try {
    console.log('=== LOGGING CALL ===');
    console.log('lead_id:', lead_id);
    console.log('user tenant_id:', tenant_id);
    console.log('user role:', role);

    const now = new Date().toISOString();

    // Build query based on role
    let leadQuery = supabase
      .from('leads')
      .select('id, call_logged, first_call_at, total_call_attempts')
      .eq('id', lead_id);

    // Apply tenant filtering unless global admin
    if (role !== 'global_admin') {
      leadQuery = leadQuery.eq('tenant_id', tenant_id);
    }

    // Get current lead data to check if this is first call
    const { data: currentLead, error: fetchError } = await leadQuery.single();

    if (fetchError) {
      console.error('Error fetching lead:', fetchError);
      return res.status(404).json({ error: 'Lead not found or access denied' });
    }

    // Prepare update data
    const updateData = {
      call_logged: true,
      last_call_at: now,
      total_call_attempts: (currentLead.total_call_attempts || 0) + 1
    };

    // If this is the first call, set first_call_at
    if (!currentLead.first_call_at) {
      updateData.first_call_at = now;
    }

    // Update the lead with same security filter
    let updateQuery = supabase
      .from('leads')
      .update(updateData)
      .eq('id', lead_id);

    if (role !== 'global_admin') {
      updateQuery = updateQuery.eq('tenant_id', tenant_id);
    }

    const { data: updatedLead, error: updateError } = await updateQuery
      .select()
      .single();

    if (updateError) {
      console.error('Error updating lead:', updateError);
      throw updateError;
    }

    console.log('Call logged successfully:', updatedLead);

    res.json({ 
      success: true, 
      message: 'Call logged successfully',
      lead: updatedLead,
      isFirstCall: !currentLead.first_call_at
    });

  } catch (err) {
    console.error('Call logging error:', err.message);
    res.status(500).json({ error: 'Failed to log call' });
  }
});

// Update call outcome
router.post('/update-outcome', async (req, res) => {
  const { lead_id, outcome } = req.body; // Only accept lead_id and outcome
  const { role, tenant_id } = req.user || {}; // Get tenant_id from authenticated user
  
  // Security check
  if (!tenant_id && role !== 'global_admin') {
    return res.status(403).json({ error: 'No tenant access configured' });
  }

  const validOutcomes = ['connected', 'voicemail', 'no_answer', 'not_fit', 'qualified', 'interested', 'callback_requested'];
  
  if (!validOutcomes.includes(outcome)) {
    return res.status(400).json({ error: 'Invalid outcome value' });
  }

  try {
    console.log('=== UPDATING CALL OUTCOME ===');
    console.log('lead_id:', lead_id);
    console.log('outcome:', outcome);
    console.log('user tenant_id:', tenant_id);
    console.log('user role:', role);

    // Build update query with security filter
    let updateQuery = supabase
      .from('leads')
      .update({ call_outcome: outcome })
      .eq('id', lead_id);

    if (role !== 'global_admin') {
      updateQuery = updateQuery.eq('tenant_id', tenant_id);
    }

    const { data: updatedLead, error } = await updateQuery
      .select()
      .single();

    if (error) {
      console.error('Error updating outcome:', error);
      return res.status(404).json({ error: 'Lead not found or access denied' });
    }

    console.log('Outcome updated successfully:', updatedLead);

    res.json({ 
      success: true, 
      message: 'Call outcome updated successfully',
      lead: updatedLead
    });

  } catch (err) {
    console.error('Outcome update error:', err.message);
    res.status(500).json({ error: 'Failed to update call outcome' });
  }
});

module.exports = router;