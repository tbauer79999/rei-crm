const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

const AIRTABLE_API_TOKEN = process.env.AIRTABLE_API_TOKEN;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_BASE_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`;

const fetchAllRecords = async (table, view = 'Grid view') => {
  let records = [];
  let offset = null;

  do {
    let url = `${AIRTABLE_BASE_URL}/${table}?view=${view}`;
    if (offset) url += `&offset=${offset}`;

    const res = await axios.get(url, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_TOKEN}` },
    });

    records = records.concat(res.data.records);
    offset = res.data.offset;
  } while (offset);

  return records;
};

const fetchRecordById = async (table, id) => {
  const url = `${AIRTABLE_BASE_URL}/${table}/${id}`;
  const res = await axios.get(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_API_TOKEN}` },
  });
  return res.data;
};

const fetchSettingValue = async (key) => {
  const url = `${AIRTABLE_BASE_URL}/PlatformSettings?filterByFormula={Key}='${key}'`;
  const res = await axios.get(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_API_TOKEN}` },
  });
  const record = res.data.records[0];
  return record?.fields?.Value || '';
};

app.get('/api/properties', async (req, res) => {
  try {
    const records = await fetchAllRecords('Properties');
    res.json(records);
  } catch (err) {
    console.error('Error fetching properties:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch properties' });
  }
});

app.get('/api/properties/:id', async (req, res) => {
  try {
    const record = await fetchRecordById('Properties', req.params.id);
    res.json(record);
  } catch (err) {
    console.error('Error fetching property by ID:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch property' });
  }
});

