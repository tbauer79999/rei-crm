const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const { buildInstructionBundle } = require('./src/lib/instructionBuilder'); // Keep, used by settingsApiRoutes indirectly
const multer = require('multer'); // Keep, used by knowledgeBaseRoutes
const upload = multer(); // Keep, used by knowledgeBaseRoutes
const pdf = require('pdf-parse'); // Keep, used by knowledgeBaseRoutes
const { default: fetch } = require('node-fetch'); // Keep, used by settingsApiRoutes and knowledgeBaseRoutes
const { fetchAllRecords, fetchRecordById, fetchSettingValue } = require('./src/lib/supabaseHelpers');

dotenv.config();
const { supabase } = require('./src/lib/supabaseService'); // ✅


// Import new routers
const leadsRouter = require('./src/api_routes/leadRoutes');
const analyticsRoute = require('./src/api_routes/analyticsRoutes');
const settingsApiRouter = require('./src/api_routes/settingsApiRoutes');
const knowledgeBaseRouter = require('./src/api_routes/knowledgeBaseRoutes');
const funnelRouter = require('./src/api_routes/funnel');
const onboardingRoute = require('./src/api_routes/onboardingDemo');
const messageQuality = require('./src/api_routes/messageQuality');
const weeklyMomentum = require('./src/api_routes/weeklyMomentum');
const responseTime = require('./src/api_routes/responseTime');
const replyPacing = require('./src/api_routes/replyPacing');
const escalationStats = require('./src/api_routes/escalationStats');
const leadConversionSpeed = require('./src/api_routes/leadConversionSpeed');
const conversationFlow = require('./src/api_routes/conversationFlowSparklineCard');
const failureRate = require('./src/api_routes/failureRate');
const aiVsHuman = require('./src/api_routes/aiVsHumanToggleCard');
const aiEfficiency = require('./src/api_routes/aiEfficiencyCard');
const hotSummaryRoutes = require('./src/api_routes/hot-summary');
const keywordsRoute = require('./src/api_routes/keywords');
const messagesRoute = require('./src/api_routes/messages');
const hotRoutes = require('./src/api_routes/hot');
const overviewRouter = require('./src/api_routes/overview');
const callLoggingRoutes = require('./src/api_routes/call-logging');
const funnelAnalyticsRoutes = require('./src/api_routes/funnel-analytics');
const leadTrendsRoutes = require('./src/api_routes/lead-trends');
const healthRoutes = require('./src/api_routes/health');
const enterpriseAnalyticsRoutes = require('./src/api_routes/enterprise-analytics');
const companyResearchRoutes = require('./src/api_routes/companyResearchRoutes');
//const experimentsRoutes = require('./src/api_routes/experiments');
const phoneNumberRoutes = require('./src/api_routes/phone-numbers'); // ✅ Correct path

const app = express();




app.use(cors());
app.use(express.json());
app.use('/api/hot-summary', hotSummaryRoutes);
app.use('/api/leads', leadsRouter);
app.use('/api/analytics', analyticsRoute);
app.use('/api/settings', settingsApiRouter);
app.use('/api/knowledge', knowledgeBaseRouter);
app.use('/api/funnel', funnelRouter);
app.use('/api/onboarding', onboardingRoute);
app.use('/api/message-quality', messageQuality);
app.use('/api/weekly-momentum', weeklyMomentum);
app.use('/api/response-time', responseTime);
app.use('/api/escalation-stats', escalationStats);
app.use('/api/reply-pacing', replyPacing);
app.use('/api/ai-efficiency', aiEfficiency);
app.use('/api/ai-vs-human', aiVsHuman);
app.use('/api/failure-rate', failureRate);
app.use('/api/conversation-flow', conversationFlow);
app.use('/api/lead-conversion-speed', leadConversionSpeed);
app.use('/api/keywords', keywordsRoute);
app.use('/api/messages', messagesRoute);
app.use('/api/hot', hotRoutes);
app.use('/api/overview', overviewRouter);
app.use('/api/call-logging', callLoggingRoutes);
app.use('/api/funnel-analytics', funnelAnalyticsRoutes);
app.use('/api/lead-trends', leadTrendsRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/enterprise-analytics', enterpriseAnalyticsRoutes);
app.use('/api/research-company', companyResearchRoutes);
//app.use('/api/experiments', authenticateToken, experimentsRoutes);
app.use('/api/phone-numbers', phoneNumberRoutes);

app.post('/api/leads/bulk', async (req, res) => {
  try {
    const records = req.body.records || [];

    // Pull allowed campaign values from Supabase settings
    const { data: settingsData, error: settingsError } = await supabase
      .from('platform_settings')
      .select('*')
      .eq('key', 'Campaigns')
      .single();

    if (settingsError || !settingsData?.value) {
      throw new Error('Failed to retrieve allowed campaigns');
    }

    const allowedCampaigns = settingsData.value
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);

    const validRecords = records.filter(r =>
      r.fields?.["Owner Name"] &&
      r.fields?.["Property Address"] &&
      r.fields?.["Campaign"]
    );

    if (validRecords.length === 0) {
      return res.status(400).json({
        error: 'No valid records with Campaign provided.',
        uploaded: records.length,
        skipped: records.length,
        added: 0
      });
    }

    const invalidCampaigns = validRecords.filter(r =>
      !allowedCampaigns.includes(r.fields["Campaign"])
    );

    if (invalidCampaigns.length > 0) {
      return res.status(422).json({
        error: 'One or more records use invalid Campaign values.',
        allowedCampaigns,
        uploaded: records.length,
        skipped: records.length,
        added: 0
      });
    }

    // Fetch existing leads for deduplication
    const { data: existingData, error: existingError } = await supabase
      .from('leads')
      .select('owner_name, property_address');

    if (existingError) {
      throw existingError;
    }

    const existingSet = new Set(
      existingData.map(e =>
        `${e.owner_name?.toLowerCase().trim()}|${e.property_address?.toLowerCase().trim()}`
      )
    );

    const deduplicated = validRecords.filter(r => {
      const key = `${r.fields["Owner Name"].toLowerCase().trim()}|${r.fields["Property Address"].toLowerCase().trim()}`;
      return !existingSet.has(key);
    });

    const enrichedRecords = deduplicated.map(r => {
      const f = r.fields;
      const today = new Date().toISOString().split('T')[0];
      return {
        owner_name: f["Owner Name"],
        property_address: f["Property Address"],
        city: f.City || '',
        state: f.State || '',
        zip_code: f["Zip Code"] || '',
        phone: f.Phone || '',
        email: f.Email || '',
        bedrooms: f.Bedrooms || '',
        bathrooms: f.Bathrooms || '',
        square_footage: f["Square Footage"] || '',
        notes: f.Notes || '',
        campaign: f.Campaign,
        status: f.Status || 'New Lead',
        status_history: `${today}: ${f.Status || 'New Lead'}`
      };
    });

    if (enrichedRecords.length === 0) {
      return res.status(409).json({
        error: 'All records are duplicates or missing required fields.',
        uploaded: records.length,
        skipped: records.length,
        added: 0
      });
    }

    const { error: insertError } = await supabase
      .from('leads')
      .insert(enrichedRecords);

    if (insertError) {
      throw insertError;
    }

    res.status(200).json({
      message: 'Upload successful',
      uploaded: records.length,
      skipped: records.length - enrichedRecords.length,
      added: enrichedRecords.length
    });
  } catch (err) {
    console.error('Bulk upload failed:', err.message);
    res.status(500).json({ error: 'Bulk upload failed' });
  }
});








