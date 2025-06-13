console.log('✅ analyticsRoutes.js is loaded');
const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabaseClient');
const { addUserProfile, filterByTenant } = require('../lib/authMiddleware');

// Apply security middleware
router.use(addUserProfile);
router.use(filterByTenant);

router.get('/', async (req, res) => {
  try {
    const { role, tenant_id } = req.user || {};
    
    console.log('Analytics request - Role:', role, 'Tenant ID:', tenant_id);

    // Security check
    if (!tenant_id && role !== 'global_admin') {
      return res.status(403).json({ error: 'No tenant access configured' });
    }

    // Build leads query based on role
    let leadsQuery = supabase
      .from('leads')
      .select('id, status, campaign, created_at, status_history');

    // Apply tenant filtering unless global admin
    if (role === 'global_admin') {
      // Global admin can see all leads
      console.log('Global admin - fetching all leads');
    } else {
      // Enterprise and business admins see only their tenant's leads
      leadsQuery = leadsQuery.eq('tenant_id', tenant_id);
      console.log('Filtered query for tenant:', tenant_id);
    }

    // Step 1: Get leads
    const { data: leads, error: leadsError } = await leadsQuery;
    
    console.log('✅ Leads fetched:', leads?.length || 0);
    
    if (leadsError) {
      console.error('Leads error:', leadsError);
      return res.status(500).json({ error: 'Failed to fetch leads' });
    }

    if (!leads || leads.length === 0) {
      return res.json({
        raw: [],
        byCampaign: {},
        meta: { role, tenant_id, leads_count: 0 }
      });
    }

    // Step 2: Get messages for these leads
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('id, lead_id, direction, timestamp')
      .in('lead_id', leads.map(l => l.id));
      
    console.log('✅ Messages fetched:', messages?.length || 0);
    
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

    (messages || []).forEach((msg) => {
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
      byCampaign,
      meta: { 
        role, 
        tenant_id, 
        leads_count: leads.length,
        messages_count: messages?.length || 0
      }
    });
  } catch (err) {
    console.error('Error in /api/analytics:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;