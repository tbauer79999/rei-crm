// src/api_routes/analyticsRoutes.js
const express = require('express');
// Assuming supabase client and helpers will be exported from server.js eventually
const { supabase, fetchAllRecords } = require('../../server'); 
// const { supabase } = require('../../supabaseClient'); // Adjusted to current supabaseClient path
// Assuming fetchAllRecords will be available from server.js or another helper module.
// For now, this will cause an error if not defined globally or imported differently.
// We will need to define/import fetchAllRecords properly in a later step.

const router = express.Router();

// GET /api/analytics
router.get('/', async (req, res) => {
  try {
    const leads = await fetchAllRecords('properties'); // Changed 'Properties' to 'properties' for consistency
    // Temporary placeholder for fetchAllRecords if it's not directly available
    // const fetchAllRecords = async (table) => {
    //     const { data, error } = await supabase
    //         .from(table)
    //         .select('*');
    //     if (error) {
    //         throw new Error(`Failed to fetch records from ${table}: ${error.message}`);
    //     }
    //     return data;
    // };
    // const leads = await fetchAllRecords('properties'); // Changed 'Properties' to 'properties' for consistency

    const byCampaign = {};
    const byStatus = {};
    const byDate = {};
    const raw = [];
    const statusProgression = {};

    for (const r of leads) {
      // Adjusted to directly access properties of 'r' instead of 'r.fields'
      const campaign = r.campaign || 'Unlabeled';
      const status = r.status || 'Unknown';
      // const created = r.createdTime; // createdTime might not exist, using created_at
      const created = r.created_at;


      byCampaign[campaign] = (byCampaign[campaign] || 0) + 1;
      byStatus[status] = (byStatus[status] || 0) + 1;

      if (created) {
        const dateKey = new Date(created).toISOString().split('T')[0];
        byDate[dateKey] = (byDate[dateKey] || 0) + 1;
      }

      // const history = r.fields?.['Status History'];
      const history = r.status_history; // Adjusted to status_history
      if (history) {
        const lines = history.trim().split('\n');
        for (let i = 1; i < lines.length; i++) {
          const prev = lines[i - 1].split(': ').slice(1).join(': ');
          const curr = lines[i].split(': ').slice(1).join(': ');
          if (prev && curr && prev !== curr) {
            const key = `${prev} → ${curr}`;
            statusProgression[key] = (statusProgression[key] || 0) + 1;
          }
        }
      }

      // const messageIds = r.fields?.Messages || []; // Messages field might not exist directly
      // This part needs to be re-evaluated based on actual data structure for messages relationship
      // For now, assuming messages are not directly fetched here or structure is different.
      let messageRecords = []; // Default to empty
      // Example: if messages were linked by property_id and fetched separately
      // const { data: messagesData, error: messagesError } = await supabase
      // .from('messages')
      // .select('direction, timestamp, body')
      // .eq('property_id', r.id);
      // if (!messagesError && messagesData) {
      //   messageRecords = messagesData.map(msg => ({
      //     direction: msg.direction,
      //     timestamp: msg.timestamp,
      //     body: msg.body || ''
      //   }));
      // }


      raw.push({
        // Campaign: campaign, // Already have campaign
        // Status: status, // Already have status
        // Created: created, // Already have created
        // Messages: messageRecords, // Populated above if logic is added
        ...r, // Spread the rest of the record
        // Ensure not to overwrite campaign, status, created if they are named differently in 'r'
        Campaign: campaign, // Explicitly set from derived value
        Status: status,     // Explicitly set from derived value
        Created: created,   // Explicitly set from derived value
        Messages: messageRecords, // Set from derived value
      });
    }

    res.json({
      totalLeads: leads.length,
      byCampaign,
      byStatus,
      byDate,
      raw,
      statusProgression,
    });
  } catch (err) {
    console.error('Error fetching analytics:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch analytics data' });
  }
});

module.exports = router;
