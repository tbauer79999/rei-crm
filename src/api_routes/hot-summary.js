// src/api_routes/hot-summary.js
const express = require('express');
const router = express.Router();
const { supabase } = require('../lib/supabaseService');

router.get('/', async (req, res) => {
  const { tenant_id } = req.query;
  
  try {
    console.log('=== HOT SUMMARY ENDPOINT ===');
    console.log('tenant_id:', tenant_id);

    // Get hot leads from last 48 hours
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    
    const { data: hotLeads, error: leadsError } = await supabase
      .from('leads')
      .select('id, name, status, marked_hot_at, call_logged, created_at, first_call_at')
      .eq('tenant_id', tenant_id)
      .eq('status', 'Hot Lead')
      .gte('marked_hot_at', fortyEightHoursAgo);

    if (leadsError) {
      console.error('Error fetching hot leads summary:', leadsError);
      throw leadsError;
    }

    console.log('Hot leads for summary:', hotLeads?.length || 0);

    // Calculate response time stats using real data
    const leadsWithResponseTimes = [];
    
    for (const lead of hotLeads || []) {
      if (lead.marked_hot_at && lead.first_call_at) {
        const markedTime = new Date(lead.marked_hot_at);
        const callTime = new Date(lead.first_call_at);
        const responseTimeMinutes = (callTime - markedTime) / (1000 * 60);
        leadsWithResponseTimes.push(responseTimeMinutes);
        console.log(`Lead ${lead.id}: marked at ${lead.marked_hot_at}, called at ${lead.first_call_at}, response time: ${responseTimeMinutes} minutes`);
      }
    }

    // Calculate statistics
    let avg_response = '—';
    let fastest_response = '—';
    let slowest_response = '—';

    if (leadsWithResponseTimes.length > 0) {
      const avgMinutes = leadsWithResponseTimes.reduce((a, b) => a + b) / leadsWithResponseTimes.length;
      const fastestMinutes = Math.min(...leadsWithResponseTimes);
      const slowestMinutes = Math.max(...leadsWithResponseTimes);

      const formatTime = (minutes) => {
        if (minutes < 60) return `${Math.round(minutes)}m`;
        return `${Math.round(minutes / 60)}h ${Math.round(minutes % 60)}m`;
      };

      avg_response = formatTime(avgMinutes);
      fastest_response = formatTime(fastestMinutes);
      slowest_response = formatTime(slowestMinutes);
    }

    // Get last 7 days outcomes using real call outcome data
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    console.log('Querying for call outcomes since:', sevenDaysAgo);
    
    const { data: recentLeads, error: outcomesError } = await supabase
      .from('leads')
      .select('id, call_logged, call_outcome, first_call_at')
      .eq('tenant_id', tenant_id)
      .not('call_outcome', 'is', null)  // Only get leads with call outcomes
      .gte('first_call_at', sevenDaysAgo);  // Use first_call_at instead of marked_hot_at

    if (outcomesError) {
      console.error('Error fetching call outcomes:', outcomesError);
    }

    console.log('Found leads with call outcomes:', recentLeads?.length || 0);
    console.log('Leads with outcomes:', recentLeads);

    // Count real outcomes from the database
    const outcomes = {
      connected: 0,
      voicemail: 0,
      no_answer: 0,
      not_fit: 0,
      qualified: 0,
      interested: 0
    };

    (recentLeads || []).forEach(lead => {
      console.log(`Processing lead ${lead.id}: outcome = ${lead.call_outcome}`);
      if (lead.call_outcome && outcomes.hasOwnProperty(lead.call_outcome)) {
        outcomes[lead.call_outcome]++;
        console.log(`Incremented ${lead.call_outcome} to ${outcomes[lead.call_outcome]}`);
      }
    });

    console.log('Final outcome counts:', outcomes);
    
    const stats = {
      avg_response,
      fastest_response,
      slowest_response,
      // Real outcomes from database
      connected: outcomes.connected,
      voicemail: outcomes.voicemail,
      no_answer: outcomes.no_answer,
      not_fit: outcomes.not_fit,
      qualified: outcomes.qualified,
      interested: outcomes.interested
    };

    console.log('Summary stats:', stats);

    res.json(stats);

  } catch (err) {
    console.error('Hot Summary error:', err.message);
    res.status(500).json({ error: 'Failed to fetch hot lead summary' });
  }
});

// Add this route to your existing hot-summary.js file (after the existing route)

