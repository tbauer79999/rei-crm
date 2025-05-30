// src/api_routes/call-logging.js
const express = require('express');
const router = express.Router();
const { supabase } = require('../lib/supabaseService');

// Log a call attempt
router.post('/log-call', async (req, res) => {
  const { lead_id, tenant_id } = req.body;
  
  try {
    console.log('=== LOGGING CALL ===');
    console.log('lead_id:', lead_id);
    console.log('tenant_id:', tenant_id);

    const now = new Date().toISOString();

    // Get current lead data to check if this is first call
    const { data: currentLead, error: fetchError } = await supabase
      .from('leads')
      .select('id, call_logged, first_call_at, total_call_attempts')
      .eq('id', lead_id)
      .eq('tenant_id', tenant_id)
      .single();

    if (fetchError) {
      console.error('Error fetching lead:', fetchError);
      throw fetchError;
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

    // Update the lead
    const { data: updatedLead, error: updateError } = await supabase
      .from('leads')
      .update(updateData)
      .eq('id', lead_id)
      .eq('tenant_id', tenant_id)
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
  const { lead_id, tenant_id, outcome } = req.body;
  
  const validOutcomes = ['connected', 'voicemail', 'no_answer', 'not_fit', 'qualified', 'interested', 'callback_requested'];
  
  if (!validOutcomes.includes(outcome)) {
    return res.status(400).json({ error: 'Invalid outcome value' });
  }

  try {
    console.log('=== UPDATING CALL OUTCOME ===');
    console.log('lead_id:', lead_id);
    console.log('outcome:', outcome);

    const { data: updatedLead, error } = await supabase
      .from('leads')
      .update({ call_outcome: outcome })
      .eq('id', lead_id)
      .eq('tenant_id', tenant_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating outcome:', error);
      throw error;
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