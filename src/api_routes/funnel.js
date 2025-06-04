const express = require('express');
const router = express.Router();
const { fetchAllRecords } = require('../lib/supabaseHelpers');
const { addUserProfile, filterByTenant } = require('../lib/authMiddleware');

// Apply security middleware
router.use(addUserProfile);
router.use(filterByTenant);

router.get('/', async (req, res) => {
  const { campaign, timeframe } = req.query;
  const { role, tenant_id } = req.user || {};

  try {
    // Security check
    if (!tenant_id && role !== 'global_admin') {
      return res.status(403).json({ error: 'No tenant access configured' });
    }

    // Get leads with tenant filtering
    let leads = await fetchAllRecords('leads');
    
    // Apply tenant filtering based on role
    if (role === 'global_admin') {
      // Global admin can see all leads
    } else if (role === 'enterprise_admin' || role === 'business_admin') {
      // Filter to only this tenant's leads
      leads = leads.filter(lead => lead.tenant_id === tenant_id);
    } else {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    let filteredLeads = leads;

    // 🟡 Campaign filter
    if (campaign && campaign !== 'All') {
      filteredLeads = filteredLeads.filter(
        lead => (lead.campaign || '').toLowerCase() === campaign.toLowerCase()
      );
    }

    // 🟡 Timeframe filter
    if (timeframe) {
      const now = new Date();
      let cutoff;

      if (timeframe === 'Last 7 Days') {
        cutoff = new Date(now.setDate(now.getDate() - 7));
      } else if (timeframe === 'Last 30 Days') {
        cutoff = new Date(now.setDate(now.getDate() - 30));
      } else if (timeframe === 'This Quarter') {
        const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        cutoff = quarterStart;
      }

      filteredLeads = filteredLeads.filter(lead => {
        const created = new Date(lead.created_at || lead.createdAt || '');
        return created >= cutoff;
      });
    }

    // ✅ Funnel stage calculation
    let cold = 0, warm = 0, engaged = 0, hot = 0;

    filteredLeads.forEach(lead => {
      const status = (lead.status || '').toLowerCase();
      if (['cold', 'warm', 'engaged', 'hot'].includes(status)) {
        cold += 1;
        if (['warm', 'engaged', 'hot'].includes(status)) warm += 1;
        if (['engaged', 'hot'].includes(status)) engaged += 1;
        if (['hot'].includes(status)) hot += 1;
      }
    });

    res.json({ 
      cold, 
      warm, 
      engaged, 
      hot,
      meta: { 
        role, 
        tenant_id, 
        total_leads: leads.length, 
        filtered_leads: filteredLeads.length 
      }
    });
  } catch (err) {
    console.error('Error generating funnel data:', err.message);
    res.status(500).json({ error: 'Failed to generate funnel stats' });
  }
});

module.exports = router;