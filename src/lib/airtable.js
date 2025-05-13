import axios from 'axios';

const AIRTABLE_BASE_ID = 'appAfzlWKGj7n5GQq';
const AIRTABLE_TABLE_NAME = 'Properties';
const AIRTABLE_TOKEN = 'patPCJM4dODcNTfHo.bd282027696b77f5280682e4df8f223c94de8dfaf4a014bf83e683f8df93ea67'; // <-- replace this

const airtable = axios.create({
  baseURL: `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`,
  headers: {
    Authorization: `Bearer ${AIRTABLE_TOKEN}`,
  },
});

export const fetchProperties = async () => {
  const res = await airtable.get(`/${AIRTABLE_TABLE_NAME}`);
  return res.data.records;
};
