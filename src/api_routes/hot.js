// src/api_routes/hot.js
const express = require('express');
const router = express.Router();
const { supabase } = require('../lib/supabaseService');

router.get('/', async (req, res) => {
  const { tenant_id } = req.query;
  
  try {
    console.log('=== HOT LEADS ENDPOINT ===');
    console.log('tenant_id:', tenant_id);

    // Get hot leads with their latest messages
    const { data: hotLeads, error: leadsError } = await supabase
      .from('leads')
      .select(`
        id,
        name,
        status,
        marked_hot_at,
        call_logged,
        created_at,
        campaign
      `)
      .eq('tenant_id', tenant_id)
      .eq('status', 'Hot Lead')
      .order('marked_hot_at', { ascending: false });

    if (leadsError) {
      console.error('Error fetching hot leads:', leadsError);
      throw leadsError;
    }

    console.log('Found hot leads:', hotLeads?.length || 0);

    // For each hot lead, get their latest message for context
    const leadsWithMessages = await Promise.all(
      (hotLeads || []).map(async (lead) => {
        // Get latest message for this lead
        const { data: messages } = await supabase
          .from('messages')
          .select('message_body, timestamp')
          .eq('lead_id', lead.id)
          .order('timestamp', { ascending: false })
          .limit(1);

        const latestMessage = messages?.[0];

        // Calculate time since marked hot
        let marked_hot_time_ago = '—';
        if (lead.marked_hot_at) {
          const markedTime = new Date(lead.marked_hot_at);
          const now = new Date();
          const diffMinutes = Math.floor((now - markedTime) / (1000 * 60));
          
          if (diffMinutes < 60) {
            marked_hot_time_ago = `${diffMinutes}m ago`;
          } else if (diffMinutes < 1440) {
            marked_hot_time_ago = `${Math.floor(diffMinutes / 60)}h ago`;
          } else {
            marked_hot_time_ago = `${Math.floor(diffMinutes / 1440)}d ago`;
          }
        }

        return {
          id: lead.id,
          name: lead.name || 'Unnamed Lead',
          marked_hot_time_ago,
          snippet: latestMessage?.message_body?.slice(0, 80) + '...' || 'No recent messages',
          call_logged: lead.call_logged || false,
          campaign: lead.campaign
        };
      })
    );

    console.log('Hot leads with messages:', leadsWithMessages.length);

    res.json({ 
      hotLeads: leadsWithMessages 
    });

  } catch (err) {
    console.error('Hot Leads error:', err.message);
    res.status(500).json({ error: 'Failed to fetch hot leads' });
  }
});

module.exports = router;