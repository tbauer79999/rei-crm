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
});

const { createClient } = require('@supabase/supabase-js');

app.post('/api/properties/bulk', async (req, res) => {
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
      .from('properties')
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
      .from('properties')
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


app.get('/api/settings', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('platform_settings')
      .select('*');

    if (error) throw error;

    const settings = {};
    for (const row of data) {
      settings[row.key] = {
        value: row.value,
        id: row.id
      };
    }

    res.json(settings);
  } catch (err) {
    console.error('Error fetching settings from Supabase:', err.message);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});



app.post('/api/settings', async (req, res) => {
  const { key, value } = req.body;

  try {
    const { data: existing, error: fetchError } = await supabase
      .from('platform_settings')
      .select('id')
      .eq('key', key.trim().toLowerCase())
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    if (existing) {
      const { error: updateError } = await supabase
        .from('platform_settings')
        .update({ value })
        .eq('id', existing.id);

      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase
        .from('platform_settings')
        .insert({ key: key.trim().toLowerCase(), value });

      if (insertError) throw insertError;
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error saving setting to Supabase:', err.message || err);
    res.status(500).json({ error: 'Failed to save setting' });
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











app.put('/api/settings', async (req, res) => {
  const settings = req.body;

  try {
    const upserts = [];

    for (const [key, setting] of Object.entries(settings)) {
      const value = typeof setting.value === 'boolean' ? String(setting.value) : setting.value;

      upserts.push({ key, value });
    }

    const { error } = await supabase
      .from('platform_settings')
      .upsert(upserts, { onConflict: 'key' });

    if (error) throw error;

    res.status(200).json({ message: 'All settings saved.' });
  } catch (err) {
    console.error('Error saving settings to Supabase:', err.message);
    res.status(500).json({ error: 'Failed to save one or more settings' });
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
