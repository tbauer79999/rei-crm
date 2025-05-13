const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const AIRTABLE_BASE_URL = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}`;
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;

const fetchAllRecords = async (table, view = 'Grid view') => {
  let records = [];
  let offset = null;

  do {
    let url = `${AIRTABLE_BASE_URL}/${table}?view=${view}`;
    if (offset) url += `&offset=${offset}`;

    const res = await axios.get(url, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    });

    records = records.concat(res.data.records);
    offset = res.data.offset;
  } while (offset);

  return records;
};

const fetchRecordById = async (table, id) => {
  const url = `${AIRTABLE_BASE_URL}/${table}/${id}`;
  const res = await axios.get(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
  });
  return res.data;
};

app.get('/api/properties', async (req, res) => {
  try {
    const records = await fetchAllRecords('Properties', 'Grid view');
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
        headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
      }
    );

    res.json(resUpdate.data);
  } catch (err) {
    console.error('Error updating status:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

app.get('/api/messages/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const url = `${AIRTABLE_BASE_URL}/Messages?filterByFormula=${encodeURIComponent(`{Property} = '${id}'`)}`;
    const resAirtable = await axios.get(url, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    });
    res.json(resAirtable.data.records);
  } catch (err) {
    console.error('Error fetching messages:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

app.get('/api/analytics', async (req, res) => {
  try {
    const leads = await fetchAllRecords('Properties', 'Grid view');

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

      // ✅ NEW: Expand message IDs manually
      const messageRecords = [];
      const messageIds = r.fields?.Messages || [];

      for (const id of messageIds) {
        try {
          const url = `${AIRTABLE_BASE_URL}/Messages/${id}`;
          const resMsg = await axios.get(url, {
            headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` }
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

    const existing = await fetchAllRecords('Properties', 'Grid view');
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
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` }
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

app.get('/', (req, res) => {
  res.send('REI-CRM server running.');
});

// [ALL YOUR ORIGINAL WORKING CODE GOES HERE — OMITTED FOR SPACE]

// -----------------------------
// Settings Routes
// -----------------------------

app.get('/api/settings', async (req, res) => {
  try {
    const records = await fetchAllRecords('PlatformSettings', 'Grid view');
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

app.put('/api/settings/:key', async (req, res) => {
  const { key } = req.params;
  const { value } = req.body;

  try {
    const searchUrl = `${AIRTABLE_BASE_URL}/PlatformSettings?filterByFormula={Key}='${key}'`;
    const searchRes = await axios.get(searchUrl, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    });

    const existing = searchRes.data.records[0];

    if (existing) {
      const updateUrl = `${AIRTABLE_BASE_URL}/PlatformSettings`;
      await axios.patch(updateUrl,
        {
          records: [
            {
              id: existing.id,
              fields: { Value: value },
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${AIRTABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );
    } else {
      const createUrl = `${AIRTABLE_BASE_URL}/PlatformSettings`;
      await axios.post(createUrl,
        {
          fields: {
            Key: key,
            Value: value,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${AIRTABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    res.status(200).json({ message: 'Setting saved.' });
  } catch (err) {
    console.error('Error saving setting:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to save setting' });
  }
});

// ✅ Your app.listen must remain the final line:
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
