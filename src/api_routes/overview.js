const express = require('express');
const router = express.Router();
const { supabase } = require('../lib/supabaseService');

// GET /api/overview/
router.get('/', async (req, res) => {
  const { tenant_id } = req.query;
  console.log('=== DEBUG OVERVIEW ENDPOINT ===');
  console.log('Full req.query:', req.query);
  console.log('tenant_id received:', tenant_id, 'type:', typeof tenant_id);
  
  if (!tenant_id) {
    console.log('ERROR: Missing tenant_id');
    return res.status(400).json({ error: 'Missing tenant_id' });
  }

  try {
    // Test the leads query first
    console.log('Querying leads with tenant_id:', tenant_id.toString());
    const { data: leads, error: leadError } = await supabase
      .from('leads')
      .select('id, status, created_at')
      .eq('tenant_id', tenant_id.toString());

    console.log('Leads query result:');
    console.log('- Error:', leadError);
    console.log('- Data count:', leads ? leads.length : 0);
    console.log('- First few leads:', leads ? leads.slice(0, 3) : 'none');

    if (leadError) {
      console.error('Lead query error details:', leadError);
      throw leadError;
    }

    // Test the messages query
    console.log('Querying messages with tenant_id:', tenant_id.toString());
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('direction, lead_id')
      .eq('tenant_id', tenant_id.toString());

    console.log('Messages query result:');
    console.log('- Error:', msgError);
    console.log('- Data count:', messages ? messages.length : 0);
    console.log('- First few messages:', messages ? messages.slice(0, 3) : 'none');

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
  const { tenant_id } = req.query;
  console.log('=== DEBUG ANALYTICS ENDPOINT ===');
  console.log('tenant_id received:', tenant_id, 'type:', typeof tenant_id);
  
  if (!tenant_id) {
    return res.status(400).json({ error: 'Missing tenant_id' });
  }

  try {
    const now = new Date();
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(now.getDate() - 7);
    const lastWeekStart = new Date(now);
    lastWeekStart.setDate(now.getDate() - 14);

    console.log('Date ranges:');
    console.log('- Now:', now);
    console.log('- This week start:', thisWeekStart);
    console.log('- Last week start:', lastWeekStart);

    const { data: leads, error: leadError } = await supabase
      .from('leads')
      .select('id, created_at, status')
      .eq('tenant_id', tenant_id.toString());

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

    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('timestamp, direction')
      .eq('tenant_id', tenant_id.toString());

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
    };

    console.log('Analytics result:', result);
    return res.json(result);
  } catch (err) {
    console.error('Error in /api/overview/analytics-trend-cost:', err);
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// Add this temporary debug endpoint to investigate the data mismatch
router.get('/debug-data', async (req, res) => {
  const { tenant_id } = req.query;
  
  try {
    console.log('=== DEBUGGING SUPABASE DATA ===');
    console.log('Looking for tenant_id:', tenant_id);

    // 1. Get ALL tenant_ids from leads table
    const { data: allLeads, error: allLeadsError } = await supabase
      .from('leads')
      .select('tenant_id, id, status, created_at')
      .limit(20);

    console.log('All leads (first 20):');
    console.log('- Error:', allLeadsError);
    console.log('- Count:', allLeads ? allLeads.length : 0);
    if (allLeads && allLeads.length > 0) {
      console.log('- Sample tenant_ids from leads:');
      const uniqueTenantIds = [...new Set(allLeads.map(l => l.tenant_id))];
      uniqueTenantIds.forEach((id, index) => {
        console.log(`  ${index + 1}. "${id}" (type: ${typeof id})`);
        console.log(`     Matches target? ${id === tenant_id}`);
        console.log(`     String comparison: "${id.toString()}" === "${tenant_id.toString()}" = ${id.toString() === tenant_id.toString()}`);
      });
    }

    // 2. Get ALL tenant_ids from messages table  
    const { data: allMessages, error: allMsgError } = await supabase
      .from('messages')
      .select('tenant_id, id, direction')
      .limit(20);

    console.log('All messages (first 20):');
    console.log('- Error:', allMsgError);
    console.log('- Count:', allMessages ? allMessages.length : 0);
    if (allMessages && allMessages.length > 0) {
      console.log('- Sample tenant_ids from messages:');
      const uniqueTenantIds = [...new Set(allMessages.map(m => m.tenant_id))];
      uniqueTenantIds.forEach((id, index) => {
        console.log(`  ${index + 1}. "${id}" (type: ${typeof id})`);
        console.log(`     Matches target? ${id === tenant_id}`);
      });
    }

    // 3. Try different comparison methods
    if (allLeads && allLeads.length > 0) {
      console.log('=== TESTING DIFFERENT QUERY METHODS ===');
      
      // Try exact match
      const { data: exactMatch, error: exactError } = await supabase
        .from('leads')
        .select('id')
        .eq('tenant_id', tenant_id);
      console.log(`Exact match (${tenant_id}):`, exactMatch ? exactMatch.length : 0, 'results');

      // Try with toString()
      const { data: stringMatch, error: stringError } = await supabase
        .from('leads')
        .select('id')
        .eq('tenant_id', tenant_id.toString());
      console.log(`String match (${tenant_id.toString()}):`, stringMatch ? stringMatch.length : 0, 'results');

      // Try the first tenant_id we found
      const firstTenantId = allLeads[0].tenant_id;
      const { data: firstMatch, error: firstError } = await supabase
        .from('leads')
        .select('id')
        .eq('tenant_id', firstTenantId);
      console.log(`Using first found tenant_id (${firstTenantId}):`, firstMatch ? firstMatch.length : 0, 'results');
    }

    return res.json({
      searchingFor: tenant_id,
      searchingForType: typeof tenant_id,
      leadsFound: allLeads ? allLeads.length : 0,
      messagesFound: allMessages ? allMessages.length : 0,
      sampleLeadTenantIds: allLeads ? [...new Set(allLeads.map(l => l.tenant_id))].slice(0, 5) : [],
      sampleMessageTenantIds: allMessages ? [...new Set(allMessages.map(m => m.tenant_id))].slice(0, 5) : []
    });

  } catch (err) {
    console.error('Debug error:', err);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;