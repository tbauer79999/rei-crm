const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');

// Load environment variables FIRST before any other imports that use them
dotenv.config();

// Now that env vars are loaded, we can safely import other modules
const { buildInstructionBundle } = require('./src/lib/instructionBuilder');
const multer = require('multer');
const upload = multer();
const pdf = require('pdf-parse');
const { default: fetch } = require('node-fetch');
const { fetchAllRecords, fetchRecordById, fetchSettingValue } = require('./src/lib/supabaseHelpers');
const { supabase } = require('./src/lib/supabaseService');

// Import routers AFTER environment variables are loaded
const leadsRouter = require('./src/api_routes/leadRoutes');
const settingsApiRouter = require('./src/api_routes/settingsApiRoutes');
const knowledgeBaseRouter = require('./src/api_routes/knowledgeBaseRoutes');
const funnelRouter = require('./src/api_routes/funnel');
const onboardingRoute = require('./src/api_routes/onboardingDemo');
const replyPacing = require('./src/api_routes/replyPacing');
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
const phoneNumberRoutes = require('./src/api_routes/phone-numbers');
const campaignsRouter = require('./src/api_routes/campaigns');
const teamRoutes = require('./src/api_routes/team');
const invitationsRoutes = require('./src/api_routes/invitations');
const userRoutes = require('./src/api_routes/user'); // ADD THIS LINE

const app = express();

// Updated CORS configuration to allow your frontend domain
app.use(cors({
  origin: [
    'http://localhost:3000',           // For local development
    'http://localhost:3001',           // Alternative local port
    'https://app.getsurfox.com',       // Your production frontend
    'https://getsurfox.com',           // In case you have this domain too
    'https://www.getsurfox.com'        // With www subdomain
  ],
  credentials: true,                   // Allow cookies/auth headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// ADD THIS LINE RIGHT HERE:
app.options('/api/*', cors()); // Handle preflight requests for all routes

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/api/hot-summary', hotSummaryRoutes);
app.use('/api/leads', leadsRouter);
app.use('/api/settings', settingsApiRouter);
app.use('/api/knowledge', knowledgeBaseRouter);
app.use('/api/funnel', funnelRouter);
app.use('/api/onboarding', onboardingRoute);
app.use('/api/reply-pacing', replyPacing);
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
app.use('/api/phone-numbers', phoneNumberRoutes);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/team', teamRoutes);
app.use('/api/invitations', invitationsRoutes);
app.use('/api/user', userRoutes); // ADD THIS LINE

app.post('/api/settings/instructions', async (req, res) => {
  const { tone, persona, industry, role } = req.body;

  try {
    // Get knowledge base data
    const bundleRes = await fetch(`${process.env.API_URL}/api/knowledge-bundle`);
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
          key: 'aiinstruction_bundle',
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
    console.error('Error saving aiinstruction_bundle to Supabase:', err.message);
    res.status(500).json({ error: 'Failed to save aiinstruction_bundle' });
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

// Run website scraper every 2 minutes
setInterval(() => {
  const { exec } = require('child_process');
  const path = require('path');
  
  // Construct the correct path relative to the current file
  const workerPath = path.join(__dirname, 'workers/scrapeAndEmbedPendingWebsites.js');
  
  exec(`node ${workerPath}`, (error, stdout) => {
    if (error) console.error('Scraper error:', error);
    else console.log('Website scraper ran:', new Date().toISOString());
  });
}, 2 * 60 * 1000); // 2 minutes

// Export shared utilities and Supabase client
module.exports = {
  supabase,
  fetchAllRecords,
  fetchRecordById,
  fetchSettingValue
};