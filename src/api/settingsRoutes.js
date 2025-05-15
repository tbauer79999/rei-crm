// settingsRoutes.js
require('dotenv').config();

const express = require('express');
const router = express.Router();
const { fetchSettings, updateSettings } = require('./src/lib/airtable');

// GET the single Settings record
router.get('/api/settings', async (req, res) => {
  try {
    const settings = await fetchSettings();
    res.json(settings);
  } catch (err) {
    console.error('GET /api/settings failed:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// PATCH the single Settings record
router.patch('/api/settings', async (req, res) => {
  try {
    const updated = await updateSettings(req.body);
    res.json(updated);
  } catch (err) {
    console.error('PATCH /api/settings failed:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

module.exports = router;
