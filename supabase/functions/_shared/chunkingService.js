const { createEmbedding } = require('./openai');

/**
 * Chunk content and generate embeddings for each chunk.
 * @param {object} params
 * @param {string} params.content - Full text content to embed
 * @param {string} params.tenantId
 * @param {string} params.knowledgeBaseId
 * @param {string} params.sourceTitle
 * @returns {Promise<Array<{ chunk_index: number, chunk_text: string, embedding: number[], tenant_id: string, knowledge_base_id: string, source_title: string }>>}
 */
async function createEmbeddingChunks({ content, tenantId, knowledgeBaseId, sourceTitle }) {
  const CHUNK_SIZE = 1000;
  const chunks = [];

  for (let i = 0; i < content.length; i += CHUNK_SIZE) {
    const chunk = content.slice(i, i + CHUNK_SIZE).trim();
    if (!chunk) continue;

    const embedding = await createEmbedding(chunk);

    if (!embedding || !Array.isArray(embedding)) {
      throw new Error(`❌ Embedding failed or returned invalid data for chunk index ${chunks.length}`);
    }

    chunks.push({
      chunk_index: chunks.length,
      chunk_text: chunk,
      embedding,
      tenant_id: tenantId,
      knowledge_base_id: knowledgeBaseId,
      source_title: sourceTitle
    });
  }

  return chunks;
}

module.exports = {
  createEmbeddingChunks
};