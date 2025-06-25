// src/api_routes/hot.js
const express = require('express');
const router = express.Router();
const { supabase } = require('../lib/supabaseService');
const { addUserProfile, filterByTenant } = require('../lib/authMiddleware');

// Apply security middleware
router.use(addUserProfile);
router.use(filterByTenant);

router.get('/', async (req, res) => {
  const { role, tenant_id } = req.user || {}; // Get from authenticated user
  
  try {
    console.log('=== HOT LEADS ENDPOINT ===');
    console.log('user role:', role);
    console.log('user tenant_id:', tenant_id);

    // Security check
    if (!tenant_id && role !== 'global_admin') {
      return res.status(403).json({ error: 'No tenant access configured' });
    }

    // Get ALL leads with their lead_scores
    let query = supabase
      .from('leads')
      .select(`
        id,
        name,
        status,
        marked_hot_at,
        call_logged,
        created_at,
        campaign,
        lead_scores (
          hot_score,
          requires_immediate_attention,
          alert_priority
        )
      `)
      .order('marked_hot_at', { ascending: false });

    // Apply tenant filtering
    if (role !== 'global_admin') {
      query = query.eq('tenant_id', tenant_id);
    }

    const { data: allLeads, error: leadsError } = await query;

    if (leadsError) {
      console.error('Error fetching leads:', leadsError);
      throw leadsError;
    }

    // Filter in JavaScript to get leads that are EITHER:
    // 1. Critical (requires_immediate_attention = true) regardless of status/score
    // 2. Have status = 'Hot Lead'
    const hotLeads = (allLeads || []).filter(lead => 
      lead.lead_scores?.requires_immediate_attention === true || 
      lead.status === 'Hot Lead'
    ).sort((a, b) => {
      // Sort critical leads first
      const aCritical = a.lead_scores?.requires_immediate_attention || false;
      const bCritical = b.lead_scores?.requires_immediate_attention || false;
      
      if (aCritical && !bCritical) return -1;
      if (!aCritical && bCritical) return 1;
      
      // Then by hot score
      const aScore = a.lead_scores?.hot_score || 0;
      const bScore = b.lead_scores?.hot_score || 0;
      return bScore - aScore;
    });

    console.log('Total leads fetched:', allLeads?.length || 0);
    console.log('Filtered hot/critical leads:', hotLeads.length);
    console.log('Critical leads:', hotLeads.filter(l => l.lead_scores?.requires_immediate_attention).length);
    console.log('Hot status leads:', hotLeads.filter(l => l.status === 'Hot Lead').length);

    // For each hot/critical lead, get their latest message for context
    const leadsWithMessages = await Promise.all(
      hotLeads.map(async (lead) => {
        // Get latest message for this lead
        const { data: messages } = await supabase
          .from('messages')
          .select('message_body, timestamp')
          .eq('lead_id', lead.id)
          .order('timestamp', { ascending: false })
          .limit(1);

        const latestMessage = messages?.[0];

        // Calculate time since marked hot or became critical
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
        } else if (lead.lead_scores?.requires_immediate_attention) {
          // If no marked_hot_at but is critical, use created_at
          const createdTime = new Date(lead.created_at);
          const now = new Date();
          const diffMinutes = Math.floor((now - createdTime) / (1000 * 60));
          
          if (diffMinutes < 60) {
            marked_hot_time_ago = `${diffMinutes}m ago (critical)`;
          } else if (diffMinutes < 1440) {
            marked_hot_time_ago = `${Math.floor(diffMinutes / 60)}h ago (critical)`;
          } else {
            marked_hot_time_ago = `${Math.floor(diffMinutes / 1440)}d ago (critical)`;
          }
        }

        return {
          id: lead.id,
          name: lead.name || 'Unnamed Lead',
          marked_hot_time_ago,
          snippet: latestMessage?.message_body?.slice(0, 80) + '...' || 'No recent messages',
          call_logged: lead.call_logged || false,
          campaign: lead.campaign,
          status: lead.status,
          // Include lead_scores data
          hot_score: lead.lead_scores?.hot_score || 0,
          requires_immediate_attention: lead.lead_scores?.requires_immediate_attention || false,
          alert_priority: lead.lead_scores?.alert_priority || 'none'
        };
      })
    );

    console.log('Hot/critical leads with messages:', leadsWithMessages.length);

    // Count different types of leads
    const criticalCount = leadsWithMessages.filter(l => l.requires_immediate_attention).length;
    const hotCount = leadsWithMessages.filter(l => !l.requires_immediate_attention && l.status === 'Hot Lead').length;

    res.json({ 
      hotLeads: leadsWithMessages,
      meta: { 
        role, 
        tenant_id, 
        total_count: leadsWithMessages.length,
        hot_leads_count: hotCount,
        critical_leads_count: criticalCount
      }
    });

  } catch (err) {
    console.error('Hot Leads error:', err.message);
    res.status(500).json({ error: 'Failed to fetch hot leads' });
  }
});

module.exports = router;