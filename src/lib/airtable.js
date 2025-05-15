// airtable.js
const axios = require('axios');
require('dotenv').config();

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_PLATFORM_SETTINGS_TABLE = 'PlatformSettings';

const airtable = axios.create({
  baseURL: `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`,
  headers: {
    Authorization: `Bearer ${AIRTABLE_API_KEY}`,
    'Content-Type': 'application/json',
  },
});

const fetchPlatformSettings = async () => {
  const res = await airtable.get(`/${AIRTABLE_PLATFORM_SETTINGS_TABLE}`);
  const settings = {};

  res.data.records.forEach((record) => {
    const key = record.fields.Key;
    const value = record.fields.Value;
    settings[key] = { value, id: record.id };
  });

  return settings;
};

const updatePlatformSetting = async (id, value) => {
  const res = await airtable.patch(`/${AIRTABLE_PLATFORM_SETTINGS_TABLE}`, {
    records: [
      {
        id,
        fields: { Value: value },
      },
    ],
  });
  return res.data.records[0];
};

module.exports = {
  fetchPlatformSettings,
  updatePlatformSetting,
};
