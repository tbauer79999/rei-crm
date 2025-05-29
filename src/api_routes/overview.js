const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabaseClient');

// GET /api/analytics-overview
router.get('/analytics-overview', async (req, res) => {
  const { tenant_id } = req.query;

  if (!tenant_id) {
    return res.status(400).json({ error: 'Missing tenant_id' });
  }

  try {
// LEADS
const { data: leads, error: leadError } = await supabase
  .from('leads')
  .select('id, status, created_at')
  .eq('tenant_id', tenant_id);

if (leadError) throw leadError;

// MESSAGES
const { data: messages, error: msgError } = await supabase
  .from('messages')
  .select('direction, lead_id')
  .eq('tenant_id', tenant_id);

if (msgError) throw msgError;

// ✅ Log after both are fetched
console.log('LEADS:', leads);
console.log('MESSAGES:', messages);

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

    return res.json({
      totalLeads,
      weeklyLeads,
      hotLeadRate: Number(hotLeadRate.toFixed(1)),
      replyRate: Number(replyRate.toFixed(1)),
      activeLeads,
      completedLeads,
      messagesSent,
      messagesReceived,
    });
  } catch (err) {
    console.error('Error in /api/analytics-overview:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/analytics-trend-cost
router.get('/analytics-trend-cost', async (req, res) => {
  const { tenant_id } = req.query;
  if (!tenant_id) {
    return res.status(400).json({ error: 'Missing tenant_id' });
  }

  try {
    const now = new Date();
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(now.getDate() - 7);
    const lastWeekStart = new Date(now);
    lastWeekStart.setDate(now.getDate() - 14);

    // Leads
    const { data: leads, error: leadError } = await supabase
      .from('leads')
      .select('id, created_at, status')
      .eq('tenant_id', tenant_id);

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

    // Messages
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('timestamp, direction')
      .eq('tenant_id', tenant_id);

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

    return res.json({
      trend,
      totalMessagesSent,
      totalHotLeads,
      previousMessagesSent,
      previousHotLeads,
    });
  } catch (err) {
    console.error('Error in /api/analytics-trend-cost:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
