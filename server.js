const express = require('express');
const axios = require('axios'); // Keep for now, might be used by other parts or future work
const dotenv = require('dotenv');
const cors = require('cors');
const { buildInstructionBundle } = require('./src/lib/instructionBuilder'); // Keep, used by settingsApiRoutes indirectly
const multer = require('multer'); // Keep, used by knowledgeBaseRoutes
const upload = multer(); // Keep, used by knowledgeBaseRoutes
const pdf = require('pdf-parse'); // Keep, used by knowledgeBaseRoutes
const { default: fetch } = require('node-fetch'); // Keep, used by settingsApiRoutes and knowledgeBaseRoutes

dotenv.config();
const { supabase } = require('./supabaseClient');

// Import new routers
const propertiesRouter = require('./src/api_routes/propertiesRoutes');
const messagesRouter = require('./src/api_routes/messagesRoutes');
const analyticsRouter = require('./src/api_routes/analyticsRoutes');
const settingsApiRouter = require('./src/api_routes/settingsApiRoutes');
const knowledgeBaseRouter = require('./src/api_routes/knowledgeBaseRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// Helper functions (to be exported)
const fetchAllRecords = async (table) => {
  const { data, error } = await supabase
    .from(table)
    .select('*');

  if (error) {
    throw new Error(`Failed to fetch records from ${table}: ${error.message}`);
  }

  return data;
};

const fetchRecordById = async (table, id) => {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    // Log the error or handle it as per application's needs
    // console.error(`Error in fetchRecordById for table ${table}, id ${id}: ${error.message}`);
    // Rethrow or return null/undefined based on how callers expect to handle it
    throw new Error(`Failed to fetch record from ${table} with id ${id}: ${error.message}`);
  }

  return data;
};

const fetchSettingValue = async (key) => {
  const { data, error } = await supabase
    .from('platform_settings')
    .select('value') // Corrected 'Value' to 'value'
    .eq('key', key)   // Corrected 'Key' to 'key'
    .single();

  if (error) {
    console.error(`Error fetching setting "${key}":`, error.message);
    return ''; // Default value or error handling as appropriate
  }

  return data?.value || ''; // Corrected data.Value to data.value
};

// Authentication Middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer YOUR_JWT_TOKEN

  if (token == null) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  try {
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data || !data.user) {
      console.error('Authentication error:', error);
      return res.status(403).json({ error: 'Forbidden: Invalid or expired token' });
    }

    req.user = data.user;
    next();
  } catch (err) {
    console.error('Token validation error:', err);
    return res.status(403).json({ error: 'Forbidden: Token validation failed' });
  }
};

// Mount new routers with authentication middleware
app.use('/api/properties', authenticateToken, propertiesRouter);
app.use('/api/messages', authenticateToken, messagesRouter);
app.use('/api/analytics', authenticateToken, analyticsRouter);
app.use('/api/settings', authenticateToken, settingsApiRouter);
app.use('/api/knowledge', authenticateToken, knowledgeBaseRouter); // Base path for knowledge routes

// Original root route (remains unprotected for basic server check)
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
