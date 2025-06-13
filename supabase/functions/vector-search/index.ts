// supabase/functions/vector-search/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authenticateAndAuthorize } from '../_shared/authUtils.ts';
import { corsHeaders } from '../_shared/cors.ts';

const EMBEDDING_MODEL = 'text-embedding-3-small';
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const auth = await authenticateAndAuthorize(req);
  if (auth.error || !auth.tenant_id) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status || 401,
      headers: corsHeaders,
    });
  }

  const { tenant_id } = auth;

  try {
    const { query } = await req.json();
    if (!query) {
      return new Response(JSON.stringify({ error: 'Missing query' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Embed the query
    const embedRes = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: query,
        model: EMBEDDING_MODEL,
      }),
    });

    const embedJson = await embedRes.json();
    const queryEmbedding = embedJson?.data?.[0]?.embedding;

    if (!queryEmbedding) {
      return new Response(JSON.stringify({ error: 'Embedding failed' }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    // Perform vector similarity search
    const { data, error } = await supabase.rpc('match_knowledge_chunks', {
      query_embedding: queryEmbedding,
      match_threshold: 0.75,
      match_count: 5,
      filter_tenant_id: tenant_id,
    });

    if (error) {
      console.error('Vector search error:', error);
      return new Response(JSON.stringify({ error: 'Vector search failed' }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    return new Response(JSON.stringify({ matches: data }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
