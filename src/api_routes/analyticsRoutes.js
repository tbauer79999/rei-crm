console.log('✅ analyticsRoutes.js is loaded');
const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabaseClient');
const { getTenantIdFromRequest } = require('../lib/authMiddleware');

router.get('/', async (req, res) => {
  try {
    const tenant_id = await getTenantIdFromRequest(req);
console.log('Resolved tenant_id:', tenant_id);

    // Step 1: Get leads
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('id, status, campaign, created_at, status_history')
      .eq('tenant_id', tenant_id);
console.log('✅ Leads fetched:', leads);
    if (leadsError) {
      console.error('Leads error:', leadgetTenantIdFromRequestsError);
      return res.status(500).json({ error: 'Failed to fetch leads' });
    }

    // Step 2: Get messages
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('id, lead_id, direction, timestamp')
      .in('lead_id', leads.map(l => l.id));
console.log('✅ Messages fetched:', messages);
    if (messagesError) {
      console.error('Messages error:', messagesError);
      return res.status(500).json({ error: 'Failed to fetch messages' });
    }

    // Step 3: Attach messages to each lead
    const leadMap = {};
    leads.forEach((lead) => {
      leadMap[lead.id] = {
        ID: lead.id,
        Status: lead.status || 'Unknown',
        Campaign: lead.campaign || 'Unlabeled',
        Created: lead.created_at,
        'Status History': lead.status_history || '',
        Messages: []
      };
    });

    messages.forEach((msg) => {
      if (leadMap[msg.lead_id]) {
        leadMap[msg.lead_id].Messages.push({
          id: msg.id,
          direction: msg.direction,
          timestamp: msg.timestamp
        });
      }
    });

    const byCampaign = {};
    Object.values(leadMap).forEach((lead) => {
      const campaign = lead.Campaign;
      if (!byCampaign[campaign]) byCampaign[campaign] = 0;
      byCampaign[campaign]++;
    });

    return res.json({
      raw: Object.values(leadMap),
      byCampaign
    });
  } catch (err) {
    console.error('Error in /api/analytics:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
