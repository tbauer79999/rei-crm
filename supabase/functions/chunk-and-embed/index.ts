import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authenticateAndAuthorize } from '../_shared/authUtils.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createEmbeddingChunks } from '../_shared/chunkingService.js';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;
const EMBEDDING_MODEL = 'text-embedding-3-small';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const auth = await authenticateAndAuthorize(req);

  if (auth.error || !auth.tenant_id) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status || 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { tenant_id } = auth;

  try {
    const { chunks, knowledge_base_id, metadata = {} } = await req.json();

    if (!chunks || !Array.isArray(chunks) || chunks.length === 0) {
      return new Response(JSON.stringify({ error: 'Missing or invalid chunks array' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!knowledge_base_id || !tenant_id) {
      return new Response(JSON.stringify({ error: 'Missing knowledge_base_id or tenant_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`\u{1F9E9} Processing ${chunks.length} chunks for KB ID: ${knowledge_base_id}`);

    const preparedChunks = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      const embedRes = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          input: chunk,
          model: EMBEDDING_MODEL
        })
      });

      const embedJson = await embedRes.json();

      if (!embedJson?.data?.[0]?.embedding) {
        console.error(`\u274C Failed to embed chunk ${i}`, embedJson);
        continue;
      }

      const embedding = embedJson.data[0].embedding;
      console.log(`\u2705 Embedded chunk ${i} (length: ${embedding.length})`);

      preparedChunks.push({
        chunk_text: chunk,
        chunk_embedding: embedding,
        knowledge_base_id,
        tenant_id,
        chunk_index: i,
        campaign_ids: metadata.campaign_ids || null,
        created_at: new Date().toISOString()
      });
    }

    if (preparedChunks.length === 0) {
      return new Response(JSON.stringify({ error: 'All embeddings failed. No chunks saved.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { error: insertError } = await supabase
      .from('knowledge_chunks')
      .insert(preparedChunks);

    if (insertError) {
      console.error('❌ Supabase insert failed:', insertError);
      return new Response(JSON.stringify({ error: 'Insert failed', details: insertError }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`\u{1F389} Successfully inserted ${preparedChunks.length} chunks`);
    return new Response(JSON.stringify({ success: true, inserted: preparedChunks.length }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('\u{1F525} Unexpected error in chunk-and-embed:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
