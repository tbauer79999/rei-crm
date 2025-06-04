// src/api_routes/lead-trends.js
const express = require('express');
const router = express.Router();
const { supabase } = require('../lib/supabaseService');
const { addUserProfile, filterByTenant } = require('../lib/authMiddleware');

// Apply security middleware
router.use(addUserProfile);
router.use(filterByTenant);

// Get lead upload/creation trends
router.get('/', async (req, res) => {
  const { days = 30 } = req.query; // Remove tenant_id from query - get from authenticated user
  const { role, tenant_id } = req.user || {}; // Get from authenticated user
  
  try {
    console.log('=== LEAD TRENDS ENDPOINT ===');
    console.log('user role:', role);
    console.log('user tenant_id:', tenant_id);
    console.log('days:', days);

    // Security check
    if (!tenant_id && role !== 'global_admin') {
      return res.status(403).json({ error: 'No tenant access configured' });
    }

    // Calculate date range
    const daysAgo = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000).toISOString();

    // Build query based on role
    let query = supabase
      .from('leads')
      .select('created_at')
      .gte('created_at', daysAgo)
      .order('created_at', { ascending: true });

    // Apply tenant filtering
    if (role !== 'global_admin') {
      query = query.eq('tenant_id', tenant_id);
    }

    const { data: trendData, error: trendError } = await query;

    if (trendError) {
      console.error('Error fetching trend data:', trendError);
      throw trendError;
    }

    console.log('Found leads for trends:', trendData?.length || 0);

    // Group by date
    const dateGroups = {};
    trendData.forEach(lead => {
      const date = new Date(lead.created_at).toISOString().split('T')[0]; // YYYY-MM-DD
      dateGroups[date] = (dateGroups[date] || 0) + 1;
    });

    // Create array with all dates in range (including zeros)
    const trends = [];
    const startDate = new Date(daysAgo);
    const endDate = new Date();
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      trends.push({
        date: dateStr,
        leads: dateGroups[dateStr] || 0
      });
    }

    console.log('Trend data points:', trends.length);

    res.json({
      trends,
      totalPeriod: trendData.length,
      periodDays: parseInt(days),
      meta: { role, tenant_id, leads_count: trendData.length }
    });

  } catch (err) {
    console.error('Lead Trends error:', err.message);
    res.status(500).json({ error: 'Failed to fetch lead trends data' });
  }
});

module.exports = router;