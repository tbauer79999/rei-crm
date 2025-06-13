// /supabase/functions/_shared/chunkingService.ts

export const createEmbeddingChunks = (text: string, chunkSize = 500): string[] => {
  const chunks = [];
  let current = 0;

  while (current < text.length) {
    const chunk = text.slice(current, current + chunkSize);
    chunks.push(chunk);
    current += chunkSize;
  }

  return chunks;
};
