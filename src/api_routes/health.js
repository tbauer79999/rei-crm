const express = require('express');
const router = express.Router();
const { supabase } = require('../lib/supabaseService');
const { addUserProfile, filterByTenant } = require('../lib/authMiddleware');

// Apply security middleware
router.use(addUserProfile);
router.use(filterByTenant);

// Health check for Overview & Health section
router.get('/health-check', async (req, res) => {
  const { role, tenant_id } = req.user || {}; // Get from authenticated user
  
  try {
    // Security check
    if (!tenant_id && role !== 'global_admin') {
      return res.status(403).json({ error: 'No tenant access configured' });
    }

    // Build query based on role
    let query = supabase
      .from('leads')
      .select('id, status, created_at')
      .gte('created_at', new Date().toISOString().split('T')[0]) // Today
      .limit(null); // Remove the 1000 row limit - fetch all results

    // Apply tenant filtering
    if (role !== 'global_admin') {
      query = query.eq('tenant_id', tenant_id);
    }

    const { data: todayStats, error } = await query;

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch health data' });
    }

    const totalToday = todayStats.length;
    const hotToday = todayStats.filter(lead => lead.status === 'Hot Lead').length;
    const lastHour = todayStats.filter(lead => {
      const leadTime = new Date(lead.created_at);
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      return leadTime > hourAgo;
    }).length;

    // Determine status based on activity
    let status, message;
    
    if (totalToday === 0) {
      status = 'attention';
      message = 'No leads today';
    } else if (totalToday >= 10 && lastHour > 0) {
      status = 'healthy';
      message = `${totalToday} leads today`;
    } else if (totalToday >= 5) {
      status = 'healthy';
      message = `${totalToday} leads today`;
    } else if (lastHour === 0 && totalToday < 5) {
      status = 'review';
      message = `${totalToday} leads today, slow activity`;
    } else {
      status = 'attention';
      message = `${totalToday} leads today`;
    }

    res.json({
      status,
      message,
      metrics: {
        totalToday,
        hotToday,
        lastHour
      },
      meta: { role, tenant_id }
    });

  } catch (err) {
    console.error('Health check error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Health check for Lead Journey & Funnel section
router.get('/funnel-health', async (req, res) => {
  const { role, tenant_id } = req.user || {}; // Get from authenticated user
  
  try {
    // Security check
    if (!tenant_id && role !== 'global_admin') {
      return res.status(403).json({ error: 'No tenant access configured' });
    }

    // Get all leads from last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    let query = supabase
      .from('leads')
      .select('id, status, created_at')
      .gte('created_at', thirtyDaysAgo)
      .limit(null); // Remove the 1000 row limit - fetch all results

    // Apply tenant filtering
    if (role !== 'global_admin') {
      query = query.eq('tenant_id', tenant_id);
    }

    const { data: allLeads, error } = await query;

    if (error) {
      console.error('Error fetching funnel health:', error);
      return res.status(500).json({ error: 'Failed to fetch funnel health data' });
    }

    const totalLeads = allLeads.length;
    const hotLeads = allLeads.filter(lead => lead.status === 'Hot Lead').length;
    const qualifiedLeads = allLeads.filter(lead => lead.status === 'Qualified').length;
    
    // Calculate conversion rate
    const conversionRate = totalLeads > 0 ? ((hotLeads + qualifiedLeads) / totalLeads * 100) : 0;
    
    let status, message;
    
    if (totalLeads === 0) {
      status = 'attention';
      message = 'No leads in last 30 days';
    } else if (conversionRate >= 20) {
      status = 'healthy';
      message = `${Math.round(conversionRate)}% conversion rate`;
    } else if (conversionRate >= 10) {
      status = 'review';
      message = `${Math.round(conversionRate)}% conversion rate`;
    } else {
      status = 'attention';
      message = `${Math.round(conversionRate)}% conversion rate - low`;
    }

    res.json({
      status,
      message,
      metrics: {
        totalLeads,
        hotLeads,
        qualifiedLeads,
        conversionRate: Math.round(conversionRate)
      },
      meta: { role, tenant_id }
    });

  } catch (err) {
    console.error('Funnel health check error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Health check for AI Optimization section
router.get('/ai-optimization-health', async (req, res) => {
  const { role, tenant_id } = req.user || {}; // Get from authenticated user
  
  try {
    // Security check
    if (!tenant_id && role !== 'global_admin') {
      return res.status(403).json({ error: 'No tenant access configured' });
    }

    // Get recent messages to check AI performance
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    let query = supabase
      .from('messages')
      .select('id, timestamp, direction')
      .gte('timestamp', last24Hours)
      .limit(null); // Remove the 1000 row limit - fetch all results

    // Apply tenant filtering
    if (role !== 'global_admin') {
      query = query.eq('tenant_id', tenant_id);
    }

    const { data: recentMessages, error } = await query;

    if (error) {
      console.error('Error fetching AI optimization health:', error);
      return res.status(500).json({ error: 'Failed to fetch AI optimization data' });
    }

    const totalMessages = recentMessages.length;
    const inboundMessages = recentMessages.filter(msg => msg.direction === 'inbound').length;
    const outboundMessages = recentMessages.filter(msg => msg.direction === 'outbound').length;
    
    // Calculate response rate (outbound/inbound ratio)
    const responseRate = inboundMessages > 0 ? (outboundMessages / inboundMessages * 100) : 0;
    
    let status, message;
    
    if (totalMessages === 0) {
      status = 'attention';
      message = 'No messages in last 24h';
    } else if (responseRate >= 80) {
      status = 'healthy';
      message = `${Math.round(responseRate)}% response rate`;
    } else if (responseRate >= 60) {
      status = 'review';
      message = `${Math.round(responseRate)}% response rate`;
    } else {
      status = 'attention';
      message = `${Math.round(responseRate)}% response rate - low`;
    }

    res.json({
      status,
      message,
      metrics: {
        totalMessages,
        inboundMessages,
        outboundMessages,
        responseRate: Math.round(responseRate)
      },
      meta: { role, tenant_id }
    });

  } catch (err) {
    console.error('AI optimization health check error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Health check for System Metrics section
router.get('/system-metrics-health', async (req, res) => {
  const { role, tenant_id } = req.user || {}; // Get from authenticated user
  
  try {
    // Security check
    if (!tenant_id && role !== 'global_admin') {
      return res.status(403).json({ error: 'No tenant access configured' });
    }

    // Check database performance by timing a simple query
    const startTime = Date.now();
    
    let testQuery = supabase
      .from('leads')
      .select('id')
      .limit(1);

    // Apply tenant filtering
    if (role !== 'global_admin') {
      testQuery = testQuery.eq('tenant_id', tenant_id);
    }

    const { data: testQueryData, error } = await testQuery;

    const queryTime = Date.now() - startTime;

    if (error) {
      console.error('Error fetching system metrics health:', error);
      return res.status(500).json({ error: 'Failed to fetch system metrics data' });
    }

    // Get message volume for last hour as system load indicator
    const lastHour = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    let activityQuery = supabase
      .from('messages')
      .select('id')
      .gte('timestamp', lastHour)
      .limit(null); // Remove the 1000 row limit - fetch all results

    // Apply tenant filtering
    if (role !== 'global_admin') {
      activityQuery = activityQuery.eq('tenant_id', tenant_id);
    }

    const { data: recentActivity, error: activityError } = await activityQuery;

    const hourlyVolume = recentActivity?.length || 0;
    
    let status, message;
    
    if (queryTime > 1000) {
      status = 'attention';
      message = `Slow response: ${queryTime}ms`;
    } else if (queryTime > 500) {
      status = 'review';
      message = `Response time: ${queryTime}ms`;
    } else {
      status = 'healthy';
      message = `Fast response: ${queryTime}ms`;
    }

    res.json({
      status,
      message,
      metrics: {
        queryTimeMs: queryTime,
        hourlyVolume,
        systemLoad: hourlyVolume > 100 ? 'high' : hourlyVolume > 50 ? 'medium' : 'low'
      },
      meta: { role, tenant_id }
    });

  } catch (err) {
    console.error('System metrics health check error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;