app.post('/api/settings/instructions', async (req, res) => {
  const { tone, persona, industry, role } = req.body;

  try {
    // Get knowledge base data
    const bundleRes = await fetch('http://localhost:5000/api/knowledge-bundle');
    const { bundle: knowledgeBlock } = await bundleRes.json();

    // Generate final instruction bundle
    const finalBundle = buildInstructionBundle({
      tone,
      persona,
      industry,
      role,
      knowledgeBlock
    });

    // ✅ Upsert (create or update) with unique `key`
    const { error } = await supabase
      .from('platform_settings')
      .upsert(
        [{
          key: 'aiInstruction_bundle',
          value: finalBundle,
          updated_at: new Date().toISOString()
        }],
        {
          onConflict: 'key', // ensure this field is unique in Supabase
          ignoreDuplicates: false
        }
      );

    if (error) throw error;

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error saving aiInstruction_bundle to Supabase:', err.message);
    res.status(500).json({ error: 'Failed to save aiInstruction_bundle' });
  }
});














app.post('/api/knowledge-upload', async (req, res) => {
  try {
    const { title = '', description = '', file_url, file_name } = req.body;

    if (!file_url || !file_name) {
      return res.status(400).json({ error: 'Missing file_url or file_name' });
    }

    // Download and parse the PDF
    const response = await fetch(file_url);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
console.log('✅ Buffer length:', buffer.length); // Should be > 0
    // Extract text
    const data = await pdf(buffer);
    const extractedText = data?.text?.trim() || '';

    // Save to Supabase
    const { data: inserted, error } = await supabase
      .from('knowledge_base')
      .insert([
        {
          title,
          description,
          file_url,
          file_name,
          content: extractedText.slice(0, 100000) // limit if needed
        }
      ]);

    if (error) throw error;

    res.status(200).json({ success: true, record: inserted?.[0] });
  } catch (err) {
    console.error('Supabase upload failed:', err.message);
    res.status(500).json({ error: 'Failed to upload knowledge file' });
  }
});




app.get('/api/knowledge-docs', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('knowledge_base')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.status(200).json(data);
  } catch (err) {
    console.error('Error fetching knowledge docs:', err.message);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});


app.get('/api/knowledge-docs/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const record = await fetchRecordById('knowledge_base', id);
    res.status(200).json(record);
  } catch (err) {
    console.error('Error fetching document by ID:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

app.delete('/api/knowledge-docs/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { error } = await supabase
      .from('knowledge_base')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error deleting document:', err.message);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});


app.get('/api/knowledge-bundle', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('knowledge_base')
      .select('title, content')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const bundle = data
      .map((doc) => `📄 ${doc.title || 'Untitled'}\n\n${doc.content || ''}`)
      .join('\n\n');

    res.status(200).json({ bundle });
  } catch (err) {
    console.error('Error generating knowledge bundle:', err.message);
    res.status(500).json({ error: 'Failed to generate bundle' });
  }
});








app.get('/', (req, res) => {
  res.send('REI-CRM server running.');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// Export shared utilities and Supabase client
module.exports = {
  supabase,
  fetchAllRecords,
  fetchRecordById,
  fetchSettingValue
  // Do not export authenticateToken as it's only used internally in server.js
};
