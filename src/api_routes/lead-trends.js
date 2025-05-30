// src/api_routes/lead-trends.js
const express = require('express');
const router = express.Router();
const { supabase } = require('../lib/supabaseService');

// Get lead upload/creation trends
router.get('/', async (req, res) => {
  const { tenant_id, days = 30 } = req.query;
  
  try {
    console.log('=== LEAD TRENDS ENDPOINT ===');
    console.log('tenant_id:', tenant_id);
    console.log('days:', days);

    // Calculate date range
    const daysAgo = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000).toISOString();

    // Get lead creation trends
    const { data: trendData, error: trendError } = await supabase
      .from('leads')
      .select('created_at')
      .eq('tenant_id', tenant_id)
      .gte('created_at', daysAgo)
      .order('created_at', { ascending: true });

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
      periodDays: parseInt(days)
    });

  } catch (err) {
    console.error('Lead Trends error:', err.message);
    res.status(500).json({ error: 'Failed to fetch lead trends data' });
  }
});

module.exports = router;