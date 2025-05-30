// src/api_routes/funnel-analytics.js
const express = require('express');
const router = express.Router();
const { supabase } = require('../lib/supabaseService');

// Get lead journey funnel data
router.get('/', async (req, res) => {
  const { tenant_id, days = 30 } = req.query;
  
  try {
    console.log('=== LEAD JOURNEY ENDPOINT ===');
    console.log('tenant_id:', tenant_id);
    console.log('days:', days);

    // Get all leads for this tenant
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('id, status, status_history, created_at, campaign')
      .eq('tenant_id', tenant_id);

    if (leadsError) {
      console.error('Error fetching leads:', leadsError);
      throw leadsError;
    }

    console.log('Found leads:', leads?.length || 0);

    // 1. Calculate status distribution
    const statusCounts = {};
    leads.forEach(lead => {
      const status = lead.status || 'Unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    const statusDistribution = Object.entries(statusCounts).map(([name, value]) => ({
      name,
      value
    }));

    // 2. Calculate funnel progression
    // Define funnel stages in order
    const funnelStages = [
      { key: 'uploaded', name: 'Uploaded', statuses: ['New Lead', 'Cold Lead', 'Warm Lead', 'Engaging', 'Responding', 'Hot Lead'] },
      { key: 'engaged', name: 'Engaged', statuses: ['Engaging', 'Responding', 'Hot Lead'] },
      { key: 'responding', name: 'Responding', statuses: ['Responding', 'Hot Lead'] },
      { key: 'hot', name: 'Hot', statuses: ['Hot Lead'] }
    ];

    const funnelData = funnelStages.map(stage => {
      const count = leads.filter(lead => 
        stage.statuses.includes(lead.status)
      ).length;
      
      return {
        stage: stage.name,
        count
      };
    });

    // 3. Parse status transitions from status_history
    const transitions = {};
    
    leads.forEach(lead => {
      if (lead.status_history) {
        // Parse the status history: "2025-05-20: New Lead\n2025-05-21: Warm Lead\n2025-05-22: Hot Lead"
        const historyLines = lead.status_history.split('\\n').filter(line => line.trim());
        
        for (let i = 0; i < historyLines.length - 1; i++) {
          const currentLine = historyLines[i].trim();
          const nextLine = historyLines[i + 1].trim();
          
          // Extract status from "YYYY-MM-DD: Status Name"
          const currentStatus = currentLine.split(': ')[1];
          const nextStatus = nextLine.split(': ')[1];
          
          if (currentStatus && nextStatus) {
            const transitionKey = `${currentStatus} → ${nextStatus}`;
            transitions[transitionKey] = (transitions[transitionKey] || 0) + 1;
          }
        }
      }
    });

    const transitionData = Object.entries(transitions)
      .map(([transition, count]) => {
        const totalLeads = leads.length;
        const percent = totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0;
        return {
          transition,
          count,
          percent: `${percent}%`
        };
      })
      .sort((a, b) => b.count - a.count) // Sort by count descending
      .slice(0, 10); // Top 10 transitions

    console.log('Status distribution:', statusDistribution);
    console.log('Funnel data:', funnelData);
    console.log('Transition data:', transitionData);

    res.json({
      statusDistribution,
      funnelData,
      transitionData,
      totalLeads: leads.length
    });

  } catch (err) {
    console.error('Lead Journey error:', err.message);
    res.status(500).json({ error: 'Failed to fetch lead journey data' });
  }
});

module.exports = router;