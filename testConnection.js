require('dotenv').config();
const axios = require('axios');

const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;

const test = async () => {
  try {
    const response = await axios.get(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`, {
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('✅ SUCCESS — Connected to Airtable base.');
    console.log('Tables:', response.data);
  } catch (error) {
    console.error('❌ FAILED — Could not connect to Airtable.');
    console.error('Status:', error.response?.status);
    console.error('Message:', error.response?.data?.error?.message);
  }
};

test();
