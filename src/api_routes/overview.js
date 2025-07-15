const express = require('express');
const router = express.Router();
const { supabase } = require('../lib/supabaseService');
const { addUserProfile, filterByTenant } = require('../lib/authMiddleware');

// Apply security middleware
router.use(addUserProfile);
router.use(filterByTenant);

// GET /api/overview/
router.get('/', async (req, res) => {
  const { role, tenant_id } = req.user || {}; // Get from authenticated user, not query params
  
  console.log('=== SECURE OVERVIEW ENDPOINT ===');
  console.log('user role:', role);
  console.log('user tenant_id:', tenant_id);
  
  try {
    // Security check
    if (!tenant_id && role !== 'global_admin') {
      return res.status(403).json({ error: 'No tenant access configured' });
    }

    // Build leads query based on role
    let leadsQuery = supabase
      .from('leads')
      .select('id, status, created_at')
      .limit(null); // Remove the 1000 row limit - fetch all results

    // Apply tenant filtering
    if (role !== 'global_admin') {
      leadsQuery = leadsQuery.eq('tenant_id', tenant_id);
    }

    console.log('Querying leads with tenant filtering applied');
    const { data: leads, error: leadError } = await leadsQuery;

    console.log('Leads query result:');
    console.log('- Error:', leadError);
    console.log('- Data count:', leads ? leads.length : 0);

    if (leadError) {
      console.error('Lead query error details:', leadError);
      throw leadError;
    }

    // Build messages query based on role
    let messagesQuery = supabase
      .from('messages')
      .select('direction, lead_id')
      .limit(null); // Remove the 1000 row limit - fetch all results

    // Apply tenant filtering
    if (role !== 'global_admin') {
      messagesQuery = messagesQuery.eq('tenant_id', tenant_id);
    }

    console.log('Querying messages with tenant filtering applied');
    const { data: messages, error: msgError } = await messagesQuery;

    console.log('Messages query result:');
    console.log('- Error:', msgError);
    console.log('- Data count:', messages ? messages.length : 0);

    if (msgError) {
      console.error('Message query error details:', msgError);
      throw msgError;
    }

    // Continue with calculations...
    const now = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(now.getDate() - 7);

    const totalLeads = leads.length;
    const weeklyLeads = leads.filter((l) => new Date(l.created_at) > weekAgo).length;
    const hotLeads = leads.filter((l) => l.status === 'Hot Lead').length;
    const activeLeads = leads.filter((l) => ['Engaging', 'Responding'].includes(l.status)).length;
    const completedLeads = leads.filter((l) =>
      ['Hot Lead', 'Opted Out', 'Unsubscribed', 'Disqualified'].includes(l.status)
    ).length;

    let messagesSent = 0;
    let messagesReceived = 0;
    const repliedLeadIds = new Set();

    messages.forEach((msg) => {
      if (msg.direction === 'outbound') messagesSent++;
      if (msg.direction === 'inbound') {
        messagesReceived++;
        if (msg.lead_id) repliedLeadIds.add(msg.lead_id);
      }
    });

    const replyRate = totalLeads > 0 ? (repliedLeadIds.size / totalLeads) * 100 : 0;
    const hotLeadRate = totalLeads > 0 ? (hotLeads / totalLeads) * 100 : 0;

    const result = {
      totalLeads,
      weeklyLeads,
      hotLeadRate: Number(hotLeadRate.toFixed(1)),
      replyRate: Number(replyRate.toFixed(1)),
      activeLeads,
      completedLeads,
      messagesSent,
      messagesReceived,
      meta: { role, tenant_id }
    };

    console.log('Final result:', result);
    return res.json(result);
  } catch (err) {
    console.error('Error in /api/overview:', err);
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// GET /api/overview/analytics-trend-cost
router.get('/analytics-trend-cost', async (req, res) => {
  const { role, tenant_id } = req.user || {}; // Get from authenticated user, not query params
  
  console.log('=== SECURE ANALYTICS ENDPOINT ===');
  console.log('user role:', role);
  console.log('user tenant_id:', tenant_id);
  
  try {
    // Security check
    if (!tenant_id && role !== 'global_admin') {
      return res.status(403).json({ error: 'No tenant access configured' });
    }

    const now = new Date();
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(now.getDate() - 7);
    const lastWeekStart = new Date(now);
    lastWeekStart.setDate(now.getDate() - 14);

    console.log('Date ranges:');
    console.log('- Now:', now);
    console.log('- This week start:', thisWeekStart);
    console.log('- Last week start:', lastWeekStart);

    // Build leads query based on role
    let leadsQuery = supabase
      .from('leads')
      .select('id, created_at, status')
      .limit(null); // Remove the 1000 row limit - fetch all results

    // Apply tenant filtering
    if (role !== 'global_admin') {
      leadsQuery = leadsQuery.eq('tenant_id', tenant_id);
    }

    const { data: leads, error: leadError } = await leadsQuery;

    console.log('Analytics leads query:');
    console.log('- Error:', leadError);
    console.log('- Data count:', leads ? leads.length : 0);

    if (leadError) throw leadError;

    const grouped = {};
    let totalHotLeads = 0;
    let previousHotLeads = 0;

    leads.forEach((lead) => {
      const created = new Date(lead.created_at);
      const dateKey = created.toISOString().slice(0, 10);
      if (!grouped[dateKey]) grouped[dateKey] = { total: 0, hot: 0 };
      grouped[dateKey].total++;
      if (lead.status === 'Hot Lead') {
        grouped[dateKey].hot++;
        totalHotLeads++;
        if (created > lastWeekStart && created <= thisWeekStart) {
          previousHotLeads++;
        }
      }
    });

    const trend = Object.entries(grouped).map(([date, data]) => ({
      date,
      hotRate: data.total ? ((data.hot / data.total) * 100).toFixed(1) : 0,
    }));

    // Build messages query based on role
    let messagesQuery = supabase
      .from('messages')
      .select('timestamp, direction')
      .limit(null); // Remove the 1000 row limit - fetch all results

    // Apply tenant filtering
    if (role !== 'global_admin') {
      messagesQuery = messagesQuery.eq('tenant_id', tenant_id);
    }

    const { data: messages, error: msgError } = await messagesQuery;

    console.log('Analytics messages query:');
    console.log('- Error:', msgError);
    console.log('- Data count:', messages ? messages.length : 0);

    if (msgError) throw msgError;

    let totalMessagesSent = 0;
    let previousMessagesSent = 0;

    messages.forEach((msg) => {
      const ts = new Date(msg.timestamp);
      if (msg.direction === 'outbound') {
        totalMessagesSent++;
        if (ts > lastWeekStart && ts <= thisWeekStart) {
          previousMessagesSent++;
        }
      }
    });

    const result = {
      trend,
      totalMessagesSent,
      totalHotLeads,
      previousMessagesSent,
      previousHotLeads,
      meta: { role, tenant_id }
    };

    console.log('Analytics result:', result);
    return res.json(result);
  } catch (err) {
    console.error('Error in /api/overview/analytics-trend-cost:', err);
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// Secure debug endpoint - for troubleshooting tenant data access
router.get('/debug-data', async (req, res) => {
  const { role, tenant_id } = req.user || {};
  
  try {
    // Security check
    if (!tenant_id && role !== 'global_admin') {
      return res.status(403).json({ error: 'No tenant access configured' });
    }

    console.log('=== SECURE DEBUGGING ENDPOINT ===');
    console.log('User role:', role);
    console.log('User tenant_id:', tenant_id);

    // Build query based on role - limit results for debugging
    let leadsQuery = supabase
      .from('leads')
      .select('tenant_id, id, status, created_at')
      .limit(20);

    // Apply tenant filtering
    if (role !== 'global_admin') {
      leadsQuery = leadsQuery.eq('tenant_id', tenant_id);
    }

    const { data: allLeads, error: allLeadsError } = await leadsQuery;

    console.log('Debug leads query:');
    console.log('- Error:', allLeadsError);
    console.log('- Count:', allLeads ? allLeads.length : 0);

    // Build query based on role - limit results for debugging
    let messagesQuery = supabase
      .from('messages')
      .select('tenant_id, id, direction')
      .limit(20);

    // Apply tenant filtering
    if (role !== 'global_admin') {
      messagesQuery = messagesQuery.eq('tenant_id', tenant_id);
    }

    const { data: allMessages, error: allMsgError } = await messagesQuery;

    console.log('Debug messages query:');
    console.log('- Error:', allMsgError);
    console.log('- Count:', allMessages ? allMessages.length : 0);

    return res.json({
      userRole: role,
      userTenantId: tenant_id,
      leadsFound: allLeads ? allLeads.length : 0,
      messagesFound: allMessages ? allMessages.length : 0,
      sampleLeads: allLeads ? allLeads.slice(0, 3) : [],
      sampleMessages: allMessages ? allMessages.slice(0, 3) : [],
      meta: { role, tenant_id }
    });

  } catch (err) {
    console.error('Debug error:', err);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;