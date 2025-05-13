const Airtable = require('airtable');
require('dotenv').config();

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

base('Properties').select().firstPage((err, records) => {
  if (err) {
    console.error('❌ Airtable error:', err);
  } else {
    console.log('✅ Token works. First record:', records[0]?.fields);
  }
});
