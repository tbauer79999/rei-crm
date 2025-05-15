// settingsRoutes.js
const express = require("express");
const { fetchSettings, updateSettings } = require("./src/lib/airtable.js");

const router = express.Router();

router.get("/api/settings", async (req, res) => {
  try {
    const data = await fetchSettings();
    res.json(data);
  } catch (err) {
    console.error("GET /api/settings error:", err);
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

router.put("/api/settings", async (req, res) => {
  try {
    const updated = await updateSettings(req.body);
    res.json(updated);
  } catch (err) {
    console.error("PUT /api/settings error:", err);
    res.status(500).json({ error: "Failed to update settings" });
  }
});

module.exports = router;