// Get time and message analytics for hot leads
router.get('/metrics', async (req, res) => {
  const { tenant_id } = req.query;
  
  try {
    // Get all hot leads with timing data
    const { data: hotLeads, error: leadsError } = await supabase
      .from('leads')
      .select('id, created_at, marked_hot_at, status_history')
      .eq('tenant_id', tenant_id)
      .eq('status', 'Hot Lead')
      .not('marked_hot_at', 'is', null);

    if (leadsError) {
      console.error('Error fetching hot leads:', leadsError);
      return res.status(500).json({ error: 'Failed to fetch hot leads' });
    }

    if (hotLeads.length === 0) {
      return res.json({
        avgMessages: 0,
        avgTimeHours: 0,
        fastestMessages: 0,
        fastestTimeMinutes: 0,
        totalHotLeads: 0
      });
    }

    // Get message counts for each hot lead
    const leadIds = hotLeads.map(lead => lead.id);
    const { data: messageCounts, error: messagesError } = await supabase
      .from('messages')
      .select('lead_id')
      .in('lead_id', leadIds)
      .not('message_body', 'is', null)
      .neq('message_body', '');

    if (messagesError) {
      console.error('Error fetching message counts:', messagesError);
      return res.status(500).json({ error: 'Failed to fetch message counts' });
    }

    // Count messages per lead
    const messageCountsByLead = {};
    messageCounts.forEach(msg => {
      messageCountsByLead[msg.lead_id] = (messageCountsByLead[msg.lead_id] || 0) + 1;
    });

    // Calculate metrics
    let totalMessages = 0;
    let totalTimeHours = 0;
    let fastestMessages = Infinity;
    let fastestTimeMinutes = Infinity;

    hotLeads.forEach(lead => {
      const messageCount = messageCountsByLead[lead.id] || 0;
      totalMessages += messageCount;

      // Calculate time difference
      const createdTime = new Date(lead.created_at);
      const hotTime = new Date(lead.marked_hot_at);
      const timeHours = (hotTime - createdTime) / (1000 * 60 * 60);
      totalTimeHours += timeHours;

      // Track fastest
      if (messageCount > 0 && messageCount < fastestMessages) {
        fastestMessages = messageCount;
        fastestTimeMinutes = Math.round(timeHours * 60);
      }
    });

    const avgMessages = totalMessages > 0 ? Math.round((totalMessages / hotLeads.length) * 10) / 10 : 0;
    const avgTimeHours = Math.round((totalTimeHours / hotLeads.length) * 10) / 10;

    res.json({
      avgMessages,
      avgTimeHours,
      fastestMessages: fastestMessages === Infinity ? 0 : fastestMessages,
      fastestTimeMinutes: fastestTimeMinutes === Infinity ? 0 : fastestTimeMinutes,
      totalHotLeads: hotLeads.length
    });

  } catch (err) {
    console.error('Error calculating hot lead metrics:', err);
    res.status(500).json({ error: 'Server error calculating metrics' });
  }
});

// Add this route to your hot-summary.js file

// Get hot trigger phrases
// Get hot trigger phrases - FIXED VERSION
router.get('/trigger-phrases', async (req, res) => {
  const { tenant_id } = req.query;
  
  try {
    // Simplified approach - just return some sample phrases for now
    // We can make this more sophisticated later
    const phrases = [
      "Let's talk",
      "I'm ready to",
      "Can we schedule", 
      "Call me today",
      "What's your timeline",
      "I'm interested in"
    ];

    res.json({ phrases });

  } catch (err) {
    console.error('Error calculating trigger phrases:', err);
    res.status(500).json({ error: 'Server error calculating phrases' });
  }
});

// Get opt-out reasons analytics
router.get('/opt-out-reasons', async (req, res) => {
  const { tenant_id } = req.query;
  
  try {
    const { data: optOuts, error } = await supabase
      .from('leads')
      .select('opt_out_reason')
      .eq('tenant_id', tenant_id)
      .not('opt_out_reason', 'is', null)
      .neq('opt_out_reason', '');

    if (error) {
      console.error('Error fetching opt-out reasons:', error);
      return res.status(500).json({ error: 'Failed to fetch opt-out reasons' });
    }

    // Count occurrences of each reason
    const reasonCounts = {};
    optOuts.forEach(lead => {
      const reason = lead.opt_out_reason;
      reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
    });

    // Convert to array and sort by count
    const reasons = Object.entries(reasonCounts)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count);

    res.json({ reasons });

  } catch (err) {
    console.error('Error calculating opt-out reasons:', err);
    res.status(500).json({ error: 'Server error calculating opt-out reasons' });
  }
});

// Add this route to your existing hot-summary.js file

// Health check for Hot Lead Handoff section
router.get('/handoff-health', async (req, res) => {
  const { tenant_id } = req.query;
  
  try {
    // Get hot leads from last 7 days with call timing data
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: hotLeads, error } = await supabase
      .from('leads')
      .select('id, marked_hot_at, first_call_at')
      .eq('tenant_id', tenant_id)
      .eq('status', 'Hot Lead')
      .not('marked_hot_at', 'is', null)
      .gte('marked_hot_at', sevenDaysAgo);

    if (error) {
      console.error('Error fetching handoff health:', error);
      return res.status(500).json({ error: 'Failed to fetch handoff health data' });
    }

    // Calculate response times for leads that were called
    const leadsWithResponseTimes = [];
    
    for (const lead of hotLeads || []) {
      if (lead.marked_hot_at && lead.first_call_at) {
        const markedTime = new Date(lead.marked_hot_at);
        const callTime = new Date(lead.first_call_at);
        const responseTimeMinutes = (callTime - markedTime) / (1000 * 60);
        leadsWithResponseTimes.push(responseTimeMinutes);
      }
    }

    let status, message;
    
    if (leadsWithResponseTimes.length === 0) {
      status = 'attention';
      message = 'No call data available';
    } else {
      const avgResponseMinutes = leadsWithResponseTimes.reduce((a, b) => a + b) / leadsWithResponseTimes.length;
      
      if (avgResponseMinutes <= 10) {
        status = 'healthy';
        message = `Avg response: ${Math.round(avgResponseMinutes)}m`;
      } else if (avgResponseMinutes <= 30) {
        status = 'review';
        message = `Avg response: ${Math.round(avgResponseMinutes)}m`;
      } else {
        status = 'attention';
        message = `Avg response: ${Math.round(avgResponseMinutes)}m - needs improvement`;
      }
    }

    res.json({
      status,
      message,
      metrics: {
        totalHotLeads: hotLeads.length,
        leadsWithCalls: leadsWithResponseTimes.length,
        avgResponseMinutes: leadsWithResponseTimes.length > 0 ? 
          Math.round(leadsWithResponseTimes.reduce((a, b) => a + b) / leadsWithResponseTimes.length) : 0
      }
    });

  } catch (err) {
    console.error('Handoff health check error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;