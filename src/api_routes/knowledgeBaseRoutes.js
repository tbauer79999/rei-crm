// src/api_routes/knowledgeBaseRoutes.js
const express = require('express');
const multer = require('multer');
const pdf = require('pdf-parse');
const fetch = require('node-fetch'); // Kept as node-fetch, consistent with server.js top-level import
const { supabase, fetchRecordById } = require('../../server'); // Import from server.js

// Placeholder for helper functions that will eventually be imported from server.js
// const { fetchRecordById } = require('../../server'); // Keep for reference

const router = express.Router();
const upload = multer(); // For handling multipart/form-data, though not explicitly used in POST /api/knowledge-upload for file data

// POST /api/knowledge-upload
router.post('/upload', async (req, res) => {
  try {
    const { title = '', description = '', file_url, file_name } = req.body;

    if (!file_url || !file_name) {
      return res.status(400).json({ error: 'Missing file_url or file_name' });
    }

    const response = await fetch(file_url);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // console.log('✅ Buffer length:', buffer.length); // Keep for debugging if necessary

    const data = await pdf(buffer);
    const extractedText = data?.text?.trim() || '';

    const { data: inserted, error } = await supabase
      .from('knowledge_base')
      .insert([
        {
          title,
          description,
          file_url,
          file_name,
          content: extractedText.slice(0, 100000) // Limit content size if needed
        }
      ])
      .select(); // Ensure the inserted record is returned

    if (error) throw error;

    res.status(200).json({ success: true, record: inserted?.[0] });
  } catch (err) {
    console.error('Supabase upload failed:', err.message);
    res.status(500).json({ error: 'Failed to upload knowledge file' });
  }
});

// GET /api/knowledge-docs
router.get('/docs', async (req, res) => {
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

// GET /api/knowledge-docs/:id
router.get('/docs/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const record = await fetchRecordById('knowledge_base', id); // Using imported function
    // Direct implementation until fetchRecordById is available:
    // const { data: record, error } = await supabase
    //     .from('knowledge_base')
    //     .select('*')
    //     .eq('id', id)
    //     .single();
    // if (error) throw error;
    
    res.status(200).json(record);
  } catch (err) {
    // console.error('Error fetching document by ID:', err.response?.data || err.message);
    console.error('Error fetching document by ID:', err.message); // Log the actual error message
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

// DELETE /api/knowledge-docs/:id
router.delete('/docs/:id', async (req, res) => {
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

// GET /api/knowledge-bundle
const { generateKnowledgeBundleString } = require('../lib/knowledgeService'); // Import the new service

router.get('/bundle', async (req, res) => {
  try {
    const bundleString = await generateKnowledgeBundleString();
    res.status(200).json({ bundle: bundleString });
  } catch (err) {
    // The error is already logged in generateKnowledgeBundleString
    res.status(500).json({ error: 'Failed to generate knowledge bundle' });
  }
});

module.exports = router;
