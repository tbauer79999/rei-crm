const axios = require('axios');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_EMBED_MODEL = 'text-embedding-3-small'; // or text-embedding-ada-002

async function createEmbedding(inputText) {
  if (!OPENAI_API_KEY) throw new Error('Missing OPENAI_API_KEY in environment');

  const response = await axios.post(
    'https://api.openai.com/v1/embeddings',
    {
      input: inputText,
      model: OPENAI_EMBED_MODEL
    },
    {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return response.data.data[0].embedding;
}

module.exports = {
  createEmbedding
};