app.patch('/api/properties/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const id = req.params.id;
    const today = new Date().toISOString().split('T')[0];

    const existing = await fetchRecordById('Properties', id);
    const oldStatus = existing.fields?.Status || '';
    const history = existing.fields?.['Status History'] || '';

    let updatedHistory = history;
    if (status && status !== oldStatus) {
      const newLine = `${today}: ${status}`;
      updatedHistory = history ? `${history}\n${newLine}` : newLine;
    }

    const url = `${AIRTABLE_BASE_URL}/Properties/${id}`;
    const resUpdate = await axios.patch(
      url,
      {
        fields: {
          Status: status,
          'Status History': updatedHistory,
        },
      },
      {
        headers: { Authorization: `Bearer ${AIRTABLE_API_TOKEN}` },
      }
    );

    res.json(resUpdate.data);
  } catch (err) {
    console.error('Error updating status:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

app.get('/api/messages', async (req, res) => {
  try {
    const records = await fetchAllRecords('Messages');
    res.json(records);
  } catch (err) {
    console.error('Error fetching messages:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

app.get('/api/messages/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const formula = `{Property ID} = '${id}'`;

    const url = `${AIRTABLE_BASE_URL}/Messages?filterByFormula=${encodeURIComponent(formula)}`;
    const resAirtable = await axios.get(url, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_TOKEN}` },
    });

    res.json(resAirtable.data.records);
  } catch (err) {
    console.error('Error fetching messages:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

app.get('/api/analytics', async (req, res) => {
  try {
    const leads = await fetchAllRecords('Properties');

    const byCampaign = {};
    const byStatus = {};
    const byDate = {};
    const raw = [];
    const statusProgression = {};

    for (const r of leads) {
      const campaign = r.fields?.Campaign || 'Unlabeled';
      const status = r.fields?.Status || 'Unknown';
      const created = r.createdTime;

      byCampaign[campaign] = (byCampaign[campaign] || 0) + 1;
      byStatus[status] = (byStatus[status] || 0) + 1;

      if (created) {
        const dateKey = new Date(created).toISOString().split('T')[0];
        byDate[dateKey] = (byDate[dateKey] || 0) + 1;
      }

      const history = r.fields?.['Status History'];
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

      const messageRecords = [];
      const messageIds = r.fields?.Messages || [];

      for (const id of messageIds) {
        try {
          const url = `${AIRTABLE_BASE_URL}/Messages/${id}`;
          const resMsg = await axios.get(url, {
            headers: { Authorization: `Bearer ${AIRTABLE_API_TOKEN}` }
          });

          const msg = resMsg.data?.fields;
          if (msg) {
            messageRecords.push({
              direction: msg.Direction,
              timestamp: msg.Timestamp,
              body: msg.Body || ''
            });
          }
        } catch (e) {
          console.warn(`Failed to fetch message ${id}:`, e.message);
        }
      }

      raw.push({
        Campaign: campaign,
        Status: status,
        Created: created,
        Messages: messageRecords,
        ...r.fields,
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

app.post('/api/properties/bulk', async (req, res) => {
  try {
    const records = req.body.records;

    const rawCampaigns = await fetchSettingValue('Campaigns');
    const allowedCampaigns = rawCampaigns.split('\n').map(s => s.trim()).filter(Boolean);

    const validRecords = records.filter(r =>
      r.fields["Owner Name"] &&
      r.fields["Property Address"] &&
      r.fields["Campaign"]
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

    const existing = await fetchAllRecords('Properties');
    const existingSet = new Set(
      existing.map(e =>
        `${e.fields["Owner Name"]?.toLowerCase().trim()}|${e.fields["Property Address"]?.toLowerCase().trim()}`
      )
    );

    const deduplicated = validRecords.filter(r => {
      const key = `${r.fields["Owner Name"].toLowerCase().trim()}|${r.fields["Property Address"].toLowerCase().trim()}`;
      return !existingSet.has(key);
    });

    const uploaded = records.length;
    const skipped = uploaded - deduplicated.length;

    if (deduplicated.length === 0) {
      return res.status(409).json({
        error: 'All records are duplicates or missing required fields.',
        uploaded,
        skipped,
        added: 0
      });
    }

    const enrichedRecords = deduplicated.map(r => {
      const status = r.fields.Status || 'New Lead';
      const today = new Date().toISOString().split('T')[0];
      const historyLine = `${today}: ${status}`;
      return {
        fields: {
          ...r.fields,
          "Status": status,
          "Status History": historyLine
        }
      };
    });

    const url = `${AIRTABLE_BASE_URL}/Properties`;
    const response = await axios.post(url, { records: enrichedRecords }, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_TOKEN}` }
    });

    const added = response.data.records?.length || 0;

    res.json({
      message: 'Upload successful',
      uploaded,
      skipped,
      added
    });
  } catch (err) {
    console.error('Bulk upload failed:', err.response?.data || err.message);
    res.status(500).json({ error: 'Bulk upload failed' });
  }
});

app.get('/api/settings', async (req, res) => {
  try {
    const records = await fetchAllRecords('PlatformSettings');
    const settings = {};

    records.forEach(record => {
      const key = record.fields.Key;
      const value = record.fields.Value;
      settings[key] = { value, id: record.id };
    });

    res.json(settings);
  } catch (err) {
    console.error('Error fetching settings:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

app.post('/api/settings', async (req, res) => {
  const { key, value } = req.body;
  const headers = {
    Authorization: `Bearer ${AIRTABLE_API_TOKEN}`,
    'Content-Type': 'application/json'
  };

  try {
    const formula = `LOWER(TRIM({Key})) = "${key.toLowerCase().trim()}"`;
    const lookupUrl = `${AIRTABLE_BASE_URL}/PlatformSettings?filterByFormula=${encodeURIComponent(formula)}`;
    const existing = await axios.get(lookupUrl, { headers });

    const payload = { fields: { Key: key, Value: value } };

    if (existing.data.records.length > 0) {
      const existingId = existing.data.records[0].id;
      await axios.patch(`${AIRTABLE_BASE_URL}/PlatformSettings/${existingId}`, payload, { headers });
    } else {
      await axios.post(`${AIRTABLE_BASE_URL}/PlatformSettings`, payload, { headers });
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error saving setting:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to save setting' });
  }
});


app.put('/api/settings', async (req, res) => {
  const settings = req.body;
  const headers = {
    Authorization: `Bearer ${AIRTABLE_API_TOKEN}`,
    'Content-Type': 'application/json',
  };

  try {
    for (const [key, setting] of Object.entries(settings)) {
      const value = typeof setting.value === 'boolean' ? String(setting.value) : setting.value;

      const escapedKey = key.replace(/"/g, '\\"');
      const formula = `LOWER(TRIM({Key})) = "${escapedKey.toLowerCase().trim()}"`;
      const lookupUrl = `${AIRTABLE_BASE_URL}/PlatformSettings?filterByFormula=${encodeURIComponent(formula)}`;
      const existing = await axios.get(lookupUrl, { headers });

      const payload = { fields: { Key: key, Value: value } };

      if (existing.data.records.length > 0) {
        const existingId = existing.data.records[0].id;
        await axios.patch(`${AIRTABLE_BASE_URL}/PlatformSettings/${existingId}`, payload, { headers });
      } else {
        await axios.post(`${AIRTABLE_BASE_URL}/PlatformSettings`, payload, { headers });
      }
    }

    res.status(200).json({ message: 'All settings saved.' });
  } catch (err) {
    console.error('Error saving setting:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to save one or more settings' });
  }
});

app.get('/', (req, res) => {
  res.send('REI-CRM server running.');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
